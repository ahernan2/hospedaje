import { type PolyOSClient, todayCR } from '../../shared/api-client.js';

interface Deps {
  api: PolyOSClient;
  send: (text: string) => Promise<void>;
}

export function createOccupancyForecastJob(deps: Deps) {
  return async (): Promise<void> => {
    const { api, send } = deps;
    const today = todayCR();

    console.log('[occupancy-forecast] Running');

    try {
      const [reservations, cabins] = await Promise.all([
        api.listReservations(),
        api.listCabins(),
      ]);

      const totalCabins = cabins.length;
      const todayDate = new Date(today + 'T12:00:00');

      // Build 14-day forecast
      const forecast: Array<{ date: string; occupied: number; pct: number }> = [];
      for (let i = 0; i < 14; i++) {
        const d = new Date(todayDate);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];

        const occupied = reservations.filter((r) => {
          if (r.status === 'cancelled') return false;
          return r.check_in <= dateStr && r.check_out > dateStr;
        }).length;

        forecast.push({
          date: dateStr,
          occupied: Math.min(occupied, totalCabins),
          pct: totalCabins > 0 ? Math.round((Math.min(occupied, totalCabins) / totalCabins) * 100) : 0,
        });
      }

      // Format as text without LLM
      const bar = (pct: number) => {
        const filled = Math.round(pct / 10);
        return '█'.repeat(filled) + '░'.repeat(10 - filled);
      };

      const avgPct = Math.round(forecast.reduce((s, d) => s + d.pct, 0) / forecast.length);
      const lowDays = forecast.filter((d) => d.pct < 40);
      const highDays = forecast.filter((d) => d.pct >= 80);

      const lines = [
        `*Pronóstico de ocupación — 14 días* 📊`,
        `Desde: ${today} | Cabañas: ${totalCabins}`,
        '',
        ...forecast.map((d) => `${d.date}  ${bar(d.pct)} ${d.pct}% (${d.occupied}/${totalCabins})`),
        '',
        `Promedio: *${avgPct}%*`,
      ];

      if (highDays.length > 0) {
        lines.push(`✅ Días llenos (≥80%): ${highDays.map((d) => d.date.slice(5)).join(', ')}`);
      }
      if (lowDays.length > 0) {
        lines.push(`📉 Días bajos (<40%): ${lowDays.map((d) => d.date.slice(5)).join(', ')}`);
        if (lowDays.length >= 3) {
          lines.push('💡 Considera promociones para los días con baja ocupación.');
        }
      }

      await send(lines.join('\n'));
      console.log('[occupancy-forecast] Sent successfully');
    } catch (err) {
      console.error('[occupancy-forecast] Error:', err);
    }
  };
}
