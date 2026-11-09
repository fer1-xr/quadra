import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import axios from 'axios'
import { Plus, Pencil, Trash2, X, Check, ChevronUp, ChevronDown, AlertTriangle, QrCode, Info, BadgeCheck, ExternalLink } from 'lucide-react'
import { useContable } from './ContableContext'
import { MontoInput } from './ui'
import { Buscador } from './AsientosManuales'
import { API_BASE_URL, authHeaders } from '../../services/api'
import {
  TIPOS, CTA, totalesDe, lineasDe, gs, fechaCorta, hoyISO, formatearNumero, numeroValido, timbradoValido,
  siguienteNumero, timbradoVigente, analizarRuc, n0, leerCDC, formatearCDC, fechaRapida, dvRuc
} from '../../services/contabilidad'
import '../../styles/AsientosManuales.css'
import '../../styles/NotasCredito.css'

/* ── catálogos ──────────────────────────────────────────────── */

const MONEDAS = [
  { id: 'PYG', label: 'GUARANÍ', corto: 'GS' },
  { id: 'USD', label: 'DÓLAR', corto: 'USD' },
  { id: 'BRL', label: 'REAL', corto: 'BRL' },
  { id: 'ARS', label: 'PESO ARGENTINO', corto: 'ARS' },
  { id: 'EUR', label: 'EURO', corto: 'EUR' }
]

const TIPOS_TIMB = [
  { id: 'preimpreso', label: 'Preimpreso', corto: 'Preimpreso' },
  { id: 'electronico', label: 'Electrónico', corto: 'Electrónico' },
  { id: 'autoimpresor', label: 'Autoimpresor', corto: 'Autoimpresor' }
]

const TIPOS_NC = [
  { id: 'devolucion', label: 'Devolución' },
  { id: 'descuento', label: 'Descuento' },
  { id: 'bonificacion', label: 'Bonificación' },
  { id: 'ajuste', label: 'Ajuste de precio' }
]

const FORM_145 = [
  { id: 'original', label: 'Original' },
  { id: 'rectificativa', label: 'Rectificativa' }
]

const MESES_CORTOS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
const normalizar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const nuevaKey = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
const filaVacia = () => ({ key: nuevaKey(), factura: '', g10: '', g5: '', ex: '' })

/** CDC completo y con el dígito verificador correcto */
const cdcValido = (d) => /^\d{44}$/.test(d) && String(dvRuc(d.slice(0, 43))) === d[43]

/** el QR del KuDE trae el CDC en el parámetro Id */
const cdcDeQR = (texto) => {
  const s = String(texto || '')
  const m = s.match(/[?&]Id=(\d{44})/i) || s.match(/(\d{44})/)
  return m ? m[1] : ''
}

/* ── formulario ─────────────────────────────────────────────── */

const formVacio = (tipo, fecha = '') => ({
  tipo,
  cdc: '',
  tipoTimbrado: '',
  serie: '',
  tipoNC: 'devolucion',
  numero: '',
  fecha,
  fechaTxt: fecha ? fechaCorta(fecha) : '',
  personaRuc: '',
  personaNombre: '',
  timbrado: '',
  formulario145: 'original',
  moneda: 'PYG',
  cambio: 1,
  facturas: [filaVacia()],
  condicion: 'credito',
  cuentaPago: CTA.CAJA,
  cuenta: TIPOS[tipo].cuenta,
  concepto: ''
})

const formDesdeDoc = (d) => {
  const orig = d.montosOrig
  const facturas = d.facturas?.length
    ? d.facturas.map((x) => ({ ...x, key: nuevaKey() }))
    : [{ key: nuevaKey(), factura: d.asociado || '', g10: orig ? orig.g10 : d.gravada10, g5: orig ? orig.g5 : d.gravada5, ex: orig ? orig.ex : d.exenta }]
  return {
    ...formVacio(d.tipo, d.fecha),
    ...d,
    fechaTxt: fechaCorta(d.fecha),
    moneda: d.moneda || 'PYG',
    cambio: d.cambio || 1,
    condicion: d.condicion || 'credito',
    cuentaPago: d.cuentaPago || CTA.CAJA,
    facturas
  }
}

/** suma de las facturas afectadas, en la moneda del comprobante */
const sumaFacturas = (filas) => filas.reduce((t, r) => ({ g10: t.g10 + n0(r.g10), g5: t.g5 + n0(r.g5), ex: t.ex + n0(r.ex) }), { g10: 0, g5: 0, ex: 0 })

/** formulario → comprobante en guaraníes (misma forma que usan el Libro y el Diario) */
const aDoc = (f) => {
  const tc = f.moneda === 'PYG' ? 1 : Number(f.cambio) || 0
  const s = sumaFacturas(f.facturas)
  const facturas = f.facturas
    .filter((r) => r.factura || n0(r.g10) || n0(r.g5) || n0(r.ex))
    .map(({ key, ...r }) => ({ ...r, factura: formatearNumero(r.factura), g10: n0(r.g10), g5: n0(r.g5), ex: n0(r.ex) }))
  return {
    ...f,
    numero: formatearNumero(f.numero),
    gravada10: Math.round(s.g10 * tc),
    gravada5: Math.round(s.g5 * tc),
    exenta: Math.round(s.ex * tc),
    facturas,
    asociado: facturas.map((r) => r.factura).filter(Boolean).join(', '),
    imputaciones: []
  }
}

/* ── ventana de carga ───────────────────────────────────────── */

function ModalNotaCredito({ inicial, onCerrar, mesRef }) {
  const { comprobantes, timbrados, personas, imputables, nombreCuenta, ejercicio } = useContable()
  const [f, setF] = useState(inicial)
  const [tab, setTab] = useState('encabezado')
  const [errores, setErrores] = useState([])
  const [cdcEstado, setCdcEstado] = useState(null)
  const [buscando, setBuscando] = useState(false)
  const [qrAbierto, setQrAbierto] = useState(false)
  const [cotizando, setCotizando] = useState('')
  const cdcRef = useRef(null)

  const t = TIPOS[f.tipo]
  const esCompra = t.lado === 'compra'
  const quien = esCompra ? 'Proveedor' : 'Cliente'
  const set = (c) => { setF((x) => ({ ...x, ...c })); setErrores([]) }

  const doc = aDoc(f)
  const x = totalesDe(doc)
  const s = sumaFacturas(f.facturas)
  const tc = f.moneda === 'PYG' ? 1 : Number(f.cambio) || 0
  const enMoneda = (v) => (f.moneda === 'PYG' ? gs(v) : (Number(v) || 0).toLocaleString('es-PY', { maximumFractionDigits: 2 }))
  const iva10m = f.moneda === 'PYG' ? x.iva10 : s.g10 / 11
  const iva5m = f.moneda === 'PYG' ? x.iva5 : s.g5 / 21
  const bruto = s.g10 + s.g5 + s.ex
  const lineas = lineasDe(doc)
  const otros = comprobantes.items.filter((d) => d.id !== f.id)

  const [rucBase, rucDv] = String(f.personaRuc || '').split('-')
  const misTimbrados = timbrados.items.filter((m) => m.tipo === t.timbradoTipo)
  const timbradosPersona = useMemo(() => [...new Set(otros
    .filter((d) => esCompra && d.personaRuc === f.personaRuc && TIPOS[d.tipo]?.lado === 'compra' && d.timbrado)
    .map((d) => d.timbrado))], [otros, f.personaRuc, esCompra])

  // facturas de la persona que la nota puede afectar
  const facturasPersona = useMemo(() => otros
    .filter((d) => d.personaRuc === f.personaRuc && d.tipo === (esCompra ? 'compra' : 'venta'))
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')), [otros, f.personaRuc, esCompra])

  const repetido = f.numero && f.personaRuc
    ? otros.find((d) => d.tipo === f.tipo && d.numero === formatearNumero(f.numero) && d.personaRuc === f.personaRuc)
    : null

  const opcionesPersona = useMemo(() => personas.items
    .map((p) => ({ value: p.ruc, code: p.ruc, text: p.nombre, label: `${p.ruc} · ${p.nombre}`, search: `${p.ruc} ${p.nombre}` })), [personas.items])
  const opcionesCuenta = useMemo(() => imputables.map((c) => ({
    value: c.codigo, code: c.codigo, text: c.nombre, label: `${c.codigo} · ${c.nombre}`, search: `${c.codigo} ${c.nombre}`
  })), [imputables])

  /* persona */
  const elegirPersona = (ruc) => {
    const p = personas.items.find((y) => y.ruc === ruc)
    set({ personaRuc: ruc, personaNombre: p?.nombre || f.personaNombre })
    setBuscando(false)
  }
  const escribirRuc = (base) => {
    const limpio = base.replace(/\D/g, '').slice(0, 9)
    const ruc = limpio ? `${limpio}-${dvRuc(limpio)}` : ''
    const p = personas.items.find((y) => y.ruc === ruc)
    set({ personaRuc: ruc, personaNombre: p ? p.nombre : (personas.items.some((y) => y.nombre === f.personaNombre) ? '' : f.personaNombre) })
  }

  /* CDC */
  const aplicarCDC = (texto) => {
    const d = String(texto || '').replace(/\D/g, '')
    if (!d) { setCdcEstado(null); return false }
    if (d.length !== 44) { setCdcEstado({ ok: false, texto: `El CDC tiene 44 dígitos (van ${d.length}).` }); return false }
    if (!cdcValido(d)) { setCdcEstado({ ok: false, texto: 'El dígito verificador del CDC no coincide. Revisá que esté bien copiado.' }); return false }
    const c = leerCDC(d)
    if (c.tipoDoc !== 'nota-credito') { setCdcEstado({ ok: false, texto: `Ese CDC corresponde a una ${c.tipoDoc.replace('-', ' de ')}, no a una nota de crédito.` }); return false }
    const ruc = esCompra ? c.ruc : f.personaRuc
    const p = personas.items.find((y) => y.ruc === ruc)
    setF((prev) => ({
      ...prev,
      cdc: d,
      tipoTimbrado: 'electronico',
      numero: c.numero,
      fecha: c.fecha || prev.fecha,
      fechaTxt: c.fecha ? fechaCorta(c.fecha) : prev.fechaTxt,
      personaRuc: ruc,
      personaNombre: esCompra ? (p?.nombre || '') : prev.personaNombre
    }))
    setErrores([])
    setCdcEstado({ ok: true, texto: `CDC válido · ${c.numero} del ${fechaCorta(c.fecha)}${esCompra ? ` · RUC ${c.ruc}` : ''}` })
    return true
  }

  const fijarFecha = (txt) => {
    const iso = fechaRapida(txt, ejercicio, mesRef || (f.fecha ? f.fecha.slice(5, 7) : ''))
    set({ fechaTxt: iso ? fechaCorta(iso) : txt, fecha: iso })
  }

  // ventas: timbrado propio de notas de crédito y número siguiente
  const elegirTimbradoPropio = (numero) => {
    const tim = misTimbrados.find((m) => m.numero === numero)
    set({ timbrado: numero, numero: tim && !f.id ? siguienteNumero(tim, otros) : f.numero })
  }
  useEffect(() => {
    if (!t.emitido || f.id || f.timbrado) return
    const vig = misTimbrados.find((m) => timbradoVigente(m, f.fecha || hoyISO())) || misTimbrados[0]
    if (vig) elegirTimbradoPropio(vig.numero)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const traerCotizacion = async (moneda = f.moneda) => {
    if (moneda === 'PYG') return
    if (!f.fecha) { setCotizando('Indicá la fecha para traer la cotización.'); return }
    setCotizando('Consultando DNIT…')
    try {
      const auth = await authHeaders()
      const r = await axios.post(`${API_BASE_URL}/api/cotizacion`, { fecha: f.fecha, moneda }, { headers: { ...auth } })
      if (r.data?.success) {
        set({ cambio: esCompra ? r.data.data.vendedor : r.data.data.comprador })
        setCotizando(`DNIT ${esCompra ? 'vendedor' : 'comprador'} del ${fechaCorta(r.data.data.fecha)}`)
      } else setCotizando(r.data?.message || 'Sin cotización')
    } catch (err) {
      setCotizando(err.response?.data?.message || 'No se pudo consultar la DNIT; cargala a mano.')
    }
  }

  /* facturas afectadas */
  const setFila = (key, c) => set({ facturas: f.facturas.map((r) => (r.key === key ? { ...r, ...c } : r)) })
  const elegirFactura = (key, numero) => {
    const fac = facturasPersona.find((d) => d.numero === numero)
    if (!fac) { setFila(key, { factura: numero }); return }
    const o = fac.montosOrig
    setFila(key, { factura: numero, g10: o ? o.g10 : fac.gravada10, g5: o ? o.g5 : fac.gravada5, ex: o ? o.ex : fac.exenta })
  }

  const guardar = () => {
    const d = aDoc(f)
    const errs = []
    if (f.cdc && !cdcValido(f.cdc)) errs.push('El CDC no es válido: tiene que tener 44 dígitos y el verificador correcto.')
    if (!f.tipoTimbrado) errs.push('Elegí el tipo de comprobante (preimpreso, electrónico o autoimpresor).')
    if (!d.fecha) errs.push('Indicá la fecha (podés escribir solo el día, p. ej. «15»).')
    else if (!d.fecha.startsWith(String(ejercicio))) errs.push(`La fecha tiene que estar dentro del ejercicio ${ejercicio}.`)
    if (!numeroValido(d.numero)) errs.push('El número de N.C. tiene el formato 001-001-0000001.')
    if (!analizarRuc(d.personaRuc).formato) errs.push(`Indicá el RUC del ${quien.toLowerCase()}.`)
    if (!String(d.personaNombre || '').trim()) errs.push(`Escribí el nombre o razón social del ${quien.toLowerCase()}.`)
    if (!timbradoValido(d.timbrado)) errs.push('El timbrado tiene 8 dígitos.')
    if (f.moneda !== 'PYG' && !(Number(f.cambio) > 0)) errs.push('Indicá la tasa de cambio.')
    if (!totalesDe(d).total) errs.push('Cargá en la pestaña Facturas los importes que acredita la nota.')
    if (d.facturas.some((r) => r.factura && !numeroValido(r.factura))) errs.push('Las facturas afectadas tienen el formato 001-001-0000001.')
    if (!d.cuenta) errs.push('Elegí la cuenta de imputación en la pestaña del asiento.')
    if (repetido) errs.push(`Ya está cargada la N.C. ${repetido.numero} del ${fechaCorta(repetido.fecha)}.`)
    if (errs.length) { setErrores(errs); setTab('encabezado'); return }

    personas.asegurar(d.personaRuc, d.personaNombre.trim(), esCompra ? 'proveedor' : 'cliente')
    const { fechaTxt, ...resto } = d
    const sum = sumaFacturas(d.facturas)
    comprobantes.guardar({
      ...resto,
      personaNombre: d.personaNombre.trim(),
      serie: String(f.serie || '').toUpperCase(),
      cuentaPago: d.condicion === 'contado' ? d.cuentaPago : null,
      montosOrig: f.moneda === 'PYG' ? null : { g10: sum.g10, g5: sum.g5, ex: sum.ex },
      editadoEn: f.id ? new Date().toISOString() : null
    })
    onCerrar(true)
  }

  // atajos: Alt+E/F/D/H pestañas, Alt+G guardar, Esc cancelar
  useEffect(() => {
    const onKey = (e) => {
      const k = e.key.toLowerCase()
      const tabs = { e: 'encabezado', f: 'facturas', d: 'debe', h: 'haber' }
      if (e.altKey && tabs[k]) { e.preventDefault(); setTab(tabs[k]) }
      if (e.altKey && k === 'g') { e.preventDefault(); guardar() }
      if (e.altKey && k === 'c') { e.preventDefault(); onCerrar(false) }
      if (k === 'escape') onCerrar(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })
  useEffect(() => { cdcRef.current?.focus() }, [])

  const TABS = [
    { id: 'encabezado', label: 'Encabezado' },
    { id: 'facturas', label: 'Facturas', n: doc.facturas.length },
    { id: 'debe', label: 'Asiento Debe' },
    { id: 'haber', label: 'Asiento Haber' }
  ]

  /* pestañas del asiento */
  const ladoNeto = esCompra ? 'haber' : 'debe'
  const ladoAsiento = (lado) => {
    const propias = lineas.filter((l) => (lado === 'debe' ? l.debe : l.haber))
    const total = propias.reduce((sm, l) => sm + (lado === 'debe' ? l.debe : l.haber), 0)
    const esContra = lado !== ladoNeto
    return (
      <div className="nc-asiento">
        {lado === ladoNeto ? (
          <div className="nc-fila nc-fila--asiento">
            <label className="nc-label" htmlFor="nc-cuenta">Cuenta :</label>
            <div className="nc-asiento__busca">
              <Buscador id="nc-cuenta" items={opcionesCuenta} valor={f.cuenta} onElegir={(v) => v && set({ cuenta: v })} placeholder="Código o nombre" ariaLabel="Cuenta de imputación" />
            </div>
          </div>
        ) : (
          <div className="nc-fila nc-fila--asiento">
            <label className="nc-label" htmlFor="nc-contra">Contrapartida :</label>
            <select id="nc-contra" className="nc-input nc-select" value={f.condicion === 'credito' ? 'cc' : f.cuentaPago}
              onChange={(e) => (e.target.value === 'cc' ? set({ condicion: 'credito' }) : set({ condicion: 'contado', cuentaPago: e.target.value }))}>
              <option value="cc">{nombreCuenta(esCompra ? CTA.PROVEEDORES : CTA.DEUDORES)} (cuenta corriente)</option>
              {imputables.filter((c) => c.codigo.startsWith('1.1.01.')).map((c) => <option key={c.codigo} value={c.codigo}>{c.nombre} ({esCompra ? 'reintegro recibido' : 'reintegro pagado'})</option>)}
            </select>
          </div>
        )}
        <table className="nc-tabla">
          <thead><tr><th>Código</th><th>Cuenta</th><th className="nc-der">{lado === 'debe' ? 'Debe' : 'Haber'}</th></tr></thead>
          <tbody>
            {propias.length ? propias.map((l, i) => (
              <tr key={i}><td className="nc-mono">{l.cuenta}</td><td>{nombreCuenta(l.cuenta)}</td><td className="nc-der nc-mono">{gs(lado === 'debe' ? l.debe : l.haber)}</td></tr>
            )) : <tr><td colSpan={3} className="nc-vacio">Sin datos: cargá los importes en la pestaña Facturas.</td></tr>}
          </tbody>
          <tfoot><tr><td colSpan={2}>Total {lado === 'debe' ? 'Debe' : 'Haber'}</td><td className="nc-der nc-mono">{gs(total)}</td></tr></tfoot>
        </table>
        {esContra && <p className="nc-nota">El IVA {esCompra ? 'crédito' : 'débito'} fiscal se revierte automáticamente según las tasas de la pestaña Facturas.</p>}
      </div>
    )
  }

  const campoMonto = (label, valor, id) => (
    <>
      <label className="nc-label" htmlFor={id}>{label} :</label>
      <input id={id} className="nc-input nc-input--ro nc-num" value={valor} readOnly tabIndex={-1} />
    </>
  )

  return createPortal(
    <div className="q-content am-overlay nc-overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar(false) }}>
      <div className="nc-modal" role="dialog" aria-modal="true" aria-labelledby="nc-titulo">
        <header className="nc-modal__head">
          <h2 id="nc-titulo">{f.id ? 'Modificar' : 'Registrar'} nota de crédito {esCompra ? 'compra' : 'venta'}</h2>
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
              {/* CDC */}
              <div className="nc-fila nc-fila--cdc">
                <label className={`nc-label ${!esCompra || f.tipoTimbrado === 'electronico' || !f.tipoTimbrado ? 'is-req' : ''}`} htmlFor="nc-cdc">CDC :</label>
                <div className={`nc-cdc ${cdcEstado && !cdcEstado.ok ? 'is-err' : ''} ${cdcEstado?.ok ? 'is-ok' : ''}`}>
                  <input id="nc-cdc" ref={cdcRef} className="nc-cdc__input" inputMode="numeric" autoComplete="off"
                    value={formatearCDC(f.cdc)} placeholder="____ ____ ____ ____ ____ ____ ____ ____ ____ ____ ____"
                    onChange={(e) => {
                      const d = e.target.value.replace(/\D/g, '').slice(0, 44)
                      set({ cdc: d })
                      setCdcEstado(null)
                      if (d.length === 44) aplicarCDC(d)
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); aplicarCDC(f.cdc) } }} />
                  <span className="nc-cdc__info" title="Código de Control de 44 dígitos del documento electrónico (está en el KuDE). Al pegarlo se completan número, fecha y RUC."><Info size={13} strokeWidth={2.4} /></span>
                </div>
                <button type="button" className="nc-btn" onClick={() => aplicarCDC(f.cdc)}>Verificar</button>
                <button type="button" className="nc-btn nc-btn--qr" onClick={() => setQrAbierto((v) => !v)} aria-expanded={qrAbierto}><QrCode size={15} strokeWidth={1.9} /> QR</button>
              </div>
              {qrAbierto && (
                <div className="nc-fila nc-fila--sub">
                  <span />
                  <input className="nc-input" autoFocus placeholder="Escaneá o pegá el contenido del QR del KuDE"
                    onChange={(e) => { const c = cdcDeQR(e.target.value); if (c) { set({ cdc: c }); aplicarCDC(c); setQrAbierto(false) } }} />
                </div>
              )}
              {cdcEstado && (
                <div className="nc-fila nc-fila--sub">
                  <span />
                  <p className={`nc-aviso ${cdcEstado.ok ? 'is-ok' : 'is-err'}`}>
                    {cdcEstado.ok ? <BadgeCheck size={13} strokeWidth={2} /> : <AlertTriangle size={13} strokeWidth={2} />} {cdcEstado.texto}
                    {cdcEstado.ok && <a href="https://ekuatia.set.gov.py/consultas/" target="_blank" rel="noreferrer">Consultar en e-Kuatia <ExternalLink size={11} /></a>}
                  </p>
                </div>
              )}

              <div className="nc-grid">
                <label className="nc-label" htmlFor="nc-tt">Tipo :</label>
                <select id="nc-tt" className="nc-input nc-select" value={f.tipoTimbrado} onChange={(e) => set({ tipoTimbrado: e.target.value })}>
                  <option value="" />
                  {TIPOS_TIMB.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
                <label className="nc-label" htmlFor="nc-serie">Serie :</label>
                <input id="nc-serie" className="nc-input nc-input--sm" maxLength={2} value={f.serie} onChange={(e) => set({ serie: e.target.value.replace(/[^a-z]/gi, '').toUpperCase() })} />
                <span /><span />

                <label className="nc-label" htmlFor="nc-tnc">Tipo de N.C. :</label>
                <select id="nc-tnc" className="nc-input nc-select" value={f.tipoNC} onChange={(e) => set({ tipoNC: e.target.value })}>
                  {TIPOS_NC.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
                <label className="nc-label" htmlFor="nc-num">Nro. de N.C. :</label>
                <input id="nc-num" className={`nc-input nc-num-l ${repetido ? 'is-err' : ''}`} value={f.numero} placeholder="001-001-0000001"
                  onChange={(e) => set({ numero: e.target.value })} onBlur={() => set({ numero: formatearNumero(f.numero) })} />
                <label className="nc-label" htmlFor="nc-fecha">Fecha :</label>
                <input id="nc-fecha" className="nc-input nc-input--fecha" value={f.fechaTxt} placeholder="dd/mm/aaaa" autoComplete="off"
                  onChange={(e) => set({ fechaTxt: e.target.value, fecha: fechaRapida(e.target.value, ejercicio, mesRef) || '' })}
                  onBlur={(e) => fijarFecha(e.target.value)} />
              </div>

              <div className="nc-fila nc-fila--persona">
                <label className="nc-label" htmlFor="nc-ruc">{quien} :</label>
                <input id="nc-ruc" className="nc-input nc-num-l" inputMode="numeric" value={rucBase || ''} placeholder="RUC" onChange={(e) => escribirRuc(e.target.value)} aria-label={`RUC del ${quien.toLowerCase()}`} />
                <input className="nc-input nc-input--ro nc-dv" value={rucDv ?? ''} readOnly tabIndex={-1} aria-label="Dígito verificador" />
                <input className="nc-input" value={f.personaNombre} placeholder="Razón social" onChange={(e) => set({ personaNombre: e.target.value })} aria-label="Razón social" />
                <button type="button" className="nc-btn" onClick={() => setBuscando((v) => !v)} aria-expanded={buscando}>Buscar</button>
              </div>
              {buscando && (
                <div className="nc-fila nc-fila--sub">
                  <span />
                  <Buscador id="nc-persona" items={opcionesPersona} valor={f.personaRuc} onElegir={(v) => v && elegirPersona(v)} placeholder={`Buscar ${quien.toLowerCase()} por RUC o nombre`} ariaLabel={`Buscar ${quien.toLowerCase()}`} inputProps={{ autoFocus: true }} />
                </div>
              )}

              <div className="nc-grid nc-grid--2">
                <label className="nc-label" htmlFor="nc-timb">Timbrado :</label>
                {t.emitido && misTimbrados.length > 0 ? (
                  <select id="nc-timb" className="nc-input nc-select" value={f.timbrado} onChange={(e) => elegirTimbradoPropio(e.target.value)}>
                    <option value="" />
                    {misTimbrados.map((m) => <option key={m.id} value={m.numero}>{m.numero}{timbradoVigente(m, f.fecha || hoyISO()) ? '' : ' (vencido)'}</option>)}
                  </select>
                ) : (
                  <>
                    <input id="nc-timb" className="nc-input nc-num-l" list="nc-timbrados" inputMode="numeric" maxLength={8} value={f.timbrado}
                      onChange={(e) => set({ timbrado: e.target.value.replace(/\D/g, '') })} />
                    <datalist id="nc-timbrados">{timbradosPersona.map((tm) => <option key={tm} value={tm} />)}</datalist>
                  </>
                )}
                <label className="nc-label" htmlFor="nc-145">Formulario 145 :</label>
                <select id="nc-145" className="nc-input nc-select" value={f.formulario145} onChange={(e) => set({ formulario145: e.target.value })}>
                  {FORM_145.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>

                <label className="nc-label" htmlFor="nc-moneda">Moneda :</label>
                <select id="nc-moneda" className="nc-input nc-select" value={f.moneda}
                  onChange={(e) => { const m = e.target.value; set({ moneda: m, cambio: m === 'PYG' ? 1 : '' }); setCotizando(''); if (m !== 'PYG') traerCotizacion(m) }}>
                  {MONEDAS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
                <label className="nc-label" htmlFor="nc-tc">Tasa de Cambio :</label>
                <div className="nc-tc">
                  <input id="nc-tc" className={`nc-input nc-num ${f.moneda === 'PYG' ? 'nc-input--ro' : ''}`} inputMode="decimal" readOnly={f.moneda === 'PYG'}
                    value={f.moneda === 'PYG' ? 1 : f.cambio} onChange={(e) => set({ cambio: e.target.value.replace(',', '.') })} />
                  {cotizando && <small>{cotizando}</small>}
                </div>

                {campoMonto('Grav. 10%', enMoneda(s.g10), 'nc-g10')}
                {campoMonto('I.V.A. 10%', enMoneda(iva10m), 'nc-iva10')}
                {campoMonto('Grav. 05%', enMoneda(s.g5), 'nc-g5')}
                {campoMonto('I.V.A. 05%', enMoneda(iva5m), 'nc-iva5')}
                {campoMonto('Exentas', enMoneda(s.ex), 'nc-ex')}
                {campoMonto('Total I.V.A.', enMoneda(iva10m + iva5m), 'nc-iva')}
                {campoMonto('Valor Bruto', enMoneda(bruto), 'nc-bruto')}
                <span /><span />
                {campoMonto('Redondeo', 0, 'nc-red')}
                {campoMonto('Valor Total', enMoneda(bruto), 'nc-total')}
              </div>
              {f.moneda !== 'PYG' && tc > 0 && bruto > 0 && (
                <p className="nc-equiv">Equivale a ₲ {gs(x.total)} (IVA ₲ {gs(x.iva10 + x.iva5)})</p>
              )}

              <div className="nc-fila nc-fila--obs">
                <label className="nc-label" htmlFor="nc-obs">Observación :</label>
                <input id="nc-obs" className="nc-input" value={f.concepto} onChange={(e) => set({ concepto: e.target.value })} />
              </div>
            </div>
          )}

          {tab === 'facturas' && (
            <div className="nc-facturas">
              <p className="nc-nota">
                {f.personaRuc
                  ? `Facturas de ${f.personaNombre || f.personaRuc} que afecta esta nota. Al elegir una se copian sus importes; ajustalos a lo que se devuelve o descuenta.`
                  : `Primero indicá el ${quien.toLowerCase()} en el encabezado para ver sus facturas.`}
              </p>
              <table className="nc-tabla nc-tabla--edit">
                <thead>
                  <tr><th>Factura</th><th className="nc-der">Grav. 10%</th><th className="nc-der">Grav. 5%</th><th className="nc-der">Exentas</th><th className="nc-der">Total</th><th /></tr>
                </thead>
                <tbody>
                  {f.facturas.map((r, i) => (
                    <tr key={r.key}>
                      <td>
                        <input className="nc-input nc-num-l" list="nc-lista-facturas" value={r.factura} placeholder="001-001-0000001" aria-label={`Factura ${i + 1}`}
                          onChange={(e) => elegirFactura(r.key, e.target.value)} onBlur={() => setFila(r.key, { factura: formatearNumero(r.factura) })} />
                      </td>
                      <td><MontoInput value={r.g10} onChange={(v) => setFila(r.key, { g10: v })} aria-label={`Gravada 10% factura ${i + 1}`} /></td>
                      <td><MontoInput value={r.g5} onChange={(v) => setFila(r.key, { g5: v })} aria-label={`Gravada 5% factura ${i + 1}`} /></td>
                      <td><MontoInput value={r.ex} onChange={(v) => setFila(r.key, { ex: v })} aria-label={`Exentas factura ${i + 1}`} /></td>
                      <td className="nc-der nc-mono">{gs(n0(r.g10) + n0(r.g5) + n0(r.ex))}</td>
                      <td>
                        <button type="button" className="ct-icon ct-icon--del" disabled={f.facturas.length === 1} onClick={() => set({ facturas: f.facturas.filter((y) => y.key !== r.key) })} aria-label={`Quitar factura ${i + 1}`}><Trash2 size={14} strokeWidth={1.8} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td><button type="button" className="ct-link" onClick={() => set({ facturas: [...f.facturas, filaVacia()] })}><Plus size={13} strokeWidth={2} /> Agregar factura</button></td>
                    <td className="nc-der nc-mono">{gs(s.g10)}</td><td className="nc-der nc-mono">{gs(s.g5)}</td><td className="nc-der nc-mono">{gs(s.ex)}</td>
                    <td className="nc-der nc-mono">{gs(bruto)}</td><td />
                  </tr>
                </tfoot>
              </table>
              <datalist id="nc-lista-facturas">
                {facturasPersona.map((d) => <option key={d.id} value={d.numero}>{fechaCorta(d.fecha)} · ₲ {gs(totalesDe(d).total)}</option>)}
              </datalist>
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

export default function NotasCredito({ tipo }) {
  const { comprobantes, ejercicio, contribuyente } = useContable()
  const esCompra = TIPOS[tipo].lado === 'compra'
  const [mes, setMes] = useState(() => (String(new Date().getFullYear()) === String(ejercicio) ? String(new Date().getMonth() + 1).padStart(2, '0') : '01'))
  const [busca, setBusca] = useState('')
  const [orden, setOrden] = useState({ campo: 'fecha', dir: -1 })
  const [selId, setSelId] = useState(null)
  const [modal, setModal] = useState(null)
  const [aviso, setAviso] = useState('')
  const buscaRef = useRef(null)

  const COLUMNAS = [
    { id: 'numero', label: 'Numero', valor: (d) => d.numero },
    { id: 'timbrado', label: 'Timbrado', valor: (d) => d.timbrado },
    { id: 'tt', label: 'Tipo', valor: (d) => TIPOS_TIMB.find((o) => o.id === d.tipoTimbrado)?.corto || '' },
    { id: 'fecha', label: 'Fecha', valor: (d) => d.fecha },
    { id: 'ruc', label: 'Ruc', valor: (d) => d.personaRuc },
    { id: 'nombre', label: esCompra ? 'Proveedor' : 'Cliente', valor: (d) => d.personaNombre, ancho: true },
    { id: 'moneda', label: 'Mon.', valor: (d) => MONEDAS.find((m) => m.id === (d.moneda || 'PYG'))?.corto },
    { id: 'tnc', label: 'Tipo', valor: (d) => TIPOS_NC.find((o) => o.id === d.tipoNC)?.label || 'Devolución' },
    { id: 'total', label: 'Total', valor: (d) => totalesDe(d).total, num: true }
  ]

  const q = normalizar(busca)
  const filas = comprobantes.items
    .filter((d) => d.tipo === tipo && String(d.fecha || '').startsWith(`${ejercicio}-${mes}`))
    .filter((d) => !q || normalizar(`${d.numero} ${d.timbrado} ${d.personaRuc} ${d.personaNombre} ${d.concepto || ''} ${d.cdc || ''} ${d.asociado || ''}`).includes(q))
  const col = COLUMNAS.find((c) => c.id === orden.campo)
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
    if (window.confirm(`¿Eliminar la nota de crédito ${sel.numero} de ${sel.personaNombre}? También se quita su asiento del Diario y del Mayor.`)) {
      comprobantes.eliminar(sel.id)
      setSelId(null)
      setAviso('Nota de crédito eliminada.')
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
        if (n) { setSelId(n.id); document.getElementById(`nc-row-${n.id}`)?.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

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
              {COLUMNAS.map((c) => (
                <th key={c.id} className={c.ancho ? 'nc-ancho' : ''} aria-sort={orden.campo === c.id ? (orden.dir > 0 ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" onClick={() => setOrden({ campo: c.id, dir: orden.campo === c.id ? -orden.dir : 1 })}>
                    <span>{c.label}</span>
                    <span className={`nc-sort ${orden.campo === c.id ? 'is-on' : ''}`} aria-hidden="true">
                      {orden.campo === c.id ? (orden.dir > 0 ? <ChevronUp size={12} strokeWidth={3} /> : <ChevronDown size={12} strokeWidth={3} />) : <><ChevronUp size={10} strokeWidth={3} /><ChevronDown size={10} strokeWidth={3} /></>}
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
              <tr key={d.id} id={`nc-row-${d.id}`} className={selId === d.id ? 'is-sel' : ''} aria-selected={selId === d.id} tabIndex={0}
                onFocus={() => setSelId(d.id)} onClick={() => setSelId(d.id)} onDoubleClick={() => modificar(d)}>
                <td className="nc-mono">{d.numero}</td>
                <td className="nc-mono">{d.timbrado}</td>
                <td>{TIPOS_TIMB.find((o) => o.id === d.tipoTimbrado)?.corto || ''}</td>
                <td className="nc-mono">{fechaCorta(d.fecha)}</td>
                <td className="nc-mono">{d.personaRuc}</td>
                <td>{d.personaNombre}</td>
                <td>{MONEDAS.find((m) => m.id === (d.moneda || 'PYG'))?.corto}</td>
                <td>{TIPOS_NC.find((o) => o.id === d.tipoNC)?.label || 'Devolución'}</td>
                <td className="nc-der nc-mono">{gs(totalesDe(d).total)}</td>
              </tr>
            ))}
          </tbody>
          {ordenadas.length > 0 && (
            <tfoot>
              <tr><td colSpan={8}>{ordenadas.length} {ordenadas.length === 1 ? 'nota' : 'notas'} · {contribuyente.razonSocial}</td><td className="nc-der nc-mono">{gs(ordenadas.reduce((sm, d) => sm + totalesDe(d).total, 0))}</td></tr>
            </tfoot>
          )}
        </table>
      </div>

      {modal && <ModalNotaCredito key={modal.id || 'nuevo'} inicial={modal} mesRef={mes} onCerrar={(ok) => { if (ok) setAviso(modal.id ? 'Nota de crédito modificada.' : 'Nota de crédito registrada.'); setModal(null) }} />}
    </div>
  )
}
