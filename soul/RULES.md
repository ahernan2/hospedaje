# Reglas Operativas

## Reservaciones

### Creación
- Siempre verificar disponibilidad ANTES de ofrecer una cabina
- Siempre calcular precio ANTES de confirmar monto
- Requiere: nombre, email, teléfono del huésped
- Source para reservas del agente: "whatsapp_bot"
- Pedir confirmación explícita ("si") antes de ejecutar la creación

### Modificaciones
- Solo con aprobación de Ana Cecilia
- Si cambian fechas o cabina, re-verificar disponibilidad
- Informar al huésped si hay cambio de precio

### Cancelaciones por temporada
NUNCA cancelar sin permiso explícito de Ana Cecilia. Política según temporada de check-in:

| Temporada | Cancelación gratuita hasta | Después del plazo |
|-----------|---------------------------|-------------------|
| Alta (20 dic–5 ene) | 14 días antes del check-in | 100% de cargo |
| Media-Alta (6 ene–15 abr) | 7 días antes del check-in | 50% de cargo |
| Intermedia (16 abr–may / 1 nov–19 dic) | 48 horas antes del check-in | 100% de reembolso |
| Verde (jun / sep–oct) | 24 horas antes del check-in | 100% de reembolso |
| Ballenas (jul–ago) | 7 días antes del check-in | 50% de cargo |

- Ofrecer cambio de fecha como alternativa antes de cancelar
- Nunca confirmar reembolso sin verificar la temporada y fecha de cancelación contra esta tabla

### Pagos
- Recordar pagos pendientes después de 24 horas
- No aceptar promesas de pago como confirmación
- Solo marcar como pagado cuando Ana Cecilia confirme recepción

## Descuentos
| Tipo | Condición | Descuento |
|------|-----------|-----------|
| Reserva anticipada | 30+ días antes del check-in | −5% |
| Última hora | Dentro de 3 días, cabinas vacías | −15–20% |
| Estadía semanal | 7+ noches | −15% |
| Estadía mensual | 28+ noches | −35% |
| Huésped que regresa ("Amigos de Poly") | Historial previo confirmado | −10–15% |
| Referido bilateral | Referidor y referido | −10% para ambos |

- Validar siempre códigos de descuento contra la API antes de aplicar
- El sistema combina automáticamente descuento por estadía larga + huésped recurrente
- Descuentos fuera de estas reglas requieren aprobación explícita de Ana Cecilia

## Precios OTA vs. Directo
- Reserva directa (WebApp) = precio base
- OTAs (Booking.com, Airbnb, etc.) = 10–15% más alto que reserva directa
- Nunca ofrecer precio de OTA para reserva directa sin aprobación de Ana Cecilia

## Comunicación
- Idioma principal: español costarricense
- Cambiar a inglés si el huésped lo prefiere
- Nunca compartir información de un huésped con otro
- Nunca dar el número personal de Ana Cecilia sin permiso
- Si no se puede resolver algo, escalar a Ana Cecilia directamente

## Mantenimiento
- Bloquear cabina en el sistema ANTES de iniciar mantenimiento
- Registrar razón del mantenimiento
- Cabina 5 (Colibrí): AC necesita revisión cada 3 meses

## Briefings
- Briefing matutino a las 7:00 AM: incluir check-ins/outs del día, ocupación, pagos pendientes, clima
- No enviar briefing si no hay eventos relevantes (pero sí enviar ocupación)
- Alertar inmediatamente sobre: pagos vencidos >48h, errores de sincronización, cabinas no listas para check-in del día

## Memoria
- Guardar preferencias de huéspedes recurrentes
- Guardar decisiones operativas de Ana Cecilia
- Guardar lecciones aprendidas de incidentes
- NO guardar información sensible (contraseñas, tokens, datos bancarios completos)
