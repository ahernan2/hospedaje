import { type PolyOSClient, todayCR, formatCRC } from '../../shared/api-client.js';

interface Deps {
  api: PolyOSClient;
  send: (text: string) => Promise<void>;
}

export function createMorningBriefingJob(deps: Deps) {
  return async (): Promise<void> => {
    const { api, send } = deps;
    const today = todayCR();

    console.log(`[morning-briefing] Running for ${today}`);

    try {
      const [reservations, cabins] = await Promise.all([
        api.listReservations(),
        api.listCabins(),
      ]);

      const checkIns = reservations.filter((r) => r.check_in === today && r.status !== 'cancelled');
      const checkOuts = reservations.filter((r) => r.check_out === today && r.status !== 'cancelled');
      const unpaid = reservations.filter((r) => r.payment_status === 'unpaid' && r.status !== 'cancelled');
      const occupied = cabins.filter((c) => c.cabin_status === 'occupied').length;

      // Fetch weather
      let weatherLine = '';
      try {
        const res = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=8.64&longitude=-83.17&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=America/Costa_Rica&forecast_days=1',
        );
        if (res.ok) {
          const data = (await res.json()) as {
            daily: {
              temperature_2m_max: number[];
              temperature_2m_min: number[];
              precipitation_probability_max: number[];
            };
          };
          const d = data.daily;
          weatherLine = `🌡️ Max ${d.temperature_2m_max[0]}°C, Min ${d.temperature_2m_min[0]}°C, Lluvia ${d.precipitation_probability_max[0]}%`;
        }
      } catch {
        weatherLine = 'Clima no disponible';
      }

      const lines: string[] = [
        `*Buenos días Ana Cecilia* ☀️`,
        `📅 Resumen del ${today}`,
        '',
      ];

      if (checkIns.length > 0) {
        lines.push(`*Check-ins hoy* (${checkIns.length}):`);
        for (const r of checkIns) {
          const name = r.guest_name ?? r.guest_details?.name ?? 'N/A';
          lines.push(`  - ${name} → ${r.cabin_name} (${r.pax_count} pax)`);
        }
        lines.push('');
      } else {
        lines.push('*Check-ins hoy:* ninguno');
        lines.push('');
      }

      if (checkOuts.length > 0) {
        lines.push(`*Check-outs hoy* (${checkOuts.length}):`);
        for (const r of checkOuts) {
          const name = r.guest_name ?? r.guest_details?.name ?? 'N/A';
          lines.push(`  - ${name} ← ${r.cabin_name}`);
        }
        lines.push('');
      } else {
        lines.push('*Check-outs hoy:* ninguno');
        lines.push('');
      }

      lines.push(`🏠 Ocupación: ${occupied}/${cabins.length} cabañas`);
      if (unpaid.length > 0) {
        lines.push(`💰 Pagos pendientes: *${unpaid.length}*`);
      }
      if (weatherLine) lines.push(weatherLine);

      await send(lines.join('\n'));
      console.log('[morning-briefing] Sent successfully');
    } catch (err) {
      console.error('[morning-briefing] Error:', err);
    }
  };
}
