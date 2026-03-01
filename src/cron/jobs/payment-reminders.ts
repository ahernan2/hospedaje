import { type PolyOSClient, formatCRC } from '../../shared/api-client.js';

interface Deps {
  api: PolyOSClient;
  send: (text: string) => Promise<void>;
}

export function createPaymentRemindersJob(deps: Deps) {
  return async (): Promise<void> => {
    const { api, send } = deps;

    console.log('[payment-reminders] Running');

    try {
      const reservations = await api.listReservations({ status: 'pending_payment' });

      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      const overdue = reservations.filter((r) => new Date(r.created_at).getTime() < cutoff);

      if (overdue.length === 0) {
        console.log('[payment-reminders] No overdue payments');
        return;
      }

      const lines = overdue.map((r) => {
        const name = r.guest_name ?? r.guest_details?.name ?? 'N/A';
        return `- *${name}* | ${r.cabin_name} | ${r.check_in} → ${r.check_out} | ${formatCRC(r.total_amount_crc)}`;
      });

      const message = [
        `*Recordatorio: pagos pendientes* (${overdue.length}) 💰`,
        '',
        ...lines,
        '',
        'Estas reservas llevan más de 24h sin pago confirmado.',
      ].join('\n');

      await send(message);
      console.log(`[payment-reminders] Sent reminder for ${overdue.length} reservations`);
    } catch (err) {
      console.error('[payment-reminders] Error:', err);
    }
  };
}
