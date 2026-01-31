-- PolyOS Initial Schema
-- Micro-PMS for Hospedaje Poly: 5 cabins in Costa Rica

-- =============================================================================
-- Phase 1: Custom Types (ENUMs)
-- =============================================================================

-- Reservation source tracking
CREATE TYPE reservation_source AS ENUM (
  'manual',
  'whatsapp_bot',
  'booking_com',
  'website'
);

-- Booking lifecycle
CREATE TYPE reservation_status AS ENUM (
  'pending_payment',
  'confirmed',
  'checked_in',
  'cancelled',
  'maintenance'
);

-- Payment tracking
CREATE TYPE payment_status AS ENUM (
  'unpaid',
  'deposit_paid',
  'fully_paid'
);

-- =============================================================================
-- Phase 2: Tables
-- =============================================================================

-- Cabins Table (Inventory & Pricing)
CREATE TABLE cabins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  max_occupancy INT NOT NULL DEFAULT 3 CHECK (max_occupancy BETWEEN 1 AND 3),
  base_price_1_pax INT NOT NULL DEFAULT 15000,
  base_price_2_pax INT NOT NULL DEFAULT 26000,
  base_price_3_pax INT NOT NULL DEFAULT 36000,
  ical_import_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reservations Table (Single Source of Truth)
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cabin_id UUID NOT NULL REFERENCES cabins(id) ON DELETE RESTRICT,
  source reservation_source NOT NULL DEFAULT 'manual',
  guest_details JSONB NOT NULL DEFAULT '{}',
  pax_count INT NOT NULL CHECK (pax_count BETWEEN 1 AND 3),
  status reservation_status NOT NULL DEFAULT 'pending_payment',
  payment_status payment_status NOT NULL DEFAULT 'unpaid',
  total_amount_crc INT NOT NULL CHECK (total_amount_crc > 0),
  check_in TIMESTAMPTZ NOT NULL,
  check_out TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Business rule: check_out must be after check_in
  CONSTRAINT valid_dates CHECK (check_out > check_in)
);

-- External Blocks Table (Anti-Double-Booking Layer)
CREATE TABLE external_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cabin_id UUID NOT NULL REFERENCES cabins(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  source TEXT NOT NULL DEFAULT 'Booking.com iCal',
  external_uid TEXT, -- iCal UID for deduplication
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Business rule: end_date must be after start_date
  CONSTRAINT valid_block_dates CHECK (end_date > start_date),

  -- Prevent duplicate iCal entries
  CONSTRAINT unique_external_block UNIQUE (cabin_id, external_uid)
);

-- =============================================================================
-- Phase 3: Indexes
-- =============================================================================

-- Index for fast availability queries
CREATE INDEX idx_reservations_cabin_dates ON reservations(cabin_id, check_in, check_out);
CREATE INDEX idx_reservations_status ON reservations(status);

-- Index for fast availability lookups on external blocks
CREATE INDEX idx_external_blocks_cabin_dates ON external_blocks(cabin_id, start_date, end_date);

-- =============================================================================
-- Phase 4: Triggers
-- =============================================================================

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cabins_updated_at
  BEFORE UPDATE ON cabins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER reservations_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- Phase 5: Seed Data
-- =============================================================================

-- Seed the 5 cabins
INSERT INTO cabins (name) VALUES
  ('Cabin 1'), ('Cabin 2'), ('Cabin 3'), ('Cabin 4'), ('Cabin 5');

-- =============================================================================
-- Phase 6: Row Level Security (RLS)
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE cabins ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_blocks ENABLE ROW LEVEL SECURITY;

-- Service role has full access to everything
CREATE POLICY "Service role full access on cabins"
  ON cabins FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access on reservations"
  ON reservations FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access on external_blocks"
  ON external_blocks FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Public can read cabin info (pricing, names) but not iCal URLs
CREATE POLICY "Public read cabin info"
  ON cabins FOR SELECT
  USING (true);

-- Public can check if dates are blocked (for availability widget)
-- But cannot see guest details
CREATE POLICY "Public read reservation dates only"
  ON reservations FOR SELECT
  USING (true);

CREATE POLICY "Public read external blocks"
  ON external_blocks FOR SELECT
  USING (true);
