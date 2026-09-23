#!/usr/bin/env node
/**
 * Script para sincronizar dados do Google Ads com Supabase
 * Uso: node scripts/sync-google-ads.mjs <arquivo.csv>
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuração Supabase
const SUPABASE_URL = 'https://ibryvujocmgjperqxqli.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlicnl2dWpvY21nanBlcnF4cWxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NjUxNzEsImV4cCI6MjA5MDE0MTE3MX0.qAF_t9B5TLR4cmpGXtWwIk66T7G6oXhMEEKJPgqqN_A';

function parseRow(line) {
  const parts = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      parts.push(current.trim().replace(/^"(.*)"$/, '$1'));
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current.trim().replace(/^"(.*)"$/, '$1'));

  return parts;
}

async function main() {
  const csvPath = process.argv[2];

  if (!csvPath) {
    console.error('❌ Uso: node scripts/sync-google-ads.mjs <arquivo.csv>');
    process.exit(1);
  }

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ Arquivo não encontrado: ${csvPath}`);
    process.exit(1);
  }

  console.log('📊 Iniciando sincronização Google Ads → Supabase...\n');

  // Ler e parsear CSV
  console.log('📖 Lendo CSV...');
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());

  // Skip header (primeiras 3 linhas)
  const dataLines = lines.slice(3);

  const rows = [];
  for (const line of dataLines) {
    if (!line.trim()) continue;

    const parts = parseRow(line);
    if (parts.length >= 6) {
      const data = parts[0];

      // Validar data (YYYY-MM-DD)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) continue;

      const impressoes = parseInt(parts[2].replace(/\./g, '')) || 0;
      const custo = parseFloat(parts[4].replace(/\./g, '').replace(',', '.')) || 0;
      const cliques = parseInt(parts[5].replace(/\./g, '')) || 0;

      rows.push({ data, impressoes, custo, cliques });
    }
  }

  console.log(`✓ ${rows.length} linhas lidas\n`);

  // Agregar por dia
  console.log('📈 Agregando por dia...');
  const aggregated = {};
  for (const row of rows) {
    if (!aggregated[row.data]) {
      aggregated[row.data] = { data: row.data, custo: 0, impressoes: 0, cliques: 0 };
    }
    aggregated[row.data].custo += row.custo;
    aggregated[row.data].impressoes += row.impressoes;
    aggregated[row.data].cliques += row.cliques;
  }

  const daily = Object.values(aggregated).sort((a, b) => new Date(a.data) - new Date(b.data));
  console.log(`✓ ${daily.length} dias únicos\n`);

  // Conectar ao Supabase
  console.log('🔌 Conectando ao Supabase...');
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Inserir dados
  console.log(`📝 Inserindo ${daily.length} registros...\n`);

  let inserted = 0;
  let skipped = 0;
  let updated = 0;

  for (const record of daily) {
    try {
      // Primeiro, verificar se já existe
      const { data: existing, error: checkError } = await supabase
        .from('google_ads_daily')
        .select('id')
        .eq('data', record.data)
        .single();

      if (existing) {
        // Atualizar
        const { error: updateError } = await supabase
          .from('google_ads_daily')
          .update({
            custo: record.custo,
            impressoes: record.impressoes,
            cliques: record.cliques,
          })
          .eq('data', record.data);

        if (updateError) {
          console.error(`  ❌ Erro ao atualizar ${record.data}:`, updateError.message);
        } else {
          console.log(`  ✓ Atualizado: ${record.data} (R$ ${record.custo.toFixed(2)})`);
          updated++;
        }
      } else {
        // Inserir novo
        const { error: insertError } = await supabase
          .from('google_ads_daily')
          .insert({
            data: record.data,
            custo: record.custo,
            impressoes: record.impressoes,
            cliques: record.cliques,
          });

        if (insertError) {
          console.error(`  ❌ Erro ao inserir ${record.data}:`, insertError.message);
        } else {
          console.log(`  ✓ Inserido: ${record.data} (R$ ${record.custo.toFixed(2)})`);
          inserted++;
        }
      }
    } catch (error) {
      console.error(`  ⚠️  Erro ao processar ${record.data}:`, error.message);
      skipped++;
    }
  }

  // Resumo
  console.log('\n' + '='.repeat(50));
  console.log('📊 RESUMO DA SINCRONIZAÇÃO:');
  console.log(`├─ Inseridos: ${inserted}`);
  console.log(`├─ Atualizados: ${updated}`);
  console.log(`├─ Erros: ${skipped}`);
  console.log(`└─ Total: ${daily.length}`);

  console.log('\n✅ Sincronização concluída!');
  console.log('\n💡 Próximo passo: recarregue a página em http://localhost:3000/relatorio');
}

main().catch(console.error);
