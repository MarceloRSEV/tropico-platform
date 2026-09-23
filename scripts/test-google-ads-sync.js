#!/usr/bin/env node
/**
 * Script de teste: verifica se a sincronização do Google Ads está funcionando
 *
 * Uso:
 *   node scripts/test-google-ads-sync.js
 */

require('dotenv').config()

async function test() {
  console.log('\n╔════════════════════════════════════════════════════════════╗')
  console.log('║  Google Ads Sync — Test Suite                              ║')
  console.log('╚════════════════════════════════════════════════════════════╝\n')

  // 1. Verificar credenciais
  console.log('✓ Verificando credenciais...')
  const required = [
    'GOOGLE_ADS_DEVELOPER_TOKEN',
    'GOOGLE_ADS_CLIENT_ID',
    'GOOGLE_ADS_CLIENT_SECRET',
    'GOOGLE_ADS_REFRESH_TOKEN',
    'GOOGLE_ADS_CUSTOMER_ID',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SYNC_SECRET_TOKEN',
  ]

  let allSet = true
  for (const key of required) {
    const value = process.env[key]
    const status = value ? '✓' : '✗'
    console.log(`  ${status} ${key}`)
    if (!value) allSet = false
  }

  if (!allSet) {
    console.error('\n✗ Algumas credenciais estão faltando. Verifique .env\n')
    process.exit(1)
  }

  console.log('\n✓ Todas as credenciais configuradas!\n')

  // 2. Testar endpoint
  console.log('✓ Testando endpoint /api/sync-google-ads...')
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  try {
    // Primeiro, verificar se está disponível (GET)
    const statusRes = await fetch(`${baseUrl}/api/sync-google-ads`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!statusRes.ok) {
      console.error(`✗ Endpoint retornou status ${statusRes.status}`)
      process.exit(1)
    }

    const statusData = await statusRes.json()
    console.log('  GET /api/sync-google-ads:', statusData)

    // Agora testar sincronização de 1 dia
    console.log('\n✓ Testando sincronização (último 1 dia)...')
    const syncRes = await fetch(`${baseUrl}/api/sync-google-ads?days=1`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SYNC_SECRET_TOKEN}`,
        'Content-Type': 'application/json',
      },
    })

    if (!syncRes.ok) {
      const error = await syncRes.text()
      console.error(`✗ Sincronização falhou: ${syncRes.status}`)
      console.error('  Response:', error.substring(0, 500))
      process.exit(1)
    }

    const syncData = await syncRes.json()
    console.log('  Status:', syncData.success ? '✓ SUCCESS' : '✗ FAILED')
    console.log('  Registros sincronizados:', syncData.synced)
    console.log('  Período:', syncData.period.since, 'a', syncData.period.until)

    if (syncData.success && syncData.synced > 0) {
      console.log('\n✓ Sincronização funcionando corretamente!\n')
    } else {
      console.log('\n⚠ Sincronização não retornou dados. Pode significar:')
      console.log('  - Sem campanhas ativas no Google Ads')
      console.log('  - Nenhum gasto no período')
      console.log('  - Problema com a conexão\n')
    }

  } catch (error) {
    console.error(`✗ Erro ao testar: ${error.message}`)
    console.error('\n  Verifique se o servidor está rodando:')
    console.error('  npm run dev\n')
    process.exit(1)
  }
}

test()
