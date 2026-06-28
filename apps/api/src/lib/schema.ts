import { sqliteTable, text, integer, real, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// =============================================================================
// TENANTS (Organizations/Property Owners)
// =============================================================================
export const tenants = sqliteTable('tenants', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  pincode: text('pincode'),
  gstNumber: text('gst_number'),
  planType: text('plan_type').default('free'),
  planExpiresAt: text('plan_expires_at'),
  maxProperties: integer('max_properties').default(1),
  maxBeds: integer('max_beds').default(50),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// =============================================================================
// USERS (Staff + Owners + Admins)
// =============================================================================
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  phone: text('phone'),
  passwordHash: text('password_hash').notNull(),
  fullName: text('full_name').notNull(),
  role: text('role').notNull().default('staff'),
  tenantProfileId: text('tenant_profile_id').references(() => tenantProfiles.id),
  avatarUrl: text('avatar_url'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  lastLoginAt: text('last_login_at'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
}, (t) => [
  uniqueIndex('idx_users_tenant_email').on(t.tenantId, t.email),
]);

// =============================================================================
// PROPERTIES (Buildings)
// =============================================================================
export const properties = sqliteTable('properties', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  address: text('address').notNull(),
  city: text('city').notNull(),
  state: text('state').notNull(),
  pincode: text('pincode'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  propertyType: text('property_type').notNull().default('pg'),
  totalFloors: integer('total_floors').notNull().default(1),
  totalRooms: integer('total_rooms').notNull().default(0),
  totalBeds: integer('total_beds').notNull().default(0),
  occupiedBeds: integer('occupied_beds').notNull().default(0),
  vacantBeds: integer('vacant_beds').notNull().default(0),
  wifiSsid: text('wifi_ssid'),
  wifiPassword: text('wifi_password'),
  amenities: text('amenities').default('[]'),
  status: text('status').default('active'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// =============================================================================
// FLOORS
// =============================================================================
export const floors = sqliteTable('floors', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  propertyId: text('property_id').notNull().references(() => properties.id, { onDelete: 'cascade' }),
  floorNumber: integer('floor_number').notNull(),
  floorName: text('floor_name'),
  totalRooms: integer('total_rooms').notNull().default(0),
  totalBeds: integer('total_beds').notNull().default(0),
  occupiedBeds: integer('occupied_beds').notNull().default(0),
  layoutData: text('layout_data'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// =============================================================================
// ROOMS
// =============================================================================
export const rooms = sqliteTable('rooms', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  propertyId: text('property_id').notNull().references(() => properties.id, { onDelete: 'cascade' }),
  floorId: text('floor_id').notNull().references(() => floors.id, { onDelete: 'cascade' }),
  roomNumber: text('room_number').notNull(),
  roomType: text('room_type').notNull().default('shared'),
  sharingType: integer('sharing_type').default(2),
  totalBeds: integer('total_beds').notNull().default(2),
  occupiedBeds: integer('occupied_beds').notNull().default(0),
  vacantBeds: integer('vacant_beds').notNull().default(2),
  reservedBeds: integer('reserved_beds').notNull().default(0),
  blockedBeds: integer('blocked_beds').notNull().default(0),
  rentPerBed: real('rent_per_bed').notNull().default(5000),
  depositAmount: real('deposit_amount').notNull().default(10000),
  amenities: text('amenities').default('[]'),
  status: text('status').default('available'),
  floorPosition: text('floor_position'),
  gender: text('gender'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// =============================================================================
// BEDS
// =============================================================================
export const beds = sqliteTable('beds', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  propertyId: text('property_id').notNull().references(() => properties.id, { onDelete: 'cascade' }),
  floorId: text('floor_id').notNull().references(() => floors.id, { onDelete: 'cascade' }),
  roomId: text('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  bedNumber: text('bed_number').notNull(),
  bedType: text('bed_type').default('standard'),
  status: text('status').default('vacant'),
  currentTenantId: text('current_tenant_id'),
  rentAmount: real('rent_amount').notNull().default(5000),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// =============================================================================
// TENANT_PROFILES (Residents)
// =============================================================================
export const tenantProfiles = sqliteTable('tenant_profiles', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  propertyId: text('property_id').notNull().references(() => properties.id, { onDelete: 'cascade' }),
  roomId: text('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  bedId: text('bed_id').notNull().references(() => beds.id, { onDelete: 'cascade' }),

  fullName: text('full_name').notNull(),
  phone: text('phone').notNull(),
  email: text('email'),
  dateOfBirth: text('date_of_birth'),
  gender: text('gender'),
  bloodGroup: text('blood_group'),

  aadhaarNumber: text('aadhaar_number'),
  panNumber: text('pan_number'),
  passportNumber: text('passport_number'),

  occupation: text('occupation'),
  companyName: text('company_name'),
  collegeName: text('college_name'),
  workAddress: text('work_address'),

  emergencyName: text('emergency_name'),
  emergencyPhone: text('emergency_phone'),
  emergencyRelation: text('emergency_relation'),

  moveInDate: text('move_in_date').notNull(),
  moveOutDate: text('move_out_date'),
  noticeDate: text('notice_date'),
  noticePeriodDays: integer('notice_period_days').default(30),

  rentAmount: real('rent_amount').notNull(),
  depositPaid: real('deposit_paid').notNull().default(0),
  depositBalance: real('deposit_balance').notNull().default(0),

  status: text('status').default('active'),

  aadhaarFrontUrl: text('aadhaar_front_url'),
  aadhaarBackUrl: text('aadhaar_back_url'),
  panCardUrl: text('pan_card_url'),
  passportUrl: text('passport_url'),
  policeVerificationUrl: text('police_verification_url'),
  photoUrl: text('photo_url'),

  foodOptIn: integer('food_opt_in', { mode: 'boolean' }).default(true),
  breakfastOptIn: integer('breakfast_opt_in', { mode: 'boolean' }).default(true),
  lunchOptIn: integer('lunch_opt_in', { mode: 'boolean' }).default(false),
  dinnerOptIn: integer('dinner_opt_in', { mode: 'boolean' }).default(true),
  dietaryPreference: text('dietary_preference'),

  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// =============================================================================
// RENT_PAYMENTS
// =============================================================================
export const rentPayments = sqliteTable('rent_payments', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  propertyId: text('property_id').notNull().references(() => properties.id, { onDelete: 'cascade' }),
  roomId: text('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  bedId: text('bed_id').notNull().references(() => beds.id, { onDelete: 'cascade' }),
  tenantProfileId: text('tenant_profile_id').notNull().references(() => tenantProfiles.id, { onDelete: 'cascade' }),

  monthYear: text('month_year').notNull(),
  dueDate: text('due_date').notNull(),
  paidDate: text('paid_date'),

  rentAmount: real('rent_amount').notNull(),
  electricityCharge: real('electricity_charge').default(0),
  waterCharge: real('water_charge').default(0),
  foodCharge: real('food_charge').default(0),
  maintenanceCharge: real('maintenance_charge').default(0),
  lateFee: real('late_fee').default(0),
  discount: real('discount').default(0),
  totalAmount: real('total_amount').notNull(),
  paidAmount: real('paid_amount').default(0),
  balanceAmount: real('balance_amount').notNull(),

  paymentMethod: text('payment_method'),
  transactionId: text('transaction_id'),
  paymentStatus: text('payment_status').default('pending'),

  receiptNumber: text('receipt_number').unique(),
  receiptUrl: text('receipt_url'),

  notes: text('notes'),
  createdBy: text('created_by'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// =============================================================================
// COMPLAINTS / TICKETS
// =============================================================================
export const complaints = sqliteTable('complaints', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  propertyId: text('property_id').notNull().references(() => properties.id, { onDelete: 'cascade' }),
  roomId: text('room_id'),
  bedId: text('bed_id'),
  tenantProfileId: text('tenant_profile_id'),

  ticketNumber: text('ticket_number').unique().notNull(),
  category: text('category').notNull(),
  priority: text('priority').default('medium'),
  title: text('title').notNull(),
  description: text('description').notNull(),

  status: text('status').default('open'),
  assignedTo: text('assigned_to'),
  assignedAt: text('assigned_at'),
  resolvedAt: text('resolved_at'),
  closedAt: text('closed_at'),

  resolutionNotes: text('resolution_notes'),
  resolutionPhotos: text('resolution_photos').default('[]'),

  tenantRating: integer('tenant_rating'),
  tenantFeedback: text('tenant_feedback'),

  createdBy: text('created_by'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// =============================================================================
// COMPLAINT_COMMENTS (Thread)
// =============================================================================
export const complaintComments = sqliteTable('complaint_comments', {
  id: text('id').primaryKey(),
  complaintId: text('complaint_id').notNull().references(() => complaints.id, { onDelete: 'cascade' }),
  userId: text('user_id'),
  tenantProfileId: text('tenant_profile_id'),
  comment: text('comment').notNull(),
  isInternal: integer('is_internal', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// =============================================================================
// VISITORS
// =============================================================================
export const visitors = sqliteTable('visitors', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  propertyId: text('property_id').notNull().references(() => properties.id, { onDelete: 'cascade' }),

  name: text('name').notNull(),
  phone: text('phone').notNull(),
  email: text('email'),
  idProofType: text('id_proof_type'),
  idProofNumber: text('id_proof_number'),
  idProofUrl: text('id_proof_url'),
  photoUrl: text('photo_url'),

  purpose: text('purpose').notNull(),
  whomToMeet: text('whom_to_meet'),
  expectedDate: text('expected_date').notNull(),
  expectedTime: text('expected_time'),

  tenantApproved: integer('tenant_approved', { mode: 'boolean' }),
  tenantApprovedAt: text('tenant_approved_at'),
  ownerApproved: integer('owner_approved', { mode: 'boolean' }),
  ownerApprovedAt: text('owner_approved_at'),
  approvedBy: text('approved_by'),

  entryTime: text('entry_time'),
  exitTime: text('exit_time'),
  entryLoggedBy: text('entry_logged_by'),
  exitLoggedBy: text('exit_logged_by'),

  status: text('status').default('pending'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// =============================================================================
// STAFF
// =============================================================================
export const staff = sqliteTable('staff', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  propertyId: text('property_id').notNull().references(() => properties.id, { onDelete: 'cascade' }),
  userId: text('user_id'),

  fullName: text('full_name').notNull(),
  phone: text('phone').notNull(),
  email: text('email'),
  role: text('role').notNull(),
  salary: real('salary'),
  shiftStart: text('shift_start'),
  shiftEnd: text('shift_end'),
  weeklyOff: text('weekly_off').default('sunday'),

  aadhaarUrl: text('aadhaar_url'),
  photoUrl: text('photo_url'),

  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  joinedDate: text('joined_date').notNull(),
  leftDate: text('left_date'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// =============================================================================
// STAFF_ATTENDANCE
// =============================================================================
export const staffAttendance = sqliteTable('staff_attendance', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  staffId: text('staff_id').notNull().references(() => staff.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  checkIn: text('check_in'),
  checkOut: text('check_out'),
  checkInLocation: text('check_in_location'),
  checkOutLocation: text('check_out_location'),
  status: text('status').default('present'),
  notes: text('notes'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// =============================================================================
// TASKS
// =============================================================================
export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  propertyId: text('property_id').notNull().references(() => properties.id, { onDelete: 'cascade' }),
  assignedTo: text('assigned_to').notNull().references(() => staff.id, { onDelete: 'cascade' }),

  title: text('title').notNull(),
  description: text('description'),
  taskType: text('task_type').notNull(),
  priority: text('priority').default('medium'),
  status: text('status').default('pending'),

  scheduledDate: text('scheduled_date'),
  scheduledTime: text('scheduled_time'),
  completedAt: text('completed_at'),
  completionPhotos: text('completion_photos').default('[]'),
  completionNotes: text('completion_notes'),

  createdBy: text('created_by'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// =============================================================================
// FOOD POLLS
// =============================================================================
export const foodPolls = sqliteTable('food_polls', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  propertyId: text('property_id').references(() => properties.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  mealType: text('meal_type').notNull(),
  date: text('date').notNull(),
  deadline: text('deadline').notNull(),
  status: text('status').default('draft'),
  createdBy: text('created_by'),
  finalizedOptionId: text('finalized_option_id'),
  finalizeReason: text('finalize_reason'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// =============================================================================
// FOOD POLL OPTIONS
// =============================================================================
export const foodPollOptions = sqliteTable('food_poll_options', {
  id: text('id').primaryKey(),
  pollId: text('poll_id').notNull().references(() => foodPolls.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  voteCount: integer('vote_count').default(0),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// =============================================================================
// FOOD VOTES
// =============================================================================
export const foodVotes = sqliteTable('food_votes', {
  id: text('id').primaryKey(),
  pollId: text('poll_id').notNull().references(() => foodPolls.id, { onDelete: 'cascade' }),
  tenantProfileId: text('tenant_profile_id').notNull().references(() => tenantProfiles.id, { onDelete: 'cascade' }),
  selectedOptionId: text('selected_option_id').notNull().references(() => foodPollOptions.id, { onDelete: 'cascade' }),
  votedAt: text('voted_at').default(sql`(datetime('now'))`),
}, (t) => [
  uniqueIndex('idx_food_votes_poll_resident').on(t.pollId, t.tenantProfileId),
]);

// =============================================================================
// FOOD MENU (Finalized)
// =============================================================================
export const foodMenu = sqliteTable('food_menu', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  propertyId: text('property_id').notNull().references(() => properties.id, { onDelete: 'cascade' }),

  date: text('date').notNull(),
  mealType: text('meal_type').notNull(),
  items: text('items').notNull(),
  isSpecial: integer('is_special', { mode: 'boolean' }).default(false),
  specialName: text('special_name'),
  pollId: text('poll_id').references(() => foodPolls.id),
  finalizedBy: text('finalized_by'),
  finalizedAt: text('finalized_at'),
  status: text('status').default('draft'),
  attendanceExpected: integer('attendance_expected').default(0),
  attendanceActual: integer('attendance_actual').default(0),

  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// =============================================================================
// FOOD_RATINGS
// =============================================================================
export const foodRatings = sqliteTable('food_ratings', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  foodMenuId: text('food_menu_id').notNull().references(() => foodMenu.id, { onDelete: 'cascade' }),
  tenantProfileId: text('tenant_profile_id').notNull().references(() => tenantProfiles.id, { onDelete: 'cascade' }),

  rating: integer('rating'),
  feedback: text('feedback'),
  tags: text('tags'),
  comment: text('comment'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// =============================================================================
// INGREDIENT FORMULAS
// =============================================================================
export const ingredientFormulas = sqliteTable('ingredient_formulas', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  mealType: text('meal_type').notNull(),
  itemName: text('item_name').notNull(),
  ingredientName: text('ingredient_name').notNull(),
  quantityPerPerson: real('quantity_per_person').notNull(),
  unit: text('unit').notNull().default('kg'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// =============================================================================
// MEAL_ATTENDANCE
// =============================================================================
export const mealAttendance = sqliteTable('meal_attendance', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  propertyId: text('property_id').notNull().references(() => properties.id, { onDelete: 'cascade' }),
  tenantProfileId: text('tenant_profile_id').notNull().references(() => tenantProfiles.id, { onDelete: 'cascade' }),

  date: text('date').notNull(),
  breakfast: text('breakfast').default('no'),
  lunch: text('lunch').default('no'),
  dinner: text('dinner').default('no'),

  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// =============================================================================
// WATER_TANKS
// =============================================================================
export const waterTanks = sqliteTable('water_tanks', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  propertyId: text('property_id').notNull().references(() => properties.id, { onDelete: 'cascade' }),

  name: text('name').notNull(),
  tankType: text('tank_type').default('overhead'),
  capacityLiters: real('capacity_liters').notNull(),
  sensorId: text('sensor_id').unique(),
  location: text('location'),

  lowLevelAlert: real('low_level_alert').default(20),
  criticalLevelAlert: real('critical_level_alert').default(10),
  overflowAlert: integer('overflow_alert', { mode: 'boolean' }).default(true),

  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// =============================================================================
// WATER_READINGS
// =============================================================================
export const waterReadings = sqliteTable('water_readings', {
  id: text('id').primaryKey(),
  time: text('time').notNull(),
  tenantId: text('tenant_id').notNull(),
  propertyId: text('property_id').notNull(),
  tankId: text('tank_id').notNull().references(() => waterTanks.id, { onDelete: 'cascade' }),

  levelPercentage: real('level_percentage').notNull(),
  levelLiters: real('level_liters').notNull(),
  temperature: real('temperature'),

  consumptionLiters: real('consumption_liters'),
  flowRate: real('flow_rate'),

  isAnomaly: integer('is_anomaly', { mode: 'boolean' }).default(false),
  anomalyReason: text('anomaly_reason'),

  rawData: text('raw_data'),
});

// =============================================================================
// ELECTRICITY_METERS
// =============================================================================
export const electricityMeters = sqliteTable('electricity_meters', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  propertyId: text('property_id').notNull().references(() => properties.id, { onDelete: 'cascade' }),

  meterNumber: text('meter_number').notNull(),
  meterType: text('meter_type').default('main'),
  floorId: text('floor_id'),
  roomId: text('room_id'),

  sensorId: text('sensor_id').unique(),
  maxCapacityKw: real('max_capacity_kw'),

  costPerUnit: real('cost_per_unit').default(7.5),
  fixedCharge: real('fixed_charge').default(0),

  highUsageAlert: real('high_usage_alert').default(50),

  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// =============================================================================
// ELECTRICITY_READINGS
// =============================================================================
export const electricityReadings = sqliteTable('electricity_readings', {
  id: text('id').primaryKey(),
  time: text('time').notNull(),
  tenantId: text('tenant_id').notNull(),
  propertyId: text('property_id').notNull(),
  meterId: text('meter_id').notNull().references(() => electricityMeters.id, { onDelete: 'cascade' }),

  powerKw: real('power_kw').notNull(),
  voltage: real('voltage'),
  currentAmp: real('current_amp'),
  frequency: real('frequency'),
  powerFactor: real('power_factor'),

  totalKwh: real('total_kwh').notNull(),
  dailyKwh: real('daily_kwh'),

  estimatedCost: real('estimated_cost'),

  isAnomaly: integer('is_anomaly', { mode: 'boolean' }).default(false),
  anomalyReason: text('anomaly_reason'),

  rawData: text('raw_data'),
});

// =============================================================================
// TANKER_ORDERS
// =============================================================================
export const tankerOrders = sqliteTable('tanker_orders', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  propertyId: text('property_id').notNull().references(() => properties.id, { onDelete: 'cascade' }),
  tankId: text('tank_id').notNull().references(() => waterTanks.id, { onDelete: 'cascade' }),

  orderDate: text('order_date').notNull(),
  supplierName: text('supplier_name'),
  supplierPhone: text('supplier_phone'),
  orderedLiters: real('ordered_liters').notNull(),
  deliveredLiters: real('delivered_liters'),
  actualAddedLiters: real('actual_added_liters'),
  costPerTanker: real('cost_per_tanker'),
  totalCost: real('total_cost'),

  status: text('status').default('ordered'),
  deliveryTime: text('delivery_time'),
  verifiedBy: text('verified_by'),
  notes: text('notes'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// =============================================================================
// ASSETS
// =============================================================================
export const assets = sqliteTable('assets', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  propertyId: text('property_id').notNull().references(() => properties.id, { onDelete: 'cascade' }),

  name: text('name').notNull(),
  assetType: text('asset_type').notNull(),
  brand: text('brand'),
  model: text('model'),
  serialNumber: text('serial_number'),

  location: text('location'),
  floorId: text('floor_id'),
  roomId: text('room_id'),

  purchaseDate: text('purchase_date'),
  purchaseCost: real('purchase_cost'),
  warrantyExpiry: text('warranty_expiry'),

  maintenanceFrequency: text('maintenance_frequency'),
  lastServiceDate: text('last_service_date'),
  nextServiceDate: text('next_service_date'),

  status: text('status').default('active'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// =============================================================================
// MAINTENANCE_LOGS
// =============================================================================
export const maintenanceLogs = sqliteTable('maintenance_logs', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  assetId: text('asset_id').notNull().references(() => assets.id, { onDelete: 'cascade' }),

  serviceType: text('service_type').notNull(),
  description: text('description').notNull(),
  performedBy: text('performed_by'),
  vendorName: text('vendor_name'),
  vendorPhone: text('vendor_phone'),
  cost: real('cost'),

  beforePhotos: text('before_photos').default('[]'),
  afterPhotos: text('after_photos').default('[]'),

  serviceDate: text('service_date').notNull(),
  nextDueDate: text('next_due_date'),

  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// =============================================================================
// NOTIFICATIONS
// =============================================================================
export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  userId: text('user_id'),
  tenantProfileId: text('tenant_profile_id'),

  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull(),
  priority: text('priority').default('normal'),

  actionUrl: text('action_url'),
  actionType: text('action_type'),

  pushSent: integer('push_sent', { mode: 'boolean' }).default(false),
  pushDelivered: integer('push_delivered', { mode: 'boolean' }).default(false),
  smsSent: integer('sms_sent', { mode: 'boolean' }).default(false),
  emailSent: integer('email_sent', { mode: 'boolean' }).default(false),
  whatsappSent: integer('whatsapp_sent', { mode: 'boolean' }).default(false),

  isRead: integer('is_read', { mode: 'boolean' }).default(false),
  readAt: text('read_at'),

  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// =============================================================================
// ACTIVITY_LOGS (Audit Trail)
// =============================================================================
export const activityLogs = sqliteTable('activity_logs', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),

  actorType: text('actor_type').notNull(),
  actorId: text('actor_id').notNull(),
  actorName: text('actor_name'),

  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id'),

  oldValues: text('old_values'),
  newValues: text('new_values'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),

  createdAt: text('created_at').default(sql`(datetime('now'))`),
}, (t) => [
  index('idx_activity_logs_tenant').on(t.tenantId),
  index('idx_activity_logs_entity').on(t.entityType, t.entityId),
  index('idx_activity_logs_created').on(t.createdAt),
]);

// =============================================================================
// DATABASE INDEXES (from original PostgreSQL schema spec)
// =============================================================================
export const idxRoomsProperty = index('idx_rooms_property').on(rooms.propertyId);
export const idxRoomsFloor = index('idx_rooms_floor').on(rooms.floorId);
export const idxBedsRoom = index('idx_beds_room').on(beds.roomId);
export const idxBedsStatus = index('idx_beds_status').on(beds.status);
export const idxTenantProfilesProperty = index('idx_tenant_profiles_property').on(tenantProfiles.propertyId);
export const idxTenantProfilesRoom = index('idx_tenant_profiles_room').on(tenantProfiles.roomId);
export const idxTenantProfilesBed = index('idx_tenant_profiles_bed').on(tenantProfiles.bedId);
export const idxTenantProfilesStatus = index('idx_tenant_profiles_status').on(tenantProfiles.status);
export const idxPaymentsProperty = index('idx_payments_property').on(rentPayments.propertyId);
export const idxPaymentsStatus = index('idx_payments_status').on(rentPayments.paymentStatus);
export const idxPaymentsDueDate = index('idx_payments_due_date').on(rentPayments.dueDate);
export const idxPaymentsMonth = index('idx_payments_month').on(rentPayments.monthYear);
export const idxComplaintsProperty = index('idx_complaints_property').on(complaints.propertyId);
export const idxComplaintsStatus = index('idx_complaints_status').on(complaints.status);
export const idxComplaintsAssigned = index('idx_complaints_assigned').on(complaints.assignedTo);
export const idxComplaintsCreated = index('idx_complaints_created').on(complaints.createdAt);
export const idxVisitorsStatus = index('idx_visitors_status').on(visitors.status);
export const idxStaffAttendanceDate = index('idx_staff_attendance_date').on(staffAttendance.date);
export const idxFoodMenuDate = index('idx_food_menu_date').on(foodMenu.date);
export const idxMealAttendanceDate = index('idx_meal_attendance_date').on(mealAttendance.date);
export const idxWaterReadingsTankTime = index('idx_water_readings_tank_time').on(waterReadings.tankId, waterReadings.time);
export const idxElectricityReadingsMeterTime = index('idx_electricity_readings_meter_time').on(electricityReadings.meterId, electricityReadings.time);
export const idxNotificationsUser = index('idx_notifications_user').on(notifications.userId, notifications.isRead);
export const idxNotificationsTenant = index('idx_notifications_tenant').on(notifications.tenantId);

// =============================================================================
// RENT INVOICES (Proof Verification System)
// =============================================================================
export const rentInvoices = sqliteTable('rent_invoices', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  propertyId: text('property_id').notNull().references(() => properties.id, { onDelete: 'cascade' }),
  tenantProfileId: text('tenant_profile_id').notNull().references(() => tenantProfiles.id, { onDelete: 'cascade' }),

  invoiceNumber: text('invoice_number').unique().notNull(),
  monthYear: text('month_year').notNull(),
  rentAmount: real('rent_amount').notNull(),
  utilityCharges: real('utility_charges').default(0),
  lateFee: real('late_fee').default(0),
  discounts: real('discounts').default(0),
  totalAmount: real('total_amount').notNull(),
  dueDate: text('due_date').notNull(),
  status: text('status').default('pending'),

  generatedAt: text('generated_at').default(sql`(datetime('now'))`),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// =============================================================================
// PAYMENT PROOFS (Screenshot/Receipt Uploads)
// =============================================================================
export const paymentProofs = sqliteTable('payment_proofs', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  invoiceId: text('invoice_id').notNull().references(() => rentInvoices.id, { onDelete: 'cascade' }),
  tenantProfileId: text('tenant_profile_id').notNull().references(() => tenantProfiles.id, { onDelete: 'cascade' }),

  amountPaid: real('amount_paid').notNull(),
  paymentDate: text('payment_date').notNull(),
  transactionReference: text('transaction_reference'),
  screenshotUrl: text('screenshot_url').notNull(),
  notes: text('notes'),

  status: text('status').default('pending'),

  submittedAt: text('submitted_at').default(sql`(datetime('now'))`),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// =============================================================================
// PAYMENT VERIFICATIONS (Owner Review)
// =============================================================================
export const paymentVerifications = sqliteTable('payment_verifications', {
  id: text('id').primaryKey(),
  proofId: text('proof_id').notNull().references(() => paymentProofs.id, { onDelete: 'cascade' }),
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),

  verifiedBy: text('verified_by').notNull(),
  verificationStatus: text('verification_status').notNull(),
  rejectionReason: text('rejection_reason'),
  notes: text('notes'),

  verifiedAt: text('verified_at').default(sql`(datetime('now'))`),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// =============================================================================
// RECEIPTS
// =============================================================================
export const receipts = sqliteTable('receipts', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  invoiceId: text('invoice_id').notNull().references(() => rentInvoices.id, { onDelete: 'cascade' }),

  receiptNumber: text('receipt_number').unique().notNull(),
  amount: real('amount').notNull(),
  paymentDate: text('payment_date').notNull(),
  verifiedBy: text('verified_by').notNull(),

  generatedAt: text('generated_at').default(sql`(datetime('now'))`),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// =============================================================================
// PAYMENT REMINDERS
// =============================================================================
export const paymentReminders = sqliteTable('payment_reminders', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  invoiceId: text('invoice_id').references(() => rentInvoices.id, { onDelete: 'cascade' }),
  tenantProfileId: text('tenant_profile_id').references(() => tenantProfiles.id, { onDelete: 'cascade' }),

  channel: text('channel').notNull().default('in_app'),
  reminderType: text('reminder_type').notNull(),
  message: text('message'),

  sentAt: text('sent_at').default(sql`(datetime('now'))`),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// =============================================================================
// PAYMENT ACTIVITIES (Audit Trail)
// =============================================================================
export const paymentActivities = sqliteTable('payment_activities', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  tenantProfileId: text('tenant_profile_id').references(() => tenantProfiles.id, { onDelete: 'cascade' }),
  invoiceId: text('invoice_id').references(() => rentInvoices.id, { onDelete: 'cascade' }),

  activityType: text('activity_type').notNull(),
  description: text('description').notNull(),

  createdAt: text('created_at').default(sql`(datetime('now'))`),
});
