import React, { useEffect, useMemo, useState } from 'react'
import { Printer, FileSpreadsheet, RotateCcw, AlertTriangle, CheckCircle2, FileText, Stamp } from 'lucide-react'
import PageHead, { Figures } from '../PageHead'
import { useContable } from './ContableContext'
import { Vacio, exportarHojas } from './ui'
import { TIPOS, TIPOS_FISCALES, MESES, totalesDe, gs, fechaCorta, analizarRuc } from '../../services/contabilidad'
import { opcionesActividad } from '../SeleccionarContribuyente'
import '../../styles/InformeLibro.css'

/**
 * Informe del Libro Compras o Ventas: filtros, vista previa, controles antes de
 * presentar, impresión común o en hoja rubricada (folio, transporte Van/Vienen)
 * y Excel. Las opciones se recuerdan por contribuyente.
 */

/* ── datos ──────────────────────────────────────────────────── */

const r2 = (n) => Math.round(n * 100) / 100
const MONTOS = ['base10', 'iva10', 'base5', 'iva5', 'ex', 'neto', 'iva', 'total']
const CLASE_DOC = { compra: 'factura', venta: 'factura', 'nc-compra': 'nc', 'nc-venta': 'nc', 'nd-compra': 'nd', 'nd-venta': 'nd' }

const esElectronico = (d) => !!d.cdc || d.tipoTimbrado === 'electronico'
const establecimiento = (numero) => String(numero || '').split('-')[0]

const operacionDe = (x) => {
  const partes = [x.g10 > 0, x.g5 > 0, x.ex > 0].filter(Boolean).length
  if (partes > 1) return 'mixta'
  if (x.g10 > 0) return 'g10'
  if (x.g5 > 0) return 'g5'
  return 'exenta'
}

/** una fila del libro, en guaraníes (fiscal) o en la moneda del comprobante (origen) */
const filaDe = (d, origen) => {
  const t = TIPOS[d.tipo]
  const x = totalesDe(d)
  const o = d.montosOrig
  const moneda = origen && d.moneda && d.moneda !== 'PYG' && o ? d.moneda : 'PYG'
  let v
  if (moneda === 'PYG') v = { base10: x.base10, iva10: x.iva10, base5: x.base5, iva5: x.iva5, ex: x.ex }
  else {
    const i10 = r2(Number(o.g10 || 0) / 11)
    const i5 = r2(Number(o.g5 || 0) / 21)
    v = { base10: r2(Number(o.g10 || 0) - i10), iva10: i10, base5: r2(Number(o.g5 || 0) - i5), iva5: i5, ex: Number(o.ex || 0) }
  }
  Object.keys(v).forEach((k) => { v[k] = t.signo * v[k] })
  v.neto = r2(v.base10 + v.base5 + v.ex)
  v.iva = r2(v.iva10 + v.iva5)
  v.total = r2(v.neto + v.iva)
  return {
    id: d.id,
    tipo: d.tipo,
    fecha: d.fecha || '',
    mes: String(d.fecha || '').slice(0, 7),
    comp: t.label,
    corto: t.corto,
    timbrado: d.timbrado || '',
    numero: d.numero || '',
    ruc: d.personaRuc || '',
    nombre: d.personaNombre || '',
    cond: d.condicion === 'credito' ? 'Crédito' : 'Contado',
    moneda,
    cambio: moneda === 'PYG' ? '' : Number(d.cambio) || '',
    electronico: esElectronico(d),
    ...v
  }
}

const sumar = (filas) => {
  const m = new Map()
  filas.forEach((r) => {
    const v = m.get(r.moneda) || { n: 0, ...Object.fromEntries(MONTOS.map((k) => [k, 0])) }
    MONTOS.forEach((k) => { v[k] = r2(v[k] + r[k]) })
    v.n += 1
    m.set(r.moneda, v)
  })
  return m
}

const ORDEN = {
  fecha: (a, b) => a.fecha.localeCompare(b.fecha) || a.numero.localeCompare(b.numero),
  numero: (a, b) => a.numero.localeCompare(b.numero) || a.fecha.localeCompare(b.fecha),
  ruc: (a, b) => a.ruc.localeCompare(b.ruc) || a.fecha.localeCompare(b.fecha),
  nombre: (a, b) => a.nombre.localeCompare(b.nombre, 'es') || a.fecha.localeCompare(b.fecha),
  total: (a, b) => b.total - a.total
}

const nombreMes = (k) => `${MESES[Number(k.slice(5)) - 1] || ''} ${k.slice(0, 4)}`

const AGRUPAR = {
  mes: { clave: (r) => r.mes, rotulo: (r) => nombreMes(r.mes) },
  persona: { clave: (r) => r.ruc || r.nombre, rotulo: (r) => `${r.nombre}${r.ruc ? ` · RUC ${r.ruc}` : ''}` },
  tipo: { clave: (r) => r.comp, rotulo: (r) => r.comp },
  cond: { clave: (r) => r.cond, rotulo: (r) => r.cond }
}

/** filas → líneas del informe (encabezados y subtotales de grupo incluidos) */
const lineasDe = (filas, agrupar) => {
  const g = AGRUPAR[agrupar]
  if (!g) return filas.map((r) => ({ tipo: 'fila', r }))
  const out = []
  let clave = null
  let grupo = []
  let rotulo = ''
  const cerrar = () => { if (grupo.length) out.push({ tipo: 'subtotal', rotulo: `Subtotal ${rotulo}`, tots: sumar(grupo) }) }
  filas.forEach((r) => {
    const k = g.clave(r)
    if (k !== clave) {
      cerrar()
      clave = k
      grupo = []
      rotulo = g.rotulo(r)
      out.push({ tipo: 'grupo', rotulo })
    }
    grupo.push(r)
    out.push({ tipo: 'fila', r })
  })
  cerrar()
  return out
}

/* ── columnas ───────────────────────────────────────────────── */

const columnasDe = (formato, origen, lado) => [
  { k: 'fecha', t: 'Fecha', f: (r) => fechaCorta(r.fecha), mono: true },
  { k: 'comp', t: 'Comprobante', f: (r) => r.corto },
  ...(formato === 'iva' ? [{ k: 'timbrado', t: 'Timbrado', f: (r) => r.timbrado, mono: true }] : []),
  { k: 'numero', t: 'Número', f: (r) => r.numero, mono: true },
  { k: 'ruc', t: 'RUC', f: (r) => r.ruc, mono: true },
  { k: 'nombre', t: lado === 'compra' ? 'Proveedor' : 'Cliente', f: (r) => r.nombre, ancho: true },
  { k: 'cond', t: 'Cond.', f: (r) => r.cond },
  ...(origen ? [
    { k: 'moneda', t: 'Mon.', f: (r) => r.moneda },
    { k: 'cambio', t: 'Cambio', f: (r) => (r.cambio ? Number(r.cambio).toLocaleString('es-PY') : ''), der: true }
  ] : []),
  ...(formato === 'iva'
    ? [['base10', 'Gravada 10%'], ['iva10', 'IVA 10%'], ['base5', 'Gravada 5%'], ['iva5', 'IVA 5%'], ['ex', 'Exenta'], ['total', 'Total']]
    : [['neto', 'Neto'], ['iva', 'IVA'], ['total', 'Total']]
  ).map(([k, t]) => ({ k, t, monto: true }))
]

const fmt = (n, moneda) => {
  if (!n) return ''
  return moneda === 'PYG' ? gs(n) : n.toLocaleString('es-PY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/* ── períodos rápidos ───────────────────────────────────────── */

const ultimoDia = (y, m) => new Date(y, m, 0).getDate()
const rango = (y, m1, m2) => ({ desde: `${y}-${String(m1).padStart(2, '0')}-01`, hasta: `${y}-${String(m2).padStart(2, '0')}-${ultimoDia(y, m2)}` })

const periodosRapidos = (y) => [
  { id: 'ej', label: `Ejercicio ${y}`, ...rango(y, 1, 12) },
  ...MESES.map((m, i) => ({ id: `m${i + 1}`, label: `${m} ${y}`, ...rango(y, i + 1, i + 1) })),
  ...[1, 2, 3, 4].map((t) => ({ id: `t${t}`, label: `${t}º trimestre`, ...rango(y, t * 3 - 2, t * 3) })),
  { id: 's1', label: '1º semestre', ...rango(y, 1, 6) },
  { id: 's2', label: '2º semestre', ...rango(y, 7, 12) }
]

/* ── impresión ──────────────────────────────────────────────── */

const escapar = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

/** cuántas hojas ocupa el informe con `porHoja` líneas por hoja */
const hojasDe = (lineas, porHoja) => Math.max(1, Math.ceil(lineas.length / Math.max(5, porHoja)))

const imprimir = ({ titulo, subtitulo, filtros, cols, lineas, filas, p }) => {
  const porHoja = Math.max(5, Number(p.filasPorHoja) || 30)
  const paginas = []
  for (let i = 0; i < lineas.length; i += porHoja) paginas.push(lineas.slice(i, i + porHoja))
  if (!paginas.length) paginas.push([])
  const fijas = cols.filter((c) => !c.monto).length
  const filaTot = (rotulo, tots, clase) => [...tots.entries()].map(([mon, v]) =>
    `<tr class="${clase}"><td colspan="${fijas}">${escapar(rotulo)}${tots.size > 1 ? ` · ${mon}` : ''}</td>${cols.filter((c) => c.monto).map((c) => `<td class="n">${fmt(v[c.k], mon)}</td>`).join('')}</tr>`).join('')
  const cabecera = p.encabezado === 'ninguno' ? '' : `<header><h1>${escapar(titulo)}</h1><p>${escapar(subtitulo)}</p>${p.encabezado === 'todo' && filtros ? `<p class="f">${escapar(filtros)}</p>` : ''}</header>`
  const thead = `<thead><tr>${cols.map((c) => `<th class="${c.monto || c.der ? 'n' : ''}">${escapar(c.t)}</th>`).join('')}</tr></thead>`
  const acumulado = []
  const folio0 = Math.max(1, Number(p.folio) || 1)
  const folioN = folio0 + paginas.length - 1
  const cuerpo = paginas.map((pag, i) => {
    const vienen = p.transporte && i > 0 ? filaTot('Vienen', sumar(acumulado), 'tr') : ''
    const filasHtml = pag.map((l) => {
      if (l.tipo === 'grupo') return `<tr class="g"><td colspan="${cols.length}">${escapar(l.rotulo)}</td></tr>`
      if (l.tipo === 'subtotal') return filaTot(l.rotulo, l.tots, 'st')
      acumulado.push(l.r)
      return `<tr>${cols.map((c) => (c.monto
        ? `<td class="n">${fmt(l.r[c.k], l.r.moneda)}</td>`
        : `<td class="${c.mono ? 'm' : ''}${c.der ? ' n' : ''}">${escapar(c.f(l.r))}</td>`)).join('')}</tr>`
    }).join('')
    const ultima = i === paginas.length - 1
    const pie = ultima ? filaTot('Totales', sumar(filas), 'tt') : (p.transporte ? filaTot('Van', sumar(acumulado), 'tr') : '')
    const folio = folio0 + i
    const num = p.paginas === 'total' ? `Página ${folio} de ${folioN}` : p.paginas === 'simple' ? `${folio}` : ''
    return `<section class="pg">${cabecera}<table>${thead}<tbody>${vienen}${filasHtml}</tbody><tfoot>${pie}</tfoot></table>${num ? `<footer>${num}</footer>` : ''}</section>`
  }).join('')

  const w = window.open('', '_blank', 'width=1100,height=760')
  if (!w) return 0
  w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapar(titulo)}</title><style>
    @page{size:A4 ${p.orientacion === 'portrait' ? 'portrait' : 'landscape'};margin:0}
    *{box-sizing:border-box} body{margin:0;font:10.5px/1.35 -apple-system,'Segoe UI',Roboto,sans-serif;color:#0b1b33}
    .pg{padding:${Number(p.margenSup) || 0}mm ${Number(p.margenDer) || 10}mm 10mm ${Number(p.margenIzq) || 10}mm;page-break-after:always;position:relative;min-height:100vh}
    .pg:last-child{page-break-after:auto}
    header{border-bottom:1.5px solid #0b1b33;padding-bottom:5px;margin-bottom:8px}
    h1{font-size:14px;margin:0} header p{margin:1px 0 0;color:#3a4a63} header p.f{font-size:9.5px;color:#6b7a90}
    table{width:100%;border-collapse:collapse} th,td{padding:3px 5px;border-bottom:1px solid #dce5f0;text-align:left;vertical-align:top}
    th{font-size:8.5px;text-transform:uppercase;letter-spacing:.05em;color:#6b7a90;border-bottom:1.5px solid #0b1b33}
    .n{text-align:right;font-family:ui-monospace,Consolas,monospace;white-space:nowrap} .m{font-family:ui-monospace,Consolas,monospace;white-space:nowrap}
    tr.g td{font-weight:650;background:#f2f5f9;padding-top:6px}
    tr.st td{font-weight:600;border-bottom:1px solid #9fb0c6} tr.tr td{font-style:italic;color:#3a4a63;background:#f8fafc}
    tr.tt td{font-weight:700;border-top:1.5px solid #0b1b33;border-bottom:3px double #0b1b33}
    footer{position:absolute;bottom:6mm;right:${Number(p.margenDer) || 10}mm;font-size:9.5px;color:#3a4a63}
  </style></head><body>${cuerpo}<script>window.onload=function(){window.print()}</script></body></html>`)
  w.document.close()
  return paginas.length
}

/* ── formulario ─────────────────────────────────────────────── */

const OPCIONES = {
  sucursal: '', condicion: '', tipoDoc: '', orden: 'fecha', moneda: 'fiscal', operacion: '', tipoComp: '', agrupar: '',
  encabezado: 'todo', paginas: 'total', orientacion: 'landscape', filasPorHoja: 32,
  // hoja rubricada
  rEncabezado: 'titulo', rPaginas: 'simple', rFilas: 30, margenSup: 30, margenIzq: 20, margenDer: 10, transporte: true
}

function Campo({ label, children, ancho }) {
  return (
    <label className={`il-campo ${ancho ? 'il-campo--ancho' : ''}`}>
      <span className="q-label">{label}</span>
      {children}
    </label>
  )
}

function Opciones({ value, onChange, opciones, ...rest }) {
  return (
    <select className="q-input ct-select" value={value} onChange={(e) => onChange(e.target.value)} {...rest}>
      {opciones.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
    </select>
  )
}

function Radios({ legend, name, value, onChange, opciones }) {
  return (
    <fieldset className="il-radios">
      <legend className="q-label">{legend}</legend>
      <div>
        {opciones.map(([v, t]) => (
          <label key={v} className={value === v ? 'is-on' : ''}>
            <input type="radio" name={name} value={v} checked={value === v} onChange={() => onChange(v)} />
            {t}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export default function InformeLibro({ lado }) {
  const { comprobantes, contribuyente, ejercicio } = useContable()
  const compras = lado === 'compra'
  const libro = compras ? 'Libro Compras' : 'Libro Ventas'
  const clave = `quadra_inf_${lado}_${contribuyente.clienteId}`
  const claveFolio = `quadra_folio_${lado}_${contribuyente.clienteId}_${ejercicio}`
  const actividades = useMemo(() => opcionesActividad(contribuyente), [contribuyente])
  const inicio = { desde: contribuyente.apertura || `${ejercicio}-01-01`, hasta: contribuyente.cierre || `${ejercicio}-12-31` }

  const [tab, setTab] = useState('informe')
  const [o, setO] = useState(() => {
    let guardado = {}
    try { guardado = JSON.parse(localStorage.getItem(clave) || '{}') } catch { guardado = {} }
    return { ...OPCIONES, ...guardado, ...inicio, persona: '', actividad: contribuyente.actividad || guardado.actividad || actividades[0]?.id || '' }
  })
  const [folio, setFolio] = useState(() => Number(localStorage.getItem(claveFolio)) || 1)
  const [aviso, setAviso] = useState('')
  const set = (c) => { setO((x) => ({ ...x, ...c })); setAviso('') }

  // se recuerdan las opciones, no el período ni la persona
  useEffect(() => {
    const { desde, hasta, persona, ...resto } = o // eslint-disable-line no-unused-vars
    localStorage.setItem(clave, JSON.stringify(resto))
  }, [o, clave])

  const actividad = actividades.some((a) => a.id === o.actividad) ? o.actividad : actividades[0]?.id || ''
  const actividadLabel = actividades.find((a) => a.id === actividad)?.label || ''
  const imps = Array.isArray(contribuyente.impuestos) ? contribuyente.impuestos : []
  const formato = actividad === 'iva' || (actividad === 'todos' && imps.includes('iva')) || !actividades.length ? 'iva' : 'renta'
  const origen = o.moneda === 'origen'

  /* comprobantes del lado */
  const docs = useMemo(() => comprobantes.items.filter((d) => TIPOS_FISCALES.includes(d.tipo) && TIPOS[d.tipo].lado === lado), [comprobantes.items, lado])
  const personas = useMemo(() => {
    const m = new Map()
    docs.forEach((d) => { if (d.personaRuc || d.personaNombre) m.set(d.personaRuc || d.personaNombre, d.personaNombre) })
    return [...m.entries()].sort((a, b) => (a[1] || '').localeCompare(b[1] || '', 'es'))
  }, [docs])
  const sucursales = useMemo(() => [...new Set([contribuyente.sucursal, ...docs.map((d) => establecimiento(d.numero))].filter((s) => /^\d{3}$/.test(s || '')))].sort(), [docs, contribuyente.sucursal])

  /* filtros */
  const q = o.persona.trim().toLowerCase()
  const fechasMal = o.desde && o.hasta && o.desde > o.hasta
  const filtrados = useMemo(() => docs.filter((d) => {
    const f = d.fecha || ''
    if (o.desde && f < o.desde) return false
    if (o.hasta && f > o.hasta) return false
    if (q && !`${d.personaRuc || ''} ${d.personaNombre || ''}`.toLowerCase().includes(q)) return false
    if (!compras && o.sucursal && establecimiento(d.numero) !== o.sucursal) return false
    if (o.condicion && (d.condicion || 'contado') !== o.condicion) return false
    if (o.tipoDoc && CLASE_DOC[d.tipo] !== o.tipoDoc) return false
    if (o.tipoComp && (o.tipoComp === 'electronico') !== esElectronico(d)) return false
    if (o.operacion && operacionDe(totalesDe(d)) !== o.operacion) return false
    return true
  }), [docs, o.desde, o.hasta, q, compras, o.sucursal, o.condicion, o.tipoDoc, o.tipoComp, o.operacion])

  const filas = useMemo(() => {
    const g = AGRUPAR[o.agrupar]
    const orden = ORDEN[o.orden] || ORDEN.fecha
    return filtrados.map((d) => filaDe(d, origen)).sort((a, b) => {
      if (g) { const c = String(g.clave(a)).localeCompare(String(g.clave(b)), 'es'); if (c) return c }
      return orden(a, b)
    })
  }, [filtrados, origen, o.agrupar, o.orden])
  const lineas = useMemo(() => lineasDe(filas, o.agrupar), [filas, o.agrupar])
  const cols = columnasDe(formato, origen, lado)

  /* cifras (siempre en guaraníes) */
  const fiscal = useMemo(() => sumar(filtrados.map((d) => filaDe(d, false))).get('PYG') || { n: 0, neto: 0, iva: 0, total: 0 }, [filtrados])

  /* controles antes de presentar */
  const controles = useMemo(() => {
    const vistos = new Map()
    filtrados.forEach((d) => {
      const k = `${d.tipo}|${d.timbrado || ''}|${d.numero || ''}|${d.personaRuc || ''}`
      vistos.set(k, [...(vistos.get(k) || []), d])
    })
    const duplicados = [...vistos.values()].filter((v) => v.length > 1).map((v) => v[0])
    const rucMal = filtrados.filter((d) => { const r = analizarRuc(d.personaRuc); return r.formato && !r.valido })
    const sinTimbrado = filtrados.filter((d) => !d.timbrado && !esElectronico(d))
    const sinRuc = filtrados.filter((d) => !d.personaRuc)
    return [
      { id: 'dup', titulo: 'Comprobantes repetidos', docs: duplicados },
      { id: 'ruc', titulo: 'RUC con dígito verificador incorrecto', docs: rucMal },
      { id: 'tim', titulo: 'Sin timbrado', docs: sinTimbrado },
      { id: 'sinruc', titulo: 'Sin RUC', docs: sinRuc }
    ].filter((c) => c.docs.length)
  }, [filtrados])

  /* textos del informe */
  const rotPeriodo = `Del ${fechaCorta(o.desde)} al ${fechaCorta(o.hasta)}`
  const titulo = `${libro}${actividadLabel ? ` · ${actividadLabel}` : ''}`
  const subtitulo = `${contribuyente.razonSocial} · RUC ${contribuyente.ruc} · ${rotPeriodo}${origen ? ' · Moneda de origen' : ' · Guaraníes'}`
  const resumenFiltros = [
    o.persona && `${compras ? 'Proveedor' : 'Cliente'}: ${o.persona}`,
    !compras && o.sucursal && `Sucursal ${o.sucursal}`,
    o.condicion && (o.condicion === 'credito' ? 'Crédito' : 'Contado'),
    o.tipoDoc && { factura: 'Facturas', nc: 'Notas de crédito', nd: 'Notas de débito' }[o.tipoDoc],
    o.operacion && { g10: 'Gravadas 10%', g5: 'Gravadas 5%', exenta: 'Exentas', mixta: 'Mixtas' }[o.operacion],
    o.tipoComp && (o.tipoComp === 'electronico' ? 'Electrónicos' : 'Preimpresos'),
    o.agrupar && `Agrupado por ${{ mes: 'mes', persona: compras ? 'proveedor' : 'cliente', tipo: 'comprobante', cond: 'condición' }[o.agrupar]}`
  ].filter(Boolean).join(' · ')

  const rubricada = tab === 'rubricada'
  const pImp = rubricada
    ? { encabezado: o.rEncabezado, paginas: o.rPaginas, filasPorHoja: o.rFilas, folio, margenSup: o.margenSup, margenIzq: o.margenIzq, margenDer: o.margenDer, transporte: o.transporte, orientacion: o.orientacion }
    : { encabezado: o.encabezado, paginas: o.paginas, filasPorHoja: o.filasPorHoja, folio: 1, margenSup: 12, margenIzq: 12, margenDer: 12, transporte: false, orientacion: o.orientacion }
  const hojas = hojasDe(lineas, pImp.filasPorHoja)

  const onImprimir = () => {
    if (fechasMal || !filas.length) return
    const n = imprimir({ titulo, subtitulo, filtros: resumenFiltros, cols, lineas, filas, p: pImp })
    if (!n) { setAviso('El navegador bloqueó la ventana de impresión. Permití ventanas emergentes para Quadra y volvé a intentar.'); return }
    if (rubricada) {
      const siguiente = folio + n
      localStorage.setItem(claveFolio, String(siguiente))
      setFolio(siguiente)
      setAviso(`Se enviaron ${n} ${n === 1 ? 'hoja' : 'hojas'} (folios ${folio} a ${folio + n - 1}). El próximo informe arranca en el folio ${siguiente}.`)
    }
  }

  const onExcel = () => {
    if (fechasMal || !filas.length) return
    const enc = rubricada ? o.rEncabezado : o.encabezado
    const aoa = []
    if (enc !== 'ninguno') aoa.push([titulo], [subtitulo], ...(enc === 'todo' && resumenFiltros ? [[resumenFiltros]] : []), [])
    aoa.push(cols.map((c) => c.t))
    const fijas = cols.filter((c) => !c.monto).length
    const tot = (rotulo, tots) => [...tots.entries()].forEach(([mon, v]) => aoa.push([`${rotulo}${tots.size > 1 ? ` · ${mon}` : ''}`, ...Array(fijas - 1).fill(''), ...cols.filter((c) => c.monto).map((c) => v[c.k])]))
    lineas.forEach((l) => {
      if (l.tipo === 'grupo') aoa.push([l.rotulo])
      else if (l.tipo === 'subtotal') tot(l.rotulo, l.tots)
      else aoa.push(cols.map((c) => (c.monto ? l.r[c.k] : c.k === 'cambio' ? l.r.cambio : c.f(l.r))))
    })
    tot('TOTALES', sumar(filas))
    exportarHojas(`${libro} ${contribuyente.ruc} ${o.desde} a ${o.hasta}`, [{ hoja: libro, filas: aoa }])
  }

  const restablecer = () => { setO({ ...OPCIONES, ...inicio, persona: '', actividad: contribuyente.actividad || actividades[0]?.id || '' }); setAviso('') }
  const periodos = periodosRapidos(ejercicio)
  const periodoSel = periodos.find((p) => p.desde === o.desde && p.hasta === o.hasta)?.id || ''
  const ivaRot = compras ? 'Crédito fiscal' : 'Débito fiscal'

  return (
    <div className="q-sheet q-sheet--wide ct-sheet il">
      <PageHead
        title={`Informe del ${libro}`}
        lede={`Elegí el período y los filtros, mirá el resultado acá abajo y después imprimilo, pasalo a una hoja rubricada o bajalo a Excel. Quadra recuerda tus opciones para ${contribuyente.razonSocial}.`}
        equation={compras ? [{ v: 'CF' }, { op: '=' }, { v: 'IVA', sub: 'compras' }] : [{ v: 'DF' }, { op: '=' }, { v: 'IVA', sub: 'ventas' }]}
        caption={compras ? 'crédito fiscal del período' : 'débito fiscal del período'}
        status={comprobantes.status} />

      <section className="q-card il-panel" aria-label="Opciones del informe">
        <div className="il-tabs" role="tablist" aria-label="Tipo de impresión">
          <button type="button" role="tab" aria-selected={!rubricada} className={!rubricada ? 'is-on' : ''} onClick={() => setTab('informe')}><FileText size={15} strokeWidth={1.8} aria-hidden="true" /> Informe</button>
          <button type="button" role="tab" aria-selected={rubricada} className={rubricada ? 'is-on' : ''} onClick={() => setTab('rubricada')}><Stamp size={15} strokeWidth={1.8} aria-hidden="true" /> Hoja rubricada</button>
          <button type="button" className="il-reset" onClick={restablecer}><RotateCcw size={14} strokeWidth={1.8} aria-hidden="true" /> Restablecer</button>
        </div>

        <div className="il-grid">
          <Campo label="Período rápido">
            <Opciones value={periodoSel} onChange={(id) => { const p = periodos.find((x) => x.id === id); if (p) set({ desde: p.desde, hasta: p.hasta }) }}
              opciones={[['', 'Personalizado'], ...periodos.map((p) => [p.id, p.label])]} />
          </Campo>
          <div className="il-fechas">
            <Campo label="Fecha inicial"><input className="q-input" type="date" value={o.desde} onChange={(e) => set({ desde: e.target.value })} aria-invalid={!!fechasMal} /></Campo>
            <Campo label="Fecha final"><input className="q-input" type="date" value={o.hasta} onChange={(e) => set({ hasta: e.target.value })} aria-invalid={!!fechasMal} /></Campo>
          </div>

          <Campo label={compras ? 'Proveedor' : 'Cliente'} ancho>
            <input className="q-input" type="search" list={`il-personas-${lado}`} value={o.persona} placeholder={`Todos · buscá por RUC o nombre (${personas.length})`} onChange={(e) => set({ persona: e.target.value })} />
            <datalist id={`il-personas-${lado}`}>{personas.map(([ruc, nom]) => <option key={ruc} value={ruc}>{nom}</option>)}</datalist>
          </Campo>

          {!compras && (
            <Campo label="Sucursal">
              <Opciones value={o.sucursal} onChange={(v) => set({ sucursal: v })} opciones={[['', 'Todas'], ...sucursales.map((s) => [s, `Establecimiento ${s}`])]} />
            </Campo>
          )}
          <Campo label="Cond. de pago">
            <Opciones value={o.condicion} onChange={(v) => set({ condicion: v })} opciones={[['', 'Todas'], ['contado', 'Contado'], ['credito', 'Crédito']]} />
          </Campo>
          <Campo label="Tipo de doc.">
            <Opciones value={o.tipoDoc} onChange={(v) => set({ tipoDoc: v })} opciones={[['', 'Todos'], ['factura', 'Facturas'], ['nc', 'Notas de crédito'], ['nd', 'Notas de débito']]} />
          </Campo>
          <Campo label="Tipo comprobante">
            <Opciones value={o.tipoComp} onChange={(v) => set({ tipoComp: v })} opciones={[['', 'Todos'], ['electronico', 'Electrónicos (SIFEN)'], ['preimpreso', 'Preimpresos']]} />
          </Campo>
          <Campo label="Tipo de operación">
            <Opciones value={o.operacion} onChange={(v) => set({ operacion: v })} opciones={[['', 'Todas'], ['g10', 'Solo gravadas 10%'], ['g5', 'Solo gravadas 5%'], ['exenta', 'Solo exentas'], ['mixta', 'Mixtas']]} />
          </Campo>
          <Campo label="Actividad">
            <Opciones value={actividad} onChange={(v) => set({ actividad: v })} opciones={actividades.length ? actividades.map((a) => [a.id, a.label]) : [['', 'Sin impuestos cargados']]} disabled={!actividades.length} />
          </Campo>
          <Campo label="Ordenar por">
            <Opciones value={o.orden} onChange={(v) => set({ orden: v })} opciones={[['fecha', 'Fecha'], ['numero', 'Número'], ['ruc', 'RUC'], ['nombre', compras ? 'Proveedor' : 'Cliente'], ['total', 'Total (mayor a menor)']]} />
          </Campo>
          <Campo label="Agrupar con subtotales">
            <Opciones value={o.agrupar} onChange={(v) => set({ agrupar: v })} opciones={[['', 'Sin agrupar'], ['mes', 'Por mes'], ['persona', compras ? 'Por proveedor' : 'Por cliente'], ['tipo', 'Por comprobante'], ['cond', 'Por condición']]} />
          </Campo>
          <Radios legend="Moneda" name={`il-mon-${lado}`} value={o.moneda} onChange={(v) => set({ moneda: v })} opciones={[['fiscal', 'Fiscal (₲)'], ['origen', 'Origen']]} />
          <Radios legend="Hoja" name={`il-ori-${lado}`} value={o.orientacion} onChange={(v) => set({ orientacion: v })} opciones={[['landscape', 'Horizontal'], ['portrait', 'Vertical']]} />
        </div>

        <div className="il-print">
          {!rubricada ? (
            <>
              <Campo label="Encabezado">
                <Opciones value={o.encabezado} onChange={(v) => set({ encabezado: v })} opciones={[['todo', 'Mostrar todo'], ['titulo', 'Solo título y contribuyente'], ['ninguno', 'Sin encabezado']]} />
              </Campo>
              <Radios legend="Nº de página" name={`il-pag-${lado}`} value={o.paginas} onChange={(v) => set({ paginas: v })} opciones={[['total', '#/#'], ['simple', '#'], ['no', 'No mostrar']]} />
              <Campo label="Filas por hoja">
                <input className="q-input q-input--num il-corto" type="number" min="5" max="80" value={o.filasPorHoja} onChange={(e) => set({ filasPorHoja: e.target.value })} />
              </Campo>
            </>
          ) : (
            <>
              <Campo label="Folio inicial">
                <input className="q-input q-input--num il-corto" type="number" min="1" value={folio} onChange={(e) => { setFolio(Number(e.target.value) || 1); setAviso('') }} />
              </Campo>
              <Campo label="Filas por hoja">
                <input className="q-input q-input--num il-corto" type="number" min="5" max="80" value={o.rFilas} onChange={(e) => set({ rFilas: e.target.value })} />
              </Campo>
              <Campo label="Margen sup. (mm)">
                <input className="q-input q-input--num il-corto" type="number" min="0" max="80" value={o.margenSup} onChange={(e) => set({ margenSup: e.target.value })} />
              </Campo>
              <Campo label="Margen izq. (mm)">
                <input className="q-input q-input--num il-corto" type="number" min="0" max="60" value={o.margenIzq} onChange={(e) => set({ margenIzq: e.target.value })} />
              </Campo>
              <Campo label="Encabezado">
                <Opciones value={o.rEncabezado} onChange={(v) => set({ rEncabezado: v })} opciones={[['titulo', 'Título y contribuyente'], ['todo', 'Mostrar todo'], ['ninguno', 'Sin encabezado (la hoja ya lo trae)']]} />
              </Campo>
              <Radios legend="Nº de folio" name={`il-rpag-${lado}`} value={o.rPaginas} onChange={(v) => set({ rPaginas: v })} opciones={[['simple', '#'], ['total', '#/#'], ['no', 'No mostrar']]} />
              <label className="il-check">
                <input type="checkbox" checked={o.transporte} onChange={(e) => set({ transporte: e.target.checked })} />
                Transporte de totales <small>(“Van” al pie y “Vienen” al inicio de cada hoja)</small>
              </label>
            </>
          )}
        </div>

        <footer className="il-acciones">
          <p className="ct-hint" role="status">
            {fechasMal ? 'La fecha inicial es posterior a la final.'
              : aviso || (filas.length ? `${filas.length} comprobantes · ${hojas} ${hojas === 1 ? 'hoja' : 'hojas'}${rubricada ? ` (folios ${folio} a ${folio + hojas - 1})` : ''}` : 'Ningún comprobante con estos filtros.')}
          </p>
          <button type="button" className="q-btn q-btn--primary" onClick={onImprimir} disabled={!!fechasMal || !filas.length}><Printer size={16} strokeWidth={1.8} /> Imprimir</button>
          <button type="button" className="q-btn q-btn--line" onClick={onExcel} disabled={!!fechasMal || !filas.length}><FileSpreadsheet size={16} strokeWidth={1.8} /> Exportar XLS</button>
        </footer>
      </section>

      <Figures items={[
        { label: 'Comprobantes', value: fiscal.n },
        { label: compras ? 'Compras netas' : 'Ventas netas', value: gs(fiscal.neto) },
        { label: ivaRot, value: gs(fiscal.iva) },
        { label: 'Total', value: gs(fiscal.total) }
      ]} />

      {filas.length > 0 && (
        <section className={`il-controles ${controles.length ? 'is-warn' : 'is-ok'}`} aria-label="Controles antes de presentar">
          {controles.length ? (
            <>
              <p className="il-controles__titulo"><AlertTriangle size={16} strokeWidth={1.8} aria-hidden="true" /> Revisá antes de presentar</p>
              <ul>
                {controles.map((c) => (
                  <li key={c.id}>
                    <strong>{c.titulo}: {c.docs.length}</strong>
                    <span>{c.docs.slice(0, 4).map((d) => `${fechaCorta(d.fecha)} ${d.numero || 's/n'} ${d.personaNombre || ''}`.trim()).join(' · ')}{c.docs.length > 4 ? ' …' : ''}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="il-controles__titulo"><CheckCircle2 size={16} strokeWidth={1.8} aria-hidden="true" /> Sin comprobantes repetidos, RUC mal escritos ni faltantes de timbrado.</p>
          )}
        </section>
      )}

      {!filas.length ? (
        <Vacio titulo="Nada para mostrar">
          {docs.length ? 'Ningún comprobante cumple con estos filtros. Probá con otro período o tocá Restablecer.' : `Todavía no cargaste ${compras ? 'compras' : 'ventas'}. Se cargan en Movimientos › ${compras ? 'Compras' : 'Ventas'}.`}
        </Vacio>
      ) : (
        <div className="q-card ct-card">
          <p className="il-vista">Vista previa · {titulo} · {rotPeriodo}{resumenFiltros ? ` · ${resumenFiltros}` : ''}</p>
          <div className="ct-tabla-wrap">
            <table className="q-table ct-tabla il-tabla">
              <thead><tr>{cols.map((c) => <th key={c.k} className={c.monto || c.der ? 'ct-der' : ''}>{c.t}</th>)}</tr></thead>
              <tbody>
                {lineas.slice(0, 400).map((l, i) => {
                  if (l.tipo === 'grupo') return <tr key={`g${i}`} className="il-grupo"><td colSpan={cols.length}>{l.rotulo}</td></tr>
                  if (l.tipo === 'subtotal') {
                    return [...l.tots.entries()].map(([mon, v]) => (
                      <tr key={`s${i}${mon}`} className="il-sub">
                        <td colSpan={cols.filter((c) => !c.monto).length}>{l.rotulo}{l.tots.size > 1 ? ` · ${mon}` : ''}</td>
                        {cols.filter((c) => c.monto).map((c) => <td key={c.k} className="ct-num">{fmt(v[c.k], mon)}</td>)}
                      </tr>
                    ))
                  }
                  const r = l.r
                  return (
                    <tr key={r.id}>
                      {cols.map((c) => (c.monto
                        ? <td key={c.k} className={`ct-num ${r[c.k] < 0 ? 'is-neg' : ''}`}>{fmt(r[c.k], r.moneda)}</td>
                        : <td key={c.k} className={`${c.mono ? 'ct-mono' : ''} ${c.der ? 'ct-num' : ''} ${c.ancho ? 'ct-nombre' : ''}`}>{c.f(r)}</td>))}
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                {[...sumar(filas).entries()].map(([mon, v], i, arr) => (
                  <tr key={mon} className="ct-total">
                    <td colSpan={cols.filter((c) => !c.monto).length}>Totales{arr.length > 1 ? ` · ${mon}` : ''}</td>
                    {cols.filter((c) => c.monto).map((c) => <td key={c.k} className="ct-num">{fmt(v[c.k], mon)}</td>)}
                  </tr>
                ))}
              </tfoot>
            </table>
          </div>
          {lineas.length > 400 && <p className="ct-hint il-vista">La vista previa muestra las primeras 400 líneas; la impresión y el Excel llevan todas.</p>}
        </div>
      )}
    </div>
  )
}
