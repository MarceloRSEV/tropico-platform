#!/usr/bin/env node
// Testa conexão com Google Ads API usando credenciais do .env
// Uso: node scripts/test-google-ads-api.js

import 'dotenv/config.js';

const {
  GOOGLE_ADS_CLIENT_ID,
  GOOGLE_ADS_CLIENT_SECRET,
  GOOGLE_ADS_REFRESH_TOKEN,
  GOOGLE_ADS_LOGIN_CUSTOMER_ID,
  GOOGLE_ADS_CUSTOMER_ID,
  GOOGLE_ADS_DEVELOPER_TOKEN,
} = process.env;

if (!GOOGLE_ADS_REFRESH_TOKEN) {
  console.error('❌ GOOGLE_ADS_REFRESH_TOKEN não configurado em .env');
  process.exit(1);
}

async function getAccessToken() {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: GOOGLE_ADS_REFRESH_TOKEN,
      client_id: GOOGLE_ADS_CLIENT_ID,
      client_secret: GOOGLE_ADS_CLIENT_SECRET,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('❌ Erro ao renovar token:', response.status, error);
    throw new Error(`Token refresh falhou: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function testGoogleAdsAPI() {
  console.log('🔍 Testando Google Ads API...\n');

  try {
    // Passo 1: Renovar access token
    console.log('1️⃣  Renovando access token...');
    const accessToken = await getAccessToken();
    console.log('✅ Token renovado com sucesso\n');

    // Passo 2: Chamar API
    console.log('2️⃣  Chamando Google Ads API...');
    console.log(`   URL: https://googleads.googleapis.com/v22/customers/${GOOGLE_ADS_CUSTOMER_ID}/googleAds:search`);
    console.log(`   Login Customer ID: ${GOOGLE_ADS_LOGIN_CUSTOMER_ID}`);
    console.log(`   Customer ID: ${GOOGLE_ADS_CUSTOMER_ID}\n`);

    const response = await fetch(
      `https://googleads.googleapis.com/v22/customers/${GOOGLE_ADS_CUSTOMER_ID}/googleAds:search`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'login-customer-id': GOOGLE_ADS_LOGIN_CUSTOMER_ID,
          'developer-token': GOOGLE_ADS_DEVELOPER_TOKEN || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: 'SELECT customer.id, customer.descriptive_name FROM customer',
        }),
      }
    );

    const data = await response.json();

    if (response.ok) {
      console.log('✅ SUCESSO! Conexão validada.\n');
      console.log('📊 Resposta da API:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.error('❌ ERRO na API:');
      console.error(`Status: ${response.status}`);
      console.error('Response:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('❌ Erro ao testar:', error.message);
    process.exit(1);
  }
}

testGoogleAdsAPI();
