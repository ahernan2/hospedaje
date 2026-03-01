// ── Retry helper ─────────────────────────────────────────────────────

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === maxRetries) break;
      const delay = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 1000, 30000);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

// ── Error type ────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`PolyOS API error ${status}: ${body}`);
  }
}

// ── Response / Request types ──────────────────────────────────────────

export interface AvailabilityResponse {
  check_in: string;
  check_out: string;
  cabins: Array<{
    numero_cabina: number;
    id_db: string;
    cabin_id: string;
    cabin_name: string;
    max_occupancy: number;
    is_available: boolean;
    blocked_by: string | null;
  }>;
  available_count: number;
}

export interface PricingRequest {
  pax_count: number;
  check_in: string;
  check_out: string;
  discount_code?: string;
  customer_id?: string;
}

export interface PricingResponse {
  pax_count: number;
  nights: number;
  breakdown: Array<{ date: string; season: string; price_crc: number }>;
  subtotal_crc: number;
  discount: { min_nights: number; percent: number; amount_crc: number } | null;
  returning_discount: { percent: number; amount_crc: number } | null;
  code_discount: { code: string; percent: number; amount_crc: number } | null;
  total_amount_crc: number;
}

export interface GuestDetails {
  name: string;
  email: string;
  phone: string;
  origin_country?: string;
}

export interface CreateReservationBody {
  cabin_id: string;
  check_in: string;
  check_out: string;
  pax_count: number;
  guest_details: GuestDetails;
  source?: string;
  payment_method?: string;
  discount_code?: string;
  customer_id?: string;
  notes?: string;
}

export interface Reservation {
  id: string;
  cabin_id?: string;
  cabin_name: string;
  source?: string;
  guest_details?: GuestDetails;
  guest_name?: string;
  pax_count: number;
  status: string;
  payment_status?: string;
  payment_method: string;
  total_amount_crc: number;
  check_in: string;
  check_out: string;
  nights?: number;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Cabin {
  id: string;
  name: string;
  max_occupancy: number;
  cabin_status: string;
  cabin_status_note: string | null;
  updated_at: string;
}

export interface ActivityEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  changes: Record<string, { old: unknown; new: unknown }> | null;
  actor: string;
  created_at: string;
}

export interface MaintenanceBlock {
  id: string;
  cabin_id: string;
  cabin_name: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  block_status: string;
  created_at: string;
}

// ── Client ────────────────────────────────────────────────────────────

export class PolyOSClient {
  constructor(
    private baseUrl: string,
    private apiKey: string,
  ) {}

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    return withRetry(async () => {
      const options: RequestInit = {
        method,
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
      };
      if (body !== undefined) options.body = JSON.stringify(body);

      const res = await fetch(url, options);
      if (!res.ok) {
        const text = await res.text();
        throw new ApiError(res.status, text);
      }
      return res.json() as Promise<T>;
    });
  }

  private buildQuery(params: Record<string, string | number | boolean | undefined>): string {
    const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null);
    if (entries.length === 0) return '';
    return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
  }

  // ── Availability ─────────────────────────────────────────────────────

  async checkAvailability(checkIn: string, checkOut: string, cabinId?: string): Promise<AvailabilityResponse> {
    const qs = this.buildQuery({ check_in: checkIn, check_out: checkOut, cabin_id: cabinId });
    return this.request<AvailabilityResponse>('GET', `/api/availability${qs}`);
  }

  // ── Pricing ──────────────────────────────────────────────────────────

  async calculatePricing(params: PricingRequest): Promise<PricingResponse> {
    return this.request<PricingResponse>('POST', '/api/pricing/calculate', params);
  }

  // ── Reservations ─────────────────────────────────────────────────────

  async listReservations(filters?: { status?: string; limit?: number; offset?: number }): Promise<Reservation[]> {
    const qs = this.buildQuery({ status: filters?.status, limit: filters?.limit, offset: filters?.offset });
    return this.request<Reservation[]>('GET', `/api/reservations${qs}`);
  }

  async getReservation(id: string): Promise<Reservation> {
    return this.request<Reservation>('GET', `/api/reservations/${id}`);
  }

  async createReservation(data: CreateReservationBody): Promise<Reservation> {
    return this.request<Reservation>('POST', '/api/reservations', data);
  }

  async updateReservationStatus(id: string, status: string): Promise<Reservation> {
    return this.request<Reservation>('PATCH', `/api/reservations/${id}/status`, {
      status,
      confirmacion_administradora: true,
    });
  }

  async updatePaymentStatus(id: string, paymentStatus: string): Promise<Reservation> {
    return this.request<Reservation>('PATCH', `/api/reservations/${id}/payment`, {
      payment_status: paymentStatus,
      confirmacion_administradora: true,
    });
  }

  async cancelReservation(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('DELETE', `/api/reservations/${id}`, {
      confirmacion_administradora: true,
    });
  }

  // ── Admin – Cabins ───────────────────────────────────────────────────

  async listCabins(): Promise<Cabin[]> {
    return this.request<Cabin[]>('GET', '/api/admin/cabins');
  }

  // ── Admin – Maintenance ──────────────────────────────────────────────

  async createMaintenanceBlock(data: {
    cabin_id: string;
    start_date: string;
    end_date: string;
    reason?: string;
  }): Promise<MaintenanceBlock> {
    return this.request<MaintenanceBlock>('POST', '/api/admin/maintenance', {
      ...data,
      confirmacion_administradora: true,
    });
  }

  // ── Admin – Activity ─────────────────────────────────────────────────

  async getActivityLog(filters?: {
    entity_type?: string;
    entity_id?: string;
    action?: string;
    limit?: number;
    offset?: number;
  }): Promise<ActivityEntry[]> {
    const qs = this.buildQuery({
      entity_type: filters?.entity_type,
      entity_id: filters?.entity_id,
      action: filters?.action,
      limit: filters?.limit,
      offset: filters?.offset,
    });
    return this.request<ActivityEntry[]>('GET', `/api/admin/activity${qs}`);
  }

  // ── Admin – Customers ────────────────────────────────────────────────

  async listCustomers(): Promise<unknown> {
    return this.request<unknown>('GET', '/api/admin/customers');
  }

  // ── Discount codes ───────────────────────────────────────────────────

  async validateDiscountCode(code: string): Promise<{ valid: boolean; discount_percent?: number; description?: string }> {
    return this.request<{ valid: boolean; discount_percent?: number; description?: string }>(
      'POST',
      '/api/discount-codes/validate',
      { code },
    );
  }
}

// ── Singleton factory ─────────────────────────────────────────────────

let _client: PolyOSClient | null = null;

export function getApiClient(): PolyOSClient {
  if (!_client) {
    const baseUrl = process.env.POLYOS_BASE_URL;
    const apiKey = process.env.POLYOS_API_KEY;
    if (!baseUrl || !apiKey) {
      throw new Error('Missing POLYOS_BASE_URL or POLYOS_API_KEY environment variables');
    }
    _client = new PolyOSClient(baseUrl, apiKey);
  }
  return _client;
}

// ── Date helpers (Costa Rica timezone) ───────────────────────────────

export function todayCR(): string {
  const str = new Date().toLocaleString('en-US', { timeZone: 'America/Costa_Rica' });
  const d = new Date(str);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatCRC(amount: number): string {
  return `\u20a1${Math.round(amount).toLocaleString('en-US')}`;
}
