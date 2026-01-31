import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const check_in = searchParams.get('check_in');
    const check_out = searchParams.get('check_out');
    const cabin_id = searchParams.get('cabin_id'); // Optional filter

    // Validate required params
    if (!check_in || !check_out) {
      return NextResponse.json(
        { error: 'check_in and check_out are required' },
        { status: 400 }
      );
    }

    const checkInDate = new Date(check_in);
    const checkOutDate = new Date(check_out);

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use ISO date strings (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    if (checkOutDate <= checkInDate) {
      return NextResponse.json(
        { error: 'check_out must be after check_in' },
        { status: 400 }
      );
    }

    // Get all cabins (or specific cabin)
    let cabinsQuery = supabase.from('cabins').select('id, name');
    if (cabin_id) {
      cabinsQuery = cabinsQuery.eq('id', cabin_id);
    }
    const { data: cabins, error: cabinsError } = await cabinsQuery;

    if (cabinsError) throw cabinsError;
    if (!cabins || cabins.length === 0) {
      return NextResponse.json(
        { error: cabin_id ? 'Cabin not found' : 'No cabins found' },
        { status: 404 }
      );
    }

    // Check availability for each cabin
    const availability = await Promise.all(
      cabins.map(async (cabin) => {
        // Check 1: Internal reservations that overlap
        // Overlap: existing.check_in < requested.check_out AND existing.check_out > requested.check_in
        const { data: reservations } = await supabase
          .from('reservations')
          .select('id')
          .eq('cabin_id', cabin.id)
          .not('status', 'in', '("cancelled")')
          .lt('check_in', check_out)
          .gt('check_out', check_in)
          .limit(1);

        if (reservations && reservations.length > 0) {
          return {
            cabin_id: cabin.id,
            cabin_name: cabin.name,
            is_available: false,
            blocked_by: 'reservation' as const,
          };
        }

        // Check 2: External blocks (Booking.com iCal) that overlap
        const { data: blocks } = await supabase
          .from('external_blocks')
          .select('id')
          .eq('cabin_id', cabin.id)
          .lt('start_date', check_out)
          .gt('end_date', check_in)
          .limit(1);

        if (blocks && blocks.length > 0) {
          return {
            cabin_id: cabin.id,
            cabin_name: cabin.name,
            is_available: false,
            blocked_by: 'external_block' as const,
          };
        }

        return {
          cabin_id: cabin.id,
          cabin_name: cabin.name,
          is_available: true,
        };
      })
    );

    return NextResponse.json({
      check_in,
      check_out,
      cabins: availability,
      available_count: availability.filter((c) => c.is_available).length,
    });
  } catch (error) {
    console.error('Availability check error:', error);
    return NextResponse.json(
      { error: 'Failed to check availability' },
      { status: 500 }
    );
  }
}
