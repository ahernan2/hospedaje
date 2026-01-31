import { z } from 'zod';

// Guest details schema
export const guestDetailsSchema = z.object({
  name: z
    .string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre es demasiado largo'),
  email: z
    .string()
    .email('Por favor ingrese un correo electrónico válido'),
  phone: z
    .string()
    .min(8, 'El teléfono debe tener al menos 8 dígitos')
    .max(20, 'El teléfono es demasiado largo')
    .regex(/^[\d\s\-+()]+$/, 'Formato de teléfono inválido'),
});

export type GuestDetailsInput = z.infer<typeof guestDetailsSchema>;

// Create reservation request schema
export const createReservationSchema = z.object({
  cabin_id: z.string().uuid('ID de cabaña inválido'),
  check_in: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
  check_out: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
  pax_count: z
    .number()
    .int()
    .min(1, 'Mínimo 1 huésped')
    .max(3, 'Máximo 3 huéspedes'),
  guest_details: guestDetailsSchema,
  notes: z
    .string()
    .max(500, 'Las notas son demasiado largas')
    .optional(),
}).refine(
  (data) => {
    const checkIn = new Date(data.check_in);
    const checkOut = new Date(data.check_out);
    return checkOut > checkIn;
  },
  {
    message: 'La fecha de salida debe ser posterior a la fecha de entrada',
    path: ['check_out'],
  }
).refine(
  (data) => {
    const checkIn = new Date(data.check_in);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return checkIn >= today;
  },
  {
    message: 'La fecha de entrada no puede ser en el pasado',
    path: ['check_in'],
  }
);

export type CreateReservationInput = z.infer<typeof createReservationSchema>;

// Update reservation status schema (admin)
export const updateStatusSchema = z.object({
  status: z.enum(['pending_payment', 'confirmed', 'checked_in', 'cancelled']),
});

export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;

// Date range validation helper
export const dateRangeSchema = z.object({
  checkIn: z.date(),
  checkOut: z.date(),
}).refine(
  (data) => data.checkOut > data.checkIn,
  { message: 'La fecha de salida debe ser posterior a la fecha de entrada' }
);

// Pax count schema
export const paxCountSchema = z.number().int().min(1).max(3) as z.ZodType<1 | 2 | 3>;
