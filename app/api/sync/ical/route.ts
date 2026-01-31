import { NextRequest, NextResponse } from 'next/server';
import { syncAllCabins, syncBookingComCalendar } from '@/lib/ical-sync';

// POST /api/sync/ical - Trigger iCal sync (for cron job or manual trigger)
export async function POST(request: NextRequest) {
  try {
    // Verify request is from authorized source (cron job or admin)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return NextResponse.json(
        { error: 'CRON_SECRET not configured' },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { cabin_id } = body as { cabin_id?: string };

    if (cabin_id) {
      // Sync specific cabin
      const result = await syncBookingComCalendar(cabin_id);
      return NextResponse.json(result);
    }

    // Sync all cabins
    const results = await syncAllCabins();
    return NextResponse.json(results);
  } catch (error) {
    console.error('iCal sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed' },
      { status: 500 }
    );
  }
}
