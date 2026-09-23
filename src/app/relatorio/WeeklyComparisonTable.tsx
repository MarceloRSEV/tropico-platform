'use client'

import { MetaDailyRow } from '@/lib/meta'
import { GoogleDailyRow } from '@/lib/google'

interface WeeklyComparisonTableProps {
  metaDaily: MetaDailyRow[]
  googleDaily: GoogleDailyRow[]
}

interface WeeklyData {
  weekStart: string
  weekEnd: string
  metaSpend: number
  googleCost: number
  metaImpressions: number
  googleImpressions: number
  metaClicks: number
  googleClicks: number
  metaCtr: number
  googleCtr: number
  metaCpm: number
  googleAvgCpc: number
  metaConversations: number
}

export default function WeeklyComparisonTable({ metaDaily, googleDaily }: WeeklyComparisonTableProps) {
  // Agrupa por semana (segunda a domingo)
  const dateMap = new Map<string, {
    meta: { spend: number; impressions: number; clicks: number; conversations: number; dates: string[] }
    google: { cost: number; impressions: number; clicks: number; dates: string[] }
  }>()

  // Processar dados Meta
  for (const row of metaDaily) {
    const date = new Date(row.date)
    const dayOfWeek = date.getDay() // 0 = domingo, 1 = segunda
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const monday = new Date(date)
    monday.setDate(date.getDate() - daysToMonday)
    const weekKey = monday.toISOString().split('T')[0]

    if (!dateMap.has(weekKey)) {
      dateMap.set(weekKey, {
        meta: { spend: 0, impressions: 0, clicks: 0, conversations: 0, dates: [] },
        google: { cost: 0, impressions: 0, clicks: 0, dates: [] },
      })
    }

    const week = dateMap.get(weekKey)!
    week.meta.spend += row.spend
    week.meta.impressions += row.impressions
    week.meta.clicks += row.clicks
    week.meta.conversations += row.conversations
    week.meta.dates.push(row.date)
  }

  // Processar dados Google
  for (const row of googleDaily) {
    const date = new Date(row.date)
    const dayOfWeek = date.getDay()
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const monday = new Date(date)
    monday.setDate(date.getDate() - daysToMonday)
    const weekKey = monday.toISOString().split('T')[0]

    if (!dateMap.has(weekKey)) {
      dateMap.set(weekKey, {
        meta: { spend: 0, impressions: 0, clicks: 0, conversations: 0, dates: [] },
        google: { cost: 0, impressions: 0, clicks: 0, dates: [] },
      })
    }

    const week = dateMap.get(weekKey)!
    week.google.cost += row.cost
    week.google.impressions += row.impressions
    week.google.clicks += row.clicks
    week.google.dates.push(row.date)
  }

  // Obter todas as semanas com dados e ordenar
  const allWeeks = Array.from(dateMap.keys()).sort()

  // Se não houver dados, retornar vazio
  if (allWeeks.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-500">
        Sem dados disponíveis
      </div>
    )
  }

  // Mapear todas as semanas com seus dados
  const allWeeksData = allWeeks.map(weekStart => {
    const data = dateMap.get(weekStart)!

    const allDates = [...data.meta.dates, ...data.google.dates].sort()
    const weekEnd = allDates.length > 0
      ? allDates[allDates.length - 1]
      : new Date(new Date(weekStart).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const metaTotalSpend = data.meta.spend
    const googleTotalCost = data.google.cost
    const metaImpressions = data.meta.impressions
    const googleImpressions = data.google.impressions
    const metaClicks = data.meta.clicks
    const googleClicks = data.google.clicks
    const metaConversations = data.meta.conversations

    const metaCtr = metaImpressions > 0 ? (metaClicks / metaImpressions) * 100 : 0
    const googleCtr = googleImpressions > 0 ? (googleClicks / googleImpressions) * 100 : 0
    const metaCpm = metaImpressions > 0 ? metaTotalSpend / (metaImpressions / 1000) : 0
    const googleAvgCpc = googleClicks > 0 ? googleTotalCost / googleClicks : 0

    return {
      weekStart,
      weekEnd,
      metaSpend: metaTotalSpend,
      googleCost: googleTotalCost,
      metaImpressions,
      googleImpressions,
      metaClicks,
      googleClicks,
      metaCtr,
      googleCtr,
      metaCpm,
      googleAvgCpc,
      metaConversations,
    }
  })

  // Filtrar apenas semanas com investimento > 0 e pegar as últimas 4
  const weeks: WeeklyData[] = allWeeksData
    .filter(w => w.metaSpend > 0 || w.googleCost > 0)
    .slice(-4)

  const fmtBRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const fmt = (n: number) => n.toLocaleString('pt-BR')
  const fmtPct = (n: number) => n.toFixed(2) + '%'

  const formatWeekRange = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    return `${startDate.getDate()}/${(startDate.getMonth() + 1).toString().padStart(2, '0')} – ${endDate.getDate()}/${(endDate.getMonth() + 1).toString().padStart(2, '0')}`
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700">Comparativo Semanal</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left text-gray-400 font-semibold px-6 py-3 text-[11px] uppercase tracking-wider">Semana</th>
              <th colSpan={6} className="text-center text-gray-400 font-semibold px-4 py-3 text-[11px] uppercase tracking-wider border-l border-gray-200">Meta Ads</th>
              <th colSpan={5} className="text-center text-gray-400 font-semibold px-4 py-3 text-[11px] uppercase tracking-wider border-l border-gray-200">Google Ads</th>
              <th className="text-right text-gray-400 font-semibold px-6 py-3 text-[11px] uppercase tracking-wider border-l border-gray-200">Total</th>
            </tr>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left text-gray-400 font-semibold px-6 py-3 text-[11px] uppercase tracking-wider"></th>
              <th className="text-right text-gray-400 font-semibold px-4 py-3 text-[11px] uppercase tracking-wider">Invest.</th>
              <th className="text-right text-gray-400 font-semibold px-4 py-3 text-[11px] uppercase tracking-wider">Impr.</th>
              <th className="text-right text-gray-400 font-semibold px-4 py-3 text-[11px] uppercase tracking-wider">Cliques</th>
              <th className="text-right text-gray-400 font-semibold px-4 py-3 text-[11px] uppercase tracking-wider">CTR</th>
              <th className="text-right text-gray-400 font-semibold px-4 py-3 text-[11px] uppercase tracking-wider">CPM</th>
              <th className="text-right text-gray-400 font-semibold px-4 py-3 text-[11px] uppercase tracking-wider border-l border-gray-200">Conversas</th>
              <th className="text-right text-gray-400 font-semibold px-4 py-3 text-[11px] uppercase tracking-wider border-l border-gray-200">Invest.</th>
              <th className="text-right text-gray-400 font-semibold px-4 py-3 text-[11px] uppercase tracking-wider">Impr.</th>
              <th className="text-right text-gray-400 font-semibold px-4 py-3 text-[11px] uppercase tracking-wider">Cliques</th>
              <th className="text-right text-gray-400 font-semibold px-4 py-3 text-[11px] uppercase tracking-wider">CTR</th>
              <th className="text-right text-gray-400 font-semibold px-4 py-3 text-[11px] uppercase tracking-wider border-l border-gray-200">CPC</th>
              <th className="text-right text-gray-400 font-semibold px-6 py-3 text-[11px] uppercase tracking-wider border-l border-gray-200">Invest.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {weeks.map(week => {
              const totalInvest = week.metaSpend + week.googleCost
              return (
                <tr key={week.weekStart} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900 text-xs">{formatWeekRange(week.weekStart, week.weekEnd)}</td>
                  {/* Meta Ads */}
                  <td className="px-4 py-3 text-right font-semibold text-gray-900 tabular-nums text-xs">{fmtBRL(week.metaSpend)}</td>
                  <td className="px-4 py-3 text-right text-gray-600 tabular-nums text-xs">{fmt(week.metaImpressions)}</td>
                  <td className="px-4 py-3 text-right text-gray-600 tabular-nums text-xs">{fmt(week.metaClicks)}</td>
                  <td className="px-4 py-3 text-right text-gray-600 tabular-nums text-xs">{fmtPct(week.metaCtr)}</td>
                  <td className="px-4 py-3 text-right text-gray-600 tabular-nums text-xs">{fmtBRL(week.metaCpm)}</td>
                  <td className="px-4 py-3 text-right text-gray-600 tabular-nums text-xs border-l border-gray-200">{fmt(week.metaConversations)}</td>
                  {/* Google Ads */}
                  <td className="px-4 py-3 text-right font-semibold text-gray-900 tabular-nums text-xs border-l border-gray-200">{fmtBRL(week.googleCost)}</td>
                  <td className="px-4 py-3 text-right text-gray-600 tabular-nums text-xs">{fmt(week.googleImpressions)}</td>
                  <td className="px-4 py-3 text-right text-gray-600 tabular-nums text-xs">{fmt(week.googleClicks)}</td>
                  <td className="px-4 py-3 text-right text-gray-600 tabular-nums text-xs">{fmtPct(week.googleCtr)}</td>
                  <td className="px-4 py-3 text-right text-gray-600 tabular-nums text-xs border-l border-gray-200">{fmtBRL(week.googleAvgCpc)}</td>
                  {/* Total */}
                  <td className="px-6 py-3 text-right font-bold text-blue-600 tabular-nums text-xs border-l border-gray-200">{fmtBRL(totalInvest)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
