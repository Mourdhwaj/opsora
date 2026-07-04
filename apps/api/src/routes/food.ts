import { authenticate } from '../lib/auth';
import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../lib/db';
import { foodPolls, foodPollOptions, foodVotes, mealAttendance, foodMenu, foodRatings, ingredientFormulas, tenantProfiles, notifications, properties, users } from '../lib/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { createFoodPollSchema, createFoodRatingSchema, createMealAttendanceSchema, createIngredientFormulaSchema, parseBody } from '../types';

export async function foodRoutes(app: FastifyInstance) {

  // ══════════════════════════════════════════════════════════════════════════
  // MODULE 1: MENU POLLING
  // ══════════════════════════════════════════════════════════════════════════

  // Create poll with options
  app.post('/food/polls', { preHandler: [authenticate] }, async (request, reply) => {
    const body = parseBody(createFoodPollSchema, request.body, reply);
    if (!body) return;
    const tenantId = request.user!.tenantId;

    // Resolve propertyId: use provided or fall back to first property for this tenant
    let propertyId = body.propertyId || '';
    if (!propertyId) {
      const firstProp = db.select().from(properties).where(eq(properties.tenantId, tenantId)).get();
      propertyId = firstProp?.id || '';
    }
    if (!propertyId) {
      return reply.status(400).send({ error: 'No property found. Please create a property first or provide propertyId.' });
    }

    const pollId = uuidv4();
    db.insert(foodPolls).values({
      id: pollId, tenantId, propertyId,
      title: body.title, mealType: body.mealType, date: body.date,
      deadline: body.deadline, status: 'draft', createdBy: request.user!.userId,
    }).run();

    for (const opt of body.options) {
      db.insert(foodPollOptions).values({
        id: uuidv4(), pollId, title: opt.title, description: opt.description, voteCount: 0,
      }).run();
    }

    return reply.status(201).send({ id: pollId, message: 'Poll created' });
  });

  // List polls
  app.get('/food/polls', { preHandler: [authenticate] }, async (request, reply) => {
    const { status, page = 1, limit = 20 } = request.query as { status?: string; page?: number; limit?: number };
    const tenantId = request.user!.tenantId;
    let conditions = [eq(foodPolls.tenantId, tenantId)];
    if (status) conditions.push(eq(foodPolls.status, status));

    const data = db.select().from(foodPolls).where(and(...conditions))
      .orderBy(desc(foodPolls.createdAt)).limit(limit).offset((page - 1) * limit).all();

    // Enrich with options and vote counts
    const enriched = data.map(poll => {
      const options = db.select().from(foodPollOptions).where(eq(foodPollOptions.pollId, poll.id)).all();
      const totalVotes = options.reduce((sum, o) => sum + (o.voteCount || 0), 0);
      return { ...poll, options, totalVotes };
    });

    const totalRow = db.select({ count: sql<number>`count(*)` }).from(foodPolls).where(and(...conditions)).get();
    const total = totalRow?.count ?? 0;
    return reply.send({ data: enriched, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  });

  // Get poll detail
  app.get('/food/polls/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const poll = db.select().from(foodPolls).where(eq(foodPolls.id, id)).get();
    if (!poll) return reply.status(404).send({ error: 'Poll not found' });

    const options = db.select().from(foodPollOptions).where(eq(foodPollOptions.pollId, id)).all();
    const totalVotes = options.reduce((sum, o) => sum + (o.voteCount || 0), 0);

    // Check if current user has voted — userId is users.id, need to resolve tenantProfileId
    const userId = request.user!.userId;
    const userRecord = db.select().from(users).where(eq(users.id, userId)).get();
    const profileId = userRecord?.tenantProfileId || userId;
    const userVote = db.select().from(foodVotes)
      .where(and(eq(foodVotes.pollId, id), eq(foodVotes.tenantProfileId, profileId))).get() || null;

    return reply.send({ ...poll, options, totalVotes, userVote: userVote || null });
  });

  // Publish poll
  app.post('/food/polls/:id/publish', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const poll = db.select().from(foodPolls).where(eq(foodPolls.id, id)).get();
    if (!poll) return reply.status(404).send({ error: 'Poll not found' });
    if (poll.status !== 'draft') return reply.status(400).send({ error: 'Only draft polls can be published' });

    db.update(foodPolls).set({ status: 'published', updatedAt: new Date().toISOString() })
      .where(eq(foodPolls.id, id)).run();

    // Create notifications for all active residents
    const residents = db.select().from(tenantProfiles)
      .where(and(eq(tenantProfiles.tenantId, request.user!.tenantId), eq(tenantProfiles.status, 'active')))
      .all();

    for (const r of residents) {
      db.insert(notifications).values({
        id: uuidv4(), tenantId: request.user!.tenantId, tenantProfileId: r.id,
        title: `Vote: ${poll.title}`, message: `Vote for tomorrow's ${poll.mealType}`,
        type: 'food_poll', priority: 'normal',
      }).run();
    }

    return reply.send({ message: 'Poll published' });
  });

  // Vote on poll
  app.post('/food/polls/:id/vote', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { optionId } = request.body as { optionId: string };
    const userId = request.user!.userId;

    const poll = db.select().from(foodPolls).where(eq(foodPolls.id, id)).get();
    if (!poll) return reply.status(404).send({ error: 'Poll not found' });
    if (poll.status !== 'published') return reply.status(400).send({ error: 'Poll is not accepting votes' });
    if (new Date(poll.deadline) < new Date()) return reply.status(400).send({ error: 'Voting deadline has passed' });

    // Resolve tenantProfileId from userId
    const voterUser = db.select().from(users).where(eq(users.id, userId)).get();
    const voterProfileId = voterUser?.tenantProfileId || userId;
    // Check if already voted
    const existing = db.select().from(foodVotes)
      .where(and(eq(foodVotes.pollId, id), eq(foodVotes.tenantProfileId, voterProfileId))).get();
    if (existing) return reply.status(400).send({ error: 'Already voted' });

    // Verify option exists
    const option = db.select().from(foodPollOptions).where(eq(foodPollOptions.id, optionId)).get();
    if (!option) return reply.status(404).send({ error: 'Option not found' });

    db.insert(foodVotes).values({
      id: uuidv4(), pollId: id, tenantProfileId: voterProfileId, selectedOptionId: optionId,
    }).run();

    // Increment vote count
    db.update(foodPollOptions).set({ voteCount: (option.voteCount || 0) + 1 })
      .where(eq(foodPollOptions.id, optionId)).run();

    return reply.send({ message: 'Vote recorded' });
  });

  // Get poll results
  app.get('/food/polls/:id/results', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const poll = db.select().from(foodPolls).where(eq(foodPolls.id, id)).get();
    if (!poll) return reply.status(404).send({ error: 'Poll not found' });

    const options = db.select().from(foodPollOptions).where(eq(foodPollOptions.pollId, id)).all();
    const totalVotes = options.reduce((sum, o) => sum + (o.voteCount || 0), 0);
    const totalResidentsRow = db.select({ count: sql<number>`count(*)` }).from(tenantProfiles)
      .where(and(eq(tenantProfiles.tenantId, poll.tenantId), eq(tenantProfiles.status, 'active')))
      .get();
    const totalResidents = totalResidentsRow?.count ?? 0;
    const participationRate = totalResidents > 0 ? ((totalVotes / totalResidents) * 100).toFixed(1) : '0';

    const winner = options.reduce((max, o) => (o.voteCount || 0) > (max.voteCount || 0) ? o : max, options[0]);

    return reply.send({ poll, options, totalVotes, totalResidents, participationRate, winner });
  });

  // Finalize poll
  app.post('/food/polls/:id/finalize', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { optionId, reason } = request.body as { optionId?: string; reason?: string };
    const poll = db.select().from(foodPolls).where(eq(foodPolls.id, id)).get();
    if (!poll) return reply.status(404).send({ error: 'Poll not found' });

    // Get winner if no optionId provided
    let finalOptionId = optionId;
    if (!finalOptionId) {
      const options = db.select().from(foodPollOptions).where(eq(foodPollOptions.pollId, id)).all();
      const winner = options.reduce((max, o) => (o.voteCount || 0) > (max.voteCount || 0) ? o : max, options[0]);
      finalOptionId = winner?.id;
    }

    if (!finalOptionId) return reply.status(400).send({ error: 'No option to finalize' });

    const option = db.select().from(foodPollOptions).where(eq(foodPollOptions.id, finalOptionId)).get();

    db.update(foodPolls).set({
      status: 'finalized', finalizedOptionId: finalOptionId,
      finalizeReason: reason || null, updatedAt: new Date().toISOString(),
    }).where(eq(foodPolls.id, id)).run();

    // Create food menu from winning option
    const menuId = uuidv4();
    db.insert(foodMenu).values({
      id: menuId, tenantId: poll.tenantId, propertyId: poll.propertyId,
      date: poll.date, mealType: poll.mealType, items: option?.title || '',
      pollId: id, finalizedBy: request.user!.userId, finalizedAt: new Date().toISOString(),
      status: 'finalized',
    }).run();

    return reply.send({ message: 'Poll finalized', menuId });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // MODULE 3: MEAL ATTENDANCE
  // ══════════════════════════════════════════════════════════════════════════

  // Confirm attendance
  app.post('/food/attendance', { preHandler: [authenticate] }, async (request, reply) => {
    const body = parseBody(createMealAttendanceSchema, request.body, reply);
    if (!body) return;
    const tenantId = request.user!.tenantId;
    const userId = request.user!.userId;

    // Get resident profile
    const profile = db.select().from(tenantProfiles)
      .where(and(eq(tenantProfiles.tenantId, tenantId), eq(tenantProfiles.id, userId))).get();
    if (!profile) return reply.status(404).send({ error: 'Resident profile not found' });

    // Upsert attendance
    const existing = db.select().from(mealAttendance)
      .where(and(eq(mealAttendance.tenantProfileId, userId), eq(mealAttendance.date, body.date))).get();

    if (existing) {
      db.update(mealAttendance).set({
        breakfast: body.breakfast ?? existing.breakfast,
        lunch: body.lunch ?? existing.lunch,
        dinner: body.dinner ?? existing.dinner,
      }).where(eq(mealAttendance.id, existing.id)).run();
    } else {
      db.insert(mealAttendance).values({
        id: uuidv4(), tenantId, propertyId: profile.propertyId, tenantProfileId: userId,
        date: body.date, breakfast: body.breakfast ?? 'no', lunch: body.lunch ?? 'no', dinner: body.dinner ?? 'no',
      }).run();
    }

    return reply.send({ message: 'Attendance updated' });
  });

  // Get attendance summary for a date
  app.get('/food/attendance', { preHandler: [authenticate] }, async (request, reply) => {
    const { date } = request.query as { date: string };
    const tenantId = request.user!.tenantId;

    const records = db.select().from(mealAttendance)
      .where(and(eq(mealAttendance.tenantId, tenantId), eq(mealAttendance.date, date))).all();    const totalResidentsRow = db.select({ count: sql<number>`count(*)` }).from(tenantProfiles)
      .where(and(eq(tenantProfiles.tenantId, tenantId), eq(tenantProfiles.status, 'active')))
      .get();
    const totalResidents = totalResidentsRow?.count ?? 0;

    // Calculate confirmed, maybe, and predicted attendance
    const breakfastYes = records.filter(r => r.breakfast === 'yes').length;
    const breakfastMaybe = records.filter(r => r.breakfast === 'maybe').length;
    const lunchYes = records.filter(r => r.lunch === 'yes').length;
    const lunchMaybe = records.filter(r => r.lunch === 'maybe').length;
    const dinnerYes = records.filter(r => r.dinner === 'yes').length;
    const dinnerMaybe = records.filter(r => r.dinner === 'maybe').length;

    const breakfastPredicted = breakfastYes + Math.round(breakfastMaybe * 0.5);
    const lunchPredicted = lunchYes + Math.round(lunchMaybe * 0.5);
    const dinnerPredicted = dinnerYes + Math.round(dinnerMaybe * 0.5);

    return reply.send({
      date, totalResidents, responded: records.length,
      breakfast: { confirmed: breakfastYes, maybe: breakfastMaybe, notAttending: records.length - breakfastYes - breakfastMaybe, predicted: breakfastPredicted },
      lunch: { confirmed: lunchYes, maybe: lunchMaybe, notAttending: records.length - lunchYes - lunchMaybe, predicted: lunchPredicted },
      dinner: { confirmed: dinnerYes, maybe: dinnerMaybe, notAttending: records.length - dinnerYes - dinnerMaybe, predicted: dinnerPredicted },
    });
  });

  // Get my attendance
  app.get('/food/attendance/my', { preHandler: [authenticate] }, async (request, reply) => {
    const userId = request.user!.userId;
    const records = db.select().from(mealAttendance)
      .where(eq(mealAttendance.tenantProfileId, userId))
      .orderBy(desc(mealAttendance.date)).limit(30).all();
    return reply.send(records);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // MODULE 4: COOK DASHBOARD
  // ══════════════════════════════════════════════════════════════════════════

  app.get('/food/cook/today', { preHandler: [authenticate] }, async (request, reply) => {
    const today = new Date().toISOString().slice(0, 10);
    const tenantId = request.user!.tenantId;

    const menus = db.select().from(foodMenu)
      .where(and(eq(foodMenu.tenantId, tenantId), eq(foodMenu.date, today)))
      .all();

    // Get attendance for today
    const attendance = db.select().from(mealAttendance)
      .where(and(eq(mealAttendance.tenantId, tenantId), eq(mealAttendance.date, today))).all();

    return reply.send({
      date: today,
      menus: menus.map(m => ({
        ...m,
        attendanceCount: attendance.filter(a => {
          if (m.mealType === 'breakfast') return a.breakfast === 'yes' || a.breakfast === 'maybe';
          if (m.mealType === 'lunch') return a.lunch === 'yes' || a.lunch === 'maybe';
          return a.dinner === 'yes' || a.dinner === 'maybe';
        }).length,
        predictedCount: attendance.filter(a => {
          if (m.mealType === 'breakfast') return a.breakfast === 'yes';
          if (m.mealType === 'lunch') return a.lunch === 'yes';
          return a.dinner === 'yes';
        }).length + Math.round(attendance.filter(a => {
          if (m.mealType === 'breakfast') return a.breakfast === 'maybe';
          if (m.mealType === 'lunch') return a.lunch === 'maybe';
          return a.dinner === 'maybe';
        }).length * 0.5),
      })),
    });
  });

  app.get('/food/cook/date/:date', { preHandler: [authenticate] }, async (request, reply) => {
    const { date } = request.params as { date: string };
    const tenantId = request.user!.tenantId;

    const menus = db.select().from(foodMenu)
      .where(and(eq(foodMenu.tenantId, tenantId), eq(foodMenu.date, date))).all();

    const attendance = db.select().from(mealAttendance)
      .where(and(eq(mealAttendance.tenantId, tenantId), eq(mealAttendance.date, date))).all();

    return reply.send({
      date,
      menus: menus.map(m => ({
        ...m,
        attendanceCount: attendance.filter(a => {
          if (m.mealType === 'breakfast') return a.breakfast === 'yes' || a.breakfast === 'maybe';
          if (m.mealType === 'lunch') return a.lunch === 'yes' || a.lunch === 'maybe';
          return a.dinner === 'yes' || a.dinner === 'maybe';
        }).length,
        predictedCount: attendance.filter(a => {
          if (m.mealType === 'breakfast') return a.breakfast === 'yes';
          if (m.mealType === 'lunch') return a.lunch === 'yes';
          return a.dinner === 'yes';
        }).length + Math.round(attendance.filter(a => {
          if (m.mealType === 'breakfast') return a.breakfast === 'maybe';
          if (m.mealType === 'lunch') return a.lunch === 'maybe';
          return a.dinner === 'maybe';
        }).length * 0.5),
      })),
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // MODULE 5: INGREDIENT CALCULATOR
  // ══════════════════════════════════════════════════════════════════════════

  app.get('/food/ingredients', { preHandler: [authenticate] }, async (request, reply) => {
    const { mealType, date } = request.query as { mealType?: string; date?: string };
    const tenantId = request.user!.tenantId;

    // Get expected attendance
    const queryDate = date || new Date().toISOString().slice(0, 10);
    const attendance = db.select().from(mealAttendance)
      .where(and(eq(mealAttendance.tenantId, tenantId), eq(mealAttendance.date, queryDate))).all();

    // Calculate predicted attendance: yes=1, maybe=0.5
    const predictedCount = attendance.reduce((sum, a) => {
      const val = mealType === 'breakfast' ? a.breakfast : mealType === 'lunch' ? a.lunch : a.dinner;
      if (val === 'yes') return sum + 1;
      if (val === 'maybe') return sum + 0.5;
      return sum;
    }, 0);
    const expectedCount = Math.round(predictedCount) || 0;

    // If no attendance data, estimate from active residents
    const activeCount = expectedCount || (db.select({ count: sql<number>`count(*)` }).from(tenantProfiles)
      .where(and(eq(tenantProfiles.tenantId, tenantId), eq(tenantProfiles.status, 'active')))
      .get()?.count ?? 0);

    // Get formulas
    let formulaConditions = [eq(ingredientFormulas.tenantId, tenantId)];
    if (mealType) formulaConditions.push(eq(ingredientFormulas.mealType, mealType));
    const formulas = db.select().from(ingredientFormulas).where(and(...formulaConditions)).all();

    // Calculate quantities
    const ingredients = formulas.map(f => ({
      ...f,
      totalQuantity: f.quantityPerPerson * activeCount,
    }));

    return reply.send({ date: queryDate, mealType, expectedAttendance: activeCount, ingredients });
  });

  app.post('/food/ingredients', { preHandler: [authenticate] }, async (request, reply) => {
    const body = parseBody(createIngredientFormulaSchema, request.body, reply);
    if (!body) return;

    const id = uuidv4();
    db.insert(ingredientFormulas).values({
      id, tenantId: request.user!.tenantId, ...body,
    }).run();

    return reply.status(201).send({ id, message: 'Formula created' });
  });

  app.get('/food/ingredients/formulas', { preHandler: [authenticate] }, async (request, reply) => {
    const formulas = db.select().from(ingredientFormulas)
      .where(eq(ingredientFormulas.tenantId, request.user!.tenantId)).all();
    return reply.send(formulas);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // MODULE 6: FOOD FEEDBACK
  // ══════════════════════════════════════════════════════════════════════════

  app.post('/food/ratings', { preHandler: [authenticate] }, async (request, reply) => {
    const body = parseBody(createFoodRatingSchema, request.body, reply);
    if (!body) return;

    // Check if already rated
    const existing = db.select().from(foodRatings)
      .where(and(eq(foodRatings.foodMenuId, body.foodMenuId), eq(foodRatings.tenantProfileId, request.user!.userId))).get();
    if (existing) return reply.status(400).send({ error: 'Already rated this meal' });

    const id = uuidv4();
    db.insert(foodRatings).values({
      id, tenantId: request.user!.tenantId, foodMenuId: body.foodMenuId,
      tenantProfileId: request.user!.userId, rating: body.rating,
      tags: body.tags, comment: body.comment,
    }).run();

    return reply.status(201).send({ id, message: 'Rating submitted' });
  });

  app.get('/food/ratings', { preHandler: [authenticate] }, async (request, reply) => {
    const { menuId } = request.query as { menuId?: string };
    let conditions = [eq(foodRatings.tenantId, request.user!.tenantId)];
    if (menuId) conditions.push(eq(foodRatings.foodMenuId, menuId));

    const data = db.select().from(foodRatings).where(and(...conditions))
      .orderBy(desc(foodRatings.createdAt)).limit(100).all();
    return reply.send(data);
  });

  app.get('/food/ratings/summary', { preHandler: [authenticate] }, async (request, reply) => {
    const tenantId = request.user!.tenantId;
    const allRatings = db.select().from(foodRatings)
      .where(eq(foodRatings.tenantId, tenantId)).all();

    const avgRating = allRatings.length > 0
      ? (allRatings.reduce((sum, r) => sum + (r.rating || 0), 0) / allRatings.length).toFixed(1)
      : '0';

    // Count tags
    const tagCounts: Record<string, number> = {};
    for (const r of allRatings) {
      if (r.tags) {
        for (const tag of r.tags.split(',').map(t => t.trim())) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      }
    }

    const complaintTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);

    return reply.send({ avgRating, totalRatings: allRatings.length, complaintTags });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // MODULE 7: FOOD ANALYTICS
  // ══════════════════════════════════════════════════════════════════════════

  app.get('/food/analytics', { preHandler: [authenticate] }, async (request, reply) => {
    const tenantId = request.user!.tenantId;

    const allRatings = db.select().from(foodRatings).where(eq(foodRatings.tenantId, tenantId)).all();
    const allMenus = db.select().from(foodMenu).where(eq(foodMenu.tenantId, tenantId)).all();
    const allPolls = db.select().from(foodPolls).where(eq(foodPolls.tenantId, tenantId)).all();
    const pollIds = allPolls.map(p => p.id);
    const allVotes = pollIds.length > 0 ? db.select().from(foodVotes)
      .where(sql`${foodVotes.pollId} IN (${sql.join(pollIds.map(id => sql`${id}`), sql`, `)})`).all() : [];

    const avgRating = allRatings.length > 0
      ? allRatings.reduce((sum, r) => sum + (r.rating || 0), 0) / allRatings.length : 0;

    // Popular items from menus
    const itemCounts: Record<string, number> = {};
    allMenus.forEach(m => {
      m.items.split(',').forEach(item => {
        const name = item.trim();
        if (name) itemCounts[name] = (itemCounts[name] || 0) + 1;
      });
    });
    const popularItems = Object.entries(itemCounts)
      .map(([name, count]) => ({ name, count, rating: avgRating }))
      .sort((a, b) => b.count - a.count).slice(0, 10);

    // Tag counts
    const tagCounts: Record<string, number> = {};
    allRatings.forEach(r => {
      if (r.tags) r.tags.split(',').forEach(t => {
        const tag = t.trim();
        if (tag) tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    const complaintTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count);

    // Participation rate
    const totalResidentsRow = db.select({ count: sql<number>`count(*)` }).from(tenantProfiles)
      .where(and(eq(tenantProfiles.tenantId, tenantId), eq(tenantProfiles.status, 'active'))).get();
    const totalResidents = totalResidentsRow?.count ?? 0;
    const participationRate = totalResidents > 0 ? ((allVotes.length / (allPolls.length * totalResidents)) * 100) : 0;

    // Waste estimation
    const totalExpected = allMenus.reduce((sum, m) => sum + (m.attendanceExpected || 0), 0);
    const totalActual = allMenus.reduce((sum, m) => sum + (m.attendanceActual || 0), 0);
    const wastePercent = totalExpected > 0 ? (((totalExpected - totalActual) / totalExpected) * 100).toFixed(1) : '0';

    return reply.send({
      satisfactionScore: avgRating.toFixed(1),
      totalRatings: allRatings.length,
      popularItems,
      complaintTags,
      wasteStats: { prepared: totalExpected, consumed: totalActual, wastePercent },
      participationRate: participationRate.toFixed(1),
      totalPolls: allPolls.length,
    });
  });

  // Attendance trends over past 30 days
  app.get('/food/analytics/attendance-trends', { preHandler: [authenticate] }, async (request, reply) => {
    const tenantId = request.user!.tenantId;
    const days = parseInt((request.query as any).days || '30', 10);

    const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    const records = db.select().from(mealAttendance)
      .where(and(eq(mealAttendance.tenantId, tenantId), sql`${mealAttendance.date} >= ${cutoff}`))
      .all();

    // Group by date and meal type
    const byDate: Record<string, { date: string; breakfast: { yes: number; no: number; maybe: number }; lunch: { yes: number; no: number; maybe: number }; dinner: { yes: number; no: number; maybe: number } }> = {};

    for (let i = days; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      byDate[d] = {
        date: d.slice(5),
        breakfast: { yes: 0, no: 0, maybe: 0 },
        lunch: { yes: 0, no: 0, maybe: 0 },
        dinner: { yes: 0, no: 0, maybe: 0 },
      };
    }

    for (const r of records) {
      const entry = byDate[r.date];
      if (!entry) continue;
      const bs = (r.breakfast || 'no') as string;
      const ls = (r.lunch || 'no') as string;
      const ds = (r.dinner || 'no') as string;
      if (bs === 'yes') entry.breakfast.yes++;
      else if (bs === 'maybe') entry.breakfast.maybe++;
      else entry.breakfast.no++;
      if (ls === 'yes') entry.lunch.yes++;
      else if (ls === 'maybe') entry.lunch.maybe++;
      else entry.lunch.no++;
      if (ds === 'yes') entry.dinner.yes++;
      else if (ds === 'maybe') entry.dinner.maybe++;
      else entry.dinner.no++;
    }

    return reply.send({ days, data: Object.values(byDate) });
  });

  app.get('/food/analytics/recommendations', { preHandler: [authenticate] }, async (request, reply) => {
    const tenantId = request.user!.tenantId;
    const allRatings = db.select().from(foodRatings).where(eq(foodRatings.tenantId, tenantId)).all();
    const allMenus = db.select().from(foodMenu).where(eq(foodMenu.tenantId, tenantId)).all();

    const recommendations: string[] = [];

    if (allRatings.length >= 5) {
      const avgRating = allRatings.reduce((sum, r) => sum + (r.rating || 0), 0) / allRatings.length;
      if (avgRating >= 4) recommendations.push('Overall food satisfaction is high. Keep up the good work!');
      if (avgRating < 3) recommendations.push('Food satisfaction is below average. Consider surveying residents for feedback.');
    }

    if (allMenus.length >= 3) {
      recommendations.push('Based on historical data, rotate menu items every 3-4 days to prevent repetition complaints.');
    }

    if (allRatings.length > 0) {
      const lowRated = allRatings.filter(r => (r.rating || 0) <= 2);
      if (lowRated.length > allRatings.length * 0.2) {
        recommendations.push('Over 20% of ratings are low. Review meal quality and preparation methods.');
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Add more ratings and polls to generate smart recommendations.');
    }

    return reply.send({ recommendations });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // MODULE 8: MENU (finalized menus)
  // ══════════════════════════════════════════════════════════════════════════

  app.get('/food/menus', { preHandler: [authenticate] }, async (request, reply) => {
    const { date } = request.query as { date?: string };
    let conditions = [eq(foodMenu.tenantId, request.user!.tenantId)];
    if (date) conditions.push(eq(foodMenu.date, date));

    const data = db.select().from(foodMenu).where(and(...conditions))
      .orderBy(desc(foodMenu.date)).limit(30).all();
    return reply.send(data);
  });

  app.get('/food/menus/upcoming', { preHandler: [authenticate] }, async (request, reply) => {
    const today = new Date().toISOString().slice(0, 10);
    const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

    const data = db.select().from(foodMenu)
      .where(and(
        eq(foodMenu.tenantId, request.user!.tenantId),
        sql`${foodMenu.date} >= ${today}`,
        sql`${foodMenu.date} <= ${nextWeek}`,
      ))
      .orderBy(foodMenu.date).all();
    return reply.send(data);
  });
}
