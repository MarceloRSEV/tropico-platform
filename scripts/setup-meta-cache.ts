/**
 * Script para criar tabela meta_dashboard_cache no Supabase
 * Executar: npx tsx scripts/setup-meta-cache.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function setup() {
  console.log('🔧 Criando tabela meta_dashboard_cache...')

  try {
    // SQL para criar tabela e políticas
    const sql = `
      -- Create meta_dashboard_cache table
      CREATE TABLE IF NOT EXISTS meta_dashboard_cache (
        id TEXT PRIMARY KEY DEFAULT 'latest',
        data JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      -- Enable RLS
      ALTER TABLE meta_dashboard_cache ENABLE ROW LEVEL SECURITY;

      -- Allow public read
      DROP POLICY IF EXISTS "Allow public read" ON meta_dashboard_cache;
      CREATE POLICY "Allow public read" ON meta_dashboard_cache
        FOR SELECT USING (true);

      -- Allow authenticated users to read
      DROP POLICY IF EXISTS "Allow authenticated read" ON meta_dashboard_cache;
      CREATE POLICY "Allow authenticated read" ON meta_dashboard_cache
        FOR SELECT USING (auth.role() = 'authenticated');

      -- Allow anon key to write (via API)
      DROP POLICY IF EXISTS "Allow anon write" ON meta_dashboard_cache;
      CREATE POLICY "Allow anon write" ON meta_dashboard_cache
        FOR INSERT, UPDATE USING (true);

      -- Create index
      CREATE INDEX IF NOT EXISTS meta_dashboard_cache_updated_at
        ON meta_dashboard_cache (updated_at DESC);
    `

    // Execute SQL
    const { error } = await supabase.rpc('exec_sql', { sql })

    if (error) {
      console.warn('⚠️  Não foi possível criar via RPC:', error)
      console.log('📝 SQL para executar manualmente no Supabase SQL Editor:\n')
      console.log(sql)
    } else {
      console.log('✅ Tabela criada com sucesso!')
    }
  } catch (error) {
    console.error('❌ Erro:', error)
    process.exit(1)
  }
}

setup()
