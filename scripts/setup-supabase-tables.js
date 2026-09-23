/**
 * Setup Supabase Tables via API
 * Executa o SQL diretamente sem passar pelo navegador
 *
 * Uso: node scripts/setup-supabase-tables.js
 */

const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Credenciais Supabase não configuradas');
  process.exit(1);
}

const sql1 = `
CREATE TABLE IF NOT EXISTS tropico_google_ads_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL,
  client_name TEXT DEFAULT 'Trópico',
  campaign_id TEXT,
  campaign_name TEXT,
  ad_group_id TEXT,
  ad_group_name TEXT,
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  conversions NUMERIC DEFAULT 0,
  cost NUMERIC DEFAULT 0,
  date DATE NOT NULL,
  synced_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(customer_id, campaign_id, ad_group_id, date)
);

CREATE TABLE IF NOT EXISTS tropico_google_ads_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL,
  client_name TEXT DEFAULT 'Trópico',
  sync_date DATE NOT NULL,
  records_synced INT DEFAULT 0,
  sync_status TEXT DEFAULT 'pending',
  error_message TEXT,
  synced_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(customer_id, sync_date)
);
`;

const sql2 = `
CREATE INDEX idx_tropico_google_ads_daily_date ON tropico_google_ads_daily(date DESC);
CREATE INDEX idx_tropico_google_ads_daily_customer ON tropico_google_ads_daily(customer_id);
CREATE INDEX idx_tropico_google_ads_daily_campaign ON tropico_google_ads_daily(campaign_id);
CREATE INDEX idx_tropico_google_ads_daily_client ON tropico_google_ads_daily(client_name);
CREATE INDEX idx_tropico_google_ads_daily_synced ON tropico_google_ads_daily(synced_at DESC);

CREATE INDEX idx_tropico_google_ads_sync_log_customer ON tropico_google_ads_sync_log(customer_id);
CREATE INDEX idx_tropico_google_ads_sync_log_status ON tropico_google_ads_sync_log(sync_status);
CREATE INDEX idx_tropico_google_ads_sync_log_client ON tropico_google_ads_sync_log(client_name);
`;

const sql3 = `
ALTER TABLE tropico_google_ads_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tropico_admin_or_self" ON tropico_google_ads_daily FOR SELECT
USING ((auth.jwt_claim('user_type')::text = 'admin') OR (auth.jwt_claim('customer_id')::text = customer_id));

CREATE OR REPLACE FUNCTION update_tropico_google_ads_daily_timestamp() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tropico_google_ads_daily_timestamp BEFORE UPDATE ON tropico_google_ads_daily
FOR EACH ROW EXECUTE FUNCTION update_tropico_google_ads_daily_timestamp();
`;

async function executeSql(sql, step) {
  try {
    console.log(`\n⏳ Executando PASSO ${step}...`);

    const response = await axios.post(
      `${SUPABASE_URL}/rest/v1/rpc/exec_sql`,
      { sql },
      {
        headers: {
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        timeout: 30000, // 30 segundos
      }
    );

    console.log(`✅ PASSO ${step}: OK`);
    return true;
  } catch (error) {
    // Se a função RPC não existir, tenta via graphql
    console.log(`⚠️  Método 1 falhou, tentando método 2...`);

    try {
      const response = await axios.post(
        `${SUPABASE_URL}/graphql/v1`,
        { query: `mutation { executeSQL(sql: ${JSON.stringify(sql)}) }` },
        {
          headers: {
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      console.log(`✅ PASSO ${step}: OK`);
      return true;
    } catch (err) {
      console.error(`❌ PASSO ${step} FALHOU:`, err.response?.data?.message || err.message);
      return false;
    }
  }
}

async function main() {
  console.log('🔧 Setup Supabase Tables');
  console.log(`📍 Project: ${SUPABASE_URL}`);

  try {
    // Passo 1: Criar tabelas
    const step1 = await executeSql(sql1, 1);
    if (!step1) {
      console.error('❌ Setup interrompido no Passo 1');
      process.exit(1);
    }

    // Aguardar 2 segundos
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Passo 2: Criar índices
    const step2 = await executeSql(sql2, 2);
    if (!step2) {
      console.error('⚠️  Passo 2 falhou, continuando...');
    }

    // Aguardar 2 segundos
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Passo 3: RLS + Triggers
    const step3 = await executeSql(sql3, 3);
    if (!step3) {
      console.error('⚠️  Passo 3 falhou, continuando...');
    }

    console.log('\n✅ Setup concluído!\n');
    console.log('📋 Próximos passos:');
    console.log('  1. Verifique as tabelas em: https://app.supabase.com/project/ibryvujocmgjperqxqli/editor');
    console.log('  2. Execute: git push origin master');
    console.log('  3. Acesse: https://tropico-platform.vercel.app/relatorio\n');
  } catch (error) {
    console.error('❌ Erro fatal:', error.message);
    process.exit(1);
  }
}

main();
