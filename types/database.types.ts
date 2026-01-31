// Enums matching Supabase
export type ReservationSource = 'manual' | 'whatsapp_bot' | 'booking_com' | 'website';
export type ReservationStatus = 'pending_payment' | 'confirmed' | 'checked_in' | 'cancelled' | 'maintenance';
export type PaymentStatus = 'unpaid' | 'deposit_paid' | 'fully_paid';

// Guest details stored as JSONB
export interface GuestDetails {
  name: string;
  phone?: string;
  email?: string;
  origin_country?: string;
}

// Database models
export interface Cabin {
  id: string;
  name: string;
  max_occupancy: number;
  base_price_1_pax: number;
  base_price_2_pax: number;
  base_price_3_pax: number;
  ical_import_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Reservation {
  id: string;
  cabin_id: string;
  source: ReservationSource;
  guest_details: GuestDetails;
  pax_count: 1 | 2 | 3;
  status: ReservationStatus;
  payment_status: PaymentStatus;
  total_amount_crc: number;
  check_in: string;
  check_out: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ExternalBlock {
  id: string;
  cabin_id: string;
  start_date: string;
  end_date: string;
  source: string;
  external_uid?: string;
  created_at: string;
}

// Pricing constants (hard-coded business rules)
export const PRICING = {
  1: 15000, // 1 person: 15,000 CRC per night
  2: 26000, // 2 people: 26,000 CRC per night
  3: 36000, // 3 people: 36,000 CRC per night
} as const;

export const BUSINESS_RULES = {
  CHECK_IN_TIME: '15:00',  // 3:00 PM
  CHECK_OUT_TIME: '11:00', // 11:00 AM
  MAX_OCCUPANCY: 3,
  TOTAL_CABINS: 5,
} as const;
