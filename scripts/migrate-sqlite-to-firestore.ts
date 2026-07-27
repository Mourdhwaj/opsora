import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('opsora-service-account.json', 'utf8'));
const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);
const sqlite = new Database('apps/api/opsora.db', { readonly: true });

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function migrateTenants() {
  const rows = sqlite.prepare('SELECT * FROM tenants').all() as any[];
  console.log(`Migrating ${rows.length} tenants...`);
  for (const row of rows) {
    await db.collection('tenants').doc(row.id).set({
      id: row.id,
      name: row.name,
      slug: row.slug,
      email: row.email,
      phone: row.phone,
      address: row.address || null,
      city: row.city || null,
      state: row.state || null,
      pincode: row.pincode || null,
      gstNumber: row.gst_number || null,
      planType: row.plan_type || 'free',
      maxProperties: row.max_properties || 1,
      maxBeds: row.max_beds || 50,
      isActive: row.is_active === 1,
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    });
    await sleep(100);
  }
}

async function migrateProperties(tenantId: string) {
  const properties = sqlite.prepare('SELECT * FROM properties WHERE tenant_id = ?').all(tenantId) as any[];
  for (const prop of properties) {
    const floors = sqlite.prepare('SELECT * FROM floors WHERE property_id = ?').all(prop.id) as any[];
    const rooms = sqlite.prepare('SELECT * FROM rooms WHERE property_id = ?').all(prop.id) as any[];
    const roomSummaries = [];
    for (const room of rooms) {
      const beds = sqlite.prepare('SELECT * FROM beds WHERE room_id = ?').all(room.id) as any[];
      const residents = sqlite.prepare(`SELECT tp.full_name FROM tenant_profiles tp WHERE tp.room_id = ? AND tp.status = 'active'`).all(room.id) as any[];
      roomSummaries.push({
        id: room.id,
        roomNumber: room.room_number,
        roomType: room.room_type,
        sharingType: room.sharing_type,
        rentPerBed: room.rent_per_bed,
        status: room.status,
        floorNumber: floors.find((f: any) => f.id === room.floor_id)?.floor_number || 0,
        beds: beds.map((bed: any, i: number) => ({
          id: bed.id,
          bedNumber: bed.bed_number,
          status: bed.status,
          rentAmount: bed.rent_amount,
          residentName: residents[i]?.full_name || null,
        })),
      });
    }
    const floorSummaries = floors.map((f: any) => ({
      id: f.id,
      floorNumber: f.floor_number,
      floorName: f.floor_name,
      roomCount: rooms.filter((r: any) => r.floor_id === f.id).length,
      occupiedCount: roomSummaries
        .filter(r => r.floorNumber === f.floor_number)
        .reduce((sum, r) => sum + r.beds.filter((b: any) => b.status === 'occupied').length, 0),
    }));
    const totalBeds = roomSummaries.reduce((sum, r) => sum + r.beds.length, 0);
    const occupiedBeds = roomSummaries.reduce((sum, r) => sum + r.beds.filter((b: any) => b.status === 'occupied').length, 0);
    await db.collection('tenants').doc(tenantId).collection('properties').doc(prop.id).set({
      id: prop.id,
      name: prop.name,
      address: prop.address,
      city: prop.city,
      state: prop.state,
      pincode: prop.pincode,
      latitude: prop.latitude || null,
      longitude: prop.longitude || null,
      propertyType: prop.property_type || 'pg',
      totalFloors: prop.total_floors || 1,
      wifiSsid: prop.wifi_ssid || null,
      wifiPassword: prop.wifi_password || null,
      amenities: prop.amenities ? JSON.parse(prop.amenities) : [],
      status: prop.status || 'active',
      floorSummaries,
      roomSummaries,
      stats: { totalBeds, occupiedBeds, occupancyRate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 1000) / 10 : 0, monthlyRevenue: 0 },
      createdAt: prop.created_at || new Date().toISOString(),
      updatedAt: prop.updated_at || new Date().toISOString(),
    });
    console.log(`  Property: ${prop.name}`);
  }
}

async function migratePeople(tenantId: string) {
  const users = sqlite.prepare('SELECT * FROM users WHERE tenant_id = ?').all(tenantId) as any[];
  for (const user of users) {
    await db.collection('tenants').doc(tenantId).collection('people').doc(user.id).set({
      id: user.id,
      role: user.role || 'staff',
      email: user.email,
      phone: user.phone || null,
      fullName: user.full_name,
      passwordHash: user.password_hash,
      avatarUrl: user.avatar_url || null,
      isActive: user.is_active === 1,
      createdAt: user.created_at || new Date().toISOString(),
      updatedAt: user.updated_at || new Date().toISOString(),
    });
  }
  console.log(`  Users: ${users.length}`);

  const residents = sqlite.prepare('SELECT * FROM tenant_profiles WHERE tenant_id = ?').all(tenantId) as any[];
  for (const res of residents) {
    await db.collection('tenants').doc(tenantId).collection('people').doc(res.id).set({
      id: res.id,
      role: 'resident',
      email: res.email || null,
      phone: res.phone,
      fullName: res.full_name,
      tenantProfileId: res.id,
      propertyId: res.property_id,
      roomId: res.room_id,
      bedId: res.bed_id,
      dateOfBirth: res.date_of_birth || null,
      gender: res.gender || null,
      bloodGroup: res.blood_group || null,
      occupation: res.occupation || null,
      companyName: res.company_name || null,
      emergencyName: res.emergency_name || null,
      emergencyPhone: res.emergency_phone || null,
      emergencyRelation: res.emergency_relation || null,
      moveInDate: res.move_in_date,
      moveOutDate: res.move_out_date || null,
      rentAmount: res.rent_amount,
      depositPaid: res.deposit_paid || 0,
      status: res.status || 'active',
      documents: { aadhaarFront: res.aadhaar_front_url || null, aadhaarBack: res.aadhaar_back_url || null, panCard: res.pan_card_url || null, photo: res.photo_url || null },
      mealPreferences: res.meal_preferences ? JSON.parse(res.meal_preferences) : { breakfast: true, lunch: false, dinner: true },
      dietaryPreference: res.dietary_preference || null,
      createdAt: res.created_at || new Date().toISOString(),
      updatedAt: res.updated_at || new Date().toISOString(),
    });
  }
  console.log(`  Residents: ${residents.length}`);

  const staffRows = sqlite.prepare('SELECT * FROM staff WHERE tenant_id = ?').all(tenantId) as any[];
  for (const staff of staffRows) {
    await db.collection('tenants').doc(tenantId).collection('people').doc(staff.id).set({
      id: staff.id,
      role: 'staff',
      email: staff.email || null,
      phone: staff.phone,
      fullName: staff.full_name,
      isActive: staff.is_active === 1,
      staffDetails: { propertyId: staff.property_id, staffRole: staff.role, salary: staff.salary || null, shiftStart: staff.shift_start || null, shiftEnd: staff.shift_end || null, weeklyOff: staff.weekly_off || 'sunday', joinedDate: staff.joined_date, leftDate: staff.left_date || null },
      createdAt: staff.created_at || new Date().toISOString(),
      updatedAt: staff.updated_at || new Date().toISOString(),
    });
  }
  console.log(`  Staff: ${staffRows.length}`);
}

async function migrateFinancials(tenantId: string) {
  const payments = sqlite.prepare('SELECT * FROM rent_payments WHERE tenant_id = ?').all(tenantId) as any[];
  for (const pay of payments) {
    await db.collection('tenants').doc(tenantId).collection('financials').doc(pay.id).set({
      id: pay.id,
      type: 'payment',
      personId: pay.tenant_profile_id,
      propertyId: pay.property_id,
      monthYear: pay.month_year,
      dueDate: pay.due_date,
      paidDate: pay.paid_date || null,
      rentAmount: pay.rent_amount,
      electricityCharge: pay.electricity_charge || 0,
      waterCharge: pay.water_charge || 0,
      foodCharge: pay.food_charge || 0,
      maintenanceCharge: pay.maintenance_charge || 0,
      lateFee: pay.late_fee || 0,
      discount: pay.discount || 0,
      totalAmount: pay.total_amount,
      paidAmount: pay.paid_amount || 0,
      balanceAmount: pay.balance_amount,
      paymentMethod: pay.payment_method || null,
      transactionId: pay.transaction_id || null,
      paymentStatus: pay.payment_status || 'pending',
      receiptNumber: pay.receipt_number || null,
      notes: pay.notes || null,
      createdAt: pay.created_at || new Date().toISOString(),
      updatedAt: pay.updated_at || new Date().toISOString(),
    });
  }
  console.log(`  Payments: ${payments.length}`);
}

async function migrateOperations(tenantId: string) {
  const complaints = sqlite.prepare('SELECT * FROM complaints WHERE tenant_id = ?').all(tenantId) as any[];
  for (const comp of complaints) {
    const comments = sqlite.prepare('SELECT * FROM complaint_comments WHERE complaint_id = ?').all(comp.id) as any[];
    await db.collection('tenants').doc(tenantId).collection('operations').doc(comp.id).set({
      id: comp.id,
      type: 'complaint',
      ticketNumber: comp.ticket_number,
      personId: comp.tenant_profile_id || null,
      propertyId: comp.property_id,
      category: comp.category,
      priority: comp.priority || 'medium',
      title: comp.title,
      description: comp.description,
      status: comp.status || 'open',
      assignedTo: comp.assigned_to || null,
      assignedAt: comp.assigned_at || null,
      resolvedAt: comp.resolved_at || null,
      resolutionNotes: comp.resolution_notes || null,
      resolutionPhotos: comp.resolution_photos ? JSON.parse(comp.resolution_photos) : [],
      tenantRating: comp.tenant_rating || null,
      tenantFeedback: comp.tenant_feedback || null,
      comments: comments.map((c: any) => ({ id: c.id, userId: c.user_id || null, comment: c.comment, isInternal: c.is_internal === 1, createdAt: c.created_at || new Date().toISOString() })),
      createdBy: comp.created_by || null,
      createdAt: comp.created_at || new Date().toISOString(),
      updatedAt: comp.updated_at || new Date().toISOString(),
    });
  }
  console.log(`  Complaints: ${complaints.length}`);

  const tasks = sqlite.prepare('SELECT * FROM tasks WHERE tenant_id = ?').all(tenantId) as any[];
  for (const task of tasks) {
    await db.collection('tenants').doc(tenantId).collection('operations').doc(task.id).set({
      id: task.id,
      type: 'task',
      personId: task.assigned_to,
      propertyId: task.property_id,
      title: task.title,
      description: task.description || null,
      taskType: task.task_type,
      priority: task.priority || 'medium',
      status: task.status || 'pending',
      scheduledDate: task.scheduled_date || null,
      scheduledTime: task.scheduled_time || null,
      completedAt: task.completed_at || null,
      completionPhotos: task.completion_photos ? JSON.parse(task.completion_photos) : [],
      completionNotes: task.completion_notes || null,
      createdBy: task.created_by || null,
      createdAt: task.created_at || new Date().toISOString(),
      updatedAt: task.updated_at || new Date().toISOString(),
    });
  }
  console.log(`  Tasks: ${tasks.length}`);

  const visitors = sqlite.prepare('SELECT * FROM visitors WHERE tenant_id = ?').all(tenantId) as any[];
  for (const vis of visitors) {
    await db.collection('tenants').doc(tenantId).collection('operations').doc(vis.id).set({
      id: vis.id,
      type: 'visitor',
      propertyId: vis.property_id,
      name: vis.name,
      phone: vis.phone,
      email: vis.email || null,
      purpose: vis.purpose,
      whomToMeet: vis.whom_to_meet || null,
      expectedDate: vis.expected_date,
      expectedTime: vis.expected_time || null,
      status: vis.status || 'pending',
      entryTime: vis.entry_time || null,
      exitTime: vis.exit_time || null,
      createdAt: vis.created_at || new Date().toISOString(),
      updatedAt: vis.updated_at || new Date().toISOString(),
    });
  }
  console.log(`  Visitors: ${visitors.length}`);
}

async function main() {
  console.log('--- Migrating Tenants ---');
  await migrateTenants();

  const tenants = sqlite.prepare('SELECT id FROM tenants').all() as any[];
  for (const tenant of tenants) {
    console.log(`\n=== Tenant: ${tenant.id} ===`);
    await migrateProperties(tenant.id);
    await migratePeople(tenant.id);
    await migrateFinancials(tenant.id);
    await migrateOperations(tenant.id);
  }
  console.log('\nMigration complete!');
  sqlite.close();
  process.exit(0);
}

main().catch(console.error);
