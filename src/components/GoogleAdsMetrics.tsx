import type { ReactNode } from 'react'
import { createClient } from '@supabase/supabase-js'

type Props = { since: string; until: string }

interface CampaignTotals {
  campaignId: string
  campaignName: string
  impressions: number
  clicks: number
  conversions: number
  cost: number
}

function fmt(n: number) {
  return n.toLocaleString('pt-BR')
}

function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtPct(n: number) {
  return n.toFixed(2) + '%'
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-6 py-8 text-center text-sm text-gray-500">
      {children}
    </div>
  )
}

export async function GoogleAdsMetrics({ since, until }: Props) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return <Notice>Sincronização com o Supabase não configurada.</Notice>

  const supabase = createClient(url, key, { auth: { persistSession: false } })
  const [{ data: rows, error }, { data: lastSync }] = await Promise.all([
    supabase
      .from('tropico_google_ads_daily')
      .select('campaign_id, campaign_name, impressions, clicks, conversions, cost')
      .gte('date', since)
      .lte('date', until),
    supabase
      .from('tropico_google_ads_sync_log')
      .select('synced_at, sync_status, records_synced')
      .order('synced_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (error) {
    console.error('[GoogleAdsMetrics]', error.message)
    return <Notice>Não foi possível ler os dados sincronizados.</Notice>
  }
  if (!rows || rows.length === 0) {
    return <Notice>Sem dados sincronizados para o período ({since} a {until}).</Notice>
  }

  const byCampaign = new Map<string, CampaignTotals>()
  const totals = { impressions: 0, clicks: 0, conversions: 0, cost: 0 }

  for (const r of rows) {
    const id = r.campaign_id ?? ''
    const c = byCampaign.get(id) ?? {
      campaignId: id,
      campaignName: r.campaign_name ?? 'Campanha sem nome',
      impressions: 0, clicks: 0, conversions: 0, cost: 0,
    }
    c.impressions += Number(r.impressions ?? 0)
    c.clicks += Number(r.clicks ?? 0)
    c.conversions += Number(r.conversions ?? 0)
    c.cost += Number(r.cost ?? 0)
    byCampaign.set(id, c)

    totals.impressions += Number(r.impressions ?? 0)
    totals.clicks += Number(r.clicks ?? 0)
    totals.conversions += Number(r.conversions ?? 0)
    totals.cost += Number(r.cost ?? 0)
  }

  const campaigns = [...byCampaign.values()].sort((a, b) => b.cost - a.cost)
  const ctr = (clicks: number, impressions: number) => (impressions > 0 ? (clicks / impressions) * 100 : 0)

  const lastSyncLabel = lastSync?.synced_at
    ? new Date(lastSync.synced_at).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : null

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card label="Impressões" value={fmt(totals.impressions)} />
        <Card label="Cliques" value={fmt(totals.clicks)} />
        <Card label="Conversões" value={fmt(Math.round(totals.conversions))} />
        <Card label="Custo" value={fmtBRL(totals.cost)} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left text-gray-400 font-semibold px-5 py-3 text-[11px] uppercase tracking-wider">Campanha</th>
                <th className="text-right text-gray-400 font-semibold px-4 py-3 text-[11px] uppercase tracking-wider">Impressões</th>
                <th className="text-right text-gray-400 font-semibold px-4 py-3 text-[11px] uppercase tracking-wider">Cliques</th>
                <th className="text-right text-gray-400 font-semibold px-4 py-3 text-[11px] uppercase tracking-wider">CTR</th>
                <th className="text-right text-gray-400 font-semibold px-4 py-3 text-[11px] uppercase tracking-wider">Conversões</th>
                <th className="text-right text-gray-400 font-semibold px-5 py-3 text-[11px] uppercase tracking-wider">Custo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {campaigns.map(c => (
                <tr key={c.campaignId} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-xs text-gray-700">{c.campaignName}</td>
                  <td className="px-4 py-3 text-right text-gray-600 tabular-nums text-xs">{fmt(c.impressions)}</td>
                  <td className="px-4 py-3 text-right text-gray-600 tabular-nums text-xs">{fmt(c.clicks)}</td>
                  <td className="px-4 py-3 text-right text-gray-600 tabular-nums text-xs">{fmtPct(ctr(c.clicks, c.impressions))}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-xs">
                    <span className={c.conversions > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}>
                      {c.conversions > 0 ? fmt(Math.round(c.conversions)) : '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-gray-900 tabular-nums text-xs">{fmtBRL(c.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {lastSyncLabel && (
          <div className="px-5 py-2 border-t border-gray-100 text-[11px] text-gray-400">
            Última sincronização: {lastSyncLabel}
            {lastSync?.sync_status === 'failed' ? ' (falhou)' : ` — ${fmt(lastSync?.records_synced ?? 0)} registros`}
          </div>
        )}
      </div>
    </div>
  )
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-bold mt-1 text-gray-900">{value}</p>
    </div>
  )
}
