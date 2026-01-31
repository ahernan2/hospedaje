// API Request/Response types
export interface PriceCalculateRequest {
  pax_count: 1 | 2 | 3;
  nights: number;
}

export interface PriceCalculateResponse {
  pax_count: number;
  nights: number;
  price_per_night_crc: number;
  total_amount_crc: number;
}

export interface AvailabilityRequest {
  cabin_id?: string; // Optional: check specific cabin or all
  check_in: string;  // ISO date string
  check_out: string; // ISO date string
}

export interface CabinAvailability {
  cabin_id: string;
  cabin_name: string;
  is_available: boolean;
  blocked_by?: 'reservation' | 'external_block';
}

export interface AvailabilityResponse {
  check_in: string;
  check_out: string;
  cabins: CabinAvailability[];
  available_count: number;
}
