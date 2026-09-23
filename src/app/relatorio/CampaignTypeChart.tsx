'use client'

interface CampaignData {
  type: 'Pesquisa' | 'Performance Max' | 'Facebook' | 'Instagram'
  cost: number
  impressions: number
  clicks: number
  platform: 'google' | 'meta'
}

interface CampaignTypeChartProps {
  data: CampaignData[]
}

export default function CampaignTypeChart({ data }: CampaignTypeChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-500">
        Sem dados disponíveis
      </div>
    )
  }

  const maxCost = Math.max(...data.map(d => d.cost))
  const scale = maxCost > 0 ? 300 / maxCost : 1 // 300px de largura máxima

  const getIcon = (type: string) => {
    switch (type) {
      case 'Pesquisa': return '🔍'
      case 'Performance Max': return '⚡'
      case 'Facebook': return 'f'
      case 'Instagram': return '📷'
      default: return '•'
    }
  }

  const getColor = (platform: string, type: string) => {
    if (platform === 'google') return 'from-blue-500 to-blue-600'
    return type === 'Facebook' ? 'from-blue-600 to-blue-700' : 'from-pink-500 to-pink-600'
  }

  const getHoverColor = (platform: string, type: string) => {
    if (platform === 'google') return 'group-hover:from-blue-600 group-hover:to-blue-700'
    return type === 'Facebook' ? 'group-hover:from-blue-700 group-hover:to-blue-800' : 'group-hover:from-pink-600 group-hover:to-pink-700'
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-6">Investimento por Posicionamento</h3>

        <div className="space-y-6">
          {data.map(campaign => {
            const width = campaign.cost * scale

            return (
              <div key={`${campaign.platform}-${campaign.type}`} className="space-y-2">
                {/* Label */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-gray-900">
                      {getIcon(campaign.type)} {campaign.type}
                    </p>
                    <p className="text-[10px] text-gray-400 font-normal">
                      ({campaign.platform === 'google' ? 'Google' : 'Meta'})
                    </p>
                  </div>
                  <p className="text-xs font-semibold text-gray-900">R$ {campaign.cost.toFixed(2)}</p>
                </div>

                {/* Barra */}
                <div className="flex items-center gap-3 group">
                  <div
                    className={`h-10 rounded bg-gradient-to-r ${getColor(campaign.platform, campaign.type)} transition-all ${getHoverColor(campaign.platform, campaign.type)} shadow-sm`}
                    style={{ width: `${width}px` }}
                  />
                  <div className="text-xs text-gray-600 flex gap-4 min-w-fit">
                    <span>{campaign.impressions.toLocaleString()} impr.</span>
                    <span>{campaign.clicks.toLocaleString()} cliques</span>
                  </div>
                </div>

                {/* Percentual */}
                <div className="text-[11px] text-gray-500">
                  {((campaign.cost / data.reduce((sum, d) => sum + d.cost, 0)) * 100).toFixed(1)}% do total
                </div>
              </div>
            )
          })}
        </div>

        {/* Total */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <p className="text-xs font-semibold text-gray-700">Total de Investimento</p>
            <p className="text-sm font-bold text-blue-600">
              R$ {data.reduce((sum, d) => sum + d.cost, 0).toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
