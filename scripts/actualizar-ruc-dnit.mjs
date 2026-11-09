#!/usr/bin/env node
/**
 * Actualiza public.ruc_dnit con el padrón de RUC que publica la DNIT.
 *
 *   Fuente: https://www.dnit.gov.py/en/web/portal-institucional/listado-de-ruc-con-sus-equivalencias
 *   (ruc0.zip … ruc9.zip, cada uno con un .txt: RUC|RAZON SOCIAL|DV|RUC ANTERIOR|ESTADO|)
 *
 * Uso (desde la raíz del repo):
 *   SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=... node scripts/actualizar-ruc-dnit.mjs
 *   node scripts/actualizar-ruc-dnit.mjs --dir ./carpeta-con-ruc0.txt-…   (usa archivos ya descargados)
 *
 * Los RUC cancelados no se cargan (ocupan un tercio del padrón y no sirven para facturas nuevas);
 * si ya estaban en la tabla se borran al final.
 *
 * La service role key está en Supabase → Project Settings → API. No la subas al repo.
 */
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const PAGINA = 'https://www.dnit.gov.py/en/web/portal-institucional/listado-de-ruc-con-sus-equivalencias'
const URL_SB = (process.env.SUPABASE_URL || 'https://knlzuwimaocubmpfquin.supabase.co').replace(/\/$/, '')
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
// alternativa sin service key: función temporal public.ruc_dnit_cargar(token, filas) creada a mano
const TOKEN = process.env.RUC_CARGA_TOKEN
const ANON = process.env.SUPABASE_ANON_KEY
const LOTE = 5000
const PARALELO = 4

const args = process.argv.slice(2)
const dir = args.includes('--dir') ? args[args.indexOf('--dir') + 1] : null

if (!SERVICE && !(TOKEN && ANON)) {
  console.error('Falta SUPABASE_SERVICE_ROLE_KEY (o RUC_CARGA_TOKEN + SUPABASE_ANON_KEY).')
  process.exit(1)
}

/** descomprime el único archivo de un .zip (lee el directorio central) */
function unzipUnico(buf) {
  let eocd = buf.length - 22
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--
  if (eocd < 0) throw new Error('ZIP inválido')
  const cd = buf.readUInt32LE(eocd + 16)
  const metodo = buf.readUInt16LE(cd + 10)
  const tam = buf.readUInt32LE(cd + 20)
  const local = buf.readUInt32LE(cd + 42)
  const ini = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28)
  const datos = buf.subarray(ini, ini + tam)
  return metodo === 0 ? datos : zlib.inflateRawSync(datos)
}

async function textos() {
  if (dir) {
    return fs.readdirSync(dir).filter((f) => /^ruc\d\.txt$/i.test(f)).sort()
      .map((f) => ({ nombre: f, texto: fs.readFileSync(path.join(dir, f), 'utf8') }))
  }
  const html = await (await fetch(PAGINA)).text()
  const links = [...new Set([...html.matchAll(/href="([^"]*ruc\d\.zip[^"]*)"/gi)].map((m) => m[1].replace(/&amp;/g, '&')))]
  if (links.length < 10) throw new Error(`Sólo encontré ${links.length} archivos en la página de la DNIT`)
  const out = []
  for (const l of links) {
    const url = new URL(l, PAGINA).href
    process.stdout.write(`Descargando ${url.match(/ruc\d\.zip/i)[0]}… `)
    const buf = Buffer.from(await (await fetch(url)).arrayBuffer())
    out.push({ nombre: url.match(/ruc\d/i)[0], texto: unzipUnico(buf).toString('utf8') })
    console.log('ok')
  }
  return out
}

/** RUC|RAZON SOCIAL|DV|RUC ANTERIOR|ESTADO| — la razón social a veces trae "|" */
function parsear(linea) {
  const p = linea.replace(/\r$/, '').split('|')
  if (p[p.length - 1] === '') p.pop()
  if (p.length < 5) return null
  const ruc = p[0].trim()
  const estado = p[p.length - 1].trim()
  const dv = p[p.length - 3].trim()
  const nombre = p.slice(1, p.length - 3).join('|').replace(/\|+/g, ' ').replace(/\s+/g, ' ').trim()
  if (!/^\d{1,9}$/.test(ruc) || !/^\d$/.test(dv) || !nombre || !/^[A-Z ]+$/.test(estado)) return null
  return { ruc, dv: Number(dv), nombre, estado }
}

async function enviar(filas, intento = 1) {
  const res = SERVICE
    ? await fetch(`${URL_SB}/rest/v1/ruc_dnit?on_conflict=ruc`, {
      method: 'POST',
      headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(filas)
    })
    : await fetch(`${URL_SB}/rest/v1/rpc/ruc_dnit_cargar`, {
      method: 'POST',
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: TOKEN, filas })
    })
  if (res.ok) return
  const msg = await res.text()
  if (intento < 4) { await new Promise((r) => setTimeout(r, 1500 * intento)); return enviar(filas, intento + 1) }
  throw new Error(`Supabase ${res.status}: ${msg.slice(0, 300)}`)
}

const archivos = await textos()
const filas = new Map()
let malas = 0
const cancelados = []
for (const a of archivos) {
  for (const l of a.texto.split('\n')) {
    if (!l.trim()) continue
    const f = parsear(l)
    if (!f) malas++
    else if (f.estado.startsWith('CANCELADO')) { filas.delete(f.ruc); cancelados.push(f.ruc) } else filas.set(f.ruc, f)
  }
}
console.log(`${filas.size.toLocaleString('es-PY')} RUC vigentes, ${cancelados.length.toLocaleString('es-PY')} cancelados (${malas} líneas descartadas).`)

const todas = [...filas.values()]
let hechas = 0
const lotes = []
for (let i = 0; i < todas.length; i += LOTE) lotes.push(todas.slice(i, i + LOTE))
let sig = 0
await Promise.all(Array.from({ length: PARALELO }, async () => {
  while (sig < lotes.length) {
    const lote = lotes[sig++]
    await enviar(lote)
    hechas += lote.length
    process.stdout.write(`\rCargados ${hechas.toLocaleString('es-PY')} / ${todas.length.toLocaleString('es-PY')}`)
  }
}))
console.log('\nListo.')
