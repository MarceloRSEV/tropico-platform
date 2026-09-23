import puppeteer from 'puppeteer-core'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL    = 'http://localhost:3003/relatorio?periodo=ano'
const OUT    = 'C:/Users/User/Desktop/relatorio-tropico-2026-04-15-v5.pdf'

// Lê o SESSION_SECRET do .env local
const envPath = resolve(import.meta.dirname, '../.env')
const env     = readFileSync(envPath, 'utf-8')
const secret  = env.match(/SESSION_SECRET=(.+)/)?.[1]?.trim()

if (!secret) {
  console.error('SESSION_SECRET não encontrado no .env')
  process.exit(1)
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
})

const page = await browser.newPage()

// Define o cookie de sessão diretamente — sem precisar fazer login
await page.setCookie({
  name:   'tropico_session',
  value:  secret,
  domain: 'localhost',
  path:   '/',
})

await page.setViewport({ width: 1600, height: 1000 })
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 })

// Aguarda a tabela de anúncios renderizar
await page.waitForSelector('table tbody tr', { timeout: 15000 })

await page.pdf({
  path: OUT,
  format: 'A4',
  landscape: true,
  margin: { top: '10mm', right: '12mm', bottom: '10mm', left: '12mm' },
  printBackground: true,
  displayHeaderFooter: false,
})

await browser.close()
console.log(`PDF gerado: ${OUT}`)
