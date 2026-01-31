'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useBooking } from '@/contexts/BookingContext';
import { guestDetailsSchema, type GuestDetailsInput } from '@/schemas/booking.schema';

export function GuestDetailsStep() {
  const { state, dispatch } = useBooking();

  const form = useForm<GuestDetailsInput>({
    resolver: zodResolver(guestDetailsSchema),
    defaultValues: state.guestDetails || {
      name: '',
      email: '',
      phone: '',
    },
  });

  const handleBack = () => {
    // Save current form data before going back
    const currentValues = form.getValues();
    if (currentValues.name || currentValues.email || currentValues.phone) {
      const result = guestDetailsSchema.safeParse(currentValues);
      if (result.success) {
        dispatch({ type: 'SET_GUEST_DETAILS', details: result.data });
      }
    }
    dispatch({ type: 'PREV_STEP' });
  };

  const onSubmit = (data: GuestDetailsInput) => {
    dispatch({ type: 'SET_GUEST_DETAILS', details: data });
    dispatch({ type: 'NEXT_STEP' });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Tus datos</h2>
        <p className="text-muted-foreground text-sm">
          Ingresa tus datos de contacto para la reserva
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre completo</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Juan Pérez"
                    autoComplete="name"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Correo electrónico</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="juan@ejemplo.com"
                    autoComplete="email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teléfono</FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    placeholder="+506 8888-8888"
                    autoComplete="tel"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Notes field (arrival time) */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Hora aproximada de llegada (opcional)
            </label>
            <Input
              placeholder="Ej: 3:00 PM"
              value={state.notes}
              onChange={(e) => dispatch({ type: 'SET_NOTES', notes: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Check-in a partir de las 3:00 PM
            </p>
          </div>

          {/* Error Display */}
          {state.error && (
            <p className="text-destructive text-sm">{state.error}</p>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleBack}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Atrás
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={state.isLoading}
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
        </form>
      </Form>
    </div>
  );
}
