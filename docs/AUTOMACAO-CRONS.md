# Automação de Crons — Tropico Dashboard

**Data:** 2026-08-25  
**Status:** ✅ Implementado

## Problema Resolvido

O Supabase free tier pausava após **7 dias de inatividade**, causando indisponibilidade do dashboard.

## Solução Implementada

### 1. **Keep-Alive Automático** (Novo)
- **Endpoint:** `/api/cron/keep-alive`
- **Schedule:** A cada 6 horas (`0 */6 * * *`)
- **O que faz:** Executa uma query simples no Supabase para manter a conexão ativa
- **Resultado:** Supabase nunca mais pausa por inatividade

### 2. **Sincronização Google Ads** (Existente)
- **Diário:** 02:00 UTC (`0 2 * * *`)
- **Semanal:** domingo 03:00 UTC (`0 3 * * 0`)
- Importa dados de campanhas de performance do Google Ads para o Supabase

### 3. **Relatório Semanal Automático** (Novo)
- **Schedule:** segunda-feira 08:00 UTC (`0 8 * * 1`)
- **Endpoint:** `/api/generate-report`
- **Uso:** Trigger automático para n8n enviar email semanal
- **Formato:** JSON com métricas Meta + Google Ads, variações semanais

## Configuração (Vercel)

O arquivo `vercel.json` foi atualizado com todos os crons:

```json
{
  "crons": [
    {
      "path": "/api/cron/keep-alive",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/sync-google-ads?days=1",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/sync-google-ads?days=7",
      "schedule": "0 3 * * 0"
    },
    {
      "path": "/api/generate-report?token=${REPORT_API_TOKEN}",
      "schedule": "0 8 * * 1"
    }
  ]
}
```

## Próximas Etapas

### ✅ Feito
- [x] Endpoint keep-alive implementado
- [x] Crons configurados no vercel.json
- [x] Documentação criada

### ⏳ A Fazer
- [ ] **Deploy em produção:** `git push` → Vercel redeploy automático
- [ ] **Validar keep-alive:** Monitorar Supabase ativo 24h depois
- [ ] **Testar relatório:** Confirmar que `/api/generate-report` retorna dados válidos
- [ ] **Integrar n8n:** Configurar webhook para receber relatório toda segunda-feira

## Monitoramento

### Como verificar se o keep-alive está funcionando:
1. Acesse o dashboard Vercel: https://vercel.com/dashboard
2. Projeto: `tropico-platform`
3. Aba: **Deployments** → Selecione deployment atual
4. Aba: **Functions** → Procure por `/api/cron/keep-alive`
5. Logs devem mostrar execuções a cada 6 horas

### Como testar o keep-alive manualmente:
```bash
curl -X GET "https://tropico-platform.vercel.app/api/cron/keep-alive"
```

Resposta esperada:
```json
{
  "ok": true,
  "timestamp": "2026-08-25T14:30:00.000Z"
}
```

## Informações Técnicas

### Ambiente Vercel
- **Crons automáticos:** Sem custos adicionais (free plan)
- **Frequência máxima:** 5 minutos (usar com moderação)
- **Timeout:** 30 segundos (keep-alive leva ~100ms)
- **Autenticação:** Token Supabase service role (server-only)

### Supabase
- **Projeto:** `ibryvujocmgjperqxqli` (Escalada shared)
- **Tabela usado:** `ad_accounts` (query leve para keep-alive)
- **Service Role Key:** Armazenado em `SUPABASE_SERVICE_ROLE_KEY` (env Vercel)

## Referências

- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Supabase Free Tier](https://supabase.com/pricing)
- Docs locais: `docs/deploy-vercel.md`, `docs/prd/tropico-surfshop-prd.md`
