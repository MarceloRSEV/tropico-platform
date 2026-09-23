import { saveToCacheAsync, getFromCache, getSafeEmptyData } from './meta-cache'

const META_API = 'https://graph.facebook.com/v21.0'
const REQUEST_TIMEOUT = 10000 // 10 segundos por requisição

function today(): string {
  return new Date().toISOString().split('T')[0]
}

// Helper: fetch com timeout
async function fetchWithTimeout(
  url: string,
  options?: RequestInit & { next?: { revalidate?: number } }
) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return res
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
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

function buildUrl(path: string, params: Record<string, string>): string {
  const url = new URL(`${META_API}/${path}`)
  url.searchParams.set('access_token', process.env.META_ACCESS_TOKEN!)
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }
  return url.toString()
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface MetaOverview {
  spend: number
  reach: number
  impressions: number
  clicks: number
  ctr: number
  cpm: number
}

export interface MetaDailyRow {
  date: string
  spend: number
  impressions: number
  clicks: number
  conversations: number
}

export interface MetaCreative {
  adId: string
  adName: string
  thumbnailUrl: string | null
  postId: string | null
  effectiveStatus: string
  spend: number
  reach: number
  impressions: number
  clicks: number
  ctr: number
  cpm: number
  likes: number
  comments: number
  conversations: number
  campaignObjective?: string
}

export interface MetaCityRow {
  region: string
  impressions: number
  reach: number
  clicks: number
  ctr: number
  cpc: number
  spend: number
  spendPct: number
  frequency: number
}

export interface MetaCampaignByType {
  type: 'Vendas' | 'Tráfego' | 'Alcance'
  spend: number
  reach: number
  impressions: number
  clicks: number
  conversions: number
}

export interface MetaAudienceMetrics {
  audienceName: string
  audienceType: 'Alcance' | 'Conversão'
  impressions: number
  clicks: number
  reach: number
  ctr: number
  engagementRate: number
  conversationsStarted: number
  cpm: number
  costPerConversation?: number
  spend: number
}

export interface MetaDashboardData {
  overview: MetaOverview
  daily: MetaDailyRow[]
  creatives: MetaCreative[]
  cities: MetaCityRow[]
  campaignsByType: MetaCampaignByType[]
  audiences: MetaAudienceMetrics[]
  updatedAt: string
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchOverview(since: string): Promise<MetaOverview> {
  const adAccountId = process.env.META_AD_ACCOUNT_ID!
  const timeRange = JSON.stringify({ since, until: today() })

  const url = buildUrl(`${adAccountId}/insights`, {
    fields: 'spend,reach,impressions,clicks,ctr,cpm',
    time_range: timeRange,
    level: 'account',
  })

  const res = await fetchWithTimeout(url, { next: { revalidate: 1800 } })
  if (!res.ok) throw new Error(`Meta overview error: ${res.status}`)

  const json = await res.json()
  const d = json.data?.[0] ?? {}

  return {
    spend: parseFloat(d.spend ?? '0'),
    reach: parseInt(d.reach ?? '0', 10),
    impressions: parseInt(d.impressions ?? '0', 10),
    clicks: parseInt(d.clicks ?? '0', 10),
    ctr: parseFloat(d.ctr ?? '0'),
    cpm: parseFloat(d.cpm ?? '0'),
  }
}

async function fetchDaily(since: string): Promise<MetaDailyRow[]> {
  const adAccountId = process.env.META_AD_ACCOUNT_ID!
  const timeRange = JSON.stringify({ since, until: today() })

  const url = buildUrl(`${adAccountId}/insights`, {
    fields: 'spend,impressions,clicks,actions',
    time_range: timeRange,
    time_increment: '1',
    level: 'account',
  })

  const res = await fetchWithTimeout(url, { next: { revalidate: 1800 } })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Meta daily error: ${res.status} — ${body}`)
  }

  const json = await res.json()
  return (json.data ?? []).map((d: Record<string, unknown>) => {
    const actions = (d.actions as { action_type: string; value: string }[]) ?? []
    const conversations = actions.find((a) =>
      a.action_type === 'onsite_conversion.messaging_conversation_started_7d' ||
      a.action_type === 'messaging_conversation_started_7d'
    )?.value ?? '0'

    return {
      date: d.date_start as string,
      spend: parseFloat((d.spend as string) ?? '0'),
      impressions: parseInt((d.impressions as string) ?? '0', 10),
      clicks: parseInt((d.clicks as string) ?? '0', 10),
      conversations: parseInt(conversations, 10),
    }
  })
}

async function fetchAdInsights(
  since: string,
): Promise<Map<string, { metrics: Omit<MetaCreative, 'adId' | 'adName' | 'thumbnailUrl' | 'postId' | 'effectiveStatus' | 'likes' | 'comments' | 'conversations'>; likes: number; comments: number; conversations: number }>> {
  const adAccountId = process.env.META_AD_ACCOUNT_ID!
  const timeRange = JSON.stringify({ since, until: today() })

  // actions retorna array com todos os tipos de interação (reactions, comments, etc.)
  const url = buildUrl(`${adAccountId}/insights`, {
    fields: 'ad_id,spend,reach,impressions,clicks,ctr,cpm,actions',
    time_range: timeRange,
    level: 'ad',
    sort: JSON.stringify(['spend_descending']),
    limit: '20',
  })

  const res = await fetchWithTimeout(url, { next: { revalidate: 1800 } })
  if (!res.ok) {
    console.error('[Meta fetchAdInsights]', res.status, await res.text())
    return new Map()
  }

  const json = await res.json()
  const map = new Map<string, { metrics: Omit<MetaCreative, 'adId' | 'adName' | 'thumbnailUrl' | 'postId' | 'effectiveStatus' | 'likes' | 'comments' | 'conversations'>; likes: number; comments: number; conversations: number }>()

  for (const d of json.data ?? []) {
    // actions é um array de { action_type, value } — filtramos os tipos relevantes
    const actions: Array<{ action_type: string; value: string }> = d.actions ?? []

    const findAction = (type: string) =>
      actions
        .filter(a => a.action_type === type)
        .reduce((acc, a) => acc + parseInt(a.value ?? '0', 10), 0)

    // post_reaction engloba like, love, haha, wow, sad, angry
    const likes = findAction('post_reaction')
    const comments = findAction('comment')
    // conversas iniciadas via WhatsApp/Messenger
    const conversations = findAction('onsite_conversion.messaging_conversation_started_7d')
      || findAction('messaging_conversation_started_7d')

    map.set(d.ad_id, {
      metrics: {
        spend: parseFloat(d.spend ?? '0'),
        reach: parseInt(d.reach ?? '0', 10),
        impressions: parseInt(d.impressions ?? '0', 10),
        clicks: parseInt(d.clicks ?? '0', 10),
        ctr: parseFloat(d.ctr ?? '0'),
        cpm: parseFloat(d.cpm ?? '0'),
      },
      likes,
      comments,
      conversations,
    })
  }

  return map
}

async function fetchAdCreatives(
  adIds: string[],
): Promise<Map<string, { name: string; thumbnailUrl: string | null; postId: string | null; effectiveStatus: string; campaignObjective?: string }>> {
  if (adIds.length === 0) return new Map()

  const adAccountId = process.env.META_AD_ACCOUNT_ID!

  // effective_object_story_id = "pageId_postId" — é o post do Facebook vinculado ao anúncio
  // effective_status dentro do filtering para sobrescrever o filtro padrão ACTIVE da API
  // campaign{objective} para pegar o objetivo da campanha vinculada
  const url = buildUrl(`${adAccountId}/ads`, {
    fields: 'id,name,effective_status,effective_object_story_id,creative{thumbnail_url,image_url},campaign{objective}',
    filtering: JSON.stringify([
      { field: 'id', operator: 'IN', value: adIds },
      { field: 'effective_status', operator: 'IN', value: ['ACTIVE', 'PAUSED', 'ARCHIVED', 'DELETED', 'IN_PROCESS', 'WITH_ISSUES'] },
    ]),
    limit: '50',
  })

  const res = await fetchWithTimeout(url, { next: { revalidate: 1800 } })
  if (!res.ok) throw new Error(`Meta creatives error: ${res.status}`)

  const json = await res.json()
  const map = new Map<string, { name: string; thumbnailUrl: string | null; postId: string | null; effectiveStatus: string; campaignObjective?: string }>()

  for (const ad of json.data ?? []) {
    const thumbnail = ad.creative?.thumbnail_url ?? ad.creative?.image_url ?? null
    map.set(ad.id, {
      name: ad.name,
      thumbnailUrl: thumbnail,
      postId: ad.effective_object_story_id ?? null,
      effectiveStatus: ad.effective_status ?? 'UNKNOWN',
      campaignObjective: ad.campaign?.objective ?? undefined,
    })
  }

  return map
}

async function fetchCities(since: string, totalSpend: number): Promise<MetaCityRow[]> {
  const adAccountId = process.env.META_AD_ACCOUNT_ID!
  const timeRange = JSON.stringify({ since, until: today() })

  const url = buildUrl(`${adAccountId}/insights`, {
    fields: 'spend,reach,impressions,clicks,ctr,frequency',
    time_range: timeRange,
    level: 'account',
    breakdowns: 'region',
    sort: JSON.stringify(['spend_descending']),
    limit: '50',
  })

  const res = await fetchWithTimeout(url, { next: { revalidate: 1800 } })
  if (!res.ok) {
    console.error('[Meta fetchCities]', res.status, await res.text())
    return []
  }

  const json = await res.json()
  return (json.data ?? [])
    .filter((d: Record<string, string>) => parseInt(d.clicks ?? '0', 10) > 0)
    .map((d: Record<string, string>) => {
      const spend = parseFloat(d.spend ?? '0')
      const clicks = parseInt(d.clicks ?? '0', 10)
      return {
        region: d.region ?? 'Desconhecida',
        impressions: parseInt(d.impressions ?? '0', 10),
        reach: parseInt(d.reach ?? '0', 10),
        clicks,
        ctr: parseFloat(d.ctr ?? '0'),
        cpc: clicks > 0 ? spend / clicks : 0,
        spend,
        spendPct: totalSpend > 0 ? (spend / totalSpend) * 100 : 0,
        frequency: parseFloat(d.frequency ?? '0'),
      }
    })
}

// ─── Range custom (relatório semanal) ─────────────────────────────────────────

export interface MetaRangeSummary {
  since: string
  until: string
  spend: number
  reach: number
  impressions: number
  clicks: number
  ctr: number
  cpm: number
  conversations: number
}

export interface MetaTopAd {
  adId: string
  adName: string
  spend: number
  impressions: number
  clicks: number
  conversations: number
}

/**
 * Métricas agregadas da conta para um range de datas custom (since/until,
 * formato YYYY-MM-DD) via `time_range` do Graph API. Usado pelo relatório
 * semanal — não altera o fluxo do dashboard.
 */
export async function getMetaRangeSummary(since: string, until: string): Promise<MetaRangeSummary> {
  const adAccountId = process.env.META_AD_ACCOUNT_ID!
  const timeRange = JSON.stringify({ since, until })

  const url = buildUrl(`${adAccountId}/insights`, {
    fields: 'spend,reach,impressions,clicks,ctr,cpm,actions',
    time_range: timeRange,
    level: 'account',
  })

  const res = await fetchWithTimeout(url, { next: { revalidate: 1800 } })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Meta range summary error: ${res.status} — ${body}`)
  }

  const json = await res.json()
  const d = json.data?.[0] ?? {}

  const actions: Array<{ action_type: string; value: string }> = d.actions ?? []
  const findAction = (type: string) =>
    actions
      .filter(a => a.action_type === type)
      .reduce((acc, a) => acc + parseInt(a.value ?? '0', 10), 0)

  const conversations = findAction('onsite_conversion.messaging_conversation_started_7d')
    || findAction('messaging_conversation_started_7d')

  return {
    since,
    until,
    spend: parseFloat(d.spend ?? '0'),
    reach: parseInt(d.reach ?? '0', 10),
    impressions: parseInt(d.impressions ?? '0', 10),
    clicks: parseInt(d.clicks ?? '0', 10),
    ctr: parseFloat(d.ctr ?? '0'),
    cpm: parseFloat(d.cpm ?? '0'),
    conversations,
  }
}

/**
 * Top anúncios por gasto em um range custom, com nome resolvido via /ads.
 */
export async function getMetaTopAds(since: string, until: string, limit = 3): Promise<MetaTopAd[]> {
  const adAccountId = process.env.META_AD_ACCOUNT_ID!
  const timeRange = JSON.stringify({ since, until })

  const url = buildUrl(`${adAccountId}/insights`, {
    fields: 'ad_id,spend,impressions,clicks,actions',
    time_range: timeRange,
    level: 'ad',
    sort: JSON.stringify(['spend_descending']),
    limit: String(limit),
  })

  const res = await fetchWithTimeout(url, { next: { revalidate: 1800 } })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Meta top ads error: ${res.status} — ${body}`)
  }

  const json = await res.json()
  const rows: Array<Record<string, unknown>> = json.data ?? []

  const adIds = rows.map(d => String(d.ad_id))
  const creativesMap = await fetchAdCreatives(adIds).catch(e => {
    console.error('[Meta top ads creatives]', e)
    return new Map<string, { name: string; thumbnailUrl: string | null; postId: string | null; effectiveStatus: string }>()
  })

  return rows.map(d => {
    const actions = (d.actions ?? []) as Array<{ action_type: string; value: string }>
    const findAction = (type: string) =>
      actions
        .filter(a => a.action_type === type)
        .reduce((acc, a) => acc + parseInt(a.value ?? '0', 10), 0)

    const adId = String(d.ad_id)
    return {
      adId,
      adName: creativesMap.get(adId)?.name ?? `Anúncio ${adId}`,
      spend: parseFloat(String(d.spend ?? '0')),
      impressions: parseInt(String(d.impressions ?? '0'), 10),
      clicks: parseInt(String(d.clicks ?? '0'), 10),
      conversations: findAction('onsite_conversion.messaging_conversation_started_7d')
        || findAction('messaging_conversation_started_7d'),
    }
  })
}

// ─── Função principal ─────────────────────────────────────────────────────────

// Note: fetchCampaignsByType para Meta foi removido — a API não suporta breakdown de campaign_objective.
// Apenas Google Ads campaigns by type está ativo por enquanto.

async function fetchAudienceInsights(since: string): Promise<MetaAudienceMetrics[]> {
  const adAccountId = process.env.META_AD_ACCOUNT_ID!
  const timeRange = JSON.stringify({ since, until: today() })

  const url = buildUrl(`${adAccountId}/insights`, {
    fields: 'campaign_name,spend,reach,impressions,clicks,ctr,actions',
    time_range: timeRange,
    level: 'campaign',
    sort: JSON.stringify(['spend_descending']),
    limit: '50',
  })

  const res = await fetchWithTimeout(url, { next: { revalidate: 1800 } })
  if (!res.ok) {
    console.error('[Meta fetchAudienceInsights]', res.status, await res.text())
    return []
  }

  const json = await res.json()
  const rows: Array<Record<string, unknown>> = json.data ?? []

  return rows.map(d => {
    const spend = parseFloat(String(d.spend ?? '0'))
    const impressions = parseInt(String(d.impressions ?? '0'), 10)
    const clicks = parseInt(String(d.clicks ?? '0'), 10)
    const reach = parseInt(String(d.reach ?? '0'), 10)
    const ctr = parseFloat(String(d.ctr ?? '0'))

    const actions = (d.actions as Array<{ action_type: string; value: string }>) ?? []
    const conversationsStarted = actions
      .filter(a =>
        a.action_type === 'onsite_conversion.messaging_conversation_started_7d' ||
        a.action_type === 'messaging_conversation_started_7d'
      )
      .reduce((acc, a) => acc + parseInt(a.value ?? '0', 10), 0)

    // Categorizar por padrões no nome da campanha ou alcance
    // Se a campanha tem "alcance", "reach", "awareness" no nome, é alcance; caso contrário, conversão
    const campaignName = String(d.campaign_name ?? '')
    const audienceType: 'Alcance' | 'Conversão' =
      /alcance|reach|awareness/i.test(campaignName) ? 'Alcance' : 'Conversão'

    const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0
    const engagementRate = impressions > 0 ? (reach / impressions) * 100 : 0

    return {
      audienceName: campaignName || `Campanha ${d.campaign_id}`,
      audienceType,
      impressions,
      clicks,
      reach,
      ctr,
      engagementRate,
      conversationsStarted,
      cpm,
      costPerConversation: conversationsStarted > 0 ? spend / conversationsStarted : undefined,
      spend,
    }
  }).filter(a => a.impressions > 0)
}

export async function getMetaDashboardData(periodo = 'mes'): Promise<MetaDashboardData> {
  try {
    const since = sinceDate(periodo)

    const overview = await fetchOverview(since).catch(e => {
      console.error('[Meta overview]', e)
      return { spend: 0, reach: 0, impressions: 0, clicks: 0, ctr: 0, cpm: 0 }
    })

    const daily = await fetchDaily(since).catch(e => {
      console.error('[Meta daily]', e)
      return [] as MetaDailyRow[]
    })

    type InsightData = { metrics: Omit<MetaCreative, 'adId' | 'adName' | 'thumbnailUrl' | 'postId' | 'effectiveStatus' | 'likes' | 'comments' | 'conversations'>; likes: number; comments: number; conversations: number }
    const insightsMap = await fetchAdInsights(since).catch(e => {
      console.error('[Meta adInsights]', e)
      return new Map<string, InsightData>()
    })

    const adIds = Array.from(insightsMap.keys())

    const [creativesMap, cities, audiences] = await Promise.all([
      fetchAdCreatives(adIds).catch(e => {
        console.error('[Meta creatives]', e)
        return new Map()
      }),
      fetchCities(since, overview.spend).catch(e => {
        console.error('[Meta cities]', e)
        return []
      }),
      fetchAudienceInsights(since).catch(e => {
        console.error('[Meta audiences]', e)
        return []
      }),
    ])

    const creatives: MetaCreative[] = adIds
      .filter(id => insightsMap.has(id))
      .map(id => {
        const { metrics, likes, comments, conversations } = insightsMap.get(id)!
        const creative = creativesMap.get(id)

        return {
          adId: id,
          adName: creative?.name ?? `Anúncio ${id}`,
          thumbnailUrl: creative?.thumbnailUrl ?? null,
          postId: creative?.postId ?? null,
          effectiveStatus: creative?.effectiveStatus ?? 'UNKNOWN',
          likes,
          comments,
          conversations,
          campaignObjective: creative?.campaignObjective,
          ...metrics,
        }
      })
      .sort((a, b) => b.spend - a.spend)

    const result = {
      overview,
      daily,
      creatives,
      cities,
      campaignsByType: [],
      audiences,
      updatedAt: new Date().toISOString(),
    }

    // Salva em cache de forma assíncrona (sem bloquear)
    saveToCacheAsync(result)

    return result
  } catch (error) {
    console.error('[Meta getMetaDashboardData]', error)

    // Tenta carregar do cache
    const cached = await getFromCache()
    if (cached) {
      console.warn('[Meta] Retornando dados em cache')
      return cached as unknown as MetaDashboardData
    }

    // Fallback: dados vazios seguros
    console.warn('[Meta] Nenhum cache disponível, retornando dados vazios')
    return getSafeEmptyData()
  }
}
