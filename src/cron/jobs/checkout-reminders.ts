import { type PolyOSClient, todayCR } from '../../shared/api-client.js';

interface Deps {
  api: PolyOSClient;
  send: (text: string) => Promise<void>;
}

export function createCheckoutRemindersJob(deps: Deps) {
  return async (): Promise<void> => {
    const { api, send } = deps;
    const today = todayCR();

    console.log(`[checkout-reminders] Running for ${today}`);

    try {
      const [confirmed, checkedIn] = await Promise.all([
        api.listReservations({ status: 'confirmed' }),
        api.listReservations({ status: 'checked_in' }),
      ]);

      const todayCheckouts = [...confirmed, ...checkedIn].filter((r) => r.check_out === today);

      if (todayCheckouts.length === 0) {
        console.log('[checkout-reminders] No checkouts today');
        return;
      }

      const lines = todayCheckouts.map((r) => {
        const name = r.guest_name ?? r.guest_details?.name ?? 'N/A';
        return `- *${r.cabin_name}*: ${name} (${r.pax_count} pax)`;
      });

      const message = [
        `*Check-outs de hoy* 🧹 (${todayCheckouts.length})`,
        '',
        ...lines,
        '',
        'Preparar cabañas para limpieza después del check-out (11:00 AM).',
      ].join('\n');

      await send(message);
      console.log(`[checkout-reminders] Sent reminder for ${todayCheckouts.length} checkouts`);
    } catch (err) {
      console.error('[checkout-reminders] Error:', err);
    }
  };
}
