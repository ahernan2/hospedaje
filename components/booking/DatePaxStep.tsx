'use client';

import { useEffect, useState } from 'react';
import { format, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Users, Loader2 } from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBooking } from '@/contexts/BookingContext';

export function DatePaxStep() {
  const { state, dispatch, checkAvailability } = useBooking();
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    state.checkIn && state.checkOut
      ? { from: state.checkIn, to: state.checkOut }
      : undefined
  );
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Check availability when dates change
  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      dispatch({ type: 'SET_DATES', checkIn: dateRange.from, checkOut: dateRange.to });
    }
  }, [dateRange, dispatch]);

  useEffect(() => {
    if (state.checkIn && state.checkOut) {
      checkAvailability();
    }
  }, [state.checkIn, state.checkOut, checkAvailability]);

  const handlePaxChange = (value: string) => {
    dispatch({ type: 'SET_PAX_COUNT', paxCount: parseInt(value) as 1 | 2 | 3 });
  };

  const handleNext = () => {
    if (canProceed) {
      dispatch({ type: 'NEXT_STEP' });
    }
  };

  const today = startOfDay(new Date());
  const availableCount = state.availableCabins.filter((c) => c.is_available).length;
  const hasSelectedDates = !!state.checkIn && !!state.checkOut;
  const canProceed = hasSelectedDates && availableCount > 0 && !state.isLoading;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Selecciona tus fechas</h2>
        <p className="text-muted-foreground text-sm">
          Elige las fechas de entrada y salida para tu estadía
        </p>
      </div>

      {/* Date Range Picker */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Fechas de estadía</label>
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal',
                !dateRange && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, 'd MMM', { locale: es })} -{' '}
                    {format(dateRange.to, 'd MMM yyyy', { locale: es })}
                  </>
                ) : (
                  format(dateRange.from, 'd MMM yyyy', { locale: es })
                )
              ) : (
                <span>Selecciona las fechas</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              defaultMonth={dateRange?.from || today}
              selected={dateRange}
              onSelect={(range) => {
                setDateRange(range);
                if (range?.from && range?.to) {
                  setIsCalendarOpen(false);
                }
              }}
              numberOfMonths={1}
              disabled={(date) => isBefore(date, today)}
              locale={es}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Pax Count Selector */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Número de huéspedes</label>
        <Select
          value={state.paxCount.toString()}
          onValueChange={handlePaxChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue>
              <div className="flex items-center">
                <Users className="mr-2 h-4 w-4" />
                {state.paxCount} {state.paxCount === 1 ? 'huésped' : 'huéspedes'}
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">
              <div className="flex items-center">
                <Users className="mr-2 h-4 w-4" />1 huésped
              </div>
            </SelectItem>
            <SelectItem value="2">
              <div className="flex items-center">
                <Users className="mr-2 h-4 w-4" />2 huéspedes
              </div>
            </SelectItem>
            <SelectItem value="3">
              <div className="flex items-center">
                <Users className="mr-2 h-4 w-4" />3 huéspedes
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Availability Status */}
      {hasSelectedDates && (
        <div className="rounded-lg border p-4 bg-muted/30">
          {state.isLoading ? (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Verificando disponibilidad...</span>
            </div>
          ) : state.error ? (
            <p className="text-destructive text-sm">{state.error}</p>
          ) : availableCount > 0 ? (
            <p className="text-sm text-green-600 dark:text-green-400">
              {availableCount} {availableCount === 1 ? 'cabaña disponible' : 'cabañas disponibles'} para estas fechas
            </p>
          ) : (
            <p className="text-sm text-destructive">
              No hay cabañas disponibles para estas fechas. Por favor, selecciona otras fechas.
            </p>
          )}
        </div>
      )}

      {/* Next Button */}
      <Button
        className="w-full"
        size="lg"
        onClick={handleNext}
        disabled={!canProceed}
      >
        {state.isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Cargando...
          </>
        ) : (
          'Continuar'
        )}
      </Button>
    </div>
  );
}
