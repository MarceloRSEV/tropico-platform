# Convenção de Nomenclatura Supabase - Multi Cliente

**Projeto Supabase:** `tropico` (ibryvujocmgjperqxqli)  
**Estratégia:** Um projeto para múltiplos clientes com **namespace de cliente** em cada tabela

---

## 📋 Convenção de Nomenclatura

### Formato: `{cliente}_{dominio}_{entidade}`

| Cliente | Tabelas | Exemplo |
|---------|---------|---------|
| **Trópico** | `tropico_google_ads_daily` | Dados diários Google Ads |
| **Luvas Juliana** | `luvas_google_ads_daily` | Dados diários Google Ads |
| **Óticas Lauro** | `oticas_google_ads_daily` | Dados diários Google Ads |

---

## 🏗️ Estrutura para Trópico

### Tabela: `tropico_google_ads_daily`
```sql
CREATE TABLE tropico_google_ads_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL,           -- Google Ads Customer ID
  client_name TEXT DEFAULT 'Trópico',  -- Identificador legível
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
```

### Tabela: `tropico_google_ads_sync_log`
```sql
CREATE TABLE tropico_google_ads_sync_log (
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
```

---

## 🔑 Campo `client_name` (Importante)

Sempre adicione `client_name` para:
- ✅ Fácil identificação visual no Supabase
- ✅ Queries multi-cliente sem ambiguidade
- ✅ Auditoria e logging

**Exemplo de Query:**
```sql
SELECT * FROM tropico_google_ads_daily 
WHERE client_name = 'Trópico' AND date >= '2026-09-20'
ORDER BY date DESC;
```

---

## 📦 Replicar para Novos Clientes

Quando adicionar novo cliente:

1. **Copiar tabelas com prefixo novo:**
   ```sql
   CREATE TABLE luvas_google_ads_daily AS SELECT * FROM tropico_google_ads_daily WHERE 1=0;
   ALTER TABLE luvas_google_ads_daily ADD CONSTRAINT luvas_unique UNIQUE(customer_id, campaign_id, ad_group_id, date);
   ```

2. **Atualizar scripts:**
   ```bash
   # scripts/sync-google-ads.js
   # Adicionar parâmetro --client
   node scripts/sync-google-ads.js --client tropico
   node scripts/sync-google-ads.js --client luvas
   ```

3. **Atualizar .env:**
   ```bash
   GOOGLE_ADS_CUSTOMER_ID_TROPICO=9923174960
   GOOGLE_ADS_CUSTOMER_ID_LUVAS=XXXXXXXXXXXX
   ```

---

## 🔐 RLS Por Cliente

```sql
-- Política: Admin vê tudo, cliente vê só seus dados
CREATE POLICY "tropico_admin_or_self" ON tropico_google_ads_daily
  FOR SELECT
  USING (
    (auth.jwt_claim('user_type')::text = 'admin')
    OR (auth.jwt_claim('customer_id')::text = customer_id)
  );
```

---

## 📊 Query Multi-Cliente (Dashboard Central)

```sql
-- Ver dados de TODOS os clientes em um dashboard
SELECT 
  client_name,
  date,
  SUM(impressions) as total_impressions,
  SUM(clicks) as total_clicks,
  SUM(cost) as total_cost
FROM (
  SELECT * FROM tropico_google_ads_daily
  UNION ALL
  SELECT * FROM luvas_google_ads_daily
  UNION ALL
  SELECT * FROM oticas_google_ads_daily
)
WHERE date >= '2026-09-01'
GROUP BY client_name, date
ORDER BY client_name, date DESC;
```

---

## ✅ Checklist

- [x] Tabelas nomeadas com prefixo de cliente
- [x] Campo `client_name` para identificação visual
- [x] RLS por cliente configurado
- [x] Scripts suportam múltiplos clientes
- [x] Documentação centralizada

---

**Aplicar:** Sempre que criar nova tabela de dados de cliente, use este padrão!
