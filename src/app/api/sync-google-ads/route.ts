import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Constantes da Google Ads API
const GOOGLE_ADS_API = 'https://googleads.googleapis.com/v18'
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const MICROS = 1e6

let cachedToken: { accessToken: string; expiresAt: number } | null = null

// Valida credenciais necessárias
function isGoogleAdsConfigured(): boolean {
  return !![
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    process.env.GOOGLE_ADS_CLIENT_ID,
    process.env.GOOGLE_ADS_CLIENT_SECRET,
    process.env.GOOGLE_ADS_REFRESH_TOKEN,
    process.env.GOOGLE_ADS_CUSTOMER_ID,
  ].every(Boolean)
}

// OAuth: obtém access token (com cache)
async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 5 * 60 * 1000) {
    return cachedToken.accessToken
  }

  const res = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
      grant_type: 'refresh_token',
    }),
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Google OAuth error: ${res.status} — ${body}`)
  }

  const json: { access_token: string; expires_in: number } = await res.json()
  cachedToken = {
    accessToken: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  }
  return cachedToken.accessToken
}

// GAQL: executa query na Google Ads API
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function gaqlSearch(query: string): Promise<any[]> {
  const accessToken = await getAccessToken()
  const custId = (process.env.GOOGLE_ADS_CUSTOMER_ID ?? '').replace(/\D/g, '')

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    'Content-Type': 'application/json',
  }
  const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID
  if (loginCustomerId) {
    headers['login-customer-id'] = loginCustomerId.replace(/\D/g, '')
  }

  const res = await fetch(`${GOOGLE_ADS_API}/customers/${custId}/googleAds:search`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query }),
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Google Ads API error: ${res.status} — ${body}`)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json: { results?: any[] } = await res.json()
  return json.results ?? []
}

// Sincroniza dados de um período específico com o Supabase
async function syncPeriod(since: string, until: string): Promise<number> {
  const rows = await gaqlSearch(`
    SELECT
      segments.date,
      metrics.cost_micros,
      metrics.impressions,
      metrics.clicks
    FROM customer
    WHERE segments.date >= '${since}' AND segments.date <= '${until}'
    ORDER BY segments.date ASC
  `)

  if (!rows || rows.length === 0) {
    console.log(`[Sync] No data for period ${since} to ${until}`)
    return 0
  }

  // Converte para formato esperado pelo Supabase
  const dailyData = rows.map(r => ({
    data: r.segments?.date ?? '',
    custo: parseInt(r.metrics?.costMicros ?? '0', 10) / MICROS,
    impressoes: parseInt(r.metrics?.impressions ?? '0', 10),
    cliques: parseInt(r.metrics?.clicks ?? '0', 10),
  }))

  // Supabase: insere/atualiza dados
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Remove dados antigos do período (para evitar duplicatas)
  const { error: deleteError } = await supabase
    .from('google_ads_daily')
    .delete()
    .gte('data', since)
    .lte('data', until)

  if (deleteError) {
    console.error(`[Sync] Delete error:`, deleteError)
    throw new Error(`Delete error: ${deleteError.message}`)
  }

  // Insere novos dados
  const { error: insertError } = await supabase
    .from('google_ads_daily')
    .insert(dailyData)

  if (insertError) {
    console.error(`[Sync] Insert error:`, insertError)
    throw new Error(`Insert error: ${insertError.message}`)
  }

  console.log(`[Sync] Synced ${dailyData.length} records from ${since} to ${until}`)
  return dailyData.length
}

// Endpoint: POST /api/sync-google-ads?days=N (sincroniza N dias)
export async function POST(request: NextRequest) {
  // Validação: token secreto para proteger o endpoint
  const authHeader = request.headers.get('authorization')
  const expectedToken = `Bearer ${process.env.SYNC_SECRET_TOKEN}`
  if (authHeader !== expectedToken) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  if (!isGoogleAdsConfigured()) {
    return NextResponse.json(
      { error: 'Google Ads not configured' },
      { status: 400 }
    )
  }

  try {
    const days = parseInt(request.nextUrl.searchParams.get('days') ?? '7', 10)
    const until = new Date().toISOString().split('T')[0]
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]

    console.log(`[Sync] Starting sync from ${since} to ${until} (${days} days)`)
    const count = await syncPeriod(since, until)

    return NextResponse.json({
      success: true,
      synced: count,
      period: { since, until },
    })
  } catch (error) {
    console.error('[Sync Error]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Endpoint: GET /api/sync-google-ads (retorna status)
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    configured: isGoogleAdsConfigured(),
    usage: 'POST /api/sync-google-ads?days=N with Authorization: Bearer {SYNC_SECRET_TOKEN}',
  })
}
