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

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface StaffTicket {
  id: string;
  propertyId: string;
  ticketNumber: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  assignedTo?: string;
  assignedToName?: string;
  tenantName?: string;
  roomNumber?: string;
  createdAt: string;
  updatedAt: string;
  slaDeadline?: string;
  slaStatus?: string;
  comments?: TicketComment[];
}

export interface TicketComment {
  id: string;
  ticketId: string;
  userId: string;
  userName: string;
  comment: string;
  isInternal: boolean;
  createdAt: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  date: string;
}

export interface FoodPoll {
  id: string;
  propertyId: string;
  title: string;
  mealType: string;
  date: string;
  deadline: string;
  status: string;
  options: FoodPollOption[];
  totalVotes: number;
  userVote?: string;
  winner?: string;
}

export interface FoodPollOption {
  id: string;
  pollId: string;
  title: string;
  description?: string;
  votes: number;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  breakfast?: 'yes' | 'maybe' | 'no';
  lunch?: 'yes' | 'maybe' | 'no';
  dinner?: 'yes' | 'maybe' | 'no';
}

export interface ArchiveStats {
  totalArchivedUsers: number;
  totalArchivedResidents: number;
}

export interface ArchivedUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  archivedAt: string;
  archiveReason?: string;
}

export interface ArchivedResident {
  id: string;
  fullName: string;
  phone: string;
  roomNumber?: string;
  archivedAt: string;
  archiveReason?: string;
}

export interface WaterTank {
  id: string;
  propertyId: string;
  name: string;
  tankType: string;
  capacityLiters: number;
  sensorId?: string;
  location?: string;
  lowLevelAlert: number;
  criticalLevelAlert: number;
  currentLevel?: number;
  latestReading?: {
    levelPercentage: number;
    levelLiters: number;
    timestamp: string;
  };
}

export interface ElectricityMeter {
  id: string;
  propertyId: string;
  meterNumber: string;
  meterType: string;
  floorId?: string;
  roomId?: string;
  sensorId?: string;
  costPerUnit: number;
  fixedCharge: number;
  latestReading?: {
    powerKw: number;
    totalKwh: number;
    dailyKwh: number;
    estimatedCost: number;
    timestamp: string;
  };
}

export interface FoodAnalytics {
  satisfactionScore: number;
  totalRatings: number;
  popularItems: string[];
  participationRate: number;
}

export interface ActivityLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityName: string;
  actorName: string;
  createdAt: string;
}

export interface OccupancyTrend {
  month: string;
  occupied: number;
  vacant: number;
  expected: number;
  collected: number;
  collectionRate: string;
}
