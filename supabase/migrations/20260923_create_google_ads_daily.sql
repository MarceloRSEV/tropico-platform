-- Create tropico_google_ads_daily table for syncing Google Ads data
-- Project: tropico (ibryvujocmgjperqxqli) - Multi-Client Support
-- Created: 2026-09-23
-- Convention: {client}_{domain}_{entity} (e.g., tropico_google_ads_daily)

CREATE TABLE IF NOT EXISTS tropico_google_ads_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL,
  client_name TEXT DEFAULT ''Trópico'',  -- Identificação legível do cliente
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

CREATE INDEX idx_tropico_google_ads_daily_date ON tropico_google_ads_daily(date DESC);
CREATE INDEX idx_tropico_google_ads_daily_customer ON tropico_google_ads_daily(customer_id);
CREATE INDEX idx_tropico_google_ads_daily_campaign ON tropico_google_ads_daily(campaign_id);
CREATE INDEX idx_tropico_google_ads_daily_client ON tropico_google_ads_daily(client_name);
CREATE INDEX idx_tropico_google_ads_daily_synced ON tropico_google_ads_daily(synced_at DESC);

ALTER TABLE tropico_google_ads_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tropico_admin_or_self"
  ON tropico_google_ads_daily
  FOR SELECT
  USING ((auth.jwt_claim(''user_type'')::text = ''admin'') OR (auth.jwt_claim(''customer_id'')::text = customer_id));

CREATE OR REPLACE FUNCTION update_tropico_google_ads_daily_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tropico_google_ads_daily_timestamp
  BEFORE UPDATE ON tropico_google_ads_daily FOR EACH ROW
  EXECUTE FUNCTION update_tropico_google_ads_daily_timestamp();

CREATE TABLE IF NOT EXISTS tropico_google_ads_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL,
  client_name TEXT DEFAULT ''Trópico'',
  sync_date DATE NOT NULL,
  records_synced INT DEFAULT 0,
  sync_status TEXT DEFAULT ''pending'',
  error_message TEXT,
  synced_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(customer_id, sync_date)
);

CREATE INDEX idx_tropico_google_ads_sync_log_customer ON tropico_google_ads_sync_log(customer_id);
CREATE INDEX idx_tropico_google_ads_sync_log_status ON tropico_google_ads_sync_log(sync_status);
CREATE INDEX idx_tropico_google_ads_sync_log_client ON tropico_google_ads_sync_log(client_name);
