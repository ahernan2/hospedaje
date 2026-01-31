'use client';

import { useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { CabinCard } from './CabinCard';
import { useBooking } from '@/contexts/BookingContext';
import { PRICING } from '@/types/database.types';

export function CabinSelectStep() {
  const { state, dispatch, calculatePricing, getNights } = useBooking();

  // Calculate pricing when cabin or pax changes
  useEffect(() => {
    if (state.selectedCabin) {
      calculatePricing();
    }
  }, [state.selectedCabin, state.paxCount, calculatePricing]);

  const handleCabinSelect = (cabin: (typeof state.availableCabins)[0]) => {
    dispatch({ type: 'SELECT_CABIN', cabin });
  };

  const handleBack = () => {
    dispatch({ type: 'PREV_STEP' });
  };

  const handleNext = () => {
    if (state.selectedCabin && state.pricing) {
      dispatch({ type: 'NEXT_STEP' });
    }
  };

  const nights = getNights();
  const pricePerNight = PRICING[state.paxCount];
  const canProceed = !!state.selectedCabin && !!state.pricing && !state.isLoading;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Elige tu cabaña</h2>
        <p className="text-muted-foreground text-sm">
          {state.checkIn && state.checkOut && (
            <>
              {format(state.checkIn, 'd MMM', { locale: es })} -{' '}
              {format(state.checkOut, 'd MMM yyyy', { locale: es })} ({nights}{' '}
              {nights === 1 ? 'noche' : 'noches'})
            </>
          )}
        </p>
      </div>

      {/* Cabin Grid */}
      <div className="grid gap-3">
        {state.availableCabins.map((cabin) => (
          <CabinCard
            key={cabin.cabin_id}
            cabin={cabin}
            isSelected={state.selectedCabin?.cabin_id === cabin.cabin_id}
            pricePerNight={pricePerNight}
            onSelect={() => handleCabinSelect(cabin)}
          />
        ))}
      </div>

      {/* Price Summary */}
      {state.selectedCabin && (
        <div className="rounded-lg border p-4 bg-muted/30 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {state.selectedCabin.cabin_name} x {nights} {nights === 1 ? 'noche' : 'noches'}
            </span>
            {state.isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : state.pricing ? (
              <span>₡{state.pricing.total_amount_crc.toLocaleString('es-CR')}</span>
            ) : null}
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {state.paxCount} {state.paxCount === 1 ? 'huésped' : 'huéspedes'} @ ₡{pricePerNight.toLocaleString('es-CR')}/noche
            </span>
          </div>
          {state.pricing && (
            <div className="flex justify-between font-semibold pt-2 border-t">
              <span>Total</span>
              <span>₡{state.pricing.total_amount_crc.toLocaleString('es-CR')}</span>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {state.error && (
        <p className="text-destructive text-sm">{state.error}</p>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Atrás
        </Button>
        <Button
          className="flex-1"
          onClick={handleNext}
          disabled={!canProceed}
        >
          {state.isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Calculando...
            </>
          ) : (
            'Continuar'
          )}
        </Button>
      </div>
    </div>
  );
}
