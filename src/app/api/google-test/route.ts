import { isGoogleAdsConfigured } from '@/lib/google'

async function testGaqlQuery() {
  console.log('\n--- Getting Access Token ---')
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
      grant_type: 'refresh_token',
    }),
  })

  if (!tokenRes.ok) {
    const error = await tokenRes.text()
    console.error('Token error:', tokenRes.status, error)
    throw new Error(`Token error: ${tokenRes.status} - ${error}`)
  }

  const accessToken = await tokenRes.json()
  console.log('Token OK, expires in:', accessToken.expires_in)

  const custId = (process.env.GOOGLE_ADS_CUSTOMER_ID ?? '').replace(/\D/g, '')
  const loginCustId = (process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID ?? '').replace(/\D/g, '')

  console.log('\n=== GAQL TEST ===')
  console.log('Customer ID:', custId)
  console.log('Login Customer ID:', loginCustId)
  console.log('Token expires in:', accessToken.expires_in)

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken.access_token}`,
    'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    'Content-Type': 'application/json',
  }
  if (loginCustId) {
    headers['login-customer-id'] = loginCustId
  }

  // Query simples: contar campanhas
  const query = 'SELECT campaign.id, campaign.name FROM campaign LIMIT 5'
  console.log('Query:', query)

  const res = await fetch(`https://googleads.googleapis.com/v18/customers/${custId}/googleAds:search`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query }),
  })

  const body = await res.text()
  console.log('Status:', res.status)
  console.log('Response:', body.substring(0, 500))

  return { status: res.status, body: JSON.parse(body) }
}

export async function GET() {
  console.log('\n=== GOOGLE ADS DEBUG ===')
  console.log('Configured:', isGoogleAdsConfigured())
  console.log('Env vars:', {
    DEVELOPER_TOKEN: process.env.GOOGLE_ADS_DEVELOPER_TOKEN ? '✓' : '✗',
    CLIENT_ID: process.env.GOOGLE_ADS_CLIENT_ID ? '✓' : '✗',
    CLIENT_SECRET: process.env.GOOGLE_ADS_CLIENT_SECRET ? '✓' : '✗',
    REFRESH_TOKEN: process.env.GOOGLE_ADS_REFRESH_TOKEN ? '✓' : '✗',
    CUSTOMER_ID: process.env.GOOGLE_ADS_CUSTOMER_ID,
    LOGIN_CUSTOMER_ID: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
  })

  try {
    const result = await testGaqlQuery()
    return Response.json(result, { status: 200 })
  } catch (e) {
    console.error('Error:', e)
    return Response.json({ status: 'error', error: String(e) }, { status: 500 })
  }
}
