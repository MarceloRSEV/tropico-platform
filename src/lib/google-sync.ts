// ─── Sync Google Ads → Supabase ───────────────────────────────────────────────
// Grava métricas diárias por grupo de anúncios em `tropico_google_ads_daily`
// (projeto Supabase compartilhado — prefixo `tropico_` isola o cliente) e
// registra cada execução em `tropico_google_ads_sync_log`.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { gaqlSearch } from './google'

const MICROS = 1e6
const CLIENT_NAME = 'Trópico'

export interface SyncResult {
  since: string
  until: string
  records: number
}

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().split('T')[0]
}

async function logSync(
  supabase: SupabaseClient,
  customerId: string,
  syncDate: string,
  records: number,
  status: 'success' | 'failed',
  errorMessage: string | null,
) {
  const { error } = await supabase.from('tropico_google_ads_sync_log').upsert(
    {
      customer_id: customerId,
      client_name: CLIENT_NAME,
      sync_date: syncDate,
      records_synced: records,
      sync_status: status,
      error_message: errorMessage,
      synced_at: new Date().toISOString(),
    },
    { onConflict: 'customer_id,sync_date' },
  )
  if (error) console.warn('[Google sync] falha ao registrar log:', error.message)
}

/** Sincroniza os últimos `days` dias (incluindo hoje, parcial) via upsert idempotente. */
export async function syncGoogleAdsToSupabase(days = 7): Promise<SyncResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY não configurados')

  const customerId = (process.env.GOOGLE_ADS_CUSTOMER_ID ?? '').replace(/\D/g, '')
  const since = isoDaysAgo(days)
  const until = isoDaysAgo(0)
  const supabase = createClient(url, key, { auth: { persistSession: false } })

  try {
    const rows = await gaqlSearch(`
      SELECT
        campaign.id, campaign.name,
        ad_group.id, ad_group.name,
        metrics.impressions, metrics.clicks, metrics.conversions, metrics.cost_micros,
        segments.date
      FROM ad_group
      WHERE segments.date BETWEEN '${since}' AND '${until}'
    `)

    const syncedAt = new Date().toISOString()
    const payload = rows.map(r => ({
      customer_id: customerId,
      client_name: CLIENT_NAME,
      campaign_id: r.campaign?.id ?? null,
      campaign_name: r.campaign?.name ?? null,
      ad_group_id: r.adGroup?.id ?? null,
      ad_group_name: r.adGroup?.name ?? null,
      impressions: parseInt(r.metrics?.impressions ?? '0', 10),
      clicks: parseInt(r.metrics?.clicks ?? '0', 10),
      conversions: r.metrics?.conversions ?? 0,
      cost: parseInt(r.metrics?.costMicros ?? '0', 10) / MICROS,
      date: r.segments?.date ?? '',
      synced_at: syncedAt,
    }))

    if (payload.length > 0) {
      const { error } = await supabase
        .from('tropico_google_ads_daily')
        .upsert(payload, { onConflict: 'customer_id,campaign_id,ad_group_id,date' })
      if (error) throw new Error(`Supabase upsert: ${error.message}`)
    }

    await logSync(supabase, customerId, until, payload.length, 'success', null)
    return { since, until, records: payload.length }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    await logSync(supabase, customerId, until, 0, 'failed', message)
    throw e
  }
}
