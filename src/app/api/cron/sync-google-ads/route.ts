import { NextResponse, type NextRequest } from 'next/server'
import { syncGoogleAdsToSupabase } from '@/lib/google-sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Vercel Cron envia `Authorization: Bearer $CRON_SECRET` automaticamente.
// Chamada manual: GET /api/cron/sync-google-ads?days=30 com o mesmo header.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const days = Math.min(Math.max(parseInt(request.nextUrl.searchParams.get('days') ?? '7', 10) || 7, 1), 90)

  try {
    const result = await syncGoogleAdsToSupabase(days)
    return NextResponse.json({ success: true, ...result, timestamp: new Date().toISOString() })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[CRON sync-google-ads]', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
