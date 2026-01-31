import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

// GET: Fetch single reservation (for success page)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'ID de reserva requerido' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: reservation, error } = await supabase
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
        cabins:cabin_id (
          name
        )
      `)
      .eq('id', id)
      .single();

    if (error || !reservation) {
      return NextResponse.json(
        { error: 'Reserva no encontrada' },
        { status: 404 }
      );
    }

    // Transform to flatten cabin name
    const response = {
      ...reservation,
      cabin_name: (reservation.cabins as unknown as { name: string } | null)?.name || 'Unknown',
      cabins: undefined,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Get reservation error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
