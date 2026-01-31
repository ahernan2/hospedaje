import ical from 'node-ical';
import { createServiceClient } from './supabase';

interface ICalEvent {
  type: string;
  uid: string;
  start: Date;
  end: Date;
  summary?: string;
}

/**
 * Fetches iCal from Booking.com and syncs to external_blocks table
 * Should be run as a cron job (e.g., every 15 minutes)
 */
export async function syncBookingComCalendar(cabinId: string): Promise<{
  synced: number;
  errors: string[];
}> {
  const supabase = createServiceClient();
  const errors: string[] = [];
  let synced = 0;

  try {
    // Get cabin's iCal URL
    const { data: cabin, error: cabinError } = await supabase
      .from('cabins')
      .select('id, name, ical_import_url')
      .eq('id', cabinId)
      .single();

    if (cabinError || !cabin) {
      throw new Error(`Cabin not found: ${cabinId}`);
    }

    if (!cabin.ical_import_url) {
      return { synced: 0, errors: ['No iCal URL configured for this cabin'] };
    }

    // Fetch and parse iCal
    const events = await ical.async.fromURL(cabin.ical_import_url);

    // Process each event
    for (const [, event] of Object.entries(events)) {
      const vevent = event as ICalEvent;
      if (vevent.type !== 'VEVENT') continue;

      // Skip events without valid dates
      if (!vevent.start || !vevent.end) continue;

      const startDate = new Date(vevent.start).toISOString().split('T')[0];
      const endDate = new Date(vevent.end).toISOString().split('T')[0];

      // Upsert to external_blocks (using external_uid for deduplication)
      const { error: upsertError } = await supabase
        .from('external_blocks')
        .upsert(
          {
            cabin_id: cabinId,
            start_date: startDate,
            end_date: endDate,
            source: 'Booking.com iCal',
            external_uid: vevent.uid,
          },
          {
            onConflict: 'cabin_id,external_uid',
          }
        );

      if (upsertError) {
        errors.push(`Failed to sync event ${vevent.uid}: ${upsertError.message}`);
      } else {
        synced++;
      }
    }

    // Clean up old blocks that are no longer in the iCal
    // Remove blocks older than 30 days in the past
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    await supabase
      .from('external_blocks')
      .delete()
      .eq('cabin_id', cabinId)
      .lt('end_date', thirtyDaysAgo.toISOString().split('T')[0]);

    return { synced, errors };
  } catch (error) {
    return {
      synced: 0,
      errors: [(error as Error).message],
    };
  }
}

/**
 * Sync all cabins with configured iCal URLs
 */
export async function syncAllCabins(): Promise<{
  results: { cabin_id: string; cabin_name: string; synced: number; errors: string[] }[];
}> {
  const supabase = createServiceClient();

  const { data: cabins } = await supabase
    .from('cabins')
    .select('id, name, ical_import_url')
    .not('ical_import_url', 'is', null);

  if (!cabins) return { results: [] };

  const results = await Promise.all(
    cabins.map(async (cabin) => {
      const { synced, errors } = await syncBookingComCalendar(cabin.id);
      return {
        cabin_id: cabin.id,
        cabin_name: cabin.name,
        synced,
        errors,
      };
    })
  );

  return { results };
}
