import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const maxDuration = 300; // 5 minutos max

export async function GET(req) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    console.log('[CRON] Iniciando sincronização Google Ads...');

    const { stdout, stderr } = await execAsync(
      'node scripts/sync-google-ads.js',
      { cwd: process.cwd(), timeout: 240000 }
    );

    console.log('[CRON] Saída:', stdout);
    if (stderr) console.warn('[CRON] Aviso:', stderr);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Sincronização Google Ads concluída',
        timestamp: new Date().toISOString(),
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('[CRON] Erro:', error.message);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      { status: 500 }
    );
  }
}
