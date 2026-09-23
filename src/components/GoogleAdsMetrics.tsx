'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export function GoogleAdsMetrics() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalImpressions: 0,
    totalClicks: 0,
    totalConversions: 0,
    totalCost: 0,
  });

  useEffect(() => {
    fetchGoogleAdsData();
  }, []);

  async function fetchGoogleAdsData() {
    try {
      setLoading(true);

      // Buscar últimos 30 dias
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

      const { data: records, error } = await supabase
        .from('tropico_google_ads_daily')
        .select('*')
        .gte('date', dateStr)
        .order('date', { ascending: false });

      if (error) throw error;

      if (records && records.length > 0) {
        setData(records);

        // Calcular resumo
        const totals = records.reduce((acc, row) => ({
          totalImpressions: acc.totalImpressions + (row.impressions || 0),
          totalClicks: acc.totalClicks + (row.clicks || 0),
          totalConversions: acc.totalConversions + (row.conversions || 0),
          totalCost: acc.totalCost + (row.cost || 0),
        }), {
          totalImpressions: 0,
          totalClicks: 0,
          totalConversions: 0,
          totalCost: 0,
        });

        setSummary(totals);
      }
    } catch (error) {
      console.error('Erro buscando dados:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Carregando dados...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Impressões</div>
          <div className="text-2xl font-bold text-blue-600">
            {summary.totalImpressions.toLocaleString('pt-BR')}
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Cliques</div>
          <div className="text-2xl font-bold text-green-600">
            {summary.totalClicks.toLocaleString('pt-BR')}
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Conversões</div>
          <div className="text-2xl font-bold text-purple-600">
            {summary.totalConversions.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Custo</div>
          <div className="text-2xl font-bold text-red-600">
            R$ {summary.totalCost.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Tabela de Dados */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Data</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Campanha</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Grupo de Anúncios</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Impressões</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Cliques</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Conversões</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Custo</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.length > 0 ? (
                data.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{row.date}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{row.campaign_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{row.ad_group_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">
                      {(row.impressions || 0).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">
                      {(row.clicks || 0).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">
                      {(row.conversions || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">
                      R$ {(row.cost || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Sem dados disponíveis
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Botão para Atualizar */}
      <div className="flex justify-end">
        <button
          onClick={fetchGoogleAdsData}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Atualizar Dados
        </button>
      </div>
    </div>
  );
}
