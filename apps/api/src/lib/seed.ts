import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', '..', 'opsora.db');

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

const db = drizzle(sqlite, { schema });

async function seed() {
  console.log('🌱 Seeding database...');

  // ── Tenant (Organization) ───────────────────────────────────────────────
  const tenantId = uuidv4();
  db.insert(schema.tenants).values({
    id: tenantId,
    name: 'Sunshine PG Hostels',
    slug: 'sunshine-pg',
    email: 'admin@sunshinepg.com',
    phone: '+919876543210',
    address: '123 MG Road, Koramangala',
    city: 'Bangalore',
    state: 'Karnataka',
    pincode: '560034',
    planType: 'pro',
    maxProperties: 5,
    maxBeds: 200,
  }).run();
  console.log('  ✅ Created tenant: Sunshine PG Hostels');

  // ── Users ────────────────────────────────────────────────────────────────
  const ownerId = uuidv4();
  const staffId = uuidv4();
  const passwordHash = await bcrypt.hash('password123', 10);

  const residentId = uuidv4();
  db.insert(schema.users).values([
    {
      id: ownerId,
      tenantId,
      email: 'admin@sunshinepg.com',
      phone: '+919876543210',
      passwordHash,
      fullName: 'Rajesh Kumar',
      role: 'owner',
    },
    {
      id: staffId,
      tenantId,
      email: 'staff@sunshinepg.com',
      phone: '+919876543211',
      passwordHash,
      fullName: 'Priya Sharma',
      role: 'staff',
    },
    {
      id: residentId,
      tenantId,
      email: 'resident@sunshinepg.com',
      phone: '+919800000001',
      passwordHash,
      fullName: 'Amit Patel',
      role: 'resident',
    },
  ]).run();
  console.log('  ✅ Created users: Rajesh (owner), Priya (staff), Amit (resident)');

  // ── Property ─────────────────────────────────────────────────────────────
  const propertyId = uuidv4();
  db.insert(schema.properties).values({
    id: propertyId,
    tenantId,
    name: 'Sunshine PG - Koramangala',
    address: '456 5th Block, Koramangala',
    city: 'Bangalore',
    state: 'Karnataka',
    pincode: '560095',
    propertyType: 'pg',
    totalFloors: 5,
    totalRooms: 50,
    totalBeds: 100,
    occupiedBeds: 62,
    vacantBeds: 38,
    amenities: JSON.stringify(['wifi', 'food', 'laundry', 'parking']),
  }).run();
  console.log('  ✅ Created property: Sunshine PG - Koramangala (5 floors × 10 rooms × 2 beds)');

  // ── Floors (5 floors) ───────────────────────────────────────────────────
  const floorIds: string[] = [];
  const floorOccupancy = [18, 16, 14, 8, 6]; // varying occupancy per floor
  for (let f = 0; f < 5; f++) {
    const floorId = uuidv4();
    floorIds.push(floorId);
    db.insert(schema.floors).values({
      id: floorId,
      tenantId,
      propertyId,
      floorNumber: f + 1,
      floorName: `Floor ${f + 1}`,
      totalRooms: 10,
      totalBeds: 20,
      occupiedBeds: floorOccupancy[f],
    }).run();
  }
  console.log('  ✅ Created 5 floors');

  // ── Rooms & Beds (50 rooms, 100 beds) ───────────────────────────────────
  const roomIds: string[] = [];
  const bedIds: string[] = [];

  for (let f = 0; f < 5; f++) {
    for (let r = 0; r < 10; r++) {
      const roomId = uuidv4();
      roomIds.push(roomId);

      // Room numbering: 101, 102, ..., 110, 201, ..., 510
      const roomNumber = `${f + 1}${String(r + 1).padStart(2, '0')}`;
      // Alternate: first 5 rooms male, next 5 female per floor
      const roomGender = r < 5 ? 'male' : 'female';
      const bedsPerRoom = 2;
      const occupiedBedsInRoom = f < 3 ? (r < 5 ? 2 : (r < 8 ? 2 : (r < 10 ? 1 : 0))) : (r < 3 ? 2 : (r < 6 ? 1 : 0));
      const actualOccupied = Math.min(occupiedBedsInRoom, bedsPerRoom);

      db.insert(schema.rooms).values({
        id: roomId,
        tenantId,
        propertyId,
        floorId: floorIds[f],
        roomNumber,
        roomType: 'shared',
        sharingType: 2,
        totalBeds: bedsPerRoom,
        occupiedBeds: actualOccupied,
        vacantBeds: bedsPerRoom - actualOccupied,
        rentPerBed: 7000 + f * 1000,
        depositAmount: 15000,
      }).run();

      for (let b = 1; b <= bedsPerRoom; b++) {
        const bedId = uuidv4();
        bedIds.push(bedId);

        db.insert(schema.beds).values({
          id: bedId,
          tenantId,
          propertyId,
          floorId: floorIds[f],
          roomId,
          bedNumber: `B${b}`,
          bedType: 'standard',
          status: b <= actualOccupied ? 'occupied' : 'vacant',
          rentAmount: 7000 + f * 1000,
        }).run();
      }
    }
  }
  console.log('  ✅ Created 50 rooms with 100 beds');

  // ── Tenant Profiles (Residents) ──────────────────────────────────────────
  const residents = [
    { name: 'Amit Patel', phone: '+919800000001', gender: 'male', occ: 'Software Engineer' },
    { name: 'Vikram Singh', phone: '+919800000003', gender: 'male', occ: 'Designer' },
    { name: 'Arjun Mehta', phone: '+919800000005', gender: 'male', occ: 'DevOps Engineer' },
    { name: 'Rohit Gupta', phone: '+919800000007', gender: 'male', occ: 'Backend Developer' },
    { name: 'Suresh Kumar', phone: '+919800000009', gender: 'male', occ: 'QA Engineer' },
    { name: 'Rahul Verma', phone: '+919800000011', gender: 'male', occ: 'Frontend Developer' },
    { name: 'Karthik Rao', phone: '+919800000013', gender: 'male', occ: 'Mobile Developer' },
    { name: 'Sanjay Mishra', phone: '+919800000015', gender: 'male', occ: 'Cloud Architect' },
    { name: 'Aditya Bose', phone: '+919800000017', gender: 'male', occ: 'ML Engineer' },
    { name: 'Manish Tiwari', phone: '+919800000019', gender: 'male', occ: 'System Admin' },
    { name: 'Nikhil Chandra', phone: '+919800000021', gender: 'male', occ: 'SRE Engineer' },
    { name: 'Vishal Pandey', phone: '+919800000023', gender: 'male', occ: 'Full Stack Dev' },
    { name: 'Gaurav Saxena', phone: '+919800000025', gender: 'male', occ: 'Data Engineer' },
    { name: 'Arun Prasad', phone: '+919800000027', gender: 'male', occ: 'Platform Engineer' },
    { name: 'Sneha Reddy', phone: '+919800000002', gender: 'female', occ: 'Data Analyst' },
    { name: 'Priyanka Nair', phone: '+919800000004', gender: 'female', occ: 'Marketing Manager' },
    { name: 'Kavya Iyer', phone: '+919800000006', gender: 'female', occ: 'Product Manager' },
    { name: 'Neha Joshi', phone: '+919800000008', gender: 'female', occ: 'UI/UX Designer' },
    { name: 'Deepa Menon', phone: '+919800000010', gender: 'female', occ: 'HR Executive' },
    { name: 'Ananya Das', phone: '+919800000012', gender: 'female', occ: 'Content Writer' },
    { name: 'Meera Pillai', phone: '+919800000014', gender: 'female', occ: 'Finance Analyst' },
    { name: 'Pooja Sharma', phone: '+919800000016', gender: 'female', occ: 'Project Lead' },
    { name: 'Ritu Agarwal', phone: '+919800000018', gender: 'female', occ: 'Business Analyst' },
    { name: 'Shruti Kulkarni', phone: '+919800000020', gender: 'female', occ: 'Tech Lead' },
    { name: 'Swati Bhatt', phone: '+919800000022', gender: 'female', occ: 'Scrum Master' },
    { name: 'Aishwarya Raj', phone: '+919800000024', gender: 'female', occ: 'Security Analyst' },
    { name: 'Tanvi Kulkarni', phone: '+919800000026', gender: 'female', occ: 'UX Researcher' },
    { name: 'Divya Chakraborty', phone: '+919800000028', gender: 'female', occ: 'Growth Manager' },
  ];

  const tenantProfileIds: string[] = [];
  // Assign male residents to male rooms (indices 0-4 per floor) and female to female rooms (5-9 per floor)
  const maleRooms: string[] = [];
  const femaleRooms: string[] = [];
  for (let f = 0; f < 5; f++) {
    for (let r = 0; r < 10; r++) {
      const idx = f * 10 + r;
      if (r < 5) maleRooms.push(roomIds[idx]);
      else femaleRooms.push(roomIds[idx]);
    }
  }
  for (let i = 0; i < residents.length; i++) {
    const r = residents[i];
    const profileId = uuidv4();
    tenantProfileIds.push(profileId);
    const isMale = r.gender === 'male';
    const assignedRoom = isMale ? maleRooms[i % maleRooms.length] : femaleRooms[i % femaleRooms.length];
    const assignedBed = bedIds[i];
    db.insert(schema.tenantProfiles).values({
      id: profileId,
      tenantId,
      propertyId,
      roomId: assignedRoom,
      bedId: assignedBed,
      fullName: r.name,
      phone: r.phone,
      gender: r.gender,
      occupation: r.occ,
      moveInDate: '2026-01-15',
      rentAmount: 7000 + (i % 5) * 1000,
      depositPaid: 15000,
      depositBalance: 0,
      status: 'active',
      foodOptIn: true,
      breakfastOptIn: true,
      lunchOptIn: i % 3 !== 0,
      dinnerOptIn: true,
    }).run();
  }
  console.log(`  ✅ Created ${residents.length} tenant profiles`);

  // ── Link resident user to tenant profile ────────────────────────────────
  db.update(schema.users)
    .set({ tenantProfileId: tenantProfileIds[0] })
    .where(eq(schema.users.id, residentId))
    .run();
  console.log('  ✅ Linked resident user to tenant profile (Amit Patel)');

  // ── Rent Payments ────────────────────────────────────────────────────────
  const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'];
  for (const month of months) {
    for (let i = 0; i < residents.length; i++) {
      const isPaid = Math.random() > 0.2;
      const paidAmount = isPaid ? 8000 : (Math.random() > 0.5 ? 4000 : 0);
      db.insert(schema.rentPayments).values({
        id: uuidv4(),
        tenantId,
        propertyId,
        roomId: roomIds[i % roomIds.length],
        bedId: bedIds[i],
        tenantProfileId: tenantProfileIds[i],
        monthYear: month,
        dueDate: `${month}-05`,
        paidDate: isPaid ? `${month}-03` : null,
        rentAmount: 8000,
        totalAmount: 8000,
        paidAmount,
        balanceAmount: 8000 - paidAmount,
        paymentStatus: isPaid ? 'paid' : paidAmount > 0 ? 'partial' : 'pending',
        paymentMethod: isPaid ? (Math.random() > 0.5 ? 'upi' : 'bank_transfer') : null,
      }).run();
    }
  }
  console.log('  ✅ Created rent payments for 6 months');

  // ── Complaints ───────────────────────────────────────────────────────────
  const complaintData = [
    { cat: 'plumbing', pri: 'high', title: 'Leaking tap in Room 101', desc: 'The bathroom tap has been leaking for 2 days continuously.' },
    { cat: 'electrical', pri: 'medium', title: 'AC not working', desc: 'The AC in Room 205 is not cooling properly since yesterday.' },
    { cat: 'furniture', pri: 'low', title: 'Broken chair', desc: 'One chair in the common area has a broken leg.' },
    { cat: 'cleaning', pri: 'medium', title: 'Bathroom not cleaned', desc: 'Floor 3 bathrooms have not been cleaned today.' },
    { cat: 'internet', pri: 'high', title: 'WiFi speed very slow', desc: 'WiFi speed dropped to less than 1 Mbps on Floor 5.' },
    { cat: 'food', pri: 'medium', title: 'Food quality issue', desc: "Today's lunch was undercooked rice and stale curry." },
    { cat: 'security', pri: 'urgent', title: 'Unauthorized entry', desc: 'Someone entered the floor without security check at 2 AM.' },
    { cat: 'other', pri: 'low', title: 'Water heater maintenance', desc: 'Water heater on Floor 1 needs servicing.' },
  ];

  for (const c of complaintData) {
    db.insert(schema.complaints).values({
      id: uuidv4(),
      tenantId,
      propertyId,
      ticketNumber: `TKT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      category: c.cat,
      priority: c.pri,
      title: c.title,
      description: c.desc,
      status: Math.random() > 0.3 ? 'open' : 'in_progress',
      createdBy: staffId,
    }).run();
  }
  console.log('  ✅ Created 8 complaints');

  // ── Water Tanks ──────────────────────────────────────────────────────────
  const tankId = uuidv4();
  db.insert(schema.waterTanks).values({
    id: tankId,
    tenantId,
    propertyId,
    name: 'Main Overhead Tank',
    tankType: 'overhead',
    capacityLiters: 5000,
    sensorId: 'ESP32-WATER-001',
    location: 'Roof',
    lowLevelAlert: 20,
    criticalLevelAlert: 10,
  }).run();

  // Generate 30 days of water readings (hourly)
  for (let d = 30; d >= 0; d--) {
    for (let h = 0; h < 24; h++) {
      const time = new Date(Date.now() - d * 86400000 - h * 3600000).toISOString();
      const base = 60 + Math.sin(h / 4) * 15 + Math.sin(d / 5) * 10;
      const level = Math.max(5, Math.min(95, base + (Math.random() * 6 - 3)));
      db.insert(schema.waterReadings).values({
        id: uuidv4(),
        time,
        tenantId,
        propertyId,
        tankId,
        levelPercentage: level,
        levelLiters: (level / 100) * 5000,
        temperature: 28 + Math.random() * 4,
        consumptionLiters: 10 + Math.random() * 40,
        flowRate: Math.random() * 2,
      }).run();
    }
  }
  console.log('  ✅ Created water tank with 720+ readings (30 days)');

  // ── Electricity Meter ────────────────────────────────────────────────────
  const meterId = uuidv4();
  db.insert(schema.electricityMeters).values({
    id: meterId,
    tenantId,
    propertyId,
    meterNumber: 'MTR-KA-001',
    meterType: 'main',
    sensorId: 'ESP32-ELEC-001',
    maxCapacityKw: 50,
    costPerUnit: 8.5,
    fixedCharge: 200,
    highUsageAlert: 40,
  }).run();

  // Generate 30 days of electricity readings (hourly)
  for (let d = 30; d >= 0; d--) {
    for (let h = 0; h < 24; h++) {
      const time = new Date(Date.now() - d * 86400000 - h * 3600000).toISOString();
      // Peak hours: 9-12 and 18-23 have higher usage
      const peakFactor = (h >= 9 && h <= 12) || (h >= 18 && h <= 23) ? 1.5 : 1;
      const base = (12 + Math.sin(h / 6) * 8) * peakFactor;
      const power = Math.max(3, base + (Math.random() * 4 - 2));
      const dailyKwh = power * 1;
      db.insert(schema.electricityReadings).values({
        id: uuidv4(),
        time,
        tenantId,
        propertyId,
        meterId,
        powerKw: power,
        voltage: 220 + Math.random() * 10 - 5,
        currentAmp: power / 220,
        frequency: 50 + Math.random() * 0.5,
        powerFactor: 0.85 + Math.random() * 0.1,
        totalKwh: 1000 + (d * 24 + (23 - h)) * dailyKwh,
        dailyKwh,
        estimatedCost: dailyKwh * 8.5 + 200,
      }).run();
    }
  }
  console.log('  ✅ Created electricity meter with 720+ readings (30 days)');

  // ── Staff ────────────────────────────────────────────────────────────────
  const staffMembers = [
    { name: 'Priya Sharma', phone: '+919876543211', role: 'maintenance', salary: 16000, userId: staffId },
    { name: 'Ramesh Yadav', phone: '+919800001001', role: 'housekeeper', salary: 15000, userId: null },
    { name: 'Sunita Devi', phone: '+919800001002', role: 'cook', salary: 18000, userId: null },
    { name: 'Mahesh Patel', phone: '+919800001003', role: 'security', salary: 14000, userId: null },
    { name: 'Ganesh Iyer', phone: '+919800001004', role: 'maintenance', salary: 16000, userId: null },
  ];

  for (const s of staffMembers) {
    db.insert(schema.staff).values({
      id: uuidv4(),
      tenantId,
      propertyId,
      userId: s.userId,
      fullName: s.name,
      phone: s.phone,
      role: s.role,
      salary: s.salary,
      shiftStart: '08:00',
      shiftEnd: '20:00',
      weeklyOff: 'sunday',
      joinedDate: '2025-06-01',
      isActive: true,
    }).run();
  }
  console.log('  ✅ Created 5 staff members (Priya linked to staff user)');

  // ── Visitors ─────────────────────────────────────────────────────────────
  const visitorData = [
    { name: "Rahul's Parent", phone: '+919700000001', purpose: 'Family visit', status: 'approved' },
    { name: 'Courier Delivery', phone: '+919700000002', purpose: 'Package delivery', status: 'pending' },
    { name: 'Plumber', phone: '+919700000003', purpose: 'Maintenance work', status: 'approved' },
  ];

  for (const v of visitorData) {
    db.insert(schema.visitors).values({
      id: uuidv4(),
      tenantId,
      propertyId,
      name: v.name,
      phone: v.phone,
      purpose: v.purpose,
      expectedDate: new Date().toISOString().split('T')[0],
      status: v.status,
    }).run();
  }
  console.log('  ✅ Created 3 visitors');

  console.log('\n🎉 Seed complete!');
  console.log('\n📋 Login credentials:');
  console.log('   Email:    admin@sunshinepg.com');
  console.log('   Password: password123');
  console.log('\n   (or resident@sunshinepg.com / password123)');

  sqlite.close();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
