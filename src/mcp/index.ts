import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { getApiClient, todayCR } from '../shared/api-client.js';

// ── Tool definitions (JSON Schema for MCP, Zod for runtime validation) ──

const tools: Tool[] = [
  {
    name: 'check_availability',
    description: 'Verifica disponibilidad de cabañas para un rango de fechas. Úsalo antes de crear cualquier reserva.',
    inputSchema: {
      type: 'object',
      properties: {
        check_in: { type: 'string', description: 'Fecha de entrada en formato YYYY-MM-DD' },
        check_out: { type: 'string', description: 'Fecha de salida en formato YYYY-MM-DD' },
        cabin_id: { type: 'string', description: 'ID de cabaña específica (opcional, para verificar una sola)' },
      },
      required: ['check_in', 'check_out'],
    },
  },
  {
    name: 'calculate_price',
    description: 'Calcula el precio total de una estadía con desglose por temporada y descuentos aplicables.',
    inputSchema: {
      type: 'object',
      properties: {
        pax_count: { type: 'number', description: 'Número de personas (1-3)' },
        check_in: { type: 'string', description: 'Fecha de entrada YYYY-MM-DD' },
        check_out: { type: 'string', description: 'Fecha de salida YYYY-MM-DD' },
        discount_code: { type: 'string', description: 'Código de descuento (opcional)' },
        customer_id: { type: 'string', description: 'ID del cliente para descuento de cliente frecuente (opcional)' },
      },
      required: ['pax_count', 'check_in', 'check_out'],
    },
  },
  {
    name: 'list_reservations',
    description: 'Lista las reservas del hotel. Filtra por estado para ver reservas pendientes, confirmadas, check-in activo o canceladas.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['pending_payment', 'confirmed', 'checked_in', 'cancelled'],
          description: 'Filtrar por estado (opcional, sin filtro devuelve todas)',
        },
        limit: { type: 'number', description: 'Máximo de resultados (por defecto 50)' },
        offset: { type: 'number', description: 'Desplazamiento para paginación' },
      },
    },
  },
  {
    name: 'get_reservation',
    description: 'Obtiene todos los detalles de una reserva específica por ID.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID de la reserva' },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_reservation',
    description: 'Crea una nueva reserva. IMPORTANTE: verificar disponibilidad y precio primero. Requiere confirmación explícita de Ana Cecilia antes de ejecutar.',
    inputSchema: {
      type: 'object',
      properties: {
        cabin_id: { type: 'string', description: 'ID de la cabaña' },
        check_in: { type: 'string', description: 'Fecha de entrada YYYY-MM-DD' },
        check_out: { type: 'string', description: 'Fecha de salida YYYY-MM-DD' },
        pax_count: { type: 'number', description: 'Número de personas (máximo 3)' },
        guest_name: { type: 'string', description: 'Nombre completo del huésped' },
        guest_email: { type: 'string', description: 'Correo del huésped' },
        guest_phone: { type: 'string', description: 'Teléfono del huésped' },
        payment_method: { type: 'string', description: 'Método de pago (ej: SINPE, efectivo, transferencia)' },
        discount_code: { type: 'string', description: 'Código de descuento (opcional)' },
        notes: { type: 'string', description: 'Notas adicionales (opcional)' },
      },
      required: ['cabin_id', 'check_in', 'check_out', 'pax_count', 'guest_name', 'guest_email', 'guest_phone'],
    },
  },
  {
    name: 'update_reservation_status',
    description: 'Cambia el estado de una reserva (ej: de confirmed a checked_in cuando llega el huésped). Requiere confirmación de Ana Cecilia.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID de la reserva' },
        status: {
          type: 'string',
          enum: ['pending_payment', 'confirmed', 'checked_in', 'cancelled'],
          description: 'Nuevo estado',
        },
      },
      required: ['id', 'status'],
    },
  },
  {
    name: 'update_payment_status',
    description: 'Actualiza el estado de pago de una reserva. Úsalo cuando Ana Cecilia confirma haber recibido el pago.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID de la reserva' },
        payment_status: {
          type: 'string',
          enum: ['unpaid', 'deposit_paid', 'fully_paid'],
          description: 'Estado de pago',
        },
      },
      required: ['id', 'payment_status'],
    },
  },
  {
    name: 'cancel_reservation',
    description: 'Cancela una reserva. NUNCA cancelar sin permiso explícito de Ana Cecilia. Sin reembolso dentro de 48h del check-in.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID de la reserva a cancelar' },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_cabins',
    description: 'Lista todas las cabañas con su estado actual (disponible, ocupada, mantenimiento).',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'create_maintenance_block',
    description: 'Bloquea una cabaña por mantenimiento. La cabaña no aparecerá disponible durante ese período.',
    inputSchema: {
      type: 'object',
      properties: {
        cabin_id: { type: 'string', description: 'ID de la cabaña' },
        start_date: { type: 'string', description: 'Inicio del bloqueo YYYY-MM-DD' },
        end_date: { type: 'string', description: 'Fin del bloqueo YYYY-MM-DD' },
        reason: { type: 'string', description: 'Motivo del mantenimiento (opcional)' },
      },
      required: ['cabin_id', 'start_date', 'end_date'],
    },
  },
  {
    name: 'query_activity_log',
    description: 'Consulta el historial de actividad del sistema (reservas creadas, modificadas, pagos, etc.).',
    inputSchema: {
      type: 'object',
      properties: {
        entity_type: { type: 'string', description: 'Tipo de entidad (ej: reservation, cabin)' },
        entity_id: { type: 'string', description: 'ID de la entidad específica' },
        action: { type: 'string', description: 'Tipo de acción (ej: created, updated, ical_sync)' },
        limit: { type: 'number', description: 'Máximo de resultados' },
      },
    },
  },
  {
    name: 'list_customers',
    description: 'Lista los clientes registrados con su historial de estadías.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'validate_discount_code',
    description: 'Verifica si un código de descuento es válido y cuánto descuento aplica.',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Código de descuento a validar' },
      },
      required: ['code'],
    },
  },
  {
    name: 'get_weather',
    description: 'Obtiene el pronóstico del tiempo para Golfito, Costa Rica (ubicación del hotel).',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_exchange_rate',
    description: 'Obtiene la tasa de cambio actual USD a CRC (colones costarricenses).',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_current_datetime',
    description: 'Obtiene la fecha y hora actual en la zona horaria de Costa Rica.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

// ── Zod schemas for runtime validation ───────────────────────────────

const CheckAvailabilitySchema = z.object({
  check_in: z.string(),
  check_out: z.string(),
  cabin_id: z.string().optional(),
});

const CalculatePriceSchema = z.object({
  pax_count: z.number().int().min(1).max(10),
  check_in: z.string(),
  check_out: z.string(),
  discount_code: z.string().optional(),
  customer_id: z.string().optional(),
});

const ListReservationsSchema = z.object({
  status: z.enum(['pending_payment', 'confirmed', 'checked_in', 'cancelled']).optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
});

const GetReservationSchema = z.object({ id: z.string() });

const CreateReservationSchema = z.object({
  cabin_id: z.string(),
  check_in: z.string(),
  check_out: z.string(),
  pax_count: z.number().int().min(1).max(3),
  guest_name: z.string(),
  guest_email: z.string(),
  guest_phone: z.string(),
  payment_method: z.string().optional(),
  discount_code: z.string().optional(),
  notes: z.string().optional(),
});

const UpdateReservationStatusSchema = z.object({
  id: z.string(),
  status: z.enum(['pending_payment', 'confirmed', 'checked_in', 'cancelled']),
});

const UpdatePaymentStatusSchema = z.object({
  id: z.string(),
  payment_status: z.enum(['unpaid', 'deposit_paid', 'fully_paid']),
});

const CancelReservationSchema = z.object({ id: z.string() });

const CreateMaintenanceBlockSchema = z.object({
  cabin_id: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  reason: z.string().optional(),
});

const QueryActivityLogSchema = z.object({
  entity_type: z.string().optional(),
  entity_id: z.string().optional(),
  action: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

const ValidateDiscountCodeSchema = z.object({ code: z.string() });

// ── Tool handler ──────────────────────────────────────────────────────

async function handleTool(name: string, args: unknown): Promise<unknown> {
  const api = getApiClient();

  switch (name) {
    case 'check_availability': {
      const { check_in, check_out, cabin_id } = CheckAvailabilitySchema.parse(args);
      return api.checkAvailability(check_in, check_out, cabin_id);
    }

    case 'calculate_price': {
      const params = CalculatePriceSchema.parse(args);
      return api.calculatePricing(params);
    }

    case 'list_reservations': {
      const filters = ListReservationsSchema.parse(args);
      return api.listReservations(filters);
    }

    case 'get_reservation': {
      const { id } = GetReservationSchema.parse(args);
      return api.getReservation(id);
    }

    case 'create_reservation': {
      const params = CreateReservationSchema.parse(args);
      return api.createReservation({
        cabin_id: params.cabin_id,
        check_in: params.check_in,
        check_out: params.check_out,
        pax_count: params.pax_count,
        guest_details: {
          name: params.guest_name,
          email: params.guest_email,
          phone: params.guest_phone,
        },
        source: 'claude_desktop',
        payment_method: params.payment_method,
        discount_code: params.discount_code,
        notes: params.notes,
      });
    }

    case 'update_reservation_status': {
      const { id, status } = UpdateReservationStatusSchema.parse(args);
      return api.updateReservationStatus(id, status);
    }

    case 'update_payment_status': {
      const { id, payment_status } = UpdatePaymentStatusSchema.parse(args);
      return api.updatePaymentStatus(id, payment_status);
    }

    case 'cancel_reservation': {
      const { id } = CancelReservationSchema.parse(args);
      return api.cancelReservation(id);
    }

    case 'list_cabins': {
      return api.listCabins();
    }

    case 'create_maintenance_block': {
      const params = CreateMaintenanceBlockSchema.parse(args);
      return api.createMaintenanceBlock(params);
    }

    case 'query_activity_log': {
      const filters = QueryActivityLogSchema.parse(args);
      return api.getActivityLog(filters);
    }

    case 'list_customers': {
      return api.listCustomers();
    }

    case 'validate_discount_code': {
      const { code } = ValidateDiscountCodeSchema.parse(args);
      return api.validateDiscountCode(code);
    }

    case 'get_weather': {
      const res = await fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=8.64&longitude=-83.17&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=America/Costa_Rica&forecast_days=3',
      );
      if (!res.ok) throw new Error('No se pudo obtener el pronóstico del tiempo');
      const data = (await res.json()) as {
        daily: {
          time: string[];
          temperature_2m_max: number[];
          temperature_2m_min: number[];
          precipitation_probability_max: number[];
        };
      };
      return {
        ubicacion: 'Golfito, Costa Rica',
        pronostico: data.daily.time.map((date, i) => ({
          fecha: date,
          temperatura_max: data.daily.temperature_2m_max[i],
          temperatura_min: data.daily.temperature_2m_min[i],
          lluvia_probabilidad: data.daily.precipitation_probability_max[i],
        })),
      };
    }

    case 'get_exchange_rate': {
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        if (res.ok) {
          const data = (await res.json()) as { rates: Record<string, number>; time_last_update_utc: string };
          return {
            usd_to_crc: data.rates['CRC'],
            source: 'open.er-api.com',
            fecha: data.time_last_update_utc,
          };
        }
      } catch {
        // fall through to fallback
      }
      return { usd_to_crc: 520, source: 'fallback', fecha: new Date().toISOString() };
    }

    case 'get_current_datetime': {
      const now = new Date();
      const crStr = now.toLocaleString('es-CR', { timeZone: 'America/Costa_Rica' });
      return {
        fecha_hora: crStr,
        iso_date: todayCR(),
        timezone: 'America/Costa_Rica',
      };
    }

    default:
      throw new Error(`Herramienta desconocida: ${name}`);
  }
}

// ── Server setup ──────────────────────────────────────────────────────

const server = new Server(
  { name: 'poly-hotel', version: '2.0.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    const result = await handleTool(name, args ?? {});
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: 'text', text: `Error: ${message}` }],
      isError: true,
    };
  }
});

// ── Start ─────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
