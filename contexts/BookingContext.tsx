'use client';

import React, { createContext, useContext, useReducer, useCallback } from 'react';
import type { CabinAvailability, PriceCalculateResponse } from '@/types/api.types';
import type { GuestDetailsInput } from '@/schemas/booking.schema';

// State types
export interface BookingState {
  step: 1 | 2 | 3 | 4;
  checkIn: Date | null;
  checkOut: Date | null;
  paxCount: 1 | 2 | 3;
  availableCabins: CabinAvailability[];
  selectedCabin: CabinAvailability | null;
  pricing: PriceCalculateResponse | null;
  guestDetails: GuestDetailsInput | null;
  notes: string;
  isLoading: boolean;
  error: string | null;
}

// Action types
type BookingAction =
  | { type: 'SET_DATES'; checkIn: Date; checkOut: Date }
  | { type: 'SET_PAX_COUNT'; paxCount: 1 | 2 | 3 }
  | { type: 'SET_AVAILABLE_CABINS'; cabins: CabinAvailability[] }
  | { type: 'SELECT_CABIN'; cabin: CabinAvailability }
  | { type: 'SET_PRICING'; pricing: PriceCalculateResponse }
  | { type: 'SET_GUEST_DETAILS'; details: GuestDetailsInput }
  | { type: 'SET_NOTES'; notes: string }
  | { type: 'SET_STEP'; step: 1 | 2 | 3 | 4 }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'RESET' };

// Initial state
const initialState: BookingState = {
  step: 1,
  checkIn: null,
  checkOut: null,
  paxCount: 2,
  availableCabins: [],
  selectedCabin: null,
  pricing: null,
  guestDetails: null,
  notes: '',
  isLoading: false,
  error: null,
};

// Reducer
function bookingReducer(state: BookingState, action: BookingAction): BookingState {
  switch (action.type) {
    case 'SET_DATES':
      return {
        ...state,
        checkIn: action.checkIn,
        checkOut: action.checkOut,
        // Reset dependent state when dates change
        selectedCabin: null,
        pricing: null,
        error: null,
      };
    case 'SET_PAX_COUNT':
      return {
        ...state,
        paxCount: action.paxCount,
        // Reset pricing when pax count changes
        pricing: null,
      };
    case 'SET_AVAILABLE_CABINS':
      return {
        ...state,
        availableCabins: action.cabins,
      };
    case 'SELECT_CABIN':
      return {
        ...state,
        selectedCabin: action.cabin,
        error: null,
      };
    case 'SET_PRICING':
      return {
        ...state,
        pricing: action.pricing,
      };
    case 'SET_GUEST_DETAILS':
      return {
        ...state,
        guestDetails: action.details,
        error: null,
      };
    case 'SET_NOTES':
      return {
        ...state,
        notes: action.notes,
      };
    case 'SET_STEP':
      return {
        ...state,
        step: action.step,
        error: null,
      };
    case 'NEXT_STEP':
      return {
        ...state,
        step: Math.min(state.step + 1, 4) as 1 | 2 | 3 | 4,
        error: null,
      };
    case 'PREV_STEP':
      return {
        ...state,
        step: Math.max(state.step - 1, 1) as 1 | 2 | 3 | 4,
        error: null,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.isLoading,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.error,
        isLoading: false,
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

// Context type
interface BookingContextType {
  state: BookingState;
  dispatch: React.Dispatch<BookingAction>;
  // Helper methods
  checkAvailability: () => Promise<void>;
  calculatePricing: () => Promise<void>;
  submitReservation: () => Promise<{ id: string; cabin_name: string; total_amount_crc: number } | null>;
  getNights: () => number;
}

const BookingContext = createContext<BookingContextType | null>(null);

// Provider component
export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(bookingReducer, initialState);

  // Calculate number of nights
  const getNights = useCallback(() => {
    if (!state.checkIn || !state.checkOut) return 0;
    const diffTime = state.checkOut.getTime() - state.checkIn.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [state.checkIn, state.checkOut]);

  // Check availability API call
  const checkAvailability = useCallback(async () => {
    if (!state.checkIn || !state.checkOut) return;

    dispatch({ type: 'SET_LOADING', isLoading: true });
    dispatch({ type: 'SET_ERROR', error: null });

    try {
      const checkInStr = state.checkIn.toISOString().split('T')[0];
      const checkOutStr = state.checkOut.toISOString().split('T')[0];

      const response = await fetch(
        `/api/availability?check_in=${checkInStr}&check_out=${checkOutStr}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al verificar disponibilidad');
      }

      dispatch({ type: 'SET_AVAILABLE_CABINS', cabins: data.cabins });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    } finally {
      dispatch({ type: 'SET_LOADING', isLoading: false });
    }
  }, [state.checkIn, state.checkOut]);

  // Calculate pricing API call
  const calculatePricing = useCallback(async () => {
    const nights = getNights();
    if (nights <= 0) return;

    dispatch({ type: 'SET_LOADING', isLoading: true });

    try {
      const response = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pax_count: state.paxCount,
          nights,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al calcular precio');
      }

      dispatch({ type: 'SET_PRICING', pricing: data });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    } finally {
      dispatch({ type: 'SET_LOADING', isLoading: false });
    }
  }, [state.paxCount, getNights]);

  // Submit reservation API call
  const submitReservation = useCallback(async () => {
    if (!state.checkIn || !state.checkOut || !state.selectedCabin || !state.guestDetails) {
      dispatch({ type: 'SET_ERROR', error: 'Información incompleta' });
      return null;
    }

    dispatch({ type: 'SET_LOADING', isLoading: true });
    dispatch({ type: 'SET_ERROR', error: null });

    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cabin_id: state.selectedCabin.cabin_id,
          check_in: state.checkIn.toISOString().split('T')[0],
          check_out: state.checkOut.toISOString().split('T')[0],
          pax_count: state.paxCount,
          guest_details: state.guestDetails,
          notes: state.notes || undefined,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear reserva');
      }

      return data;
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
      return null;
    } finally {
      dispatch({ type: 'SET_LOADING', isLoading: false });
    }
  }, [state.checkIn, state.checkOut, state.selectedCabin, state.guestDetails, state.paxCount, state.notes]);

  return (
    <BookingContext.Provider
      value={{
        state,
        dispatch,
        checkAvailability,
        calculatePricing,
        submitReservation,
        getNights,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
}

// Hook to use booking context
export function useBooking() {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
}
