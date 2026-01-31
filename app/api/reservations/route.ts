import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { createReservationSchema } from '@/schemas/booking.schema';
import { PRICING } from '@/types/database.types';

// POST: Create a new reservation
export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const body = await request.json();

    // Validate request body with Zod
    const parseResult = createReservationSchema.safeParse(body);
    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((e) => e.message).join(', ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const { cabin_id, check_in, check_out, pax_count, guest_details, notes } = parseResult.data;

    // Re-check availability to prevent race conditions
    // Check for overlapping reservations
    const { data: existingReservations } = await supabase
      .from('reservations')
      .select('id')
      .eq('cabin_id', cabin_id)
      .not('status', 'in', '("cancelled")')
      .lt('check_in', check_out)
      .gt('check_out', check_in)
      .limit(1);

    if (existingReservations && existingReservations.length > 0) {
      return NextResponse.json(
        { error: 'Esta cabaña ya no está disponible para las fechas seleccionadas' },
        { status: 409 }
      );
    }

    // Check for external blocks
    const { data: existingBlocks } = await supabase
      .from('external_blocks')
      .select('id')
      .eq('cabin_id', cabin_id)
      .lt('start_date', check_out)
      .gt('end_date', check_in)
      .limit(1);

    if (existingBlocks && existingBlocks.length > 0) {
      return NextResponse.json(
        { error: 'Esta cabaña ya no está disponible para las fechas seleccionadas' },
        { status: 409 }
      );
    }

    // Calculate total price
    const checkInDate = new Date(check_in);
    const checkOutDate = new Date(check_out);
    const nights = Math.ceil(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const pricePerNight = PRICING[pax_count as 1 | 2 | 3];
    const totalAmount = pricePerNight * nights;

    // Get cabin name for response
    const { data: cabin, error: cabinError } = await supabase
      .from('cabins')
      .select('name')
      .eq('id', cabin_id)
      .single();

    if (cabinError || !cabin) {
      return NextResponse.json({ error: 'Cabaña no encontrada' }, { status: 404 });
    }

    // Create reservation
    const { data: reservation, error: insertError } = await supabase
      .from('reservations')
      .insert({
        cabin_id,
        check_in,
        check_out,
        pax_count,
        guest_details,
        notes: notes || null,
        source: 'website',
        status: 'pending_payment',
        payment_status: 'unpaid',
        total_amount_crc: totalAmount,
      })
      .select('id, status, created_at')
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json(
        { error: 'Error al crear la reserva' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        id: reservation.id,
        cabin_name: cabin.name,
        check_in,
        check_out,
        pax_count,
        nights,
        total_amount_crc: totalAmount,
        status: reservation.status,
        created_at: reservation.created_at,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Reservation creation error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// GET: List reservations (Admin only)
export async function GET(request: NextRequest) {
  try {
    // Check admin secret
    const adminSecret = request.headers.get('X-Admin-Secret');
    if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let query = supabase
      .from('reservations')
      .select(`
        id,
        cabin_id,
        source,
        guest_details,
        pax_count,
        status,
        payment_status,
        total_amount_crc,
        check_in,
        check_out,
        notes,
        created_at,
        updated_at,
        cabins:cabin_id (
          name
        )
      `)
      .order('check_in', { ascending: true })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: reservations, error } = await query;

    if (error) {
      console.error('Query error:', error);
      return NextResponse.json(
        { error: 'Error al obtener reservas' },
        { status: 500 }
      );
    }

    // Transform data to flatten cabin name
    const transformedReservations = reservations?.map((r) => ({
      ...r,
      cabin_name: (r.cabins as unknown as { name: string } | null)?.name || 'Unknown',
      cabins: undefined,
    }));

    return NextResponse.json({
      reservations: transformedReservations || [],
      count: transformedReservations?.length || 0,
    });
  } catch (error) {
    console.error('List reservations error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
