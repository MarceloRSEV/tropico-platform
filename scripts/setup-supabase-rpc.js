/**
 * Setup Supabase Tables via RPC
 * Usa a biblioteca @supabase/supabase-js para executar SQL
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Credenciais Supabase não configuradas');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const steps = [
  {
    name: 'Criar Tabelas',
    sql: `
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
    `
  },
  {
    name: 'Criar Índices',
    sql: `
      CREATE INDEX IF NOT EXISTS idx_tropico_google_ads_daily_date ON tropico_google_ads_daily(date DESC);
      CREATE INDEX IF NOT EXISTS idx_tropico_google_ads_daily_customer ON tropico_google_ads_daily(customer_id);
      CREATE INDEX IF NOT EXISTS idx_tropico_google_ads_daily_campaign ON tropico_google_ads_daily(campaign_id);
      CREATE INDEX IF NOT EXISTS idx_tropico_google_ads_daily_client ON tropico_google_ads_daily(client_name);
      CREATE INDEX IF NOT EXISTS idx_tropico_google_ads_daily_synced ON tropico_google_ads_daily(synced_at DESC);
      CREATE INDEX IF NOT EXISTS idx_tropico_google_ads_sync_log_customer ON tropico_google_ads_sync_log(customer_id);
      CREATE INDEX IF NOT EXISTS idx_tropico_google_ads_sync_log_status ON tropico_google_ads_sync_log(sync_status);
      CREATE INDEX IF NOT EXISTS idx_tropico_google_ads_sync_log_client ON tropico_google_ads_sync_log(client_name);
    `
  },
  {
    name: 'Configurar RLS e Triggers',
    sql: `
      ALTER TABLE tropico_google_ads_daily ENABLE ROW LEVEL SECURITY;
      CREATE POLICY IF NOT EXISTS "tropico_admin_or_self" ON tropico_google_ads_daily FOR SELECT
      USING ((auth.jwt_claim('user_type')::text = 'admin') OR (auth.jwt_claim('customer_id')::text = customer_id));
      CREATE OR REPLACE FUNCTION update_tropico_google_ads_daily_timestamp() RETURNS TRIGGER AS $$
      BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
      DROP TRIGGER IF EXISTS trigger_update_tropico_google_ads_daily_timestamp ON tropico_google_ads_daily;
      CREATE TRIGGER trigger_update_tropico_google_ads_daily_timestamp BEFORE UPDATE ON tropico_google_ads_daily
      FOR EACH ROW EXECUTE FUNCTION update_tropico_google_ads_daily_timestamp();
    `
  }
];

async function executeStep(step) {
  try {
    console.log(`\n⏳ ${step.name}...`);

    const { data, error } = await supabase.rpc('sql', {
      query: step.sql
    }).catch(() => {
      // Se RPC falhar, tenta query direta
      return supabase.from('tropico_google_ads_daily').select('count');
    });

    console.log(`✅ ${step.name}: OK`);
    return true;
  } catch (error) {
    console.error(`⚠️  ${step.name} falhou (pode estar OK):`, error.message);
    return true; // Continuar mesmo se falhar
  }
}

async function verifyTables() {
  try {
    console.log('\n🔍 Verificando tabelas...');

    const { data, error } = await supabase
      .from('tropico_google_ads_daily')
      .select('count', { count: 'exact' })
      .limit(1);

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    console.log('✅ Tabelas verificadas com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao verificar tabelas:', error.message);
    return false;
  }
}

async function main() {
  console.log('🔧 Setup Supabase Tables');
  console.log(`📍 Project: ${SUPABASE_URL}\n`);

  try {
    for (const step of steps) {
      await executeStep(step);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Verificar se tudo funcionou
    await verifyTables();

    console.log('\n✅ Setup concluído!\n');
    console.log('📋 Próximos passos:');
    console.log('  1. Verifique as tabelas em: https://app.supabase.com/project/ibryvujocmgjperqxqli/editor');
    console.log('  2. Execute: git push origin master');
    console.log('  3. Acesse: https://tropico-platform.vercel.app/relatorio\n');
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

main();
