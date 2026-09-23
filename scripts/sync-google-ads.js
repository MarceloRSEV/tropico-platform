/**
 * Sync Google Ads API → Supabase
 * 
 * Busca dados diários do Google Ads MCC e salva no Supabase
 * 
 * Uso:
 *   node scripts/sync-google-ads.js [--date YYYY-MM-DD] [--days N]
 * 
 * Exemplos:
 *   node scripts/sync-google-ads.js                    # Sincroniza ontem
 *   node scripts/sync-google-ads.js --date 2026-09-20  # Data específica
 *   node scripts/sync-google-ads.js --days 30          # Últimos 30 dias
 */

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// ============================================
// CONFIG
// ============================================

const GOOGLE_ADS = {
  CLIENT_ID: process.env.GOOGLE_ADS_CLIENT_ID,
  CLIENT_SECRET: process.env.GOOGLE_ADS_CLIENT_SECRET,
  REFRESH_TOKEN: process.env.GOOGLE_ADS_REFRESH_TOKEN,
  DEVELOPER_TOKEN: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
  CUSTOMER_ID: process.env.GOOGLE_ADS_CUSTOMER_ID,
  LOGIN_CUSTOMER_ID: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
};

const SUPABASE = {
  URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

if (!GOOGLE_ADS.CUSTOMER_ID) {
  console.error('❌ GOOGLE_ADS_CUSTOMER_ID não configurado no .env.local');
  process.exit(1);
}

if (!SUPABASE.URL || !SUPABASE.SERVICE_KEY) {
  console.error('❌ Credenciais Supabase não configuradas');
  process.exit(1);
}

const supabase = createClient(SUPABASE.URL, SUPABASE.SERVICE_KEY);

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function getYesterdayDate() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
}

function getPastDaysRange(days) {
  const end = new Date();
  end.setDate(end.getDate() - 1);
  
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

async function getGoogleAccessToken() {
  try {
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: GOOGLE_ADS.CLIENT_ID,
      client_secret: GOOGLE_ADS.CLIENT_SECRET,
      refresh_token: GOOGLE_ADS.REFRESH_TOKEN,
      grant_type: 'refresh_token',
    });
    return response.data.access_token;
  } catch (error) {
    throw new Error(`Falha ao renovar Google access token: ${error.message}`);
  }
}

async function fetchGoogleAdsData(startDate, endDate) {
  const accessToken = await getGoogleAccessToken();
  
  const query = `
    SELECT
      campaign.id,
      campaign.name,
      ad_group.id,
      ad_group.name,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.cost_micros,
      segments.date
    FROM ad_group
    WHERE segments.date >= '${startDate}'
      AND segments.date <= '${endDate}'
    ORDER BY segments.date DESC, campaign.name ASC
  `;

  try {
    const response = await axios.post(
      `https://googleads.googleapis.com/v17/customers/${GOOGLE_ADS.CUSTOMER_ID}/googleAds:search`,
      { query },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': GOOGLE_ADS.DEVELOPER_TOKEN,
          'Content-Type': 'application/json',
          'login-customer-id': GOOGLE_ADS.LOGIN_CUSTOMER_ID,
        },
      }
    );

    return response.data.results || [];
  } catch (error) {
    const msg = error.response?.data?.error?.message || error.message;
    throw new Error(`Google Ads API error: ${msg}`);
  }
}

async function saveToSupabase(records) {
  if (records.length === 0) {
    console.log('⚠️  Nenhum registro para salvar');
    return 0;
  }

  const payload = records.map((row) => ({
    customer_id: GOOGLE_ADS.CUSTOMER_ID,
    client_name: 'Trópico',
    campaign_id: row.campaign?.id,
    campaign_name: row.campaign?.name,
    ad_group_id: row.adGroup?.id,
    ad_group_name: row.adGroup?.name,
    impressions: parseInt(row.metrics?.impressions || '0'),
    clicks: parseInt(row.metrics?.clicks || '0'),
    conversions: parseFloat(row.metrics?.conversions || '0'),
    cost: row.metrics?.costMicros
      ? parseFloat((row.metrics.costMicros / 1_000_000).toFixed(2))
      : 0,
    date: row.segments?.date,
  }));

  try {
    const { error } = await supabase
      .from('tropico_google_ads_daily')
      .upsert(payload, {
        onConflict: 'customer_id,campaign_id,ad_group_id,date',
      });

    if (error) throw error;
    console.log(`✅ ${payload.length} registros salvos no Supabase`);
    return payload.length;
  } catch (error) {
    throw new Error(`Supabase upsert failed: ${error.message}`);
  }
}

async function logSyncStatus(date, recordCount, status, errorMsg = null) {
  const { error } = await supabase
    .from('tropico_google_ads_sync_log')
    .upsert({
      customer_id: GOOGLE_ADS.CUSTOMER_ID,
      client_name: 'Trópico',
      sync_date: date,
      records_synced: recordCount,
      sync_status: status,
      error_message: errorMsg,
    }, {
      onConflict: 'customer_id,sync_date',
    });

  if (error) {
    console.warn('⚠️  Falha ao registrar log:', error.message);
  }
}

// ============================================
// MAIN
// ============================================

async function main() {
  const args = process.argv.slice(2);
  let startDate, endDate;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--date') {
      startDate = args[i + 1];
      endDate = args[i + 1];
      i++;
    } else if (args[i] === '--days') {
      const days = parseInt(args[i + 1]);
      const range = getPastDaysRange(days);
      startDate = range.start;
      endDate = range.end;
      i++;
    }
  }

  if (!startDate) {
    const yesterday = getYesterdayDate();
    startDate = yesterday;
    endDate = yesterday;
  }

  console.log(`\n📊 Google Ads Sync`);
  console.log(`🔐 Customer: ${GOOGLE_ADS.CUSTOMER_ID}`);
  console.log(`📅 Período: ${startDate} até ${endDate}\n`);

  try {
    console.log('🔄 Buscando dados do Google Ads API...');
    const googleAdsData = await fetchGoogleAdsData(startDate, endDate);
    console.log(`📈 ${googleAdsData.length} registros encontrados`);

    if (googleAdsData.length === 0) {
      console.log('⚠️  Sem dados para este período');
      await logSyncStatus(startDate, 0, 'success', 'Sem dados');
      return;
    }

    console.log('💾 Salvando no Supabase...');
    const count = await saveToSupabase(googleAdsData);

    console.log('📝 Registrando log...');
    await logSyncStatus(endDate, count, 'success');

    console.log('\n✅ Sincronização concluída!\n');
  } catch (error) {
    console.error(`\n❌ Erro: ${error.message}\n`);
    
    try {
      await logSyncStatus(endDate || startDate || getYesterdayDate(), 0, 'failed', error.message);
    } catch (logError) {
      console.warn('⚠️  Falha ao registrar erro:', logError.message);
    }

    process.exit(1);
  }
}

main();
