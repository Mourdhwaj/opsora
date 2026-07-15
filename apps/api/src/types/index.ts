import { z } from 'zod';
import type { FastifyReply } from 'fastify';

// =============================================================================
// Auth Types
// =============================================================================
export interface JWTPayload {
  userId: string;
  tenantId: string;
  email: string;
  role: string;
}

export interface AuthRequest {
  userId: string;
  tenantId: string;
  email: string;
  role: string;
}

// =============================================================================
// Common Query Types
// =============================================================================
export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// =============================================================================
// Zod Schemas for Validation
// =============================================================================
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

export const registerTenantSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(10),
  password: z.string().min(6),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(6),
  fullName: z.string().min(2),
  role: z.enum(['owner', 'admin', 'staff', 'resident']).default('staff'),
});

export const createPropertySchema = z.object({
  name: z.string().min(2),
  address: z.string().min(5),
  city: z.string().min(2),
  state: z.string().min(2),
  pincode: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  propertyType: z.enum(['pg', 'hostel', 'coliving', 'apartment']).default('pg'),
  totalFloors: z.number().int().min(1).default(1),
  wifiSsid: z.string().optional(),
  wifiPassword: z.string().optional(),
  amenities: z.string().optional().default('[]'),
});

export const createFloorSchema = z.object({
  propertyId: z.string().uuid(),
  floorNumber: z.number().int(),
  floorName: z.string().optional(),
});

export const createRoomSchema = z.object({
  propertyId: z.string().uuid(),
  floorId: z.string().uuid(),
  roomNumber: z.string().min(1),
  roomType: z.enum(['shared', 'single', 'couple']).default('shared'),
  sharingType: z.number().int().min(1).default(2),
  totalBeds: z.number().int().min(1).default(2),
  rentPerBed: z.number().min(0).default(5000),
  depositAmount: z.number().min(0).default(10000),
  amenities: z.string().optional().default('[]'),
  gender: z.enum(['male', 'female', 'mixed']).default('mixed'),
});

export const createBedSchema = z.object({
  propertyId: z.string().uuid(),
  floorId: z.string().uuid(),
  roomId: z.string().uuid(),
  bedNumber: z.string().min(1),
  bedType: z.enum(['standard', 'premium', 'deluxe']).default('standard'),
  rentAmount: z.number().min(0).default(5000),
});

export const createTenantProfileSchema = z.object({
  propertyId: z.string().uuid().optional(),
  roomId: z.string().uuid().optional(),
  bedId: z.string().uuid().optional(),
  fullName: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().email().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  occupation: z.string().optional(),
  companyName: z.string().optional(),
  collegeName: z.string().optional(),
  emergencyName: z.string().optional(),
  emergencyPhone: z.string().optional(),
  emergencyRelation: z.string().optional(),
  moveInDate: z.string(),
  rentAmount: z.number().min(0),
  depositPaid: z.number().min(0).default(0),
  mealPreferences: z.string().optional().default('{"breakfast":true,"lunch":false,"dinner":true}'),
});

export const createPaymentSchema = z.object({
  propertyId: z.string().uuid(),
  roomId: z.string().uuid(),
  bedId: z.string().uuid(),
  tenantProfileId: z.string().uuid(),
  monthYear: z.string().regex(/^\d{4}-\d{2}$/),
  dueDate: z.string(),
  rentAmount: z.number().min(0),
  electricityCharge: z.number().min(0).default(0),
  waterCharge: z.number().min(0).default(0),
  foodCharge: z.number().min(0).default(0),
  maintenanceCharge: z.number().min(0).default(0),
  paymentMethod: z.enum(['cash', 'upi_direct', 'neft_imps', 'cheque']).optional(),
  transactionId: z.string().optional(),
  notes: z.string().optional(),
});

export const createComplaintSchema = z.object({
  propertyId: z.string().uuid(),
  roomId: z.string().uuid().optional(),
  bedId: z.string().uuid().optional(),
  tenantProfileId: z.string().uuid().optional(),
  category: z.enum(['plumbing', 'electrical', 'furniture', 'cleaning', 'food', 'internet', 'security', 'other']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  title: z.string().min(5),
  description: z.string().min(10),
});

export const createWaterTankSchema = z.object({
  propertyId: z.string().uuid(),
  name: z.string().min(2),
  tankType: z.enum(['overhead', 'underground', 'sintex']).default('overhead'),
  capacityLiters: z.number().min(1),
  sensorId: z.string().optional(),
  location: z.string().optional(),
  lowLevelAlert: z.number().min(0).max(100).default(20),
  criticalLevelAlert: z.number().min(0).max(100).default(10),
});

export const createElectricityMeterSchema = z.object({
  propertyId: z.string().uuid(),
  meterNumber: z.string().min(1),
  meterType: z.enum(['main', 'sub', 'room']).default('main'),
  floorId: z.string().uuid().optional(),
  roomId: z.string().uuid().optional(),
  sensorId: z.string().optional(),
  costPerUnit: z.number().min(0).default(7.5),
  fixedCharge: z.number().min(0).default(0),
});

// =============================================================================
// Pagination Validation
// =============================================================================
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

export function parseBody<T>(schema: z.ZodSchema<T>, body: unknown, reply: FastifyReply): T | null {
  const result = schema.safeParse(body);
  if (!result.success) {
    reply.code(400).send({
      error: 'Validation Error',
      details: result.error.issues.map((issue) => ({
        path: issue.path.join('.') || '',
        message: issue.message,
        code: issue.code,
      })),
    });
    return null;
  }
  return result.data;
}

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterTenantInput = z.infer<typeof registerTenantSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type CreateFloorInput = z.infer<typeof createFloorSchema>;
export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type CreateBedInput = z.infer<typeof createBedSchema>;
export type CreateTenantProfileInput = z.infer<typeof createTenantProfileSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;
export type CreateWaterTankInput = z.infer<typeof createWaterTankSchema>;
export type CreateElectricityMeterInput = z.infer<typeof createElectricityMeterSchema>;

// =============================================================================
// Food Management Types
// =============================================================================
export const createFoodPollSchema = z.object({
  title: z.string().min(2),
  mealType: z.enum(['breakfast', 'lunch', 'dinner']),
  date: z.string(),
  deadline: z.string(),
  propertyId: z.string().uuid().optional(),
  options: z.array(z.object({
    title: z.string().min(1),
    description: z.string().optional(),
  })).min(2).max(5),
});

export const createFoodRatingSchema = z.object({
  foodMenuId: z.string().uuid(),
  rating: z.number().min(1).max(5),
  tags: z.string().optional(),
  comment: z.string().optional(),
});

export const createMealAttendanceSchema = z.object({
  date: z.string(),
  breakfast: z.enum(['yes', 'no', 'maybe']).optional(),
  lunch: z.enum(['yes', 'no', 'maybe']).optional(),
  dinner: z.enum(['yes', 'no', 'maybe']).optional(),
});

export const createIngredientFormulaSchema = z.object({
  mealType: z.string(),
  itemName: z.string().min(1),
  ingredientName: z.string().min(1),
  quantityPerPerson: z.number().min(0),
  unit: z.enum(['kg', 'l', 'g', 'ml']),
});

export type CreateFoodPollInput = z.infer<typeof createFoodPollSchema>;
export type CreateFoodRatingInput = z.infer<typeof createFoodRatingSchema>;
export type CreateMealAttendanceInput = z.infer<typeof createMealAttendanceSchema>;
export type CreateIngredientFormulaInput = z.infer<typeof createIngredientFormulaSchema>;

// =============================================================================
// User Update Types
// =============================================================================
export const updateUserSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().optional(),
  role: z.enum(['owner', 'admin', 'staff', 'resident']).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// =============================================================================
// Payment Proof Verification Types
// =============================================================================
export const createRentInvoiceSchema = z.object({
  tenantProfileId: z.string().uuid(),
  monthYear: z.string().regex(/^\d{4}-\d{2}$/),
  rentAmount: z.number().min(0),
  utilityCharges: z.number().min(0).default(0),
  lateFee: z.number().min(0).default(0),
  discounts: z.number().min(0).default(0),
  dueDate: z.string(),
});

export const uploadPaymentProofSchema = z.object({
  invoiceId: z.string().uuid(),
  amountPaid: z.number().min(0),
  paymentDate: z.string(),
  transactionReference: z.string().optional(),
  screenshotUrl: z.string().min(1),
  notes: z.string().optional(),
});

export const verifyPaymentSchema = z.object({
  verificationStatus: z.enum(['approved', 'rejected', 'reupload_requested']),
  rejectionReason: z.string().optional(),
  notes: z.string().optional(),
});

export const createReminderSchema = z.object({
  tenantProfileId: z.string().uuid().optional(),
  invoiceId: z.string().uuid().optional(),
  channel: z.enum(['whatsapp', 'email', 'in_app']).default('in_app'),
  reminderType: z.enum(['upcoming_due', 'due_today', 'late_payment', 'repeated_defaulter', 'manual']),
  message: z.string().optional(),
});

export const generateBulkRemindersSchema = z.object({
  targetGroup: z.enum(['all_pending', 'all_overdue', 'custom']),
  tenantProfileIds: z.array(z.string().uuid()).optional(),
  channel: z.enum(['whatsapp', 'email', 'in_app']).default('in_app'),
  reminderType: z.enum(['upcoming_due', 'due_today', 'late_payment', 'manual']).default('manual'),
  message: z.string().optional(),
});

export type CreateRentInvoiceInput = z.infer<typeof createRentInvoiceSchema>;
export type UploadPaymentProofInput = z.infer<typeof uploadPaymentProofSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
export type CreateReminderInput = z.infer<typeof createReminderSchema>;
export type GenerateBulkRemindersInput = z.infer<typeof generateBulkRemindersSchema>;
