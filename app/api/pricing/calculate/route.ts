import { NextRequest, NextResponse } from 'next/server';
import { PRICING } from '@/types/database.types';
import { PriceCalculateRequest, PriceCalculateResponse } from '@/types/api.types';

export async function POST(request: NextRequest) {
  try {
    const body: PriceCalculateRequest = await request.json();
    const { pax_count, nights } = body;

    // Validate input
    if (!pax_count || pax_count < 1 || pax_count > 3) {
      return NextResponse.json(
        { error: 'pax_count must be 1, 2, or 3' },
        { status: 400 }
      );
    }
    if (!nights || nights < 1 || !Number.isInteger(nights)) {
      return NextResponse.json(
        { error: 'nights must be a positive integer' },
        { status: 400 }
      );
    }

    const price_per_night = PRICING[pax_count as 1 | 2 | 3];
    const total = price_per_night * nights;

    const response: PriceCalculateResponse = {
      pax_count,
      nights,
      price_per_night_crc: price_per_night,
      total_amount_crc: total,
    };

    return NextResponse.json(response);
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
