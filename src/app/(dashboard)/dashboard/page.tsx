import { getMetaDashboardData } from '@/lib/meta'

function fmt(n: number) {
  return n.toLocaleString('pt-BR')
}

function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtPct(n: number) {
  return n.toFixed(2) + '%'
}

export default async function DashboardPage() {
  const data = await getMetaDashboardData()
  const { overview, daily, creatives, cities, updatedAt } = data

  const maxSpend = Math.max(...daily.map(d => d.spend), 1)

  const updatedLabel = new Date(updatedAt).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="p-8 space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meta Ads</h1>
          <p className="text-sm text-gray-500 mt-0.5">Tropico Surf Shop — mês corrente</p>
        </div>
        <p className="text-xs text-gray-400 mt-1">Atualizado: {updatedLabel}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard label="Gasto" value={fmtBRL(overview.spend)} />
        <KpiCard label="Alcance" value={fmt(overview.reach)} />
        <KpiCard label="Impressões" value={fmt(overview.impressions)} />
        <KpiCard label="Cliques" value={fmt(overview.clicks)} />
        <KpiCard label="CTR" value={fmtPct(overview.ctr)} />
        <KpiCard label="CPM" value={fmtBRL(overview.cpm)} />
      </div>

      {/* Gráfico diário */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Gasto diário</h2>
        <div className="flex items-end gap-1.5 h-32">
          {daily.map(d => {
            const pct = (d.spend / maxSpend) * 100
            const label = d.date.slice(8) // dia
            return (
              <div key={d.date} className="flex flex-col items-center flex-1 gap-1 group h-full">
                <div className="relative flex-1 w-full max-w-14 flex items-end">
                  {daily.length <= 16 && (
                    <span
                      className="absolute left-1/2 -translate-x-1/2 text-[10px] text-gray-500 whitespace-nowrap"
                      style={{ bottom: `calc(${pct * 0.85}% + 3px)` }}
                    >
                      {d.spend.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                    </span>
                  )}
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                    <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                      {fmtBRL(d.spend)}
                    </div>
                  </div>
                  <div
                    className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors"
                    style={{ height: `${pct * 0.85}%`, minHeight: '4px' }}
                  />
                </div>
                <span className="text-[10px] text-gray-400">{label}</span>
              </div>
            )
          })}
        </div>
      </section>

      {/* Anúncios */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-4">
          Anúncios <span className="text-gray-400 font-normal">({creatives.length})</span>
        </h2>
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500">Anúncio</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Gasto</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Alcance</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Impressões</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Cliques</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">CTR</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">CPM</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Comentários</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Curtidas</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500">Conversas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {creatives.map(ad => (
                <tr key={ad.adId} className="hover:bg-gray-50">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3 min-w-[220px]">
                      {ad.thumbnailUrl ? (
                        <img
                          src={ad.thumbnailUrl}
                          alt={ad.adName}
                          className="w-12 h-12 rounded-lg object-cover bg-gray-100 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center">
                          <span className="text-[9px] text-gray-400">sem img</span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 leading-tight truncate max-w-[240px]">
                          {ad.adName.replace(/_/g, ' ')}
                        </p>
                        <span className={`inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                          ad.effectiveStatus === 'ACTIVE'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {ad.effectiveStatus === 'ACTIVE' ? 'Ativo' : ad.effectiveStatus}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{fmtBRL(ad.spend)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{fmt(ad.reach)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{fmt(ad.impressions)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{fmt(ad.clicks)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{fmtPct(ad.ctr)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{fmtBRL(ad.cpm)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{ad.comments > 0 ? fmt(ad.comments) : '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{ad.likes > 0 ? fmt(ad.likes) : '—'}</td>
                  <td className="px-6 py-3 text-right">
                    {ad.conversations > 0
                      ? <span className="font-medium text-green-600">{fmt(ad.conversations)}</span>
                      : <span className="text-gray-400">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Regiões */}
      {cities.length > 0 && (
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Alcance por região</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500">Região</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Impressões</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Cliques</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">CTR</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">CPC</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-500">Gasto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cities.map(c => (
                <tr key={c.region} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{c.region}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{fmt(c.impressions)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{fmt(c.clicks)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{fmtPct(c.ctr)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{fmtBRL(c.cpc)}</td>
                  <td className="px-6 py-3 text-right font-medium text-gray-900">{fmtBRL(c.spend)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

    </div>
  )
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  )
}
