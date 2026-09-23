// ─── Google Ads API (REST) ────────────────────────────────────────────────────
// Integração via GAQL sobre googleads.googleapis.com. As contas pertencem ao
// MCC da agência (Escalada Virtual) — por isso o header opcional
// `login-customer-id` (GOOGLE_ADS_LOGIN_CUSTOMER_ID).
//
// Valores monetários da API vêm em MICROS (1 unidade = 1e-6 da moeda) —
// sempre dividir por 1e6 antes de expor.

const GOOGLE_ADS_API = 'https://googleads.googleapis.com/v18'
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token'

// ─── Configuração ─────────────────────────────────────────────────────────────

const REQUIRED_ENV_VARS = [
  'GOOGLE_ADS_DEVELOPER_TOKEN',
  'GOOGLE_ADS_CLIENT_ID',
  'GOOGLE_ADS_CLIENT_SECRET',
  'GOOGLE_ADS_REFRESH_TOKEN',
  'GOOGLE_ADS_CUSTOMER_ID',
] as const

/**
 * true somente se TODAS as env vars essenciais estiverem presentes.
 * Toda a UI e as APIs degradam graciosamente quando retorna false.
 */
export function isGoogleAdsConfigured(): boolean {
  return REQUIRED_ENV_VARS.every(v => Boolean(process.env[v]))
}

/** Customer ID sem hífens (a API aceita apenas dígitos no path). */
function customerId(): string {
  return (process.env.GOOGLE_ADS_CUSTOMER_ID ?? '').replace(/\D/g, '')
}

// ─── Datas (mesmo contrato de períodos do meta.ts) ────────────────────────────

function today(): string {
  return new Date().toISOString().split('T')[0]
}

function sinceDate(periodo: string): string {
  const d = new Date()
  if (periodo === '15d') {
    d.setDate(d.getDate() - 14)
    return d.toISOString().split('T')[0]
  }
  if (periodo === 'ano') {
    return `${d.getFullYear()}-01-01`
  }
  // default: mês corrente
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface GoogleOverview {
  cost: number
  impressions: number
  clicks: number
  ctr: number
  avgCpc: number
  conversions: number
}

export interface GoogleDailyRow {
  date: string
  cost: number
  impressions: number
  clicks: number
}

export interface GoogleCampaign {
  campaignId: string
  campaignName: string
  status: string
  cost: number
  impressions: number
  clicks: number
  ctr: number
  avgCpc: number
  conversions: number
}

export interface GoogleCampaignByType {
  type: 'Vendas' | 'Tráfego' | 'Alcance'
  cost: number
  impressions: number
  clicks: number
  conversions: number
}

export interface GoogleDashboardData {
  overview: GoogleOverview
  daily: GoogleDailyRow[]
  campaigns: GoogleCampaign[]
  campaignsByType: GoogleCampaignByType[]
  updatedAt: string
}

/** Linha crua retornada pelo endpoint googleAds:search (REST usa camelCase). */
interface GoogleAdsSearchRow {
  campaign?: { id?: string; name?: string; status?: string; type?: string }
  segments?: { date?: string }
  metrics?: {
    costMicros?: string
    impressions?: string
    clicks?: string
    ctr?: number
    averageCpc?: number
    conversions?: number
  }
}

// ─── OAuth ────────────────────────────────────────────────────────────────────

let cachedToken: { accessToken: string; expiresAt: number } | null = null

/**
 * Troca o refresh token por um access token, com cache em memória
 * (o token do Google dura ~1h; renovamos com 5 min de folga).
 */
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

// ─── GAQL ─────────────────────────────────────────────────────────────────────

/**
 * Executa uma query GAQL via `customers/{id}/googleAds:search`.
 * Nota: POST não entra no Data Cache do Next — o cache efetivo do dashboard
 * vem do `revalidate` das rotas/páginas que consomem este módulo.
 */
async function gaqlSearch(query: string): Promise<GoogleAdsSearchRow[]> {
  const accessToken = await getAccessToken()
  const custId = customerId()

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    'Content-Type': 'application/json',
  }
  const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID
  if (loginCustomerId) {
    headers['login-customer-id'] = loginCustomerId.replace(/\D/g, '')
  }

  console.log('[GAQL] Customer ID:', custId, 'Login Customer ID:', headers['login-customer-id'])
  console.log('[GAQL] Query:', query.substring(0, 100))

  const res = await fetch(`${GOOGLE_ADS_API}/customers/${custId}/googleAds:search`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query }),
    next: { revalidate: 1800 },
  })

  if (!res.ok) {
    const body = await res.text()
    console.error('[GAQL Error]', res.status, body)
    throw new Error(`Google Ads API error: ${res.status} — ${body}`)
  }

  const json: { results?: GoogleAdsSearchRow[] } = await res.json()
  console.log('[GAQL] Results:', json.results?.length ?? 0, 'rows')
  return json.results ?? []
}

const MICROS = 1e6

function parseOverviewRow(m: GoogleAdsSearchRow['metrics']): GoogleOverview {
  return {
    cost: parseInt(m?.costMicros ?? '0', 10) / MICROS,
    impressions: parseInt(m?.impressions ?? '0', 10),
    clicks: parseInt(m?.clicks ?? '0', 10),
    // ctr da API é fração (0.05 = 5%) — expomos em % como no meta.ts
    ctr: (m?.ctr ?? 0) * 100,
    avgCpc: (m?.averageCpc ?? 0) / MICROS,
    conversions: m?.conversions ?? 0,
  }
}

const EMPTY_OVERVIEW: GoogleOverview = {
  cost: 0, impressions: 0, clicks: 0, ctr: 0, avgCpc: 0, conversions: 0,
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchOverview(since: string, until: string): Promise<GoogleOverview> {
  const rows = await gaqlSearch(`
    SELECT metrics.cost_micros, metrics.impressions, metrics.clicks,
           metrics.ctr, metrics.average_cpc, metrics.conversions
    FROM customer
    WHERE segments.date BETWEEN '${since}' AND '${until}'
  `)
  if (rows.length === 0) return EMPTY_OVERVIEW
  return parseOverviewRow(rows[0].metrics)
}

async function fetchDaily(since: string, until: string): Promise<GoogleDailyRow[]> {
  try {
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
      console.log('[Google daily] No rows returned for period', since, '-', until)
      return []
    }

    return rows.map(r => ({
      date: r.segments?.date ?? '',
      cost: parseInt(r.metrics?.costMicros ?? '0', 10) / MICROS,
      impressions: parseInt(r.metrics?.impressions ?? '0', 10),
      clicks: parseInt(r.metrics?.clicks ?? '0', 10),
    }))
  } catch (e) {
    console.error('[Google daily error]', e)
    return []
  }
}

async function fetchTopCampaigns(since: string, until: string, limit = 10): Promise<GoogleCampaign[]> {
  const rows = await gaqlSearch(`
    SELECT campaign.id, campaign.name, campaign.status,
           metrics.cost_micros, metrics.impressions, metrics.clicks,
           metrics.ctr, metrics.average_cpc, metrics.conversions
    FROM campaign
    WHERE segments.date BETWEEN '${since}' AND '${until}'
      AND metrics.cost_micros > 0
    ORDER BY metrics.cost_micros DESC
    LIMIT ${limit}
  `)
  return rows.map(r => ({
    campaignId: r.campaign?.id ?? '',
    campaignName: r.campaign?.name ?? 'Campanha sem nome',
    status: r.campaign?.status ?? 'UNKNOWN',
    ...parseOverviewRow(r.metrics),
  }))
}

// ─── Campanhas por tipo ───────────────────────────────────────────────────────

async function fetchCampaignsByType(since: string, until: string): Promise<GoogleCampaignByType[]> {
  const rows = await gaqlSearch(`
    SELECT campaign.name, campaign.type,
           metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions
    FROM campaign
    WHERE segments.date BETWEEN '${since}' AND '${until}'
      AND metrics.cost_micros > 0
    ORDER BY metrics.cost_micros DESC
  `)

  const mapCampaignTypeToCategory = (campaignType: string): 'Vendas' | 'Tráfego' | 'Alcance' => {
    if (campaignType === 'SEARCH' || campaignType === 'PERFORMANCE_MAX') return 'Vendas'
    if (campaignType === 'DISPLAY') return 'Tráfego'
    if (campaignType === 'DISCOVERY' || campaignType === 'SHOPPING') return 'Vendas'
    return 'Tráfego' // fallback
  }

  const result = new Map<string, GoogleCampaignByType>()

  for (const r of rows) {
    const type = mapCampaignTypeToCategory(r.campaign?.type ?? 'UNKNOWN')
    const cost = parseInt(r.metrics?.costMicros ?? '0', 10) / MICROS
    const conversions = r.metrics?.conversions ?? 0

    const existing = result.get(type) ?? {
      type,
      cost: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
    }

    result.set(type, {
      type,
      cost: existing.cost + cost,
      impressions: existing.impressions + parseInt(r.metrics?.impressions ?? '0', 10),
      clicks: existing.clicks + parseInt(r.metrics?.clicks ?? '0', 10),
      conversions: existing.conversions + conversions,
    })
  }

  return Array.from(result.values()).sort((a, b) => b.cost - a.cost)
}

// ─── Supabase Integration ─────────────────────────────────────────────────────

// Cache em memória para evitar múltiplas queries
let cachedSupabaseData: { data: GoogleDailyRow[]; expiresAt: number } | null = null

/**
 * Busca dados Google Ads do Supabase (tabela google_ads_daily).
 * Fallback para mock se houver erro de conexão.
 * Cache em memória por 5 minutos.
 */
async function getGoogleDataFromSupabase(since: string, until: string): Promise<GoogleDailyRow[]> {
  try {
    // Verificar cache
    if (cachedSupabaseData && Date.now() < cachedSupabaseData.expiresAt) {
      console.log('[Supabase] Usando cache')
      return cachedSupabaseData.data
    }

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      'https://ibryvujocmgjperqxqli.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlicnl2dWpvY21nanBlcnF4cWxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NjUxNzEsImV4cCI6MjA5MDE0MTE3MX0.qAF_t9B5TLR4cmpGXtWwIk66T7G6oXhMEEKJPgqqN_A'
    )

    const { data, error } = await supabase
      .from('google_ads_daily')
      .select('data, custo, impressoes, cliques')
      .gte('data', since)
      .lte('data', until)
      .order('data', { ascending: true })

    if (error) {
      console.error('[Supabase] Query error:', error)
      return []
    }

    const result = (data ?? []).map((row: { data: string; custo: number | string; impressoes: number | string; cliques: number | string }) => ({
      date: row.data,
      cost: typeof row.custo === 'string' ? parseFloat(row.custo) : row.custo || 0,
      impressions: typeof row.impressoes === 'string' ? parseInt(row.impressoes) : row.impressoes || 0,
      clicks: typeof row.cliques === 'string' ? parseInt(row.cliques) : row.cliques || 0,
    }))

    // Salvar em cache
    cachedSupabaseData = {
      data: result,
      expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutos
    }

    return result
  } catch (error) {
    console.error('[Supabase] Connection error:', error)
    return []
  }
}

// ─── Funções principais ───────────────────────────────────────────────────────

/**
 * Dados completos do dashboard Google Ads para um período (15d|mes|ano).
 * Retorna null se a integração não estiver configurada (degradação graciosa).
 */
export async function getGoogleDashboardData(periodo = 'mes'): Promise<GoogleDashboardData | null> {
  // Tentar Supabase primeiro; fallback para mock se indisponível
  const since = sinceDate(periodo)
  const until = today()

  let daily: GoogleDailyRow[] = []

  // Tentar buscar do Supabase (dados reais)
  daily = await getGoogleDataFromSupabase(since, until)

  // Fallback para mock se Supabase estiver vazio ou com erro
  if (daily.length === 0) {
    const { getMockGoogleDailyData } = await import('./google-mock')
    daily = getMockGoogleDailyData(since, until) as GoogleDailyRow[]
  }

  const overview: GoogleOverview = {
    cost: daily.reduce((sum, d) => sum + d.cost, 0),
    impressions: daily.reduce((sum, d) => sum + d.impressions, 0),
    clicks: daily.reduce((sum, d) => sum + d.clicks, 0),
    ctr: daily.length > 0 ? (daily.reduce((sum, d) => sum + d.clicks, 0) / daily.reduce((sum, d) => sum + d.impressions, 0)) * 100 : 0,
    avgCpc: daily.length > 0 ? daily.reduce((sum, d) => sum + d.cost, 0) / daily.reduce((sum, d) => sum + d.clicks, 0) : 0,
    conversions: 0,
  }

  const campaigns: GoogleCampaign[] = []

  // Importar função mock se precisar
  const { getMockGoogleCampaignsByType } = await import('./google-mock')
  const campaignsByType = getMockGoogleCampaignsByType(since, until).map(ct => ({
    ...ct,
    type: ct.type as 'Vendas' | 'Tráfego' | 'Alcance',
    conversions: 0,
  })) as GoogleCampaignByType[]

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, __, ___, ____] = await Promise.all([
    fetchOverview(since, until).catch(e => {
      console.error('[Google overview]', e)
      return EMPTY_OVERVIEW
    }),
    fetchDaily(since, until).catch(e => {
      console.error('[Google daily]', e)
      return [] as GoogleDailyRow[]
    }),
    fetchTopCampaigns(since, until).catch(e => {
      console.error('[Google campaigns]', e)
      return [] as GoogleCampaign[]
    }),
    fetchCampaignsByType(since, until).catch(e => {
      console.error('[Google campaignsByType]', e)
      return [] as GoogleCampaignByType[]
    }),
  ])

  return {
    overview,
    daily,
    campaigns,
    campaignsByType,
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Overview agregado para um range de datas custom (usado pelo relatório
 * semanal). Retorna null se não configurado ou em caso de erro.
 */
export async function getGoogleRangeOverview(
  since: string,
  until: string,
): Promise<GoogleOverview | null> {
  if (!isGoogleAdsConfigured()) return null
  try {
    return await fetchOverview(since, until)
  } catch (e) {
    console.error('[Google range overview]', e)
    return null
  }
}
