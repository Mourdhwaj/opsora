export interface User {
  id: string;
  tenantId: string;
  email: string;
  fullName: string;
  role: "owner" | "admin" | "staff" | "resident";
  phone?: string;
  avatarUrl?: string;
  isActive: boolean;
}

export interface RentPayment {
  id: string;
  propertyId: string;
  tenantProfileId: string;
  monthYear: string;
  dueDate: string;
  paidDate?: string;
  rentAmount: number;
  electricityCharge: number;
  waterCharge: number;
  foodCharge: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: string;
  paymentMethod?: string;
  tenantName?: string;
  roomNumber?: string;
  tenantPhone?: string;
}
