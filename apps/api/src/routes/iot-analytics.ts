import { FastifyInstance } from 'fastify';
import { db } from '../lib/db';
import { electricityReadings, electricityMeters, waterReadings, waterTanks } from '../lib/schema';
import { eq, and, desc, gte, lte } from 'drizzle-orm';

export async function iotAnalyticsRoutes(app: FastifyInstance) {
  // ── Electricity consumption analytics ──────────────────────────────────
  // GET /iot/analytics/electricity?meterId=xxx&days=30
  app.get('/iot/analytics/electricity', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { meterId, days = 30 } = request.query as { meterId?: string; days?: number };
    const tenantId = request.user!.tenantId;

    // Get all meters if no specific meterId
    const meterList = meterId
      ? db.select().from(electricityMeters).where(and(eq(electricityMeters.id, meterId), eq(electricityMeters.tenantId, tenantId))).all()
      : db.select().from(electricityMeters).where(eq(electricityMeters.tenantId, tenantId)).all();

    if (meterList.length === 0) {
      return reply.send({ meters: [], daily: [], hourly: [] });
    }

    const cutoff = new Date(Date.now() - days * 86400000).toISOString();

    // Daily aggregations
    const dailyData: Record<string, { date: string; totalKwh: number; totalCost: number; avgPower: number; count: number; maxPower: number }> = {};

    // Hourly data for the selected day (last 24h or specific day)
    const hourlyData: Record<string, { hour: string; kwh: number; cost: number; power: number }> = {};

    for (const meter of meterList) {
      const readings = db.select().from(electricityReadings)
        .where(and(eq(electricityReadings.meterId, meter.id), gte(electricityReadings.time, cutoff)))
        .orderBy(desc(electricityReadings.time))
        .limit(2000)
        .all();

      for (const r of readings) {
        const day = r.time.slice(0, 10);
        if (!dailyData[day]) {
          dailyData[day] = { date: day, totalKwh: 0, totalCost: 0, avgPower: 0, count: 0, maxPower: 0 };
        }
        dailyData[day].totalKwh += r.dailyKwh || 0;
        dailyData[day].totalCost += r.estimatedCost || 0;
        dailyData[day].avgPower += r.powerKw || 0;
        dailyData[day].count += 1;
        dailyData[day].maxPower = Math.max(dailyData[day].maxPower, r.powerKw || 0);

        const hour = r.time.slice(0, 13);
        if (!hourlyData[hour]) {
          hourlyData[hour] = { hour, kwh: 0, cost: 0, power: 0 };
        }
        hourlyData[hour].kwh += r.dailyKwh || 0;
        hourlyData[hour].cost += r.estimatedCost || 0;
        hourlyData[hour].power = Math.max(hourlyData[hour].power, r.powerKw || 0);
      }
    }

    const daily = Object.values(dailyData)
      .map(d => ({ ...d, avgPower: d.count > 0 ? d.avgPower / d.count : 0 }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const hourly = Object.values(hourlyData).sort((a, b) => a.hour.localeCompare(b.hour));

    // Summary stats
    const totalKwh = daily.reduce((sum, d) => sum + d.totalKwh, 0);
    const totalCost = daily.reduce((sum, d) => sum + d.totalCost, 0);
    const avgDaily = daily.length > 0 ? totalKwh / daily.length : 0;
    const peakPower = daily.reduce((max, d) => Math.max(max, d.maxPower), 0);

    // Trend: compare last 7 days vs previous 7 days
    const last7 = daily.slice(-7).reduce((s, d) => s + d.totalKwh, 0);
    const prev7 = daily.slice(-14, -7).reduce((s, d) => s + d.totalKwh, 0);
    const trend = prev7 > 0 ? ((last7 - prev7) / prev7 * 100).toFixed(1) : '0';

    return reply.send({
      meters: meterList.map(m => ({ id: m.id, meterNumber: m.meterNumber, costPerUnit: m.costPerUnit })),
      summary: { totalKwh, totalCost, avgDaily, peakPower, trend: Number(trend) },
      daily,
      hourly,
    });
  });

  // ── Get hourly readings for a specific day ─────────────────────────────
  app.get('/iot/analytics/electricity/daily', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { meterId, date } = request.query as { meterId?: string; date: string };
    const tenantId = request.user!.tenantId;

    const meterList = meterId
      ? db.select().from(electricityMeters).where(and(eq(electricityMeters.id, meterId), eq(electricityMeters.tenantId, tenantId))).all()
      : db.select().from(electricityMeters).where(eq(electricityMeters.tenantId, tenantId)).all();

    const dayStart = `${date}T00:00:00`;
    const dayEnd = `${date}T23:59:59`;

    const hourly: Array<{ hour: number; kwh: number; cost: number; power: number; voltage: number }> = [];
    for (let h = 0; h < 24; h++) {
      hourly.push({ hour: h, kwh: 0, cost: 0, power: 0, voltage: 0 });
    }

    for (const meter of meterList) {
      const readings = db.select().from(electricityReadings)
        .where(and(
          eq(electricityReadings.meterId, meter.id),
          gte(electricityReadings.time, dayStart),
          lte(electricityReadings.time, dayEnd)
        ))
        .orderBy(electricityReadings.time)
        .all();

      for (const r of readings) {
        const h = parseInt(r.time.slice(11, 13), 10);
        hourly[h].kwh += r.dailyKwh || 0;
        hourly[h].cost += r.estimatedCost || 0;
        hourly[h].power = Math.max(hourly[h].power, r.powerKw || 0);
        hourly[h].voltage = r.voltage || 0;
      }
    }

    return reply.send({ date, hourly });
  });

  // ── Water consumption analytics ────────────────────────────────────────
  // GET /iot/analytics/water?tankId=xxx&days=30
  app.get('/iot/analytics/water', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { tankId, days = 30 } = request.query as { tankId?: string; days?: number };
    const tenantId = request.user!.tenantId;

    const tankList = tankId
      ? db.select().from(waterTanks).where(and(eq(waterTanks.id, tankId), eq(waterTanks.tenantId, tenantId))).all()
      : db.select().from(waterTanks).where(eq(waterTanks.tenantId, tenantId)).all();

    if (tankList.length === 0) {
      return reply.send({ tanks: [], daily: [], hourly: [] });
    }

    const cutoff = new Date(Date.now() - days * 86400000).toISOString();

    const dailyData: Record<string, { date: string; avgLevel: number; totalConsumption: number; minLevel: number; maxLevel: number; count: number }> = {};
    const hourlyData: Record<string, { hour: string; consumption: number; level: number; count: number }> = {};

    for (const tank of tankList) {
      const readings = db.select().from(waterReadings)
        .where(and(eq(waterReadings.tankId, tank.id), gte(waterReadings.time, cutoff)))
        .orderBy(desc(waterReadings.time))
        .limit(2000)
        .all();

      for (const r of readings) {
        const day = r.time.slice(0, 10);
        if (!dailyData[day]) {
          dailyData[day] = { date: day, avgLevel: 0, totalConsumption: 0, minLevel: 100, maxLevel: 0, count: 0 };
        }
        dailyData[day].avgLevel += r.levelPercentage;
        dailyData[day].totalConsumption += r.consumptionLiters || 0;
        dailyData[day].minLevel = Math.min(dailyData[day].minLevel, r.levelPercentage);
        dailyData[day].maxLevel = Math.max(dailyData[day].maxLevel, r.levelPercentage);
        dailyData[day].count += 1;

        const hour = r.time.slice(0, 13);
        if (!hourlyData[hour]) {
          hourlyData[hour] = { hour, consumption: 0, level: 0, count: 0 };
        }
        hourlyData[hour].consumption += r.consumptionLiters || 0;
        hourlyData[hour].level += r.levelPercentage;
        hourlyData[hour].count += 1;
      }
    }

    const daily = Object.values(dailyData)
      .map(d => ({ ...d, avgLevel: d.count > 0 ? d.avgLevel / d.count : 0 }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const hourly = Object.values(hourlyData)
      .map(h => ({ ...h, level: h.count > 0 ? h.level / h.count : 0 }))
      .sort((a, b) => a.hour.localeCompare(b.hour));

    const totalConsumption = daily.reduce((sum, d) => sum + d.totalConsumption, 0);
    const avgDaily = daily.length > 0 ? totalConsumption / daily.length : 0;
    const avgLevel = daily.length > 0 ? daily.reduce((s, d) => s + d.avgLevel, 0) / daily.length : 0;

    return reply.send({
      tanks: tankList.map(t => ({ id: t.id, name: t.name, capacityLiters: t.capacityLiters })),
      summary: { totalConsumption, avgDaily, avgLevel },
      daily,
      hourly,
    });
  });

  // ── Get hourly readings for a specific day (water) ─────────────────────
  app.get('/iot/analytics/water/daily', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { tankId, date } = request.query as { tankId?: string; date: string };
    const tenantId = request.user!.tenantId;

    const tankList = tankId
      ? db.select().from(waterTanks).where(and(eq(waterTanks.id, tankId), eq(waterTanks.tenantId, tenantId))).all()
      : db.select().from(waterTanks).where(eq(waterTanks.tenantId, tenantId)).all();

    const dayStart = `${date}T00:00:00`;
    const dayEnd = `${date}T23:59:59`;

    const hourly: Array<{ hour: number; consumption: number; level: number; temperature: number }> = [];
    for (let h = 0; h < 24; h++) {
      hourly.push({ hour: h, consumption: 0, level: 0, temperature: 0 });
    }

    for (const tank of tankList) {
      const readings = db.select().from(waterReadings)
        .where(and(
          eq(waterReadings.tankId, tank.id),
          gte(waterReadings.time, dayStart),
          lte(waterReadings.time, dayEnd)
        ))
        .orderBy(waterReadings.time)
        .all();

      for (const r of readings) {
        const h = parseInt(r.time.slice(11, 13), 10);
        hourly[h].consumption += r.consumptionLiters || 0;
        hourly[h].level = r.levelPercentage;
        hourly[h].temperature = r.temperature || 0;
      }
    }

    return reply.send({ date, hourly });
  });
}
