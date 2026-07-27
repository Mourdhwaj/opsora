import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAuth } from '@/lib/api-helpers';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const propertyId = searchParams.get('propertyId');
    const tenantRef = adminDb.collection('tenants').doc(auth.tenantId);
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Properties
    let propertiesQuery: FirebaseFirestore.Query = tenantRef.collection('properties');
    if (propertyId) propertiesQuery = propertiesQuery.where('__name__', '==', propertyId);
    const propertiesSnap = await propertiesQuery.get();

    let totalProperties = 0;
    let totalBeds = 0;
    let occupiedBeds = 0;

    for (const doc of propertiesSnap.docs) {
      totalProperties++;
      const stats = doc.data().stats;
      if (stats) {
        totalBeds += stats.totalBeds || 0;
        occupiedBeds += stats.occupiedBeds || 0;
      }
    }

    const vacantBeds = totalBeds - occupiedBeds;
    const occupancyRate = totalBeds > 0 ? ((occupiedBeds / totalBeds) * 100).toFixed(1) : '0';

    // Active tenants (residents with status=active)
    let peopleQuery: FirebaseFirestore.Query = tenantRef.collection('people').where('role', '==', 'resident').where('status', '==', 'active');
    if (propertyId) peopleQuery = peopleQuery.where('propertyId', '==', propertyId);
    const peopleSnap = await peopleQuery.get();
    const activeTenants = peopleSnap.size;

    // Current month payments
    let monthPayQuery: FirebaseFirestore.Query = tenantRef
      .collection('financials')
      .where('type', '==', 'payment')
      .where('monthYear', '==', currentMonth);
    if (propertyId) monthPayQuery = monthPayQuery.where('propertyId', '==', propertyId);
    const monthPaySnap = await monthPayQuery.get();
    const monthPayments = monthPaySnap.docs.map(d => d.data());

    const totalExpected = monthPayments.reduce((s, p) => s + (p.totalAmount || 0), 0);
    const totalCollected = monthPayments.reduce((s, p) => s + (p.paidAmount || 0), 0);
    const totalPending = totalExpected - totalCollected;

    // All-time payments
    let allPayQuery: FirebaseFirestore.Query = tenantRef
      .collection('financials')
      .where('type', '==', 'payment');
    if (propertyId) allPayQuery = allPayQuery.where('propertyId', '==', propertyId);
    const allPaySnap = await allPayQuery.get();
    const allPayments = allPaySnap.docs.map(d => d.data());
    const allTimeExpected = allPayments.reduce((s, p) => s + (p.totalAmount || 0), 0);
    const allTimeCollected = allPayments.reduce((s, p) => s + (p.paidAmount || 0), 0);

    // Open complaints
    let complaintsQuery: FirebaseFirestore.Query = tenantRef
      .collection('operations')
      .where('type', '==', 'complaint')
      .where('status', '==', 'open');
    if (propertyId) complaintsQuery = complaintsQuery.where('propertyId', '==', propertyId);
    const complaintsSnap = await complaintsQuery.get();

    let urgentQuery: FirebaseFirestore.Query = tenantRef
      .collection('operations')
      .where('type', '==', 'complaint')
      .where('status', '==', 'open')
      .where('priority', '==', 'urgent');
    if (propertyId) urgentQuery = urgentQuery.where('propertyId', '==', propertyId);
    const urgentSnap = await urgentQuery.get();

    // Water tanks from iot collection
    let tanksQuery: FirebaseFirestore.Query = tenantRef.collection('iot').where('type', '==', 'water-tank');
    if (propertyId) tanksQuery = tanksQuery.where('propertyId', '==', propertyId);
    const tanksSnap = await tanksQuery.get();
    const waterStatus = tanksSnap.docs.map(d => {
      const tank = d.data();
      return {
        tankId: d.id,
        tankName: tank.name || 'Unknown',
        capacityLiters: tank.capacityLiters || 0,
        currentLevel: tank.latestReading?.levelPercentage ?? null,
        currentLiters: tank.latestReading?.levelLiters ?? null,
      };
    });

    // Pending visitors
    const visitorsSnap = await tenantRef
      .collection('operations')
      .where('type', '==', 'visitor')
      .where('status', '==', 'pending')
      .get();

    // Recent activity
    const activitySnap = await tenantRef
      .collection('operations')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();
    const recentActivity = activitySnap.docs.map(d => {
      const log = d.data();
      return {
        id: d.id,
        action: log.action || log.type || '',
        entityType: log.type || '',
        entityName: log.title || log.entityId || '',
        actorName: log.actorName || '',
        createdAt: log.createdAt || '',
      };
    });

    return NextResponse.json({
      properties: { total: totalProperties, totalBeds, occupiedBeds, vacantBeds, occupancyRate },
      tenants: { active: activeTenants },
      payments: {
        totalExpected, totalCollected, totalPending,
        collectionRate: totalExpected > 0 ? ((totalCollected / totalExpected) * 100).toFixed(1) : '0',
        paidCount: monthPayments.filter(p => p.paymentStatus === 'paid').length,
        pendingCount: monthPayments.filter(p => p.paymentStatus === 'pending').length,
        overdueCount: monthPayments.filter(p => p.paymentStatus === 'overdue').length,
        partialCount: monthPayments.filter(p => p.paymentStatus === 'partial').length,
        allTimeCollected, allTimeExpected,
      },
      complaints: { open: complaintsSnap.size, urgent: urgentSnap.size },
      water: waterStatus,
      visitors: { pending: visitorsSnap.size },
      recentActivity,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
