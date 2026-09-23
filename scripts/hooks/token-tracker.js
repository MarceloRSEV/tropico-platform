#!/usr/bin/env node
/**
 * Claude Code Stop Hook — Token Tracker
 * Lê o transcript da sessão, estima tokens e loga no Supabase.
 * Falha silenciosamente — nunca bloqueia o Claude.
 */

const fs   = require("fs");
const path = require("path");
const https = require("https");

// ─── Mapeamento: pasta do projeto → cliente + squad ───────────────────────────
const PROJECT_MAP = {
  "Squad-Escalada":    { cliente: "Escalada (interno)", squad: "squad-escalada"  },
  "Squad-Koria":       { cliente: "Koria",              squad: "squad-koria"     },
  "Squad-mtf":         { cliente: "MTF Plásticos",      squad: "squad-mtf"       },
  "Squad-Brilia":      { cliente: "Brilia",             squad: "squad-brilia"    },
  "Squad-Gigantes":    { cliente: "Gigantes",           squad: "squad-gigantes"  },
  "Squad-luvas":       { cliente: "Luvas",              squad: "squad-luvas"     },
  "squad_tropico":     { cliente: "Trópico",            squad: "squad-tropico"   },
  "Squad-Koria":       { cliente: "Koria",              squad: "squad-koria"     },
};

// ─── Estimativa de tokens por caracteres (aprox. 4 chars = 1 token) ──────────
function estimateTokens(text) {
  return Math.round((text || "").length / 4);
}

// ─── Lê credenciais Supabase ──────────────────────────────────────────────────
function getCredentials() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return null;
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  const env = {};
  for (const line of lines) {
    const [k, ...v] = line.split("=");
    if (k && v.length) env[k.trim()] = v.join("=").trim();
  }
  return {
    url: env.SUPABASE_URL,
    key: env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

// ─── POST para Supabase REST API ──────────────────────────────────────────────
function postToSupabase(creds, payload) {
  return new Promise((resolve) => {
    const url = new URL(`${creds.url}/rest/v1/token_usage`);
    const body = JSON.stringify(payload);
    const req = https.request({
      hostname: url.hostname,
      path:     url.pathname,
      method:   "POST",
      headers:  {
        "Content-Type":  "application/json",
        "apikey":        creds.key,
        "Authorization": `Bearer ${creds.key}`,
        "Prefer":        "return=minimal",
        "Content-Length": Buffer.byteLength(body),
      },
    }, (res) => {
      res.resume();
      resolve(res.statusCode);
    });
    req.on("error", () => resolve(null));
    req.write(body);
    req.end();
  });
}

// ─── Identifica cliente pelo CWD ─────────────────────────────────────────────
function detectClient(cwd) {
  const parts = (cwd || "").replace(/\\/g, "/").split("/");
  for (const part of parts.reverse()) {
    if (PROJECT_MAP[part]) return PROJECT_MAP[part];
  }
  return { cliente: "Escalada (interno)", squad: "squad-escalada" };
}

// ─── Lê transcript e soma tokens reais ou estima ─────────────────────────────
function parseTranscript(transcriptPath) {
  let inputTokens  = 0;
  let outputTokens = 0;
  let agente = "@dev";

  if (!transcriptPath || !fs.existsSync(transcriptPath)) {
    return { inputTokens: 500, outputTokens: 300, agente };
  }

  try {
    const lines = fs.readFileSync(transcriptPath, "utf8").split("\n").filter(Boolean);
    for (const line of lines) {
      try {
        const msg = JSON.parse(line);

        // Tokens reais quando disponíveis (API mode)
        if (msg.usage) {
          inputTokens  += msg.usage.input_tokens  || 0;
          outputTokens += msg.usage.output_tokens || 0;
          continue;
        }

        // Estimativa por conteúdo
        const content = typeof msg.content === "string"
          ? msg.content
          : JSON.stringify(msg.content || "");

        if (msg.role === "user" || msg.type === "user") {
          inputTokens += estimateTokens(content);
        } else if (msg.role === "assistant" || msg.type === "assistant") {
          outputTokens += estimateTokens(content);
        }
      } catch { /* linha inválida, ignora */ }
    }
  } catch { /* erro ao ler transcript, usa fallback */ }

  return {
    inputTokens:  inputTokens  || 500,
    outputTokens: outputTokens || 300,
    agente,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  let input = "";
  process.stdin.on("data", d => input += d);
  process.stdin.on("end", async () => {
    try {
      const ctx = JSON.parse(input || "{}");
      const creds = getCredentials();
      if (!creds?.url || !creds?.key) return; // sem config, sai silencioso

      const { cliente, squad } = detectClient(ctx.cwd);
      const { inputTokens, outputTokens, agente } = parseTranscript(ctx.transcript_path);

      // Modelo padrão — claude-sonnet-4-6
      const modelo = "claude-sonnet-4-6";
      const custoUsd = (inputTokens / 1_000_000) * 3.00 + (outputTokens / 1_000_000) * 15.00;

      await postToSupabase(creds, {
        squad,
        cliente,
        agente,
        modelo,
        input_tokens:  inputTokens,
        output_tokens: outputTokens,
        custo_usd:     custoUsd,
        sessao_id:     ctx.session_id || null,
      });
    } catch {
      // Falha silenciosa — nunca interrompe o Claude
    }
    process.exit(0);
  });
}

main();
