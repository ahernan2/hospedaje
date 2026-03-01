import cron from 'node-cron';
import { WhatsAppSender } from './whatsapp.js';
import { getApiClient } from '../shared/api-client.js';
import { createMorningBriefingJob } from './jobs/morning-briefing.js';
import { createPaymentRemindersJob } from './jobs/payment-reminders.js';
import { createCheckoutRemindersJob } from './jobs/checkout-reminders.js';
import { createIcalSyncCheckJob } from './jobs/ical-sync-check.js';
import { createOccupancyForecastJob } from './jobs/occupancy-forecast.js';

const TZ = 'America/Costa_Rica';

async function main() {
  console.log('[cron] Starting Poly cron service...');

  // Connect WhatsApp
  const wa = new WhatsAppSender();
  console.log('[cron] Connecting to WhatsApp (scan QR if shown)...');
  await wa.start();
  console.log('[cron] WhatsApp ready');

  const api = getApiClient();
  const send = (text: string) => wa.send(text);
  const deps = { api, send };

  // ── Jobs ──────────────────────────────────────────────────────────────

  // 06:00 — Check-out reminders (before check-out time)
  cron.schedule('0 6 * * *', createCheckoutRemindersJob(deps), { timezone: TZ });

  // 07:00 — Morning briefing
  cron.schedule('0 7 * * *', createMorningBriefingJob(deps), { timezone: TZ });

  // 09:00 — Payment reminders
  cron.schedule('0 9 * * *', createPaymentRemindersJob(deps), { timezone: TZ });

  // Every 30 minutes — iCal sync check
  cron.schedule('*/30 * * * *', createIcalSyncCheckJob(deps), { timezone: TZ });

  // 08:00 Monday — Weekly occupancy forecast
  cron.schedule('0 8 * * 1', createOccupancyForecastJob(deps), { timezone: TZ });

  console.log('[cron] All jobs scheduled. Running...');
  console.log('[cron]   06:00 CR — Check-out reminders');
  console.log('[cron]   07:00 CR — Morning briefing');
  console.log('[cron]   09:00 CR — Payment reminders');
  console.log('[cron]   */30  CR — iCal sync check');
  console.log('[cron]   Mon 08:00 CR — Occupancy forecast');

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\n[cron] Shutting down...');
    await wa.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[cron] Fatal error:', err);
  process.exit(1);
});
