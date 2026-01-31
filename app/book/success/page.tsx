'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCircle, Calendar, Home, Users, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SinpeInstructions } from '@/components/booking/SinpeInstructions';
import { Toaster } from '@/components/ui/toaster';

interface ReservationData {
  id: string;
  cabin_name: string;
  check_in: string;
  check_out: string;
  pax_count: number;
  total_amount_crc: number;
  status: string;
  guest_details: {
    name: string;
    email: string;
    phone: string;
  };
  notes?: string;
  created_at: string;
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const reservationId = searchParams.get('id');

  const [reservation, setReservation] = useState<ReservationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReservation() {
      if (!reservationId) {
        setError('ID de reserva no proporcionado');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/reservations/${reservationId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Error al cargar la reserva');
        }

        setReservation(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setIsLoading(false);
      }
    }

    fetchReservation();
  }, [reservationId]);

  const calculateNights = (checkIn: string, checkOut: string) => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando tu reserva...</p>
        </div>
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold">Error</h1>
          <p className="text-muted-foreground">{error || 'Reserva no encontrada'}</p>
          <Button asChild>
            <Link href="/book">Hacer una nueva reserva</Link>
          </Button>
        </div>
      </div>
    );
  }

  const nights = calculateNights(reservation.check_in, reservation.check_out);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto space-y-6">
        {/* Success Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">¡Reserva Recibida!</h1>
          <p className="text-muted-foreground">
            Tu reserva ha sido creada exitosamente. Realiza el pago para confirmarla.
          </p>
        </div>

        {/* Reservation ID */}
        <Card className="border-dashed">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Número de Reserva</p>
            <p className="font-mono font-bold text-lg">{reservation.id.slice(0, 8).toUpperCase()}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Estado: <span className="text-amber-600 dark:text-amber-400 font-medium">Pendiente de Pago</span>
            </p>
          </CardContent>
        </Card>

        {/* Reservation Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Resumen de tu Reserva</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Cabin */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Home className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">{reservation.cabin_name}</p>
                <p className="text-sm text-muted-foreground">Cabaña</p>
              </div>
            </div>

            {/* Dates */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">
                  {format(new Date(reservation.check_in), 'd MMM', { locale: es })} -{' '}
                  {format(new Date(reservation.check_out), 'd MMM yyyy', { locale: es })}
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
                <p className="font-semibold">{reservation.guest_details.name}</p>
                <p className="text-sm text-muted-foreground">
                  {reservation.pax_count} {reservation.pax_count === 1 ? 'huésped' : 'huéspedes'}
                </p>
              </div>
            </div>

            {/* Total */}
            <div className="pt-3 border-t">
              <div className="flex justify-between font-bold text-lg">
                <span>Total a Pagar</span>
                <span>₡{reservation.total_amount_crc.toLocaleString('es-CR')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SINPE Payment Instructions */}
        <SinpeInstructions
          amount={reservation.total_amount_crc}
          cabinName={reservation.cabin_name}
          checkIn={reservation.check_in}
          reservationId={reservation.id}
        />

        {/* Back to Home */}
        <div className="text-center pt-4">
          <Button variant="outline" asChild>
            <Link href="/">Volver al Inicio</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    </div>
  );
}

export default function BookingSuccessPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Suspense fallback={<LoadingFallback />}>
        <SuccessContent />
      </Suspense>
      <Toaster />
    </main>
  );
}
