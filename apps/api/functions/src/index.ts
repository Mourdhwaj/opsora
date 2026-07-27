import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as cors from 'cors';

admin.initializeApp();
const db = admin.firestore();
const auth = admin.auth();
const corsHandler = cors({ origin: true });

async function authenticate(req: functions.Request, res: functions.Response) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  try {
    const token = authHeader.split('Bearer ')[1];
    return await auth.verifyIdToken(token);
  } catch {
    res.status(401).json({ error: 'Invalid token' });
    return null;
  }
}

export const me = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    const user = await authenticate(req, res);
    if (!user) return;
    try {
      const tenantsSnap = await db.collection('tenants').get();
      for (const tenantDoc of tenantsSnap.docs) {
        const personDoc = await tenantDoc.ref.collection('people').doc(user.uid).get();
        if (personDoc.exists) {
          const data = personDoc.data()!;
          delete data.passwordHash;
          res.json({ ...data, tenantId: tenantDoc.id });
          return;
        }
      }
      res.status(404).json({ error: 'User not found' });
    } catch {
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

export const properties = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    const user = await authenticate(req, res);
    if (!user) return;
    try {
      const tenantId = req.query.tenantId as string || (user as any).tenantId;
      const snap = await db.collection('tenants').doc(tenantId).collection('properties').get();
      res.json({ data: snap.docs.map(doc => doc.data()) });
    } catch {
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

export const residents = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    const user = await authenticate(req, res);
    if (!user) return;
    try {
      const tenantId = req.query.tenantId as string || (user as any).tenantId;
      const snap = await db.collection('tenants').doc(tenantId).collection('people')
        .where('role', '==', 'resident')
        .where('status', '==', 'active')
        .get();
      const residents = snap.docs.map(doc => {
        const data = doc.data();
        delete data.passwordHash;
        return data;
      });
      res.json({ data: residents });
    } catch {
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

export const payments = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    const user = await authenticate(req, res);
    if (!user) return;
    try {
      const tenantId = (user as any).tenantId || req.body.tenantId;
      const paymentRef = db.collection('tenants').doc(tenantId).collection('financials').doc();
      await paymentRef.set({
        ...req.body,
        id: paymentRef.id,
        type: 'payment',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      res.json({ data: { id: paymentRef.id, ...req.body } });
    } catch {
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

export const complaints = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    const user = await authenticate(req, res);
    if (!user) return;
    try {
      const tenantId = req.query.tenantId as string || (user as any).tenantId;
      const snap = await db.collection('tenants').doc(tenantId).collection('operations')
        .where('type', '==', 'complaint')
        .orderBy('createdAt', 'desc')
        .get();
      res.json({ data: snap.docs.map(doc => doc.data()) });
    } catch {
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

export const dashboard = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    const user = await authenticate(req, res);
    if (!user) return;
    try {
      const tenantId = req.query.tenantId as string || (user as any).tenantId;
      const propsSnap = await db.collection('tenants').doc(tenantId).collection('properties').get();
      const properties = propsSnap.docs.map(doc => doc.data());
      const totalBeds = properties.reduce((sum: number, p: any) => sum + (p.stats?.totalBeds || 0), 0);
      const occupiedBeds = properties.reduce((sum: number, p: any) => sum + (p.stats?.occupiedBeds || 0), 0);
      const pendingSnap = await db.collection('tenants').doc(tenantId).collection('financials')
        .where('type', '==', 'payment')
        .where('paymentStatus', '==', 'pending')
        .get();
      const pendingAmount = pendingSnap.docs.reduce((sum, doc) => sum + (doc.data().balanceAmount || 0), 0);
      const complaintsSnap = await db.collection('tenants').doc(tenantId).collection('operations')
        .where('type', '==', 'complaint')
        .where('status', '==', 'open')
        .get();
      res.json({
        data: {
          totalProperties: properties.length,
          totalBeds,
          occupiedBeds,
          occupancyRate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 1000) / 10 : 0,
          pendingAmount,
          openComplaints: complaintsSnap.size,
        },
      });
    } catch {
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

export const onPaymentCreated = functions.firestore
  .document('tenants/{tenantId}/financials/{docId}')
  .onCreate(async (snap, context) => {
    const payment = snap.data();
    if (payment.type !== 'payment') return;
    const notifRef = db.collection('tenants').doc(context.params.tenantId).collection('operations').doc();
    await notifRef.set({
      id: notifRef.id,
      type: 'notification',
      title: 'Payment Received',
      message: `Payment of ₹${payment.totalAmount} received for ${payment.monthYear}`,
      personId: payment.personId,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  });

export const onComplaintCreated = functions.firestore
  .document('tenants/{tenantId}/operations/{docId}')
  .onCreate(async (snap, context) => {
    const complaint = snap.data();
    if (complaint.type !== 'complaint') return;
    if (complaint.assignedTo) {
      const personDoc = await db.collection('tenants').doc(context.params.tenantId)
        .collection('people').doc(complaint.assignedTo).get();
      if (personDoc.exists) {
        const fcmToken = personDoc.data()?.fcmToken;
        if (fcmToken) {
          await admin.messaging().send({
            token: fcmToken,
            notification: {
              title: 'New Complaint Assigned',
              body: `${complaint.title} - ${complaint.category}`,
            },
            data: { complaintId: context.params.docId },
          });
        }
      }
    }
  });
