import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import axios from 'axios'
import { Plus, Pencil, Trash2, X, Check, ChevronUp, ChevronDown, AlertTriangle } from 'lucide-react'
import { useContable } from './ContableContext'
import { MontoInput } from './ui'
import { Buscador } from './AsientosManuales'
import { API_BASE_URL, authHeaders } from '../../services/api'
import {
  TIPOS, CTA, totalesDe, lineasDe, gs, fechaCorta, hoyISO, formatearNumero, numeroValido, timbradoValido,
  siguienteNumero, timbradoVigente, analizarRuc, n0, fechaRapida, dvRuc
} from '../../services/contabilidad'
import '../../styles/AsientosManuales.css'
import '../../styles/NotasCredito.css'
import '../../styles/Retenciones.css'

/* ── catálogos ──────────────────────────────────────────────── */

const MONEDAS = [
  { id: 'PYG', label: 'GUARANÍ', corto: 'GS' },
  { id: 'USD', label: 'DÓLAR', corto: 'USD' },
  { id: 'BRL', label: 'REAL', corto: 'BRL' },
  { id: 'ARS', label: 'PESO ARGENTINO', corto: 'ARS' },
  { id: 'EUR', label: 'EURO', corto: 'EUR' }
]

const FORM_145 = [
  { id: 'original', label: 'ORIGINAL' },
  { id: 'rectificativa', label: 'RECTIFICATIVA' }
]

const MESES_CORTOS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
const normalizar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const pct = (v) => Math.min(100, Math.max(0, Number(String(v).replace(',', '.')) || 0))

/* ── cálculo ────────────────────────────────────────────────── */

/** importes de la retención, en la moneda del comprobante (las gravadas incluyen IVA) */
const calcular = (f) => {
  const g10 = n0(f.grav10)
  const g5 = n0(f.grav5)
  const ex = n0(f.exentas)
  const iva10 = g10 / 11
  const iva5 = g5 / 21
  const ret10 = (iva10 * pct(f.porc10)) / 100
  const ret5 = (iva5 * pct(f.porc5)) / 100
  return { g10, g5, ex, iva10, iva5, ret10, ret5, total: g10 + g5 + ex, retenido: ret10 + ret5 }
}

/* ── formulario ─────────────────────────────────────────────── */

const formVacio = (tipo, fecha = '') => ({
  tipo,
  personaRuc: '',
  personaNombre: '',
  timbrado: '',
  timbradoId: '',
  anulado: false,
  formulario145: 'original',
  est: '',
  pto: '',
  nro: '',
  fecha,
  fechaTxt: fecha ? fechaCorta(fecha) : '',
  moneda: 'PYG',
  cambio: 1,
  grav10: '',
  grav5: '',
  exentas: '',
  porc10: 30,
  porc5: 30,
  comprobantesRet: [],
  cuenta: TIPOS[tipo].lado === 'compra' ? CTA.PROVEEDORES : CTA.DEUDORES,
  concepto: ''
})

const formDesdeDoc = (d) => {
  const [est = '', pto = '', nro = ''] = String(d.numero || '').split('-')
  // retenciones cargadas con el formulario anterior: solo tenían IVA y porcentaje
  const viejo = d.grav10 === undefined
  return {
    ...formVacio(d.tipo, d.fecha),
    ...d,
    est,
    pto,
    nro,
    fechaTxt: fechaCorta(d.fecha),
    moneda: d.moneda || 'PYG',
    cambio: d.cambio || 1,
    grav10: viejo ? Math.round(n0(d.ivaFactura) * 11) : d.grav10,
    porc10: viejo ? d.porcentaje ?? 30 : d.porc10,
    porc5: d.porc5 ?? 30,
    comprobantesRet: d.comprobantesRet || [],
    cuenta: d.cuenta || formVacio(d.tipo).cuenta
  }
}

/** formulario → documento en guaraníes, con el asiento que genera */
const aDoc = (f) => {
  const c = calcular(f)
  const tc = f.moneda === 'PYG' ? 1 : Number(f.cambio) || 0
  const numero = formatearNumero(`${f.est}-${f.pto}-${f.nro}`)
  return {
    ...f,
    numero,
    monto: f.anulado ? 0 : Math.round(c.retenido * tc),
    ivaFactura: Math.round((c.iva10 + c.iva5) * tc),
    porcentaje: pct(f.porc10),
    facturaRef: f.comprobantesRet.map((x) => x.numero).join(', ')
  }
}

/** gravadas de una factura, en la moneda de la retención */
const gravadasEn = (fac, moneda, tc) => {
  if (fac.montosOrig && (fac.moneda || 'PYG') === moneda) return fac.montosOrig
  const k = moneda === 'PYG' ? 1 : (Number(tc) || 1)
  return { g10: n0(fac.gravada10) / k, g5: n0(fac.gravada5) / k, ex: n0(fac.exenta) / k }
}

/* ── ventana de carga ───────────────────────────────────────── */

function ModalRetencion({ inicial, onCerrar, mesRef }) {
  const { comprobantes, timbrados, personas, imputables, nombreCuenta, ejercicio } = useContable()
  const [f, setF] = useState(inicial)
  const [tab, setTab] = useState('encabezado')
  const [errores, setErrores] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [cotizando, setCotizando] = useState('')
  const rucRef = useRef(null)

  const t = TIPOS[f.tipo]
  const emitida = f.tipo === 'ret-emitida'
  const quien = emitida ? 'Proveedor' : 'Cliente'
  const set = (c) => { setF((x) => ({ ...x, ...c })); setErrores([]) }

  const c = calcular(f)
  const doc = aDoc(f)
  const lineas = lineasDe(doc)
  const otros = comprobantes.items.filter((d) => d.id !== f.id)
  const enMoneda = (v) => (f.moneda === 'PYG' ? gs(Math.round(v)) : (Number(v) || 0).toLocaleString('es-PY', { maximumFractionDigits: 2 }))

  const [rucBase, rucDv] = String(f.personaRuc || '').split('-')
  const misTimbrados = timbrados.items.filter((m) => m.tipo === t.timbradoTipo)
  const timPropio = emitida ? misTimbrados.find((m) => m.id === f.timbradoId) || misTimbrados.find((m) => m.numero === f.timbrado) : null
  const timbradosPersona = useMemo(() => [...new Set(otros
    .filter((d) => d.tipo === f.tipo && d.personaRuc === f.personaRuc && d.timbrado)
    .map((d) => d.timbrado))], [otros, f.tipo, f.personaRuc])

  // facturas de la persona sobre las que se practica la retención
  const facturasPersona = useMemo(() => otros
    .filter((d) => d.personaRuc === f.personaRuc && d.tipo === (emitida ? 'compra' : 'venta') && !d.anulado)
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')), [otros, f.personaRuc, emitida])

  const repetido = numeroValido(doc.numero)
    ? otros.find((d) => d.tipo === f.tipo && d.numero === doc.numero && (emitida ? d.timbrado === f.timbrado : d.personaRuc === f.personaRuc))
    : null

  const opcionesPersona = useMemo(() => personas.items
    .map((p) => ({ value: p.ruc, code: p.ruc, text: p.nombre, label: `${p.ruc} · ${p.nombre}`, search: `${p.ruc} ${p.nombre}` })), [personas.items])
  const opcionesCuenta = useMemo(() => imputables.map((x) => ({
    value: x.codigo, code: x.codigo, text: x.nombre, label: `${x.codigo} · ${x.nombre}`, search: `${x.codigo} ${x.nombre}`
  })), [imputables])

  /* persona */
  const elegirPersona = (ruc) => {
    const p = personas.items.find((y) => y.ruc === ruc)
    set({ personaRuc: ruc, personaNombre: p?.nombre || f.personaNombre, comprobantesRet: ruc === f.personaRuc ? f.comprobantesRet : [] })
    setBuscando(false)
  }
  const escribirRuc = (base) => {
    const limpio = base.replace(/\D/g, '').slice(0, 9)
    const ruc = limpio ? `${limpio}-${dvRuc(limpio)}` : ''
    const p = personas.items.find((y) => y.ruc === ruc)
    set({
      personaRuc: ruc,
      personaNombre: p ? p.nombre : (personas.items.some((y) => y.nombre === f.personaNombre) ? '' : f.personaNombre),
      comprobantesRet: ruc === f.personaRuc ? f.comprobantesRet : []
    })
  }

  /* timbrado propio (emitidas): fija establecimiento, punto y número siguiente */
  const elegirTimbradoPropio = (id) => {
    const tim = misTimbrados.find((m) => m.id === id)
    if (!tim) { set({ timbradoId: '', timbrado: '' }); return }
    const sig = siguienteNumero(tim, otros)
    const [est, pto, nro] = sig.split('-')
    set({ timbradoId: tim.id, timbrado: tim.numero, est, pto, nro: f.id && f.timbrado === tim.numero ? f.nro : nro })
  }
  useEffect(() => {
    if (!emitida || f.id || f.timbrado) return
    const vig = misTimbrados.find((m) => timbradoVigente(m, f.fecha || hoyISO())) || misTimbrados[0]
    if (vig) elegirTimbradoPropio(vig.id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fijarFecha = (txt) => {
    const iso = fechaRapida(txt, ejercicio, mesRef || (f.fecha ? f.fecha.slice(5, 7) : ''))
    set({ fechaTxt: iso ? fechaCorta(iso) : txt, fecha: iso })
  }

  const traerCotizacion = async (moneda = f.moneda) => {
    if (moneda === 'PYG') return
    if (!f.fecha) { setCotizando('Indicá la fecha para traer la cotización.'); return }
    setCotizando('Consultando DNIT…')
    try {
      const auth = await authHeaders()
      const r = await axios.post(`${API_BASE_URL}/api/cotizacion`, { fecha: f.fecha, moneda }, { headers: { ...auth } })
      if (r.data?.success) {
        set({ cambio: emitida ? r.data.data.vendedor : r.data.data.comprador })
        setCotizando(`DNIT ${emitida ? 'vendedor' : 'comprador'} del ${fechaCorta(r.data.data.fecha)}`)
      } else setCotizando(r.data?.message || 'Sin cotización')
    } catch (err) {
      setCotizando(err.response?.data?.message || 'No se pudo consultar la DNIT; cargala a mano.')
    }
  }

  /* comprobantes retenidos: al marcarlos se suman sus gravadas al encabezado */
  const toggleFactura = (fac) => {
    const marcado = f.comprobantesRet.some((x) => x.facturaId === fac.id)
    const lista = marcado
      ? f.comprobantesRet.filter((x) => x.facturaId !== fac.id)
      : [...f.comprobantesRet, { facturaId: fac.id, numero: fac.numero }]
    const sel = facturasPersona.filter((d) => lista.some((x) => x.facturaId === d.id))
    const s = sel.reduce((acc, d) => {
      const g = gravadasEn(d, f.moneda, f.cambio)
      return { g10: acc.g10 + n0(g.g10), g5: acc.g5 + n0(g.g5), ex: acc.ex + n0(g.ex) }
    }, { g10: 0, g5: 0, ex: 0 })
    const r = (v) => (f.moneda === 'PYG' ? Math.round(v) : Math.round(v * 100) / 100)
    set(lista.length ? { comprobantesRet: lista, grav10: r(s.g10), grav5: r(s.g5), exentas: r(s.ex) } : { comprobantesRet: lista })
  }

  const guardar = () => {
    const d = aDoc(f)
    const errs = []
    if (!analizarRuc(d.personaRuc).formato) errs.push(`Indicá el RUC del ${quien.toLowerCase()}.`)
    if (!String(d.personaNombre || '').trim()) errs.push(`Escribí el nombre o razón social del ${quien.toLowerCase()}.`)
    if (!timbradoValido(d.timbrado)) errs.push('El timbrado tiene 8 dígitos.')
    if (!numeroValido(d.numero)) errs.push('El número tiene el formato 001-001-0000001.')
    if (!d.fecha) errs.push('Indicá la fecha (podés escribir solo el día, p. ej. «15»).')
    else if (!d.fecha.startsWith(String(ejercicio))) errs.push(`La fecha tiene que estar dentro del ejercicio ${ejercicio}.`)
    if (timPropio && d.fecha && !timbradoVigente(timPropio, d.fecha)) errs.push(`El timbrado ${timPropio.numero} no está vigente el ${fechaCorta(d.fecha)}.`)
    if (f.moneda !== 'PYG' && !(Number(f.cambio) > 0)) errs.push('Indicá la tasa de cambio.')
    if (!f.anulado && !d.monto) errs.push('El importe retenido tiene que ser mayor a cero: cargá las gravadas y el porcentaje.')
    if (!d.cuenta) errs.push('Elegí la cuenta que se cancela en la pestaña del asiento.')
    if (repetido) errs.push(`Ya está cargada la retención ${repetido.numero} del ${fechaCorta(repetido.fecha)}.`)
    if (errs.length) { setErrores(errs); setTab('encabezado'); return }

    personas.asegurar(d.personaRuc, d.personaNombre.trim(), emitida ? 'proveedor' : 'cliente')
    const tc = f.moneda === 'PYG' ? 1 : Number(f.cambio) || 1
    // cuánto cancela de cada factura: su IVA por el porcentaje
    const aplicaciones = d.anulado ? [] : facturasPersona
      .filter((fac) => f.comprobantesRet.some((x) => x.facturaId === fac.id))
      .map((fac) => {
        const x = totalesDe(fac)
        return { facturaId: fac.id, numero: fac.numero, monto: Math.round((x.iva10 * pct(f.porc10) + x.iva5 * pct(f.porc5)) / 100) }
      })
    const { fechaTxt, est, pto, nro, ...resto } = d
    comprobantes.guardar({
      ...resto,
      personaNombre: d.personaNombre.trim(),
      grav10: n0(f.grav10),
      grav5: n0(f.grav5),
      exentas: n0(f.exentas),
      porc10: pct(f.porc10),
      porc5: pct(f.porc5),
      cambio: tc,
      aplicaciones,
      editadoEn: f.id ? new Date().toISOString() : null
    })
    onCerrar(true)
  }

  // atajos: Alt+E/C/D/H pestañas, Alt+G guardar, Esc cancelar
  useEffect(() => {
    const onKey = (e) => {
      const k = e.key.toLowerCase()
      const tabs = { e: 'encabezado', o: 'comprobantes', d: 'debe', h: 'haber' }
      if (e.altKey && tabs[k]) { e.preventDefault(); setTab(tabs[k]) }
      if (e.altKey && k === 'g') { e.preventDefault(); guardar() }
      if (e.altKey && k === 'c') { e.preventDefault(); onCerrar(false) }
      if (k === 'escape') onCerrar(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })
  useEffect(() => { rucRef.current?.focus() }, [])

  const TABS = [
    { id: 'encabezado', label: 'Encabezado' },
    { id: 'comprobantes', label: 'Comprobantes', n: f.comprobantesRet.length },
    { id: 'debe', label: 'Asiento Debe' },
    { id: 'haber', label: 'Asiento Haber' }
  ]

  /* pestañas del asiento: la cuenta editable es la de la persona */
  const ladoPersona = emitida ? 'debe' : 'haber'
  const ladoAsiento = (lado) => {
    const propias = lineas.filter((l) => (lado === 'debe' ? l.debe : l.haber))
    const total = propias.reduce((sm, l) => sm + (lado === 'debe' ? l.debe : l.haber), 0)
    return (
      <div className="nc-asiento">
        {lado === ladoPersona ? (
          <div className="nc-fila nc-fila--asiento">
            <label className="nc-label" htmlFor="rt-cuenta">Cuenta :</label>
            <div className="nc-asiento__busca">
              <Buscador id="rt-cuenta" items={opcionesCuenta} valor={f.cuenta} onElegir={(v) => v && set({ cuenta: v })} placeholder="Código o nombre" ariaLabel="Cuenta que se cancela" />
            </div>
          </div>
        ) : (
          <p className="nc-nota">
            {emitida
              ? `La retención queda como deuda a ingresar a la DNIT en ${CTA.RET_IVA_A_INGRESAR} · ${nombreCuenta(CTA.RET_IVA_A_INGRESAR)}.`
              : `La retención queda como crédito a tu favor en ${CTA.RET_IVA_RECIBIDAS} · ${nombreCuenta(CTA.RET_IVA_RECIBIDAS)}.`}
          </p>
        )}
        <table className="nc-tabla">
          <thead><tr><th>Código</th><th>Cuenta</th><th className="nc-der">{lado === 'debe' ? 'Debe' : 'Haber'}</th></tr></thead>
          <tbody>
            {propias.length ? propias.map((l, i) => (
              <tr key={i}><td className="nc-mono">{l.cuenta}</td><td>{nombreCuenta(l.cuenta)}</td><td className="nc-der nc-mono">{gs(lado === 'debe' ? l.debe : l.haber)}</td></tr>
            )) : (
              <tr><td colSpan={3} className="nc-vacio">{f.anulado ? 'La retención está anulada: no genera asiento.' : 'Sin datos: cargá las gravadas y el porcentaje en el encabezado.'}</td></tr>
            )}
          </tbody>
          <tfoot><tr><td colSpan={2}>Total {lado === 'debe' ? 'Debe' : 'Haber'}</td><td className="nc-der nc-mono">{gs(total)}</td></tr></tfoot>
        </table>
      </div>
    )
  }

  const ro = (valor, id, label) => <input id={id} className="nc-input nc-input--ro nc-num" value={valor} readOnly tabIndex={-1} aria-label={label} />
  const monto = (campo, id, label) => (
    f.moneda === 'PYG'
      ? <MontoInput id={id} value={f[campo]} onChange={(v) => set({ [campo]: v })} aria-label={label} />
      : <input id={id} className="nc-input nc-num" inputMode="decimal" value={f[campo]} aria-label={label}
          onChange={(e) => set({ [campo]: e.target.value.replace(',', '.').replace(/[^\d.]/g, '') })} />
  )
  const porc = (campo, id, label) => (
    <input id={id} className="nc-input nc-num rt-porc" inputMode="decimal" value={f[campo]} aria-label={label}
      onChange={(e) => set({ [campo]: e.target.value.replace(/[^\d.,]/g, '') })} onBlur={() => set({ [campo]: pct(f[campo]) })} />
  )

  return createPortal(
    <div className="q-content am-overlay nc-overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar(false) }}>
      <div className="nc-modal rt-modal" role="dialog" aria-modal="true" aria-labelledby="rt-titulo">
        <header className="nc-modal__head">
          <h2 id="rt-titulo">{f.id ? 'Modificar' : 'Agregar'} retención {emitida ? 'emitida' : 'recibida'}</h2>
          <button type="button" className="nc-cerrar" onClick={() => onCerrar(false)} aria-label="Cerrar"><X size={16} strokeWidth={2.2} /></button>
        </header>

        <div className="nc-tabs" role="tablist">
          {TABS.map((tb) => (
            <button key={tb.id} type="button" role="tab" aria-selected={tab === tb.id} className={tab === tb.id ? 'is-on' : ''} onClick={() => setTab(tb.id)}>
              {tb.label}{tb.n > 0 && <span className="nc-tabs__n">{tb.n}</span>}
            </button>
          ))}
        </div>

        <div className="nc-body">
          {tab === 'encabezado' && (
            <div className="nc-form">
              <div className="nc-fila nc-fila--persona">
                <label className="nc-label" htmlFor="rt-ruc">{quien} :</label>
                <input id="rt-ruc" ref={rucRef} className="nc-input nc-num-l" inputMode="numeric" value={rucBase || ''} placeholder="RUC" onChange={(e) => escribirRuc(e.target.value)} aria-label={`RUC del ${quien.toLowerCase()}`} />
                <input className="nc-input nc-input--ro nc-dv" value={rucDv ?? ''} readOnly tabIndex={-1} aria-label="Dígito verificador" />
                <input className="nc-input" value={f.personaNombre} placeholder="Razón social" onChange={(e) => set({ personaNombre: e.target.value })} aria-label="Razón social" />
                <button type="button" className="nc-btn" onClick={() => setBuscando((v) => !v)} aria-expanded={buscando}>Buscar</button>
              </div>
              {buscando && (
                <div className="nc-fila nc-fila--sub">
                  <span />
                  <Buscador id="rt-persona" items={opcionesPersona} valor={f.personaRuc} onElegir={(v) => v && elegirPersona(v)} placeholder={`Buscar ${quien.toLowerCase()} por RUC o nombre`} ariaLabel={`Buscar ${quien.toLowerCase()}`} inputProps={{ autoFocus: true }} />
                </div>
              )}

              <div className="nc-fila rt-fila--timb">
                <label className="nc-label" htmlFor="rt-timb">Timbrado :</label>
                {emitida && misTimbrados.length > 0 ? (
                  <select id="rt-timb" className="nc-input nc-select" value={timPropio?.id || ''} onChange={(e) => elegirTimbradoPropio(e.target.value)}>
                    <option value="" />
                    {misTimbrados.map((m) => <option key={m.id} value={m.id}>{m.numero} · {m.establecimiento}-{m.punto}{timbradoVigente(m, f.fecha || hoyISO()) ? '' : ' (vencido)'}</option>)}
                  </select>
                ) : (
                  <div>
                    <input id="rt-timb" className="nc-input nc-num-l" list="rt-timbrados" inputMode="numeric" maxLength={8} value={f.timbrado}
                      onChange={(e) => set({ timbrado: e.target.value.replace(/\D/g, '') })} />
                    <datalist id="rt-timbrados">{timbradosPersona.map((tm) => <option key={tm} value={tm} />)}</datalist>
                  </div>
                )}
                <label className="nc-label" htmlFor="rt-venc">Vencimiento :</label>
                {ro(timPropio?.fin ? fechaCorta(timPropio.fin) : '', 'rt-venc', 'Vencimiento del timbrado')}
                <span />
                <label className="nc-label" htmlFor="rt-anul">Anulada :</label>
                <input id="rt-anul" type="checkbox" className="rt-check" checked={!!f.anulado} onChange={(e) => set({ anulado: e.target.checked })} />
              </div>

              <div className="nc-fila rt-fila--145">
                <label className="nc-label" htmlFor="rt-145">Formulario 145 :</label>
                <select id="rt-145" className="nc-input nc-select" value={f.formulario145} onChange={(e) => set({ formulario145: e.target.value })}>
                  {FORM_145.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>

              <div className="nc-fila rt-fila--num">
                <label className="nc-label" htmlFor="rt-nro">Número :</label>
                <div className="rt-numero">
                  <input className={`nc-input nc-mono ${timPropio ? 'nc-input--ro' : ''}`} readOnly={!!timPropio} tabIndex={timPropio ? -1 : undefined} maxLength={3} inputMode="numeric" value={f.est} aria-label="Establecimiento"
                    onChange={(e) => set({ est: e.target.value.replace(/\D/g, '') })} onBlur={() => f.est && set({ est: f.est.padStart(3, '0') })} />
                  <input className={`nc-input nc-mono ${timPropio ? 'nc-input--ro' : ''}`} readOnly={!!timPropio} tabIndex={timPropio ? -1 : undefined} maxLength={3} inputMode="numeric" value={f.pto} aria-label="Punto de expedición"
                    onChange={(e) => set({ pto: e.target.value.replace(/\D/g, '') })} onBlur={() => f.pto && set({ pto: f.pto.padStart(3, '0') })} />
                  <input id="rt-nro" className={`nc-input nc-mono ${repetido ? 'is-err' : ''}`} maxLength={7} inputMode="numeric" value={f.nro} aria-label="Número"
                    onChange={(e) => set({ nro: e.target.value.replace(/\D/g, '') })} onBlur={() => f.nro && set({ nro: f.nro.padStart(7, '0') })} />
                </div>
                <span />
                <label className="nc-label" htmlFor="rt-fecha">Fecha :</label>
                <input id="rt-fecha" className="nc-input nc-input--fecha" value={f.fechaTxt} placeholder="dd/mm/aaaa" autoComplete="off"
                  onChange={(e) => set({ fechaTxt: e.target.value, fecha: fechaRapida(e.target.value, ejercicio, mesRef) || '' })}
                  onBlur={(e) => fijarFecha(e.target.value)} />
              </div>

              <div className="nc-fila rt-fila--moneda">
                <label className="nc-label" htmlFor="rt-moneda">Moneda :</label>
                <select id="rt-moneda" className="nc-input nc-select" value={f.moneda}
                  onChange={(e) => { const m = e.target.value; set({ moneda: m, cambio: m === 'PYG' ? 1 : '' }); setCotizando(''); if (m !== 'PYG') traerCotizacion(m) }}>
                  {MONEDAS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
                <span />
                <label className="nc-label" htmlFor="rt-tc">Tasa de Cambio :</label>
                <div className="nc-tc">
                  <input id="rt-tc" className={`nc-input nc-num ${f.moneda === 'PYG' ? 'nc-input--ro' : ''}`} inputMode="decimal" readOnly={f.moneda === 'PYG'}
                    value={f.moneda === 'PYG' ? 1 : f.cambio} onChange={(e) => set({ cambio: e.target.value.replace(',', '.') })} />
                  {cotizando && <small>{cotizando}</small>}
                </div>
              </div>

              <div className="rt-grid">
                {/* importes */}
                <label className="nc-label" htmlFor="rt-g10">Grav. 10% :</label>
                {monto('grav10', 'rt-g10', 'Gravada 10%')}
                <label className="nc-label" htmlFor="rt-iva10">I.V.A. 10% :</label>
                {ro(enMoneda(c.iva10), 'rt-iva10', 'IVA 10%')}
                <label className="nc-label" htmlFor="rt-p10">Porc. 10% :</label>
                {porc('porc10', 'rt-p10', 'Porcentaje retenido sobre IVA 10%')}
                <label className="nc-label" htmlFor="rt-r10">Ret. 10% :</label>
                {ro(enMoneda(c.ret10), 'rt-r10', 'Retención 10%')}

                <label className="nc-label" htmlFor="rt-g5">Grav. 05% :</label>
                {monto('grav5', 'rt-g5', 'Gravada 5%')}
                <label className="nc-label" htmlFor="rt-iva5">I.V.A. 05% :</label>
                {ro(enMoneda(c.iva5), 'rt-iva5', 'IVA 5%')}
                <label className="nc-label" htmlFor="rt-p5">Porc. 5% :</label>
                {porc('porc5', 'rt-p5', 'Porcentaje retenido sobre IVA 5%')}
                <label className="nc-label" htmlFor="rt-r5">Ret. 05% :</label>
                {ro(enMoneda(c.ret5), 'rt-r5', 'Retención 5%')}

                <label className="nc-label" htmlFor="rt-ex">Exentas :</label>
                {monto('exentas', 'rt-ex', 'Exentas')}
                <label className="nc-label" htmlFor="rt-total">Total :</label>
                {ro(enMoneda(c.total), 'rt-total', 'Total')}
                <span /><span />
                <label className="nc-label" htmlFor="rt-ret">Importe Retenido :</label>
                {ro(enMoneda(c.retenido), 'rt-ret', 'Importe retenido')}
              </div>
              {f.moneda !== 'PYG' && Number(f.cambio) > 0 && c.retenido > 0 && (
                <p className="nc-equiv">Equivale a ₲ {gs(doc.monto)} retenidos</p>
              )}
              {f.anulado && <p className="nc-nota rt-aviso-anul">Anulada: queda registrada con su número, pero no genera asiento ni cancela saldo.</p>}

              <div className="nc-fila nc-fila--obs">
                <label className="nc-label" htmlFor="rt-obs">Observación :</label>
                <textarea id="rt-obs" className="nc-input rt-obs" rows={3} value={f.concepto} onChange={(e) => set({ concepto: e.target.value })} />
              </div>
            </div>
          )}

          {tab === 'comprobantes' && (
            <div className="nc-facturas">
              <p className="nc-nota">
                {!f.personaRuc
                  ? `Primero indicá el ${quien.toLowerCase()} en el encabezado para ver sus facturas.`
                  : facturasPersona.length
                    ? `Marcá las facturas ${emitida ? 'de compra' : 'de venta'} sobre las que se practica la retención. Sus gravadas se suman al encabezado y el importe retenido cancela su saldo.`
                    : `${f.personaNombre || f.personaRuc} no tiene facturas ${emitida ? 'de compra' : 'de venta'} cargadas. Podés cargar las gravadas a mano en el encabezado.`}
              </p>
              {facturasPersona.length > 0 && (
                <table className="nc-tabla">
                  <thead>
                    <tr><th aria-label="Retener" /><th>Fecha</th><th>Factura</th><th>Timbrado</th><th className="nc-der">Total</th><th className="nc-der">I.V.A.</th><th className="nc-der">Retención</th></tr>
                  </thead>
                  <tbody>
                    {facturasPersona.map((fac) => {
                      const x = totalesDe(fac)
                      const on = f.comprobantesRet.some((y) => y.facturaId === fac.id)
                      return (
                        <tr key={fac.id} className={on ? 'is-sel' : ''} onClick={() => toggleFactura(fac)} style={{ cursor: 'pointer' }}>
                          <td><input type="checkbox" className="rt-check" checked={on} onChange={() => toggleFactura(fac)} onClick={(e) => e.stopPropagation()} aria-label={`Retener factura ${fac.numero}`} /></td>
                          <td className="nc-mono">{fechaCorta(fac.fecha)}</td>
                          <td className="nc-mono">{fac.numero}</td>
                          <td className="nc-mono">{fac.timbrado}</td>
                          <td className="nc-der nc-mono">{gs(x.total)}</td>
                          <td className="nc-der nc-mono">{gs(x.iva10 + x.iva5)}</td>
                          <td className="nc-der nc-mono">{on ? gs(Math.round((x.iva10 * pct(f.porc10) + x.iva5 * pct(f.porc5)) / 100)) : ''}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {tab === 'debe' && ladoAsiento('debe')}
          {tab === 'haber' && ladoAsiento('haber')}
        </div>

        {errores.length > 0 && (
          <div className="am-error nc-error" role="alert">
            <AlertTriangle size={18} strokeWidth={2} aria-hidden="true" />
            <ul>{errores.map((e) => <li key={e}>{e}</li>)}</ul>
          </div>
        )}

        <footer className="nc-modal__foot">
          <button type="button" className="nc-btn" onClick={() => onCerrar(false)}><X size={13} strokeWidth={2.4} /> <span><u>C</u>ancelar</span></button>
          <button type="button" className="nc-btn nc-btn--primary" onClick={guardar}><Check size={14} strokeWidth={2.6} /> <span><u>G</u>uardar</span></button>
        </footer>
      </div>
    </div>,
    document.querySelector('.q-app') || document.body
  )
}

/* ── grilla ─────────────────────────────────────────────────── */

export default function Retenciones({ tipo }) {
  const { comprobantes, ejercicio, contribuyente } = useContable()
  const emitida = tipo === 'ret-emitida'
  const [mes, setMes] = useState(() => (String(new Date().getFullYear()) === String(ejercicio) ? String(new Date().getMonth() + 1).padStart(2, '0') : '01'))
  const [busca, setBusca] = useState('')
  const [orden, setOrden] = useState({ campo: 'fecha', dir: -1 })
  const [selId, setSelId] = useState(null)
  const [modal, setModal] = useState(null)
  const [aviso, setAviso] = useState('')
  const buscaRef = useRef(null)

  const COLUMNAS = [
    { id: 'numero', label: 'Número', valor: (d) => d.numero },
    { id: 'fecha', label: 'Fecha', valor: (d) => d.fecha },
    { id: 'nombre', label: emitida ? 'Proveedor' : 'Cliente', valor: (d) => d.personaNombre, ancho: true },
    { id: 'moneda', label: 'Moneda', valor: (d) => MONEDAS.find((m) => m.id === (d.moneda || 'PYG'))?.label },
    { id: 'total', label: 'Total', valor: (d) => n0(d.monto), num: true }
  ]

  const q = normalizar(busca)
  const filas = comprobantes.items
    .filter((d) => d.tipo === tipo && String(d.fecha || '').startsWith(`${ejercicio}-${mes}`))
    .filter((d) => !q || normalizar(`${d.numero} ${d.timbrado} ${d.personaRuc} ${d.personaNombre} ${d.concepto || ''} ${d.facturaRef || ''}`).includes(q))
  const col = COLUMNAS.find((x) => x.id === orden.campo)
  const ordenadas = filas.slice().sort((a, b) => {
    const va = col.valor(a)
    const vb = col.valor(b)
    const v = typeof va === 'number' ? va - vb : String(va || '').localeCompare(String(vb || ''))
    return (v || (a.numero || '').localeCompare(b.numero || '')) * orden.dir
  })
  const sel = filas.find((d) => d.id === selId) || null

  const fechaDefecto = () => {
    const hoy = hoyISO()
    return hoy.startsWith(`${ejercicio}-${mes}`) ? hoy : ''
  }
  const nuevo = () => { setAviso(''); setModal(formVacio(tipo, fechaDefecto())) }
  const modificar = (d = sel) => { if (d) { setAviso(''); setModal(formDesdeDoc(d)) } }
  const eliminar = () => {
    if (!sel) return
    if (window.confirm(`¿Eliminar la retención ${sel.numero} de ${sel.personaNombre}? También se quita su asiento del Diario y del Mayor.`)) {
      comprobantes.eliminar(sel.id)
      setSelId(null)
      setAviso('Retención eliminada.')
    }
  }

  useEffect(() => {
    const onKey = (e) => {
      if (modal) return
      const k = e.key.toLowerCase()
      if (e.ctrlKey && k === 'f') { e.preventDefault(); buscaRef.current?.focus() }
      if (e.altKey && k === 'n') { e.preventDefault(); nuevo() }
      if (e.altKey && k === 'm') { e.preventDefault(); modificar() }
      if (e.altKey && k === 'e') { e.preventDefault(); eliminar() }
      const enLista = document.activeElement?.closest?.('.nc-lista')
      if (sel && k === 'enter' && enLista) { e.preventDefault(); modificar() }
      if (sel && k === 'delete' && enLista) { e.preventDefault(); eliminar() }
      if (['arrowdown', 'arrowup'].includes(k) && enLista) {
        e.preventDefault()
        const i = ordenadas.findIndex((d) => d.id === selId)
        const n = ordenadas[Math.min(Math.max(i + (k === 'arrowdown' ? 1 : -1), 0), ordenadas.length - 1)]
        if (n) { setSelId(n.id); document.getElementById(`rt-row-${n.id}`)?.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  const vigentes = ordenadas.filter((d) => !d.anulado)

  return (
    <div className="nc-pagina">
      <div className="nc-barra">
        <div className="nc-barra__acciones" role="toolbar" aria-label="Acciones">
          <button type="button" className="nc-btn" onClick={nuevo} title="Alt+N"><Plus size={14} strokeWidth={2.6} className="nc-ico-circ" /> <span><u>N</u>uevo</span></button>
          <button type="button" className="nc-btn" onClick={() => modificar()} disabled={!sel} title="Alt+M"><Pencil size={13} strokeWidth={2.2} /> <span><u>M</u>odificar</span></button>
          <button type="button" className="nc-btn" onClick={eliminar} disabled={!sel} title="Alt+E"><Trash2 size={13} strokeWidth={2.2} /> <span><u>E</u>liminar</span></button>
        </div>
        <div className="nc-barra__filtros">
          <span className="nc-periodo__label">Periodo:</span>
          <select className="nc-input nc-select nc-anio" value={ejercicio} disabled aria-label="Año"><option>{ejercicio}</option></select>
          <select className="nc-input nc-select nc-mes" value={mes} onChange={(e) => { setMes(e.target.value); setSelId(null) }} aria-label="Mes">
            {MESES_CORTOS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <input ref={buscaRef} className="nc-input nc-buscar" type="search" value={busca} placeholder="BUSCAR [CTRL+F]" onChange={(e) => setBusca(e.target.value)} aria-label="Buscar" />
        </div>
      </div>

      {aviso && <p className="nc-aviso is-ok nc-aviso--barra" role="status"><Check size={13} strokeWidth={2.4} /> {aviso}</p>}

      <div className="nc-grilla">
        <table className="nc-lista">
          <thead>
            <tr>
              {COLUMNAS.map((x) => (
                <th key={x.id} className={x.ancho ? 'nc-ancho' : ''} aria-sort={orden.campo === x.id ? (orden.dir > 0 ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" onClick={() => setOrden({ campo: x.id, dir: orden.campo === x.id ? -orden.dir : 1 })}>
                    <span>{x.label}</span>
                    <span className={`nc-sort ${orden.campo === x.id ? 'is-on' : ''}`} aria-hidden="true">
                      {orden.campo === x.id ? (orden.dir > 0 ? <ChevronUp size={12} strokeWidth={3} /> : <ChevronDown size={12} strokeWidth={3} />) : <><ChevronUp size={10} strokeWidth={3} /><ChevronDown size={10} strokeWidth={3} /></>}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ordenadas.length === 0 ? (
              <tr className="nc-lista__vacio"><td colSpan={COLUMNAS.length}>No se encontraron registros coincidentes</td></tr>
            ) : ordenadas.map((d) => (
              <tr key={d.id} id={`rt-row-${d.id}`} className={`${selId === d.id ? 'is-sel' : ''} ${d.anulado ? 'rt-anulada-fila' : ''}`} aria-selected={selId === d.id} tabIndex={0}
                onFocus={() => setSelId(d.id)} onClick={() => setSelId(d.id)} onDoubleClick={() => modificar(d)}>
                <td className="nc-mono">{d.numero}{d.anulado && <span className="rt-tag">ANULADA</span>}</td>
                <td className="nc-mono">{fechaCorta(d.fecha)}</td>
                <td>{d.personaNombre}</td>
                <td>{MONEDAS.find((m) => m.id === (d.moneda || 'PYG'))?.label}</td>
                <td className="nc-der nc-mono">{gs(d.monto)}</td>
              </tr>
            ))}
          </tbody>
          {ordenadas.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={4}>{ordenadas.length} {ordenadas.length === 1 ? 'retención' : 'retenciones'}{ordenadas.length > vigentes.length ? ` (${ordenadas.length - vigentes.length} anulada${ordenadas.length - vigentes.length === 1 ? '' : 's'})` : ''} · {contribuyente.razonSocial}</td>
                <td className="nc-der nc-mono">{gs(vigentes.reduce((sm, d) => sm + n0(d.monto), 0))}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {modal && <ModalRetencion key={modal.id || 'nuevo'} inicial={modal} mesRef={mes} onCerrar={(ok) => { if (ok) setAviso(modal.id ? 'Retención modificada.' : 'Retención registrada.'); setModal(null) }} />}
    </div>
  )
}
