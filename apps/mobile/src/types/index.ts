export interface User {
  id: string;
  tenantId: string;
  email: string;
  fullName: string;
  role: 'owner' | 'admin' | 'staff' | 'resident';
  phone?: string;
  avatarUrl?: string;
  isActive: boolean;
}

export interface Property {
  id: string;
  tenantId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  propertyType: string;
  totalFloors: number;
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  vacantBeds: number;
  status: string;
}

export interface Floor {
  id: string;
  propertyId: string;
  floorNumber: number;
  floorName?: string;
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
}

export interface Room {
  id: string;
  propertyId: string;
  floorId: string;
  roomNumber: string;
  roomType: string;
  sharingType: number;
  totalBeds: number;
  occupiedBeds: number;
  vacantBeds: number;
  rentPerBed: number;
  depositAmount: number;
  status: string;
}

export interface Bed {
  id: string;
  roomId: string;
  bedNumber: string;
  bedType: string;
  status: string;
  rentAmount: number;
}

export interface TenantProfile {
  id: string;
  propertyId: string;
  roomId: string;
  bedId: string;
  fullName: string;
  phone: string;
  email?: string;
  gender?: string;
  occupation?: string;
  companyName?: string;
  moveInDate: string;
  moveOutDate?: string;
  rentAmount: number;
  depositPaid: number;
  status: string;
  roomNumber?: string;
  floorNumber?: number;
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
  tenantName?: string;
  roomNumber?: string;
}

export interface Complaint {
  id: string;
  propertyId: string;
  ticketNumber: string;
  category: string;
  priority: string;
  title: string;
  description: string;
  status: string;
  assignedTo?: string;
  createdAt: string;
  tenantName?: string;
  roomNumber?: string;
}

export interface DashboardOverview {
  totalProperties: number;
  totalBeds: number;
  occupiedBeds: number;
  vacantBeds: number;
  occupancyRate: number;
  totalRevenue: number;
  pendingPayments: number;
  activeComplaints: number;
  totalResidents: number;
  recentActivity: ActivityLog[];
  occupancyTrend: { month: string; occupied: number; vacant: number }[];
  revenueTrend: { month: string; revenue: number }[];
}

export interface ActivityLog {
  id: string;
  action: string;
  entityType: string;
  entityName: string;
  actorName: string;
  createdAt: string;
}

export interface WaterReading {
  id: string;
  tankId: string;
  levelPercentage: number;
  levelLiters: number;
  consumptionLiters: number;
  timestamp: string;
}

export interface ElectricityReading {
  id: string;
  meterId: string;
  powerKw: number;
  totalKwh: number;
  dailyKwh: number;
  estimatedCost: number;
  timestamp: string;
}

export interface FoodMenu {
  id: string;
  propertyId: string;
  date: string;
  mealType: string;
  items: string[];
  isSpecial: boolean;
}

export interface StaffMember {
  id: string;
  propertyId: string;
  fullName: string;
  phone: string;
  email?: string;
  role: string;
  salary?: number;
  isActive: boolean;
  joinedDate: string;
}
