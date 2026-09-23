# Deploy Vercel — Trópico Platform

> Executado em 2026-08-06 por @devops (Gage). Projeto Vercel: `tropico-platform` (team `marcelorsevs-projects`).

## Status

| Item | Status |
|------|--------|
| Build local (`npm run build`) | PASSOU (após fixes de tipo + upgrade Next 15.1.0 → 15.5.12) |
| Deploy produção | NO AR — https://tropico-platform.vercel.app |
| Domínio custom | `tropico.escaladavirtual.com.br` adicionado e verificado na Vercel — **aguardando CNAME na HostGator** |
| Env vars produção | 8 configuradas (ver lista abaixo) |

## O que foi feito

1. **Fixes de build (TypeScript):**
   - `src/lib/meta.ts` — anotações de tipo do `Map` de insights alinhadas (faltava omitir `effectiveStatus`/`conversations`). Sem mudança de lógica.
   - `src/lib/supabase/server.ts` e `src/middleware.ts` — tipo explícito no parâmetro `cookiesToSet` (erro de `any` implícito).
2. **`next.config.ts`** — `serverActions.allowedOrigins` agora inclui `tropico.escaladavirtual.com.br` e `*.vercel.app` (antes só `localhost:3000`).
3. **Upgrade de segurança:** Next.js `15.1.0` → `15.5.12` + `eslint-config-next`. A Vercel **bloqueia deploy** da 15.1.0 (CVE-2025-29927 — bypass de middleware; crítico aqui porque o auth do app depende de middleware).
4. **Projeto linkado:** `vercel link --yes --project tropico-platform --scope marcelorsevs-projects` (criou `.vercel/`, já no gitignore).
5. **Env vars de produção** adicionadas via `vercel env add` (valores lidos do `.env` local, nunca expostos):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL` → definida como `https://tropico.escaladavirtual.com.br`
   - `META_ACCESS_TOKEN` ⚠️ (expirado — ver Pendências)
   - `META_AD_ACCOUNT_ID`
   - `PDF_TOKEN`
   - `SESSION_SECRET`
   - `RELATORIO_PASSWORD`
   - (`NODE_ENV` é gerenciada automaticamente pela Vercel; `SUPABASE_SERVICE_ROLE_KEY` e demais chaves do `.env` são usadas só por scripts locais e NÃO foram enviadas)
6. **Deploy produção:** `vercel --prod --yes` → deployment `tropico-platform-15v29mtci-marcelorsevs-projects.vercel.app` (produção estável: `tropico-platform.vercel.app`).
7. **Domínio:** `vercel domains add tropico.escaladavirtual.com.br` → adicionado ao projeto, `verified: true`. Falta só o DNS.

## DNS na HostGator (AÇÃO MANUAL DO MARCELO)

O DNS de `escaladavirtual.com.br` usa os nameservers `ns74/ns75.hostgator.com.br`. No painel da HostGator (cPanel → **Zone Editor** / Editor de Zona DNS do domínio `escaladavirtual.com.br`), criar **1 registro**:

| Campo | Valor |
|-------|-------|
| Tipo | `CNAME` |
| Nome (host) | `tropico` (alguns painéis exigem `tropico.escaladavirtual.com.br.`) |
| Valor (aponta para) | `0a5c919dad11fd74.vercel-dns-017.com.` |
| TTL | `3600` (ou o mínimo permitido, ex.: 14400) |

- Esse é o CNAME **recomendado pela Vercel para este projeto** (rank 1). Alternativa genérica que também funciona: `cname.vercel-dns.com.`
- NÃO criar registro A para `tropico` — apenas o CNAME. Se já existir um registro A ou CNAME para `tropico`, remover antes.
- Nada muda no domínio raiz nem no site WordPress atual.

## Verificar propagação

```powershell
# deve responder com o CNAME da Vercel
nslookup -type=CNAME tropico.escaladavirtual.com.br

# ou
Resolve-DnsName tropico.escaladavirtual.com.br
```

Online: https://dnschecker.org/#CNAME/tropico.escaladavirtual.com.br

Depois da propagação (minutos a ~4h, dependendo do TTL da HostGator):
1. Acessar https://tropico.escaladavirtual.com.br — a Vercel emite o certificado SSL automaticamente no primeiro acesso válido (pode levar alguns minutos).
2. Conferir na dashboard: https://vercel.com/marcelorsevs-projects/tropico-platform/settings/domains — o domínio deve sair de "Invalid Configuration" para "Valid".

## Pendências manuais (Marcelo)

1. **Criar o CNAME na HostGator** (tabela acima) — sem isso o domínio custom não funciona.
2. **⚠️ META_ACCESS_TOKEN expirado em 14-jun-2026** (OAuthException 190 durante o build). O dashboard/relatório mostrará métricas zeradas até renovar. Gerar novo token de longa duração no Meta Business (Graph API) e atualizar em dois lugares:
   - `.env` local
   - Vercel: `vercel env rm META_ACCESS_TOKEN production` e depois `vercel env add META_ACCESS_TOKEN production` (ou via dashboard) + redeploy (`vercel --prod`)
3. **Supabase Auth:** em Supabase → Authentication → URL Configuration, adicionar `https://tropico.escaladavirtual.com.br` como Site URL / Redirect URL (senão login pode redirecionar para localhost).
4. **Commit das mudanças** (git push é responsabilidade do @devops em sessão autorizada): `next.config.ts`, `package.json`, `package-lock.json`, `src/lib/meta.ts`, `src/lib/supabase/server.ts`, `src/middleware.ts`, `docs/deploy-vercel.md`. Nenhum push foi feito nesta sessão.

## Comandos úteis

```bash
vercel --prod            # novo deploy de produção
vercel ls                # listar deployments
vercel logs <url>        # logs do deployment
vercel env ls production # listar env vars (valores ficam ocultos)
```
