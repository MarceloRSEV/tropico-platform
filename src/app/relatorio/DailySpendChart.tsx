'use client'

import { MetaDailyRow } from '@/lib/meta'
import { GoogleDailyRow } from '@/lib/google'

interface DailySpendChartProps {
  metaDaily: MetaDailyRow[]
  googleDaily: GoogleDailyRow[]
}

export default function DailySpendChart({ metaDaily, googleDaily }: DailySpendChartProps) {
  // Combina os dados diários de ambas plataformas
  const dateMap = new Map<string, { meta: number; google: number }>()

  for (const row of metaDaily) {
    dateMap.set(row.date, { meta: row.spend, google: 0 })
  }

  for (const row of googleDaily) {
    const existing = dateMap.get(row.date) ?? { meta: 0, google: 0 }
    dateMap.set(row.date, { ...existing, google: row.cost })
  }

  const data = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { meta, google }]) => ({
      date,
      meta,
      google,
      total: meta + google,
    }))

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-500">
        Sem dados disponíveis
      </div>
    )
  }

  const maxSpend = Math.max(...data.map(d => d.total))
  const scale = maxSpend > 0 ? 200 / maxSpend : 1

  // Agrupar por mês para exibir abaixo
  const groupedByMonth = new Map<string, typeof data>()
  for (const day of data) {
    const monthKey = day.date.substring(0, 7)
    if (!groupedByMonth.has(monthKey)) {
      groupedByMonth.set(monthKey, [])
    }
    groupedByMonth.get(monthKey)!.push(day)
  }

  const months = Array.from(groupedByMonth.entries()).map(([key, days]) => ({
    key,
    label: new Date(key + '-01').toLocaleString('pt-BR', { month: 'short', year: '2-digit' }),
    count: days.length,
  }))

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-6">
        <div className="w-full h-full flex flex-col">
          {/* Gráfico */}
          <div className="flex-1 flex gap-1 items-end justify-between" style={{
            height: '380px',
            paddingRight: '20px',
            paddingBottom: '20px',
            minHeight: '380px',
          }}>
            {data.map(day => {
                const metaHeight = day.meta * scale
                const googleHeight = day.google * scale

                return (
                  <div
                    key={day.date}
                    className="flex flex-col items-center gap-1 group flex-1"
                    style={{ minWidth: '12px' }}
                  >
                    {/* Valor ACIMA da barra */}
                    <div className="h-6 flex items-center justify-center">
                      <p className="text-[8px] font-bold text-gray-900 whitespace-nowrap">
                        {day.total > 0 ? day.total.toFixed(0) : ''}
                      </p>
                    </div>

                    {/* Barra combinada */}
                    <div className="relative w-full flex flex-col-reverse bg-gray-50 rounded-sm overflow-hidden border border-gray-200" style={{ height: `${metaHeight + googleHeight}px`, minHeight: '4px' }}>
                      {metaHeight > 0 && (
                        <div
                          className="bg-blue-500 transition-colors group-hover:bg-blue-600 w-full"
                          style={{ height: `${metaHeight}px` }}
                          title={`Meta: R$ ${day.meta.toFixed(2)}`}
                        />
                      )}
                      {googleHeight > 0 && (
                        <div
                          className="bg-red-500 transition-colors group-hover:bg-red-600 w-full"
                          style={{ height: `${googleHeight}px` }}
                          title={`Google: R$ ${day.google.toFixed(2)}`}
                        />
                      )}
                    </div>

                    {/* Dia */}
                    <div className="h-5 flex items-center justify-center">
                      <p className="text-[10px] text-gray-700 font-medium whitespace-nowrap">
                        {day.date.substring(8)}
                      </p>
                    </div>
                  </div>
                )
              })}
          </div>

          {/* Eixo X — Meses */}
          <div className="flex mt-4" style={{ paddingRight: '20px' }}>
            {months.map((month) => {
              const monthWidth = (month.count / data.length) * 100
              return (
                <div
                  key={month.key}
                  style={{
                    width: `${monthWidth}%`,
                  }}
                  className="text-center border-t border-gray-300 pt-2"
                >
                  <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{month.label}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Legenda */}
        <div className="flex gap-6 justify-start mt-6 text-xs border-t border-gray-200 pt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-blue-500" />
            <span className="text-gray-600">Meta Ads</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-red-500" />
            <span className="text-gray-600">Google Ads</span>
          </div>
        </div>
      </div>
    </div>
  )
}
