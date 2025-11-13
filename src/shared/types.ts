/**
 * Shared TypeScript types for wedding/event management system
 * Consolidated guest data with check-in, souvenir, gift, and reminder tracking
 */

// User authentication types
export interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
  accountId: string;
  permissions?: UserPermission[];
}

// User permission types
export interface UserPermission {
  page: string;
  canAccess: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
}

/**
 * Account information for wedding details
 */
export interface AccountInfo {
  id: string;
  name: string; // display name for account
  title: string; // wedding title, e.g., "Bagas & Naila"
  dateTime: Date; // wedding date and time
  location: string; // wedding location
  photoUrl: string; // hero image URL
  createdAt?: Date;
  updatedAt?: Date;
}

// Guest types with consolidated data
export interface Guest {
  _id?: string;
  name: string;
  phone: string;
  invitationCode: string;
  category: string;
  status: 'Pending' | 'Confirmed' | 'Declined' | 'Checked-In';
  plusOne: boolean;
  isInvited?: boolean; // true for invited guests, false for walk-ins

  // Check-in tracking
  checkInDate?: Date;
  guestCount?: number; // Number of people checking in

  // Souvenir tracking
  souvenirCount?: number;
  souvenirRecordedAt?: Date;

  // Gift tracking
  giftType?: 'Angpao' | 'Kado';
  kadoCount?: number;
  angpaoCount?: number;
  giftCount?: number;
  giftNote?: string;

  // Reminder tracking
  reminderScheduledAt?: Date;
  reminderSentAt?: Date;

  // Additional info
  notes?: string;
  dietaryRequirements?: string; // Special dietary requirements

  // Frontend display fields
  code?: string; // Unique code for display (kode unik)
  session?: string; // Guest session (sesi)
  limit?: number; // Guest limit (limit)
  tableNo?: string; // Table number (no. meja)
  info?: string; // Additional info (keterangan)
  introTextCategory?: string; // Intro text category (Formal/Casual/etc)

  // Timestamps
  createdAt?: Date;
  giftRecordedAt?: Date;
  updatedAt?: Date;
}

// Gift types
export type GiftType = 'Angpao' | 'Kado';

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Pagination types
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Search and filter types
export interface SearchFilters {
  search?: string;
  category?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

// Check-in types
export interface CheckInData {
  guestId: string;
  checkInDate: Date;
  notes?: string;
}

// Gift assignment types
export interface GiftAssignmentData {
  guestId: string;
  type: GiftType;
  count: number;
}

// Gift distribution types (supports multiple gifts per guest)
export interface GiftDistribution {
  _id?: string;
  guestId: string;
  guestName: string;
  giftCount: number;
  giftType: GiftType;
  note?: string;
  userId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Souvenir assignment types
export interface SouvenirAssignmentData {
  guestId: string;
  count: number;
}

// Reminder types
export interface ReminderData {
  guestId: string;
  scheduledAt: Date;
  message?: string;
}

// Statistics types
export interface GuestStats {
  totalGuests: number;
  totalCheckedIn: number;
  totalConfirmed: number;
  totalDeclined: number;
  totalPending: number;
  totalSouvenirsDistributed: number;
  totalGiftsDistributed: number;
  totalAngpao: number;
  totalKado: number;
}

// Message template types
export interface MessageTemplate {
  _id?: string;
  name: string;
  content: string;
  type: 'invitation' | 'reminder' | 'thank_you' | 'confirmation';
  variables: string[];
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Campaign types
export interface Campaign {
  _id?: string;
  name: string;
  description?: string;
  type: 'whatsapp' | 'email' | 'sms';
  status: 'draft' | 'scheduled' | 'running' | 'completed' | 'paused';
  templateId: string;
  targetAudience: 'all' | 'confirmed' | 'pending' | 'checked_in';
  scheduledAt?: Date;
  sentAt?: Date;
  totalRecipients: number;
  successCount: number;
  failureCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// Audit log types
export interface AuditLog {
  _id?: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  details?: any;
  createdAt: Date;
}

// Doorprize types
export interface DoorprizeItem {
  _id?: string;
  name: string;
  description?: string;
  imageUrl?: string;
  quantity: number;
  remainingQuantity: number;
  category: string;
  sponsor?: string;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DoorprizeWinner {
  _id?: string;
  guestId: string;
  guestName: string;
  itemId: string;
  itemName: string;
  wonAt: Date;
  claimed: boolean;
  claimedAt?: Date;
}

// WhatsApp types
export interface WhatsAppSession {
  _id?: string;
  sessionId: string;
  phoneNumber: string;
  status: 'connected' | 'disconnected' | 'connecting';
  lastActivity?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// Import/Export types
export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
  warnings: string[];
}

// Intro text types
export interface IntroText {
  _id?: string;
  userId: string;
  formalText: string;
  casualText: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// ==== Backend context typing for Hono ====
export interface Bindings {
  MONGO_URI: string
  PORT?: string
}

export interface ContextUser {
  id: string
  username?: string
  role?: 'admin' | 'user'
  accountId?: string
  guestId?: string
  email?: string
}

export interface Vars {
  user?: ContextUser
  accountId?: string
  guestId?: string
}

export type AppEnv = { Bindings: Bindings; Variables: Vars }

