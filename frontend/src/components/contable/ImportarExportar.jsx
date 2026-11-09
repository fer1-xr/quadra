import React, { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { Download, Upload, FileJson, FileSpreadsheet, BookCopy, Users, ListTree, CheckCircle2, AlertTriangle } from 'lucide-react'
import PageHead from '../PageHead'
import { useContable } from './ContableContext'
import { exportarExcel, exportarHojas } from './ui'
import { HOJAS, descargarLibros } from './Informes'
import { leerImportacion } from './AsientosManuales'
import { leerLibro } from '../../services/importarLibro'
import { armarDiario, armarMayor, analizarRuc, dvRuc, nivelDe, padreDe, PLAN_BASE } from '../../services/contabilidad'
import { saldosJerarquicos } from '../../services/informes'
import '../../styles/Informes.css'

const nh = (v) => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

const descargarJSON = (nombre, data) => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: `${nombre}.json` })
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Reconoce qué es un archivo mirando su contenido, no su nombre:
 * respaldo de Quadra (.json), plan de cuentas, personas, asientos o
 * registro de comprobantes de Marangatu / planilla propia.
 */
const detectar = async (file) => {
  if (/\.json$/i.test(file.name)) {
    const data = JSON.parse(await file.text())
    if (data?.app !== 'quadra') throw new Error('Ese JSON no es un respaldo de Quadra.')
    return { tipo: 'respaldo', data }
  }
  // los CSV se leen como texto para no romper los acentos (Código, Razón social)
  const wb = /\.csv$/i.test(file.name)
    ? XLSX.read(await file.text(), { type: 'string', raw: true })
    : XLSX.read(await file.arrayBuffer(), { cellDates: true })
  const filas = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '', raw: true })
  for (let i = 0; i < Math.min(filas.length, 30); i++) {
    const hs = filas[i].map(nh)
    const tiene = (fn) => hs.some(fn)
    if (tiene((h) => h === 'cuenta') && tiene((h) => h === 'debe') && tiene((h) => h === 'haber')) return { tipo: 'asientos' }
    const esRuc = tiene((h) => h === 'ruc' || h.includes('identificacion del informado'))
    const esComp = tiene((h) => h.includes('comprobante') || h === 'factura' || h === 'documento' || h === 'numero')
    if (esRuc && esComp) {
      const txt = filas.slice(0, i + 1).flat().map(nh).join(' ')
      const lado = /venta|emitid|ingreso/.test(`${txt} ${nh(file.name)}`) ? 'venta' : 'compra'
      return { tipo: 'comprobantes', lado }
    }
    if (esRuc && tiene((h) => h.includes('nombre') || h.includes('razon social'))) return { tipo: 'personas', filas, i }
    if (tiene((h) => h === 'codigo' || h === 'cuenta codigo') && tiene((h) => h.includes('nombre') || h.includes('denominacion') || h === 'cuenta')) return { tipo: 'plan', filas, i }
  }
  throw new Error('No reconocí el archivo. Probá con una de las plantillas de abajo o con el registro de comprobantes de Marangatu.')
}

const ETIQUETA = {
  respaldo: 'Respaldo de Quadra',
  comprobantes: 'Comprobantes (Marangatu o planilla propia)',
  asientos: 'Asientos contables',
  personas: 'Catastro de personas',
  plan: 'Plan de cuentas'
}

export default function ImportarExportar({ modo }) {
  const ctx = useContable()
  const { contribuyente, ejercicio, comprobantes, cuentas, activos, timbrados, personas, plan } = ctx
  const archivo = useRef(null)
  const [arrastrando, setArrastrando] = useState(false)
  const [previa, setPrevia] = useState(null)
  const [aviso, setAviso] = useState(null)
  const importar = modo === 'importar'

  // los libros necesitan Diario y Mayor: se arman solo al exportar
  const libros = () => {
    const diario = armarDiario(comprobantes.items, ejercicio)
    const mayor = armarMayor(diario)
    const existencias = comprobantes.items.find((d) => d.tipo === 'inventario' && String(d.fecha || '').startsWith(String(ejercicio)))
    return { ...ctx, diario, mayor, tot: saldosJerarquicos(mayor), existencias }
  }

  const respaldo = () => descargarJSON(`Respaldo Quadra ${contribuyente.ruc} ${new Date().toISOString().slice(0, 10)}`, {
    app: 'quadra', version: 1, exportado: new Date().toISOString(),
    contribuyente: { ruc: contribuyente.ruc, razonSocial: contribuyente.razonSocial },
    comprobantes: comprobantes.items, cuentas: cuentas.items, activos: activos.items, timbrados: timbrados.items,
    personas: personas.items.filter((p) => comprobantes.items.some((d) => d.personaRuc === p.ruc))
  })

  const exportarPlan = () => exportarExcel(`Plan de cuentas ${contribuyente.ruc}`, 'Plan de cuentas', [
    ['Código', 'Nombre', 'Imputable', 'Origen'],
    ...plan.map((c) => [c.codigo, c.nombre, c.imputable ? 'Sí' : 'No', c.base ? 'Base RG 49' : 'Propia'])
  ])
  const exportarPersonas = () => exportarExcel('Personas', 'Personas', [
    ['RUC', 'Nombre', 'Tipo', 'Email', 'Teléfono'],
    ...personas.items.map((p) => [p.ruc, p.nombre, p.tipo || '', p.email || '', p.telefono || ''])
  ])
  const plantillas = () => exportarHojas('Plantillas de importación Quadra', [
    { hoja: 'Comprobantes', filas: [['Fecha', 'Tipo de comprobante', 'Timbrado', 'Número de comprobante', 'RUC', 'Razón social', 'Condición', 'Gravada 10%', 'Gravada 5%', 'Exenta', 'Cuenta'], ['05/01/2026', 'Factura', '12345678', '001-001-0000123', '80012345-6', 'Proveedor S.A.', 'Contado', 1100000, 0, 0, '5.1.01.02']] },
    { hoja: 'Asientos', filas: [['Fecha', 'Concepto', 'Cuenta', 'Debe', 'Haber'], ['31/01/2026', 'Pago de sueldos', '5.3.01.01', 5000000, ''], ['31/01/2026', 'Pago de sueldos', '1.1.01.03', '', 5000000]] },
    { hoja: 'Personas', filas: [['RUC', 'Nombre', 'Tipo'], ['80012345-6', 'Proveedor S.A.', 'proveedor']] },
    { hoja: 'Plan de cuentas', filas: [['Código', 'Nombre'], ['1.1.01.05', 'Banco Continental cta. cte.']] }
  ])

  /* ── importación: primero se previsualiza, después se confirma ── */

  const recordarCuenta = (ruc, tipo) => comprobantes.items
    .filter((d) => d.personaRuc === ruc && d.tipo === tipo && d.cuenta)
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))[0]?.cuenta

  const leer = async (file, ladoForzado) => {
    if (!file) return
    setAviso(null)
    try {
      const det = await detectar(file)
      if (det.tipo === 'respaldo') {
        const d = det.data
        const ids = new Set(comprobantes.items.map((x) => x.id))
        const nuevos = (d.comprobantes || []).filter((x) => !ids.has(x.id))
        setPrevia({ file, tipo: 'respaldo', items: d, resumen: `${nuevos.length} comprobantes nuevos de ${(d.comprobantes || []).length} · ${(d.cuentas || []).length} cuentas · ${(d.activos || []).length} bienes · ${(d.timbrados || []).length} timbrados · ${(d.personas || []).length} personas`, errores: d.contribuyente?.ruc && d.contribuyente.ruc !== contribuyente.ruc ? [`El respaldo es de ${d.contribuyente.razonSocial} (RUC ${d.contribuyente.ruc}); se va a cargar en ${contribuyente.razonSocial}`] : [] })
      } else if (det.tipo === 'comprobantes') {
        const lado = ladoForzado || det.lado
        const tipos = [lado, `nd-${lado}`, `nc-${lado}`]
        const r = await leerLibro(file, { lado, tipos, ejercicio, existentes: comprobantes.items, recordarCuenta })
        setPrevia({ file, tipo: 'comprobantes', lado, items: r.docs, resumen: `${r.docs.length} comprobantes de ${lado === 'venta' ? 'venta' : 'compra'} listos${r.duplicados ? ` · ${r.duplicados} ya cargados (se omiten)` : ''}`, errores: r.errores })
      } else if (det.tipo === 'asientos') {
        const r = await leerImportacion(file, plan, ejercicio)
        setPrevia({ file, tipo: 'asientos', items: r.validos, resumen: `${r.validos.length} asientos que cuadran`, errores: r.errores })
      } else if (det.tipo === 'personas') {
        const hs = det.filas[det.i].map(nh)
        const cR = hs.findIndex((h) => h === 'ruc' || h.includes('identificacion'))
        const cN = hs.findIndex((h) => h.includes('nombre') || h.includes('razon social'))
        const cT = hs.findIndex((h) => h === 'tipo')
        const conocidos = new Set(personas.items.map((p) => p.ruc))
        const items = []
        const errores = []
        det.filas.slice(det.i + 1).forEach((f, k) => {
          let ruc = String(f[cR] || '').trim().replace(/\s/g, '')
          const nombre = String(f[cN] || '').trim()
          if (!ruc && !nombre) return
          if (/^\d+$/.test(ruc)) ruc = `${ruc}-${dvRuc(ruc)}`
          if (!analizarRuc(ruc).formato || !nombre) { errores.push(`Fila ${det.i + k + 2}: RUC o nombre incompletos.`); return }
          if (conocidos.has(ruc)) return
          conocidos.add(ruc)
          const t = nh(cT >= 0 ? f[cT] : '')
          items.push({ ruc, nombre, tipo: t.includes('client') ? 'cliente' : t.includes('ambos') ? 'ambos' : 'proveedor' })
        })
        setPrevia({ file, tipo: 'personas', items, resumen: `${items.length} personas nuevas`, errores })
      } else {
        const hs = det.filas[det.i].map(nh)
        const cC = hs.findIndex((h) => h === 'codigo' || h === 'cuenta codigo')
        const cN = hs.findIndex((h, j) => j !== cC && (h.includes('nombre') || h.includes('denominacion') || h === 'cuenta'))
        const existentes = new Set(plan.map((c) => c.codigo))
        const items = []
        const errores = []
        det.filas.slice(det.i + 1).forEach((f, k) => {
          const codigo = String(f[cC] || '').trim().replace(/\.$/, '')
          const nombre = String(f[cN] || '').trim()
          if (!codigo && !nombre) return
          const ref = `Fila ${det.i + k + 2}`
          if (!/^\d+(\.\d+)*$/.test(codigo) || !nombre) { errores.push(`${ref}: código «${codigo}» o nombre no válidos.`); return }
          if (existentes.has(codigo)) return
          if (nivelDe(codigo) > 1 && !existentes.has(padreDe(codigo))) { errores.push(`${ref}: la cuenta ${codigo} no tiene rubro padre ${padreDe(codigo)}.`); return }
          existentes.add(codigo)
          items.push({ codigo, nombre, imputable: nivelDe(codigo) >= 4 })
        })
        setPrevia({ file, tipo: 'plan', items, resumen: `${items.length} cuentas nuevas (las que ya existen se respetan)`, errores })
      }
    } catch (err) {
      setPrevia(null)
      setAviso({ tono: 'err', texto: err.message || 'No pude leer el archivo.' })
    }
    if (archivo.current) archivo.current.value = ''
  }

  const confirmar = () => {
    const p = previa
    let n = 0
    if (p.tipo === 'respaldo') {
      const ids = new Set(comprobantes.items.map((x) => x.id))
      ;(p.items.comprobantes || []).filter((x) => !ids.has(x.id)).forEach((x) => { comprobantes.guardar(x); n++ })
      const cods = new Set(cuentas.items.map((c) => c.codigo).concat(PLAN_BASE.map((c) => c.codigo)))
      ;(p.items.cuentas || []).filter((c) => !cods.has(c.codigo)).forEach((c) => cuentas.guardar(c))
      const ids2 = (col) => new Set(col.items.map((x) => x.id))
      const ia = ids2(activos)
      ;(p.items.activos || []).filter((x) => !ia.has(x.id)).forEach((x) => activos.guardar(x))
      const it = ids2(timbrados)
      ;(p.items.timbrados || []).filter((x) => !it.has(x.id)).forEach((x) => timbrados.guardar(x))
      ;(p.items.personas || []).forEach((x) => personas.asegurar(x.ruc, x.nombre, x.tipo))
    } else if (p.tipo === 'comprobantes') {
      p.items.forEach((d) => { personas.asegurar(d.personaRuc, d.personaNombre, p.lado === 'compra' ? 'proveedor' : 'cliente'); comprobantes.guardar(d); n++ })
    } else if (p.tipo === 'asientos') {
      p.items.forEach((g) => { comprobantes.guardar({ tipo: 'asiento', clase: 'manual', fecha: g.fecha, concepto: g.concepto, personaRuc: '', personaNombre: '', lineas: g.lineas, importado: p.file.name }); n++ })
    } else if (p.tipo === 'personas') {
      p.items.forEach((x) => { personas.asegurar(x.ruc, x.nombre, x.tipo); n++ })
    } else {
      p.items.forEach((c) => { cuentas.guardar(c); n++ })
    }
    setPrevia(null)
    setAviso({ tono: 'ok', texto: p.tipo === 'respaldo' ? `Respaldo restaurado: ${n} comprobantes agregados.` : `${n} ${p.tipo === 'plan' ? 'cuentas' : p.tipo} importados.` })
  }

  const soltar = (e) => {
    e.preventDefault()
    setArrastrando(false)
    leer(e.dataTransfer.files[0])
  }

  const Accion = ({ icono: Icono, titulo, desc, onClick, principal }) => (
    <button type="button" className={`inf-accion ${principal ? 'is-principal' : ''}`} onClick={onClick}>
      <Icono size={20} strokeWidth={1.6} aria-hidden="true" />
      <span className="inf-accion__txt"><strong>{titulo}</strong><small>{desc}</small></span>
      <Download size={15} strokeWidth={1.8} aria-hidden="true" className="inf-accion__ico" />
    </button>
  )

  if (!importar) {
    return (
      <div className="q-sheet q-sheet--wide ct-sheet">
        <PageHead
          title="Exportar"
          lede={`Todo lo de ${contribuyente.razonSocial} en un clic: los libros del ejercicio ${ejercicio} para imprimir o mandar al cliente, y un respaldo completo para guardar o pasar a otra cuenta.`}
          equation={[{ v: 'Quadra' }, { op: '→' }, { v: 'Excel' }, { op: '·' }, { v: 'JSON' }]}
          caption="sin volver a cargar nada"
          status={comprobantes.status}
        />
        <div className="inf-acciones-grid">
          <Accion principal icono={BookCopy} titulo="Todos los libros del ejercicio" desc={`Diario, Mayor, Inventario y Balances, IVA Compras y Ventas, Caja, Bancos, cuentas corrientes y liquidación de IVA: ${Object.keys(HOJAS).length} hojas en un Excel.`} onClick={() => descargarLibros(libros(), Object.keys(HOJAS))} />
          <Accion icono={FileJson} titulo="Respaldo completo" desc="Comprobantes, plan de cuentas propio, activos, timbrados y personas. Se restaura desde Importar." onClick={respaldo} />
          <Accion icono={ListTree} titulo="Plan de cuentas" desc={`${plan.length} cuentas, base RG 49 más las propias.`} onClick={exportarPlan} />
          <Accion icono={Users} titulo="Personas" desc={`${personas.items.length} RUC de clientes y proveedores.`} onClick={exportarPersonas} />
          <Accion icono={FileSpreadsheet} titulo="Plantillas de importación" desc="Comprobantes, asientos, personas y plan de cuentas, con una fila de ejemplo." onClick={plantillas} />
        </div>
      </div>
    )
  }

  return (
    <div className="q-sheet q-sheet--wide ct-sheet">
      <PageHead
        title="Importar"
        lede="Soltá cualquier archivo y Quadra reconoce qué es: registro de comprobantes de Marangatu, planilla de compras o ventas, asientos, personas, plan de cuentas o un respaldo. Antes de cargar te muestra qué va a entrar."
        equation={[{ v: 'Archivo' }, { op: '→' }, { v: 'Vista previa' }, { op: '→' }, { v: 'Libros' }]}
        caption="nada se carga sin tu confirmación"
        status={comprobantes.status}
      />

      <div
        className={`inf-drop ${arrastrando ? 'is-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setArrastrando(true) }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={soltar}
      >
        <Upload size={26} strokeWidth={1.5} aria-hidden="true" />
        <p className="inf-drop__t">Arrastrá un archivo acá</p>
        <p className="inf-drop__s">Excel (.xlsx, .xls), CSV o respaldo .json</p>
        <button type="button" className="q-btn q-btn--primary" onClick={() => archivo.current?.click()}>Elegir archivo</button>
        <input ref={archivo} type="file" accept=".xlsx,.xls,.csv,.json" hidden onChange={(e) => leer(e.target.files[0])} />
      </div>

      {aviso && (
        <p className={`inf-aviso is-${aviso.tono}`} role="status">
          {aviso.tono === 'ok' ? <CheckCircle2 size={16} aria-hidden="true" /> : <AlertTriangle size={16} aria-hidden="true" />} {aviso.texto}
        </p>
      )}

      {previa && (
        <section className="q-card inf-previa" aria-labelledby="inf-previa-t">
          <header className="inf-previa__head">
            <div>
              <p className="q-label">{previa.file.name}</p>
              <h3 id="inf-previa-t" className="inf-card__titulo">{ETIQUETA[previa.tipo]}</h3>
              <p>{previa.resumen}</p>
            </div>
            {previa.tipo === 'comprobantes' && (
              <div className="ct-seg ct-seg--sm" role="tablist" aria-label="Libro de destino">
                {['compra', 'venta'].map((l) => (
                  <button key={l} type="button" role="tab" aria-selected={previa.lado === l} className={previa.lado === l ? 'is-on' : ''} onClick={() => leer(previa.file, l)}>
                    {l === 'compra' ? 'Libro Compras' : 'Libro Ventas'}
                  </button>
                ))}
              </div>
            )}
          </header>
          {previa.errores.length > 0 && (
            <div className="q-alert ct-errores" role="alert">
              <ul>
                {previa.errores.slice(0, 10).map((e) => <li key={e}>{e}</li>)}
                {previa.errores.length > 10 && <li>… y {previa.errores.length - 10} más.</li>}
              </ul>
            </div>
          )}
          <div className="ct-form__actions">
            <button type="button" className="q-btn q-btn--ghost" onClick={() => setPrevia(null)}>Cancelar</button>
            <button type="button" className="q-btn q-btn--primary" disabled={previa.tipo !== 'respaldo' && !previa.items.length} onClick={confirmar}>
              {previa.tipo === 'respaldo' ? 'Restaurar respaldo' : `Importar ${previa.items.length}`}
            </button>
          </div>
        </section>
      )}

      <p className="inf-seccion__nota">
        ¿No tenés el formato? Bajá las plantillas desde <button type="button" className="ct-link" onClick={plantillas}>acá</button>. Los comprobantes repetidos (mismo tipo, número y RUC) se omiten solos, y cada proveedor recuerda la última cuenta que usaste.
      </p>
    </div>
  )
}
