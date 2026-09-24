import Link from 'next/link'
import { getMetaDashboardData } from '@/lib/meta'
import { getGoogleDashboardData, periodRange } from '@/lib/google'
import DailySpendChart from './DailySpendChart'
import ConversationBarChart from './ConversationBarChart'
import TopAdsCards from './TopAdsCards'
import CampaignTypeChart from './CampaignTypeChart'
import WeeklyComparisonTable from './WeeklyComparisonTable'
import PrintButton from './PrintButton'
import { GoogleAdsMetrics } from '@/components/GoogleAdsMetrics'

function StatusBadge({ status }: { status: string }) {
  if (status === 'ACTIVE') {
    return <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">Ativo</span>
  }
  return <span className="text-gray-400 text-xs">—</span>
}

function getObjectiveLabel(objective: string): string {
  const labels: Record<string, string> = {
    REACH: 'Alcance',
    TRAFFIC: 'Tráfego',
    CONVERSIONS: 'Conversões',
    ENGAGEMENT: 'Engajamento',
    LEAD_GENERATION: 'Geração de Leads',
    MESSAGES: 'Mensagens',
    VIDEO_VIEWS: 'Visualizações de Vídeo',
    APP_INSTALLS: 'Instalações de App',
    STORE_VISITS: 'Visitas à Loja',
    OUTCOME_SALES: 'Anúncios de Conversão',
    OUTCOME_AWARENESS: 'Anúncios de Alcance',
    Outro: 'Outros',
  }
  return labels[objective] || objective
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

const FILTROS = [
  { label: 'Últimos 15 dias', value: '15d' },
  { label: 'Este mês',        value: 'mes' },
  { label: 'Este ano',        value: 'ano' },
]

type Props = { searchParams: Promise<{ periodo?: string }> }

export default async function RelatorioPage({ searchParams }: Props) {
  const { periodo = 'mes' } = await searchParams
  const [data, google, dataFull, googleFull] = await Promise.all([
    getMetaDashboardData(periodo),
    getGoogleDashboardData(periodo),
    getMetaDashboardData('60d'), // Dados completos para o Comparativo Semanal
    getGoogleDashboardData('60d'),
  ])
  const { overview, creatives, cities, updatedAt } = data
  const totalConversations = creatives.reduce((sum, ad) => sum + ad.conversations, 0)

  const updatedLabel = new Date(updatedAt).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-8 space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Relatório de Tráfego Pago</h1>
            <p className="text-sm text-gray-500 mt-0.5">Tropico Surf Shop</p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xs text-gray-400 mt-1">Atualizado: {updatedLabel}</p>
            <PrintButton />
          </div>
        </div>

        {/* Filtros de período */}
        <div className="flex gap-2 print:hidden">
          {FILTROS.map(f => {
            const active = f.value === periodo
            return (
              <Link
                key={f.value}
                href={`/relatorio?periodo=${f.value}`}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {f.label}
              </Link>
            )
          })}
        </div>

        {/* Meta Ads KPIs */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Meta Ads</h2>
          <div className="kpi-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <KpiCard label="Gasto"       value={fmtBRL(overview.spend)} />
            <KpiCard label="Alcance"     value={fmt(overview.reach)} />
            <KpiCard label="Impressões"  value={fmt(overview.impressions)} />
            <KpiCard label="Cliques"     value={fmt(overview.clicks)} />
            <KpiCard label="CTR"         value={fmtPct(overview.ctr)} />
            <KpiCard label="CPM"         value={fmtBRL(overview.cpm)} />
            <KpiCard label="Curtidas"    value={fmt(creatives.reduce((s, a) => s + a.likes, 0))} />
            <KpiCard label="Conversas"   value={fmt(totalConversations)} highlight={totalConversations > 0} />
          </div>
        </div>

        {/* Google Ads KPIs */}
        {google && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Google Ads</h2>
            <div className="kpi-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <KpiCard label="Custo"       value={fmtBRL(google.overview.cost)} />
              <KpiCard label="Impressões"  value={fmt(google.overview.impressions)} />
              <KpiCard label="Cliques"     value={fmt(google.overview.clicks)} />
              <KpiCard label="CTR"         value={fmtPct(google.overview.ctr)} />
              <KpiCard label="CPC médio"   value={fmtBRL(google.overview.avgCpc)} />
              <KpiCard label="Conversões"  value={fmt(Math.round(google.overview.conversions))} highlight={google.overview.conversions > 0} />
            </div>
          </div>
        )}

        {/* Gasto Diário */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Gasto Diário</h2>
          <DailySpendChart metaDaily={data.daily} googleDaily={google?.daily ?? []} />
        </section>

        {/* Conversas Diárias */}
        <section>
          <ConversationBarChart daily={data.daily} />
        </section>

        {/* Melhores anúncios por conversas */}
        <section>
          <TopAdsCards creatives={creatives} />
        </section>

        {/* Audiência Meta */}
        {data.audiences.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Audiência Meta</h2>

            {/* Campanhas de Alcance */}
            {data.audiences.filter(a => a.audienceType === 'Alcance').length > 0 && (
              <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-700">Campanhas de alcance</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left text-gray-400 font-semibold px-6 py-3 text-[11px] uppercase tracking-wider">Nome do público</th>
                        <th className="text-right text-gray-400 font-semibold px-4 py-3 text-[11px] uppercase tracking-wider">Impressões</th>
                        <th className="text-right text-gray-400 font-semibold px-4 py-3 text-[11px] uppercase tracking-wider">Cliques</th>
                        <th className="text-right text-gray-400 font-semibold px-4 py-3 text-[11px] uppercase tracking-wider">Alcance</th>
                        <th className="text-right text-gray-400 font-semibold px-4 py-3 text-[11px] uppercase tracking-wider">CTR</th>
                        <th className="text-right text-gray-400 font-semibold px-4 py-3 text-[11px] uppercase tracking-wider">Taxa de engajamento</th>
                        <th className="text-right text-gray-400 font-semibold px-4 py-3 text-[11px] uppercase tracking-wider">Conversas iniciadas</th>
                        <th className="text-right text-gray-400 font-semibold px-6 py-3 text-[11px] uppercase tracking-wider">CPM</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.audiences
                        .filter(a => a.audienceType === 'Alcance')
                        .sort((a, b) => b.reach - a.reach)
                        .map(audience => (
                          <tr key={audience.audienceName} className="hover:bg-gray-50">
                            <td className="px-6 py-3 font-medium text-gray-900 text-xs">{audience.audienceName}</td>
                            <td className="px-4 py-3 text-right text-gray-600 tabular-nums text-xs">{fmt(audience.impressions)}</td>
                            <td className="px-4 py-3 text-right text-gray-600 tabular-nums text-xs">{fmt(audience.clicks)}</td>
                            <td className="px-4 py-3 text-right text-gray-600 tabular-nums text-xs">{fmt(audience.reach)}</td>
                            <td className="px-4 py-3 text-right text-gray-600 tabular-nums text-xs">{fmtPct(audience.ctr)}</td>
                            <td className="px-4 py-3 text-right text-gray-600 tabular-nums text-xs">{fmtPct(audience.engagementRate)}</td>
                            <td className="px-4 py-3 text-right text-gray-600 tabular-nums text-xs">{fmt(audience.conversationsStarted)}</td>
                            <td className="px-6 py-3 text-right text-gray-600 tabular-nums text-xs">{fmtBRL(audience.cpm)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Campanhas de Conversão */}
            {data.audiences.filter(a => a.audienceType === 'Conversão').length > 0 && (
              <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-700">Campanhas Meta Ads</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left text-gray-400 font-semibold px-6 py-3 text-[11px] uppercase tracking-wider">Nome do público</th>
                        <th className="text-right text-gray-400 font-semibold px-4 py-3 text-[11px] uppercase tracking-wider">Impressões</th>
                        <th className="text-right text-gray-400 font-semibold px-4 py-3 text-[11px] uppercase tracking-wider">Cliques</th>
                        <th className="text-right text-gray-400 font-semibold px-4 py-3 text-[11px] uppercase tracking-wider">Alcance</th>
                        <th className="text-right text-gray-400 font-semibold px-4 py-3 text-[11px] uppercase tracking-wider">CTR</th>
                        <th className="text-right text-gray-400 font-semibold px-4 py-3 text-[11px] uppercase tracking-wider">Taxa de engajamento</th>
                        <th className="text-right text-gray-400 font-semibold px-4 py-3 text-[11px] uppercase tracking-wider">Conversas iniciadas</th>
                        <th className="text-right text-gray-400 font-semibold px-6 py-3 text-[11px] uppercase tracking-wider">Custo por conversa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.audiences
                        .filter(a => a.audienceType === 'Conversão')
                        .sort((a, b) => b.conversationsStarted - a.conversationsStarted)
                        .map(audience => (
                          <tr key={audience.audienceName} className="hover:bg-gray-50">
                            <td className="px-6 py-3 font-medium text-gray-900 text-xs">{audience.audienceName}</td>
                            <td className="px-4 py-3 text-right text-gray-600 tabular-nums text-xs">{fmt(audience.impressions)}</td>
                            <td className="px-4 py-3 text-right text-gray-600 tabular-nums text-xs">{fmt(audience.clicks)}</td>
                            <td className="px-4 py-3 text-right text-gray-600 tabular-nums text-xs">{fmt(audience.reach)}</td>
                            <td className="px-4 py-3 text-right text-gray-600 tabular-nums text-xs">{fmtPct(audience.ctr)}</td>
                            <td className="px-4 py-3 text-right text-gray-600 tabular-nums text-xs">{fmtPct(audience.engagementRate)}</td>
                            <td className="px-4 py-3 text-right text-gray-600 tabular-nums text-xs">{fmt(audience.conversationsStarted)}</td>
                            <td className="px-6 py-3 text-right text-gray-600 tabular-nums text-xs">
                              {audience.costPerConversation ? fmtBRL(audience.costPerConversation) : '—'}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        )}

        {/* Comparativo Semanal */}
        <WeeklyComparisonTable metaDaily={dataFull.daily} googleDaily={googleFull?.daily ?? []} />

        {/* Anúncios Meta por Objetivo */}
        {creatives.length > 0 && (
          <div className="space-y-6">
            {Array.from(new Set(creatives.map(c => c.campaignObjective || 'Outro'))).map(objective => {
              const objectiveCreatives = creatives.filter(c => (c.campaignObjective || 'Outro') === objective)
              const objectiveLabel = getObjectiveLabel(objective)

              return (
                <section key={objective} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-gray-700">
                      {objectiveLabel} <span className="text-gray-400 font-normal">({objectiveCreatives.length})</span>
                    </h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left text-gray-400 font-semibold px-5 py-3 text-[11px] uppercase tracking-wider">Anúncio</th>
                          <th className="text-left text-gray-400 font-semibold px-3 py-3 text-[11px] uppercase tracking-wider w-px whitespace-nowrap">Status</th>
                          <th className="text-right text-gray-400 font-semibold px-4 py-3 text-[11px] uppercase tracking-wider">Gasto</th>
                          <th className="text-right text-gray-400 font-semibold px-4 py-3 text-[11px] uppercase tracking-wider">Alcance</th>
                          <th className="text-right text-gray-400 font-semibold px-4 py-3 text-[11px] uppercase tracking-wider">Impressões</th>
                          <th className="text-right text-gray-400 font-semibold px-4 py-3 text-[11px] uppercase tracking-wider">Cliques</th>
                          <th className="text-right text-gray-400 font-semibold px-4 py-3 text-[11px] uppercase tracking-wider">CTR</th>
                          <th className="text-right text-gray-400 font-semibold px-4 py-3 text-[11px] uppercase tracking-wider">CPM</th>
                          <th className="text-right text-gray-400 font-semibold px-4 py-3 text-[11px] uppercase tracking-wider">Curtidas</th>
                          <th className="text-right text-gray-400 font-semibold px-4 py-3 text-[11px] uppercase tracking-wider">Conversas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {objectiveCreatives.map(ad => (
                          <tr key={ad.adId} className="hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-2">
                              <div className="flex items-center gap-3">
                                {ad.thumbnailUrl ? (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img src={ad.thumbnailUrl} alt="" className="w-[64px] h-[64px] rounded object-cover bg-gray-100 shrink-0" />
                                ) : (
                                  <div className="w-[64px] h-[64px] rounded bg-gray-100 shrink-0" />
                                )}
                                <span className="text-xs text-gray-700 truncate max-w-[260px]">
                                  {ad.adName.replace(/_/g, ' ')}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-2 w-px whitespace-nowrap">
                              <StatusBadge status={ad.effectiveStatus} />
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-gray-900 tabular-nums text-xs">{fmtBRL(ad.spend)}</td>
                            <td className="px-4 py-3 text-right text-gray-600 tabular-nums text-xs">{fmt(ad.reach)}</td>
                            <td className="px-4 py-3 text-right text-gray-600 tabular-nums text-xs">{fmt(ad.impressions)}</td>
                            <td className="px-4 py-3 text-right text-gray-600 tabular-nums text-xs">{fmt(ad.clicks)}</td>
                            <td className="px-4 py-3 text-right text-gray-600 tabular-nums text-xs">{fmtPct(ad.ctr)}</td>
                            <td className="px-4 py-3 text-right text-gray-600 tabular-nums text-xs">{fmtBRL(ad.cpm)}</td>
                            <td className="px-4 py-3 text-right text-gray-600 tabular-nums text-xs">{ad.likes > 0 ? fmt(ad.likes) : '—'}</td>
                            <td className="px-4 py-3 text-right font-medium tabular-nums text-xs">
                              <span className={ad.conversations > 0 ? 'text-green-600' : 'text-gray-400'}>
                                {ad.conversations > 0 ? fmt(ad.conversations) : '—'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )
            })}
          </div>
        )}

        {/* Regiões */}
        {cities.length > 0 && (
          <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Alcance por região</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Região</th>
                  <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Impressões</th>
                  <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Cliques</th>
                  <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">CTR</th>
                  <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">CPC</th>
                  <th className="text-right px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Gasto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cities.map(c => (
                  <tr key={c.region} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900 text-xs">{c.region}</td>
                    <td className="px-4 py-3 text-right text-gray-600 tabular-nums text-xs">{fmt(c.impressions)}</td>
                    <td className="px-4 py-3 text-right text-gray-600 tabular-nums text-xs">{fmt(c.clicks)}</td>
                    <td className="px-4 py-3 text-right text-gray-600 tabular-nums text-xs">{fmtPct(c.ctr)}</td>
                    <td className="px-4 py-3 text-right text-gray-600 tabular-nums text-xs">{fmtBRL(c.cpc)}</td>
                    <td className="px-6 py-3 text-right font-medium text-gray-900 tabular-nums text-xs">{fmtBRL(c.spend)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Campanhas Google Ads */}
        {google && google.campaigns.length > 0 && (
          <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">
                Campanhas Google <span className="text-gray-400 font-normal">({google.campaigns.length})</span>
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left text-gray-400 font-semibold px-5 py-3 text-[11px] uppercase tracking-wider">Campanha</th>
                    <th className="text-left text-gray-400 font-semibold px-3 py-3 text-[11px] uppercase tracking-wider w-px whitespace-nowrap">Status</th>
                    <th className="text-right text-gray-400 font-semibold px-4 py-3 text-[11px] uppercase tracking-wider">Custo</th>
                    <th className="text-right text-gray-400 font-semibold px-4 py-3 text-[11px] uppercase tracking-wider">Impressões</th>
                    <th className="text-right text-gray-400 font-semibold px-4 py-3 text-[11px] uppercase tracking-wider">Cliques</th>
                    <th className="text-right text-gray-400 font-semibold px-4 py-3 text-[11px] uppercase tracking-wider">CTR</th>
                    <th className="text-right text-gray-400 font-semibold px-4 py-3 text-[11px] uppercase tracking-wider">CPC médio</th>
                    <th className="text-right text-gray-400 font-semibold px-4 py-3 text-[11px] uppercase tracking-wider">Conversões</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {google.campaigns.map(c => (
                    <tr key={c.campaignId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <span className="text-xs text-gray-700 truncate max-w-[260px] inline-block align-middle">
                          {c.campaignName}
                        </span>
                      </td>
                      <td className="px-3 py-3 w-px whitespace-nowrap">
                        <StatusBadge status={c.status === 'ENABLED' ? 'ACTIVE' : c.status} />
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900 tabular-nums text-xs">{fmtBRL(c.cost)}</td>
                      <td className="px-4 py-3 text-right text-gray-600 tabular-nums text-xs">{fmt(c.impressions)}</td>
                      <td className="px-4 py-3 text-right text-gray-600 tabular-nums text-xs">{fmt(c.clicks)}</td>
                      <td className="px-4 py-3 text-right text-gray-600 tabular-nums text-xs">{fmtPct(c.ctr)}</td>
                      <td className="px-4 py-3 text-right text-gray-600 tabular-nums text-xs">{fmtBRL(c.avgCpc)}</td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums text-xs">
                        <span className={c.conversions > 0 ? 'text-green-600' : 'text-gray-400'}>
                          {c.conversions > 0 ? fmt(Math.round(c.conversions)) : '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Google Ads Sync (Supabase) */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Dados Sincronizados Google Ads</h2>
          <GoogleAdsMetrics {...periodRange(periodo)} />
        </section>

      </div>
    </div>
  )
}

function KpiCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-xl font-bold mt-1 ${highlight ? 'text-green-600' : 'text-gray-900'}`}>{value}</p>
    </div>
  )
}

