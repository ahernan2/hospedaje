import { type PolyOSClient } from '../../shared/api-client.js';

interface Deps {
  api: PolyOSClient;
  send: (text: string) => Promise<void>;
}

export function createIcalSyncCheckJob(deps: Deps) {
  return async (): Promise<void> => {
    const { api, send } = deps;

    try {
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const activity = await api.getActivityLog({ action: 'ical_sync', limit: 1 });

      const hasRecentSync = activity.length > 0 && activity[0].created_at >= thirtyMinAgo;

      if (!hasRecentSync) {
        await send(
          '*⚠️ Alerta iCal:* No se ha detectado sincronización en los últimos 30 minutos.\nVerificar que el servicio de sincronización esté funcionando.',
        );
        console.warn('[ical-sync-check] No recent iCal sync detected');
      }
    } catch (err) {
      console.error('[ical-sync-check] Error:', err);
    }
  };
}
