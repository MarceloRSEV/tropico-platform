import { NextResponse, type NextRequest } from 'next/server'
import { getMetaRangeSummary, getMetaTopAds, type MetaRangeSummary } from '@/lib/meta'
import { getGoogleRangeOverview, isGoogleAdsConfigured, type GoogleOverview } from '@/lib/google'

// Endpoint consumido pelo n8n (envio semanal de email) — sempre dinâmico
export const dynamic = 'force-dynamic'

// ─── Auth ─────────────────────────────────────────────────────────────────────

function isAuthorized(request: NextRequest): boolean {
  // REPORT_API_TOKEN é o token oficial; PDF_TOKEN serve de fallback
  const expected = process.env.REPORT_API_TOKEN || process.env.PDF_TOKEN
  if (!expected) return false

  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ') && authHeader.slice(7) === expected) {
    return true
  }
  return request.nextUrl.searchParams.get('token') === expected
}

// ─── Datas ────────────────────────────────────────────────────────────────────

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0]
}

/**
 * Semana anterior completa (segunda a domingo) e a semana antes dela,
 * para comparação.
 */
function lastWeekRanges(now = new Date()) {
  // dias desde a segunda-feira da semana corrente (getDay: 0 = domingo)
  const daysSinceMonday = (now.getDay() + 6) % 7

  const thisMonday = new Date(now)
  thisMonday.setDate(now.getDate() - daysSinceMonday)

  const lastMonday = new Date(thisMonday)
  lastMonday.setDate(thisMonday.getDate() - 7)
  const lastSunday = new Date(thisMonday)
  lastSunday.setDate(thisMonday.getDate() - 1)

  const prevMonday = new Date(lastMonday)
  prevMonday.setDate(lastMonday.getDate() - 7)
  const prevSunday = new Date(lastMonday)
  prevSunday.setDate(lastMonday.getDate() - 1)

  return {
    week: { since: toISODate(lastMonday), until: toISODate(lastSunday) },
    previousWeek: { since: toISODate(prevMonday), until: toISODate(prevSunday) },
  }
}

// ─── Variações ────────────────────────────────────────────────────────────────

/** Variação percentual (null quando a base é 0 — evita Infinity no JSON). */
function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null
  return ((current - previous) / previous) * 100
}

function metaVariation(week: MetaRangeSummary, prev: MetaRangeSummary) {
  return {
    spend: pctChange(week.spend, prev.spend),
    impressions: pctChange(week.impressions, prev.impressions),
    clicks: pctChange(week.clicks, prev.clicks),
    ctr: pctChange(week.ctr, prev.ctr),
    conversations: pctChange(week.conversations, prev.conversations),
  }
}

function googleVariation(week: GoogleOverview, prev: GoogleOverview) {
  return {
    cost: pctChange(week.cost, prev.cost),
    impressions: pctChange(week.impressions, prev.impressions),
    clicks: pctChange(week.clicks, prev.clicks),
    ctr: pctChange(week.ctr, prev.ctr),
    conversions: pctChange(week.conversions, prev.conversions),
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { week, previousWeek } = lastWeekRanges()

  try {
    const [metaWeek, metaPrev, topAds] = await Promise.all([
      getMetaRangeSummary(week.since, week.until),
      getMetaRangeSummary(previousWeek.since, previousWeek.until),
      getMetaTopAds(week.since, week.until, 3).catch(e => {
        console.error('[Report topAds]', e)
        return []
      }),
    ])

    // Bloco Google — só entra se a integração estiver configurada
    let google: Record<string, unknown> = { configured: false }
    if (isGoogleAdsConfigured()) {
      const [googleWeek, googlePrev] = await Promise.all([
        getGoogleRangeOverview(week.since, week.until),
        getGoogleRangeOverview(previousWeek.since, previousWeek.until),
      ])
      if (googleWeek && googlePrev) {
        google = {
          configured: true,
          week: googleWeek,
          previousWeek: googlePrev,
          variation: googleVariation(googleWeek, googlePrev),
        }
      } else {
        google = { configured: true, error: 'Falha ao buscar dados do Google Ads' }
      }
    }

    return NextResponse.json({
      client: 'Tropico Surf Shop',
      periodo: week,
      periodoAnterior: previousWeek,
      meta: {
        week: metaWeek,
        previousWeek: metaPrev,
        variation: metaVariation(metaWeek, metaPrev),
        topAds,
      },
      google,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Generate Report]', error)
    return NextResponse.json(
      { error: 'Falha ao gerar relatório semanal' },
      { status: 500 },
    )
  }
}
