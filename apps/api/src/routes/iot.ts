import { authenticate } from '../lib/auth';
import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../lib/db';
import { waterTanks, waterReadings, electricityMeters, electricityReadings, tankerOrders } from '../lib/schema';
import { eq, and, desc } from 'drizzle-orm';
import { createWaterTankSchema, createElectricityMeterSchema, parseBody } from '../types';

export async function waterRoutes(app: FastifyInstance) {
  app.get('/water-tanks', { preHandler: [authenticate] }, async (request, reply) => {
    const { propertyId } = request.query as { propertyId?: string };
    const tenantId = request.user!.tenantId;
    let conditions = [eq(waterTanks.tenantId, tenantId)];
    if (propertyId) conditions.push(eq(waterTanks.propertyId, propertyId));
    const tanks = db.select().from(waterTanks).where(and(...conditions)).all();
    return reply.send(tanks.map(tank => {
      const latest = db.select().from(waterReadings).where(eq(waterReadings.tankId, tank.id))
        .orderBy(desc(waterReadings.time)).limit(1).get();
      return { ...tank, latestReading: latest || null };
    }));
  });

  app.post('/water-tanks', { preHandler: [authenticate] }, async (request, reply) => {
    const body = parseBody(createWaterTankSchema, request.body, reply);
    if (!body) return;
    const id = uuidv4();
    db.insert(waterTanks).values({ id, tenantId: request.user!.tenantId, propertyId: body.propertyId,
      name: body.name, tankType: body.tankType, capacityLiters: body.capacityLiters,
      sensorId: body.sensorId, location: body.location, lowLevelAlert: body.lowLevelAlert,
      criticalLevelAlert: body.criticalLevelAlert }).run();
    return reply.status(201).send(db.select().from(waterTanks).where(eq(waterTanks.id, id)).get());
  });

  app.get('/water-tanks/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const tank = db.select().from(waterTanks).where(and(eq(waterTanks.id, id), eq(waterTanks.tenantId, request.user!.tenantId))).get();
    if (!tank) return reply.status(404).send({ error: 'Water tank not found' });
    const readings = db.select().from(waterReadings).where(eq(waterReadings.tankId, id)).orderBy(desc(waterReadings.time)).limit(100).all();
    const orders = db.select().from(tankerOrders).where(eq(tankerOrders.tankId, id)).orderBy(desc(tankerOrders.createdAt)).limit(20).all();
    return reply.send({ ...tank, readings, tankerOrders: orders });
  });

  // Update water tank settings (thresholds, name, capacity)
  app.put('/water-tanks/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { name?: string; capacityLiters?: number; lowLevelAlert?: number; criticalLevelAlert?: number; overflowAlert?: boolean; location?: string; sensorId?: string };
    const tank = db.select().from(waterTanks).where(and(eq(waterTanks.id, id), eq(waterTanks.tenantId, request.user!.tenantId))).get();
    if (!tank) return reply.status(404).send({ error: 'Water tank not found' });
    const updates: Record<string, any> = { updatedAt: new Date().toISOString() };
    if (body.name !== undefined) updates.name = body.name;
    if (body.capacityLiters !== undefined) updates.capacityLiters = body.capacityLiters;
    if (body.lowLevelAlert !== undefined) updates.lowLevelAlert = body.lowLevelAlert;
    if (body.criticalLevelAlert !== undefined) updates.criticalLevelAlert = body.criticalLevelAlert;
    if (body.overflowAlert !== undefined) updates.overflowAlert = body.overflowAlert;
    if (body.location !== undefined) updates.location = body.location;
    if (body.sensorId !== undefined) updates.sensorId = body.sensorId;
    db.update(waterTanks).set(updates).where(eq(waterTanks.id, id)).run();
    return reply.send(db.select().from(waterTanks).where(eq(waterTanks.id, id)).get());
  });

  app.post('/water-tanks/:id/readings', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { levelPercentage: number; levelLiters: number; temperature?: number; consumptionLiters?: number; flowRate?: number; rawData?: string };
    const tank = db.select().from(waterTanks).where(and(eq(waterTanks.id, id), eq(waterTanks.tenantId, request.user!.tenantId))).get();
    if (!tank) return reply.status(404).send({ error: 'Water tank not found' });
    let isAnomaly = false, anomalyReason = '';
    if (body.levelPercentage < tank.criticalLevelAlert) { isAnomaly = true; anomalyReason = 'critical_low_level'; }
    else if (body.levelPercentage > 98) { isAnomaly = true; anomalyReason = 'possible_overflow'; }
    const readingId = uuidv4();
    db.insert(waterReadings).values({ id: readingId, time: new Date().toISOString(), tenantId: request.user!.tenantId,
      propertyId: tank.propertyId, tankId: id, levelPercentage: body.levelPercentage, levelLiters: body.levelLiters,
      temperature: body.temperature, consumptionLiters: body.consumptionLiters, flowRate: body.flowRate,
      isAnomaly, anomalyReason, rawData: body.rawData }).run();
    return reply.status(201).send({ id: readingId, isAnomaly, anomalyReason });
  });

  app.get('/water-tanks/:id/readings', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { hours = 24 } = request.query as { hours?: number };
    const tank = db.select().from(waterTanks).where(and(eq(waterTanks.id, id), eq(waterTanks.tenantId, request.user!.tenantId))).get();
    if (!tank) return reply.status(404).send({ error: 'Water tank not found' });
    const cutoff = new Date(Date.now() - hours * 3600000).toISOString();
    return reply.send(db.select().from(waterReadings).where(eq(waterReadings.tankId, id))
      .orderBy(desc(waterReadings.time)).limit(500).all().filter(r => r.time >= cutoff).reverse());
  });
}

export async function electricityRoutes(app: FastifyInstance) {
  app.get('/electricity-meters', { preHandler: [authenticate] }, async (request, reply) => {
    const { propertyId } = request.query as { propertyId?: string };
    const tenantId = request.user!.tenantId;
    let conditions = [eq(electricityMeters.tenantId, tenantId)];
    if (propertyId) conditions.push(eq(electricityMeters.propertyId, propertyId));
    const meters = db.select().from(electricityMeters).where(and(...conditions)).all();
    return reply.send(meters.map(meter => {
      const latest = db.select().from(electricityReadings).where(eq(electricityReadings.meterId, meter.id))
        .orderBy(desc(electricityReadings.time)).limit(1).get();
      return { ...meter, latestReading: latest || null };
    }));
  });

  app.post('/electricity-meters', { preHandler: [authenticate] }, async (request, reply) => {
    const body = parseBody(createElectricityMeterSchema, request.body, reply);
    if (!body) return;
    const id = uuidv4();
    db.insert(electricityMeters).values({ id, tenantId: request.user!.tenantId, propertyId: body.propertyId,
      meterNumber: body.meterNumber, meterType: body.meterType, floorId: body.floorId, roomId: body.roomId,
      sensorId: body.sensorId, costPerUnit: body.costPerUnit, fixedCharge: body.fixedCharge }).run();
    return reply.status(201).send(db.select().from(electricityMeters).where(eq(electricityMeters.id, id)).get());
  });

  // Update electricity meter settings (cost, alerts)
  app.put('/electricity-meters/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { meterNumber?: string; costPerUnit?: number; fixedCharge?: number; highUsageAlert?: number; maxCapacityKw?: number };
    const meter = db.select().from(electricityMeters).where(and(eq(electricityMeters.id, id), eq(electricityMeters.tenantId, request.user!.tenantId))).get();
    if (!meter) return reply.status(404).send({ error: 'Meter not found' });
    const updates: Record<string, any> = { updatedAt: new Date().toISOString() };
    if (body.meterNumber !== undefined) updates.meterNumber = body.meterNumber;
    if (body.costPerUnit !== undefined) updates.costPerUnit = body.costPerUnit;
    if (body.fixedCharge !== undefined) updates.fixedCharge = body.fixedCharge;
    if (body.highUsageAlert !== undefined) updates.highUsageAlert = body.highUsageAlert;
    if (body.maxCapacityKw !== undefined) updates.maxCapacityKw = body.maxCapacityKw;
    db.update(electricityMeters).set(updates).where(eq(electricityMeters.id, id)).run();
    return reply.send(db.select().from(electricityMeters).where(eq(electricityMeters.id, id)).get());
  });

  app.post('/electricity-meters/:id/readings', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { powerKw: number; voltage?: number; currentAmp?: number; frequency?: number; powerFactor?: number; totalKwh: number; dailyKwh?: number; rawData?: string };
    const meter = db.select().from(electricityMeters).where(and(eq(electricityMeters.id, id), eq(electricityMeters.tenantId, request.user!.tenantId))).get();
    if (!meter) return reply.status(404).send({ error: 'Meter not found' });
    const estimatedCost = body.dailyKwh ? body.dailyKwh * meter.costPerUnit + meter.fixedCharge : undefined;
    let isAnomaly = false, anomalyReason = '';
    if (body.powerKw && meter.maxCapacityKw && body.powerKw > meter.maxCapacityKw) { isAnomaly = true; anomalyReason = 'exceeds_max_capacity'; }
    if (body.dailyKwh && body.dailyKwh > (meter.highUsageAlert || 50)) { isAnomaly = true; anomalyReason = 'high_usage_alert'; }
    const readingId = uuidv4();
    db.insert(electricityReadings).values({ id: readingId, time: new Date().toISOString(), tenantId: request.user!.tenantId,
      propertyId: meter.propertyId, meterId: id, powerKw: body.powerKw, voltage: body.voltage, currentAmp: body.currentAmp,
      frequency: body.frequency, powerFactor: body.powerFactor, totalKwh: body.totalKwh, dailyKwh: body.dailyKwh,
      estimatedCost, isAnomaly, anomalyReason, rawData: body.rawData }).run();
    return reply.status(201).send({ id: readingId, isAnomaly, anomalyReason, estimatedCost });
  });

  app.get('/electricity-meters/:id/readings', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const meter = db.select().from(electricityMeters).where(and(eq(electricityMeters.id, id), eq(electricityMeters.tenantId, request.user!.tenantId))).get();
    if (!meter) return reply.status(404).send({ error: 'Meter not found' });
    return reply.send(db.select().from(electricityReadings).where(eq(electricityReadings.meterId, id))
      .orderBy(desc(electricityReadings.time)).limit(500).all());
  });

  app.post('/tanker-orders', { preHandler: [authenticate] }, async (request, reply) => {
    const body = request.body as { tankId: string; orderDate: string; supplierName?: string; supplierPhone?: string; orderedLiters: number; costPerTanker?: number };
    const tank = db.select().from(waterTanks).where(eq(waterTanks.id, body.tankId)).get();
    const id = uuidv4();
    db.insert(tankerOrders).values({ id, tenantId: request.user!.tenantId, propertyId: tank?.propertyId || '', tankId: body.tankId,
      orderDate: body.orderDate, supplierName: body.supplierName, supplierPhone: body.supplierPhone,
      orderedLiters: body.orderedLiters, costPerTanker: body.costPerTanker, totalCost: body.costPerTanker }).run();
    return reply.status(201).send({ id, message: 'Tanker order created' });
  });

  app.patch('/tanker-orders/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { deliveredLiters?: number; actualAddedLiters?: number; status?: string; notes?: string };
    db.update(tankerOrders).set({ ...body, updatedAt: new Date().toISOString() }).where(eq(tankerOrders.id, id)).run();
    return reply.send(db.select().from(tankerOrders).where(eq(tankerOrders.id, id)).get());
  });
}
