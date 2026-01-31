'use client';

import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Calendar, Home, Loader2, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SinpeInstructions } from './SinpeInstructions';
import { useBooking } from '@/contexts/BookingContext';

export function ConfirmationStep() {
  const router = useRouter();
  const { state, dispatch, submitReservation, getNights } = useBooking();

  const handleBack = () => {
    dispatch({ type: 'PREV_STEP' });
  };

  const handleConfirm = async () => {
    const result = await submitReservation();
    if (result) {
      // Redirect to success page with reservation ID
      router.push(`/book/success?id=${result.id}`);
    }
  };

  const nights = getNights();

  if (!state.selectedCabin || !state.pricing || !state.guestDetails || !state.checkIn || !state.checkOut) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Información incompleta</p>
        <Button variant="link" onClick={() => dispatch({ type: 'SET_STEP', step: 1 })}>
          Volver al inicio
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Confirma tu reserva</h2>
        <p className="text-muted-foreground text-sm">
          Revisa los detalles y confirma para recibir las instrucciones de pago
        </p>
      </div>

      {/* Reservation Summary */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Cabin */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Home className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">{state.selectedCabin.cabin_name}</p>
              <p className="text-sm text-muted-foreground">Cabaña seleccionada</p>
            </div>
          </div>

          {/* Dates */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">
                {format(state.checkIn, 'd MMM', { locale: es })} -{' '}
                {format(state.checkOut, 'd MMM yyyy', { locale: es })}
              </p>
              <p className="text-sm text-muted-foreground">
                {nights} {nights === 1 ? 'noche' : 'noches'}
              </p>
            </div>
          </div>

          {/* Guests */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">{state.guestDetails.name}</p>
              <p className="text-sm text-muted-foreground">
                {state.paxCount} {state.paxCount === 1 ? 'huésped' : 'huéspedes'}
              </p>
            </div>
          </div>

          {/* Contact */}
          <div className="pt-2 border-t text-sm text-muted-foreground">
            <p>{state.guestDetails.email}</p>
            <p>{state.guestDetails.phone}</p>
            {state.notes && <p className="mt-1">Llegada aprox: {state.notes}</p>}
          </div>

          {/* Price */}
          <div className="pt-2 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                ₡{state.pricing.price_per_night_crc.toLocaleString('es-CR')} x {nights} noches
              </span>
              <span>₡{state.pricing.total_amount_crc.toLocaleString('es-CR')}</span>
            </div>
            <div className="flex justify-between font-bold text-lg mt-2">
              <span>Total</span>
              <span>₡{state.pricing.total_amount_crc.toLocaleString('es-CR')}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SINPE Payment Instructions Preview */}
      <SinpeInstructions
        amount={state.pricing.total_amount_crc}
        cabinName={state.selectedCabin.cabin_name}
        checkIn={state.checkIn.toISOString().split('T')[0]}
      />

      {/* Error Display */}
      {state.error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-3">
          <p className="text-destructive text-sm">{state.error}</p>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleBack}
          disabled={state.isLoading}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Atrás
        </Button>
        <Button
          className="flex-1"
          onClick={handleConfirm}
          disabled={state.isLoading}
        >
          {state.isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creando reserva...
            </>
          ) : (
            'Confirmar Reserva'
          )}
        </Button>
      </div>
    </div>
  );
}
