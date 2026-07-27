import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('opsora-service-account.json', 'utf8'));
const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app, 'default');
const auth = getAuth(app);

const users = [
  { email: 'admin@sunshinepg.com', password: 'password123', fullName: 'Admin User', role: 'owner', tenantId: 'tenant-sunshine' },
  { email: 'staff@sunshinepg.com', password: 'password123', fullName: 'Staff User', role: 'staff', tenantId: 'tenant-sunshine' },
  { email: 'resident@sunshinepg.com', password: 'password123', fullName: 'Resident User', role: 'resident', tenantId: 'tenant-sunshine' },
];

async function seed() {
  for (const user of users) {
    try {
      const userRecord = await auth.createUser({
        email: user.email,
        password: user.password,
        displayName: user.fullName,
      });
      // Set custom claims on the Firebase Auth token
      await auth.setCustomUserClaims(userRecord.uid, {
        tenantId: user.tenantId,
        role: user.role,
      });
      await db.collection('tenants').doc(user.tenantId).collection('people').doc(userRecord.uid).set({
        id: userRecord.uid,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isActive: true,
        createdAt: new Date().toISOString(),
      });
      console.log(`Created: ${user.email} (${userRecord.uid}) with claims: tenantId=${user.tenantId}, role=${user.role}`);
    } catch (err: any) {
      console.log(`Skip ${user.email}: ${err.message}`);
    }
  }
}

seed().then(() => process.exit(0));
