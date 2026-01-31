import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { updateStatusSchema } from '@/schemas/booking.schema';

// PATCH: Update reservation status (Admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin secret
    const adminSecret = request.headers.get('X-Admin-Secret');
    if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'ID de reserva requerido' }, { status: 400 });
    }

    const body = await request.json();

    // Validate request body
    const parseResult = updateStatusSchema.safeParse(body);
    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((e) => e.message).join(', ');
      return NextResponse.json({ error: errors }, { status: 400 });
    }

    const { status } = parseResult.data;
    const supabase = createServiceClient();

    // Update payment_status based on status change
    const updates: { status: string; payment_status?: string } = { status };

    // When confirming, assume deposit was paid
    if (status === 'confirmed') {
      updates.payment_status = 'deposit_paid';
    }
    // When checked_in, assume fully paid
    if (status === 'checked_in') {
      updates.payment_status = 'fully_paid';
    }

    const { data: reservation, error } = await supabase
      .from('reservations')
      .update(updates)
      .eq('id', id)
      .select('id, status, payment_status, updated_at')
      .single();

    if (error) {
      console.error('Update error:', error);
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Reserva no encontrada' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Error al actualizar la reserva' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: reservation.id,
      status: reservation.status,
      payment_status: reservation.payment_status,
      updated_at: reservation.updated_at,
    });
  } catch (error) {
    console.error('Update status error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
