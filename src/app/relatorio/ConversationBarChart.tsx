'use client'

import { MetaDailyRow } from '@/lib/meta'

interface ConversationBarChartProps {
  daily: MetaDailyRow[]
}

export default function ConversationBarChart({ daily }: ConversationBarChartProps) {
  if (daily.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-500">
        Sem dados disponíveis
      </div>
    )
  }

  const maxConversations = Math.max(...daily.map(d => d.conversations), 1)
  const scale = maxConversations > 0 ? 200 / maxConversations : 1

  // Agrupar por mês para exibir abaixo
  const groupedByMonth = new Map<string, typeof daily>()
  for (const day of daily) {
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversas por Dia</h3>

        <div className="w-full h-full flex flex-col">
          {/* Gráfico */}
          <div className="flex-1 flex gap-1 items-end justify-between" style={{
            height: '300px',
            paddingRight: '20px',
            paddingBottom: '20px',
            minHeight: '300px',
          }}>
            {daily.map(day => {
              const barHeight = day.conversations * scale

              return (
                <div
                  key={day.date}
                  className="flex flex-col items-center gap-1 group flex-1"
                  style={{ minWidth: '12px' }}
                >
                  {/* Valor ACIMA da barra */}
                  <div className="h-6 flex items-center justify-center">
                    <p className="text-[8px] font-bold text-gray-900 whitespace-nowrap">
                      {day.conversations > 0 ? day.conversations.toFixed(0) : ''}
                    </p>
                  </div>

                  {/* Barra */}
                  <div
                    className="w-full bg-green-500 transition-colors group-hover:bg-green-600 rounded-sm"
                    style={{ height: `${barHeight}px`, minHeight: '4px' }}
                    title={`Conversas: ${day.conversations}`}
                  />

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
              const monthWidth = (month.count / daily.length) * 100
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
            <div className="w-3 h-3 rounded-sm bg-green-500" />
            <span className="text-gray-600">Conversas Iniciadas</span>
          </div>
        </div>
      </div>
    </div>
  )
}
