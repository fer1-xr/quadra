import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import axios from 'axios'
import {
  Plus, Pencil, Trash2, Printer, X, Check, Search, ChevronUp, ChevronDown, AlertTriangle, Download, Ban, Wand2, CheckSquare, Clock, UserRound
} from 'lucide-react'
import PageHead from '../PageHead'
import { useContable } from './ContableContext'
import { MontoInput, CuentaSelect, AsientoPreview, exportarExcel, esDisponibilidad } from './ui'
import { Buscador } from './AsientosManuales'
import { API_BASE_URL, authHeaders } from '../../services/api'
import { authService } from '../../services/authService'
import {
  TIPOS, CTA, lineasDe, armarDiario, gs, fechaCorta, hoyISO, n0, MESES, analizarRuc, dvRuc, timbradoValido, timbradoVigente,
  siguienteNumero, fechaRapida, facturasPendientes, enLetras, saldoPersona
} from '../../services/contabilidad'
import '../../styles/AsientosManuales.css'
import '../../styles/Recibos.css'

/* ── catálogos ──────────────────────────────────────────────── */

const MONEDAS = [
  { id: 'PYG', label: 'GUARANÍ', corto: 'GS' },
  { id: 'USD', label: 'DÓLAR', corto: 'USD' },
  { id: 'BRL', label: 'REAL', corto: 'BRL' },
  { id: 'ARS', label: 'PESO ARGENTINO', corto: 'ARS' },
  { id: 'EUR', label: 'EURO', corto: 'EUR' }
]
const monedaCorta = (id) => MONEDAS.find((m) => m.id === (id || 'PYG'))?.corto || 'GS'

const normalizar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const mesActual = () => String(new Date().getMonth() + 1).padStart(2, '0')
const usuarioActual = () => {
  const u = authService.getUser?.() || null
  return u ? { nombre: u.name || u.email, email: u.email || '' } : { nombre: 'Usuario', email: '' }
}
const fechaHora = (iso) => (iso ? new Date(iso).toLocaleString('es-PY', { dateStyle: 'long', timeStyle: 'short' }) : '')
const dias = (iso) => (iso ? Math.max(0, Math.round((Date.now() - new Date(`${iso}T00:00:00`).getTime()) / 864e5)) : 0)
const pad = (v, n) => (String(v || '').replace(/\D/g, '') ? String(v).replace(/\D/g, '').padStart(n, '0').slice(-n) : '')

const COPY = {
  'recibo-cobro': {
    titulo: 'Recibos de cobro', uno: 'recibo de cobro', quien: 'Cliente', medio: 'Cobrado en', contra: CTA.DEUDORES,
    vacioFacturas: 'no tiene facturas a crédito pendientes de cobro.'
  },
  'recibo-pago': {
    titulo: 'Recibos de pago', uno: 'recibo de pago', quien: 'Proveedor', medio: 'Pagado desde', contra: CTA.PROVEEDORES,
    vacioFacturas: 'no tiene facturas a crédito pendientes de pago.'
  }
}

/* ── formulario ↔ comprobante ───────────────────────────────── */

const formVacio = (tipo, fecha) => ({
  tipo,
  fecha,
  fechaTxt: fecha ? fechaCorta(fecha) : '',
  timbrado: '',
  est: '',
  pto: '',
  nro: '',
  personaRuc: '',
  personaNombre: '',
  moneda: 'PYG',
  cambio: 1,
  total: '',
  anulado: false,
  concepto: '',
  cuentaPago: CTA.CAJA,
  cuenta: COPY[tipo].contra,
  aplic: {} // facturaId → importe en guaraníes
})

const formDesdeDoc = (d) => {
  const [est = '', pto = '', nro = ''] = String(d.numero || '').split('-')
  return {
    ...formVacio(d.tipo, d.fecha),
    ...d,
    est,
    pto,
    nro,
    moneda: d.moneda || 'PYG',
    cambio: d.cambio || 1,
    total: d.montoMoneda ?? d.monto,
    aplic: Object.fromEntries((d.aplicaciones || []).map((a) => [a.facturaId, n0(a.monto)]))
  }
}

const numeroDe = (f) => (f.est || f.pto || f.nro ? `${pad(f.est, 3)}-${pad(f.pto, 3)}-${pad(f.nro, 7)}` : '')

/* ── ventana de carga ───────────────────────────────────────── */

function ModalRecibo({ inicial, onCerrar, mesRef }) {
  const { comprobantes, timbrados, personas, ejercicio, nombreCuenta } = useContable()
  const [f, setF] = useState(inicial)
  const [tab, setTab] = useState('encabezado')
  const [errores, setErrores] = useState([])
  const [cotizando, setCotizando] = useState('')
  const personaRef = useRef(null)
  const nombreRef = useRef(null)
  const totalRef = useRef(null)
  // después de elegir el cliente, el cursor sigue al próximo dato
  const enfocar = (ref) => setTimeout(() => ref.current?.focus(), 0)

  const t = TIPOS[f.tipo]
  const c = COPY[f.tipo]
  const esCobro = f.tipo === 'recibo-cobro'
  const set = (x) => { setF((p) => ({ ...p, ...x })); setErrores([]) }

  const otros = useMemo(() => comprobantes.items.filter((d) => d.id !== f.id), [comprobantes.items, f.id])
  const tc = f.moneda === 'PYG' ? 1 : Number(f.cambio) || 0
  const montoGs = Math.round(n0Dec(f.total) * tc)
  const pendientes = useMemo(() => facturasPendientes(comprobantes.items, f.personaRuc, t.lado, f.id), [comprobantes.items, f.personaRuc, t.lado, f.id])
  const aplicado = pendientes.reduce((s, x) => s + n0(f.aplic[x.id]), 0)
  const saldoTotal = pendientes.reduce((s, x) => s + x.saldo, 0)
  const numero = numeroDe(f)

  const doc = {
    ...f,
    numero,
    monto: montoGs,
    montoMoneda: f.moneda === 'PYG' ? null : n0Dec(f.total)
  }
  const lineas = lineasDe(doc)

  /* persona */
  const opcionesPersona = useMemo(() => {
    const saldoDe = (ruc) => saldoPersona(otros, ruc, t.lado)
    return personas.items
      .map((p) => ({ p, saldo: saldoDe(p.ruc) }))
      .sort((a, b) => b.saldo - a.saldo || a.p.nombre.localeCompare(b.p.nombre))
      .map(({ p, saldo }) => ({
        value: p.ruc, code: p.ruc, text: p.nombre, label: `${p.ruc} · ${p.nombre}`, search: `${p.ruc} ${p.nombre}`,
        extra: saldo > 0 ? `${esCobro ? 'Debe' : 'Le debés'} ₲ ${gs(saldo)}` : ''
      }))
  }, [personas.items, otros, t.lado, esCobro])

  const elegirPersona = (ruc) => {
    const p = personas.items.find((y) => y.ruc === ruc)
    set({ personaRuc: ruc, personaNombre: p?.nombre || '', aplic: {} })
    if (ruc) enfocar(p ? totalRef : nombreRef)
  }
  // RUC escrito a mano que no está en el catastro: se calcula el dígito verificador
  const escribirRuc = (txt) => {
    const s = String(txt || '').trim()
    if (/^\d{3,9}-\d$/.test(s)) { if (s !== f.personaRuc) elegirPersona(s); return }
    if (/^\d{3,9}$/.test(s)) elegirPersona(`${s}-${dvRuc(s)}`)
  }
  const conocida = personas.items.find((p) => p.ruc === f.personaRuc)

  /* talonario (timbrados propios de recibos) */
  const misTimbrados = timbrados.items.filter((m) => m.tipo === 'recibo')
  const elegirTalonario = (num) => {
    const tim = misTimbrados.find((m) => m.numero === num)
    if (!tim) { set({ timbrado: num }); return }
    const [est, pto, nro] = siguienteNumero(tim, otros).split('-')
    set({ timbrado: num, ...(f.id ? {} : { est, pto, nro }) })
  }
  useEffect(() => {
    if (!esCobro || f.id || f.timbrado) return
    const vig = misTimbrados.find((m) => timbradoVigente(m, f.fecha || hoyISO())) || misTimbrados[0]
    if (vig) elegirTalonario(vig.numero)
    personaRef.current?.focus()
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
        set({ cambio: esCobro ? r.data.data.comprador : r.data.data.vendedor })
        setCotizando(`DNIT ${esCobro ? 'comprador' : 'vendedor'} del ${fechaCorta(r.data.data.fecha)}`)
      } else setCotizando(r.data?.message || 'Sin cotización')
    } catch (err) {
      setCotizando(err.response?.data?.message || 'No se pudo consultar la DNIT; cargala a mano.')
    }
  }

  /* facturas: al marcar se aplica el saldo y el total se arma solo */
  const totalDesde = (aplic) => {
    const gsSum = pendientes.reduce((s, x) => s + n0(aplic[x.id]), 0)
    if (!gsSum) return f.total
    return f.moneda === 'PYG' ? gsSum : tc ? Math.round((gsSum / tc) * 100) / 100 : f.total
  }
  const setAplic = (aplic) => set({ aplic, total: totalDesde(aplic) })
  const marcar = (fac, on) => {
    const a = { ...f.aplic }
    if (on) a[fac.id] = fac.saldo
    else delete a[fac.id]
    setAplic(a)
  }
  const cobrarTodo = () => setAplic(Object.fromEntries(pendientes.map((x) => [x.id, x.saldo])))
  // reparte el total escrito entre las facturas más antiguas
  const repartir = () => {
    let resto = montoGs
    const a = {}
    pendientes.forEach((x) => {
      if (resto <= 0) return
      const m = Math.min(x.saldo, resto)
      a[x.id] = m
      resto -= m
    })
    set({ aplic: a })
  }

  const guardar = () => {
    const errs = []
    if (!f.fecha) errs.push('Indicá la fecha (podés escribir solo el día, p. ej. «15»).')
    else if (!f.fecha.startsWith(String(ejercicio))) errs.push(`La fecha tiene que estar dentro del ejercicio ${ejercicio}.`)
    if (!/^\d{3}-\d{3}-\d{7}$/.test(numero) || /^0+$/.test(f.nro.replace(/\D/g, ''))) errs.push('Completá el número del recibo (001-001-0000001).')
    if (f.timbrado && !timbradoValido(f.timbrado)) errs.push('El timbrado tiene 8 dígitos.')
    if (!analizarRuc(f.personaRuc).formato) errs.push(`Elegí el ${c.quien.toLowerCase()} o escribí su RUC (80012345-6).`)
    if (!String(f.personaNombre || '').trim()) errs.push(`Escribí el nombre o razón social del ${c.quien.toLowerCase()}.`)
    if (f.moneda !== 'PYG' && !(tc > 0)) errs.push('Indicá la tasa de cambio.')
    if (!f.anulado && !montoGs) errs.push('Indicá el valor total o marcá facturas en la pestaña Facturas.')
    if (!f.anulado && aplicado > montoGs) errs.push(`Las facturas aplicadas suman ₲ ${gs(aplicado)}, más que el recibo (₲ ${gs(montoGs)}).`)
    if (!f.anulado && !f.cuentaPago) errs.push(`Elegí ${c.medio.toLowerCase()} (caja o banco).`)
    const repetido = otros.find((d) => d.tipo === f.tipo && d.numero === numero && (esCobro || d.personaRuc === f.personaRuc))
    if (repetido) errs.push(`El recibo ${numero} ya está cargado (${fechaCorta(repetido.fecha)} · ${repetido.personaNombre}).`)
    if (errs.length) { setErrores(errs); setTab('encabezado'); return }

    const yo = usuarioActual()
    const aplicaciones = f.anulado ? [] : pendientes
      .filter((x) => n0(f.aplic[x.id]))
      .map((x) => ({ facturaId: x.id, numero: x.numero, fecha: x.fecha, monto: n0(f.aplic[x.id]) }))
    personas.asegurar(f.personaRuc, f.personaNombre.trim(), esCobro ? 'cliente' : 'proveedor')
    const { fechaTxt, est, pto, nro, aplic, total, ...resto } = f
    comprobantes.guardar({
      ...resto,
      numero,
      personaNombre: f.personaNombre.trim(),
      monto: f.anulado ? 0 : montoGs,
      montoMoneda: f.moneda === 'PYG' ? null : n0Dec(f.total),
      cambio: tc,
      aplicaciones,
      facturaRef: aplicaciones.map((a) => a.numero).join(', '),
      creadoPor: f.creadoPor || yo,
      editadoPor: f.id ? yo : null,
      editadoEn: f.id ? new Date().toISOString() : null
    })
    onCerrar(true)
  }

  // Alt+E/F/A/I pestañas, Alt+G guardar, Alt+T marcar todas, Esc cancelar
  useEffect(() => {
    const onKey = (e) => {
      const k = e.key.toLowerCase()
      const tabs = { e: 'encabezado', f: 'facturas', a: 'asiento', i: 'info' }
      if (e.altKey && tabs[k]) { e.preventDefault(); setTab(tabs[k]) }
      if (e.altKey && k === 'g') { e.preventDefault(); guardar() }
      if (e.altKey && k === 't' && pendientes.length) { e.preventDefault(); cobrarTodo(); setTab('facturas') }
      if (k === 'escape' && !e.defaultPrevented) onCerrar(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  const nAplicadas = Object.values(f.aplic).filter((v) => n0(v)).length
  const TABS = [
    { id: 'encabezado', label: 'Encabezado', tecla: 'E' },
    { id: 'facturas', label: 'Facturas', tecla: 'F', n: f.personaRuc ? `${nAplicadas}/${pendientes.length}` : undefined },
    { id: 'asiento', label: 'Asiento', tecla: 'A' },
    { id: 'info', label: 'Informaciones', tecla: 'I' }
  ]
  const conTecla = (x) => {
    const i = x.label.indexOf(x.tecla)
    return <span>{x.label.slice(0, i)}<u>{x.tecla}</u>{x.label.slice(i + 1)}</span>
  }

  const nroAsiento = useMemo(() => (f.id ? armarDiario(comprobantes.items, ejercicio).find((a) => a.doc.id === f.id)?.numero : null), [comprobantes.items, ejercicio, f.id])
  const nroRef = useRef(null)
  const ptoRef = useRef(null)

  return createPortal(
    <div className="q-content am-overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar(false) }}>
      <div className="am-modal rc-modal" role="dialog" aria-modal="true" aria-labelledby="rc-titulo">
        <header className="am-modal__head">
          <h2 id="rc-titulo" className="am-modal__title">{f.id ? 'Modificar' : 'Agregar nuevo'} {c.uno}</h2>
          <button type="button" className="q-ghost-icon" onClick={() => onCerrar(false)} aria-label="Cerrar"><X size={18} strokeWidth={1.7} /></button>
        </header>

        <div className="am-tabs" role="tablist">
          {TABS.map((x) => (
            <button key={x.id} type="button" role="tab" aria-selected={tab === x.id} className={tab === x.id ? 'is-on' : ''} onClick={() => setTab(x.id)}>
              {conTecla(x)}
              {x.n !== undefined && <span className="am-tabs__n">{x.n}</span>}
            </button>
          ))}
        </div>

        {/* resumen siempre visible */}
        <div className={`rc-resumen ${f.anulado ? 'is-anulado' : ''}`} aria-live="polite">
          <div><span>Recibo</span><strong className="ct-num">{f.moneda === 'PYG' ? '₲' : monedaCorta(f.moneda)} {fmtMoneda(f.total, f.moneda)}</strong></div>
          <div><span>Aplicado a facturas</span><strong className="ct-num">₲ {gs(aplicado)}</strong></div>
          <div><span>{f.personaRuc ? 'Saldo pendiente' : 'Saldo'}</span><strong className="ct-num">₲ {gs(saldoTotal)}</strong></div>
          <p className="rc-resumen__estado">
            {f.anulado ? <><Ban size={14} strokeWidth={2} /> Anulado: no genera asiento</>
              : !montoGs ? 'Sin importe'
                : aplicado === montoGs ? <><Check size={14} strokeWidth={2.4} /> Todo aplicado</>
                  : aplicado ? `₲ ${gs(montoGs - aplicado)} a cuenta` : 'A cuenta'}
          </p>
        </div>

        <div className="am-modal__body rc-body">
          {tab === 'encabezado' && (
            <div className="rc-form">
              <label className="rc-label" htmlFor="rc-persona">{c.quien} :</label>
              <div className="rc-persona">
                <Buscador id="rc-persona" inputRef={personaRef} items={opcionesPersona} valor={f.personaRuc} onElegir={(v) => (v ? elegirPersona(v) : set({ personaRuc: '', personaNombre: '', aplic: {} }))}
                  onEnterVacio={escribirRuc} placeholder="RUC o nombre (Enter para RUC nuevo)" ariaLabel={c.quien}
                  onTexto={(txt) => { if (/^\d{3,9}-\d$/.test(txt.trim())) escribirRuc(txt) }} />
                {f.personaRuc && !conocida && (
                  <input ref={nombreRef} className="q-input" value={f.personaNombre} placeholder="Razón social (RUC nuevo)" title="El RUC nuevo se agrega a Personas al guardar" aria-label="Nombre o razón social"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); totalRef.current?.focus() } }}
                    onChange={(e) => set({ personaNombre: e.target.value })} />
                )}
              </div>
              {f.personaRuc && (
                <div className="rc-fila-full rc-pendiente">
                  {pendientes.length ? (
                    <>
                      <span><strong>{pendientes.length}</strong> {pendientes.length === 1 ? 'factura pendiente' : 'facturas pendientes'} · <strong className="ct-num">₲ {gs(saldoTotal)}</strong>
                        {pendientes[0] && <> · la más antigua tiene {dias(pendientes[0].fecha)} días</>}</span>
                      <button type="button" className="q-btn q-btn--line rc-mini" onClick={() => { cobrarTodo(); setTab('facturas') }} title="Alt+T">
                        <CheckSquare size={14} strokeWidth={1.9} /> {esCobro ? 'Cobrar' : 'Pagar'} todo
                      </button>
                      <button type="button" className="ct-link" onClick={() => setTab('facturas')}>Elegir facturas</button>
                    </>
                  ) : <span>{f.personaNombre || f.personaRuc} {c.vacioFacturas} El recibo queda a cuenta.</span>}
                </div>
              )}

              <label className="rc-label" htmlFor="rc-tal">{esCobro ? 'Talonario' : 'Timbrado'} :</label>
              {esCobro && misTimbrados.length > 0 ? (
                <select id="rc-tal" className="q-input ct-select" value={f.timbrado} onChange={(e) => elegirTalonario(e.target.value)}>
                  <option value="">Sin talonario</option>
                  {misTimbrados.map((m) => <option key={m.id} value={m.numero}>{m.numero} · {m.establecimiento}-{m.punto}{timbradoVigente(m, f.fecha || hoyISO()) ? '' : ' (vencido)'}</option>)}
                </select>
              ) : (
                <input id="rc-tal" className="q-input q-input--num" inputMode="numeric" maxLength={8} value={f.timbrado} placeholder={esCobro ? 'Cargá tus timbrados de recibo en Catastros' : 'Opcional · 8 dígitos'}
                  onChange={(e) => set({ timbrado: e.target.value.replace(/\D/g, '') })} />
              )}
              <label className="rc-label" htmlFor="rc-est">Nro. :</label>
              <div className="rc-nro">
                <input id="rc-est" className="q-input q-input--num" inputMode="numeric" maxLength={3} value={f.est} placeholder="001" aria-label="Establecimiento"
                  onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); set({ est: v }); if (v.length === 3) ptoRef.current?.focus() }} onBlur={() => set({ est: pad(f.est, 3) })} />
                <input ref={ptoRef} className="q-input q-input--num" inputMode="numeric" maxLength={3} value={f.pto} placeholder="001" aria-label="Punto de expedición"
                  onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); set({ pto: v }); if (v.length === 3) nroRef.current?.focus() }} onBlur={() => set({ pto: pad(f.pto, 3) })} />
                <input ref={nroRef} className="q-input q-input--num" inputMode="numeric" maxLength={7} value={f.nro} placeholder="0000001" aria-label="Número"
                  onChange={(e) => set({ nro: e.target.value.replace(/\D/g, '') })} onBlur={() => set({ nro: pad(f.nro, 7) })} />
              </div>
              <label className="rc-anulado">
                <span>Anulado :</span>
                <input type="checkbox" checked={!!f.anulado} onChange={(e) => set({ anulado: e.target.checked })} />
              </label>

              <label className="rc-label" htmlFor="rc-fecha">Fecha :</label>
              <input id="rc-fecha" className="q-input q-input--num rc-fecha" value={f.fechaTxt} placeholder="dd/mm/aaaa"
                onChange={(e) => set({ fechaTxt: e.target.value })} onBlur={(e) => fijarFecha(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); fijarFecha(e.currentTarget.value) } }} title="Podés escribir solo el día: 15 → 15 del mes del período" />
              <label className="rc-label" htmlFor="rc-mon">Moneda :</label>
              <select id="rc-mon" className="q-input ct-select" value={f.moneda}
                onChange={(e) => { const m = e.target.value; set({ moneda: m, cambio: m === 'PYG' ? 1 : '', aplic: {}, total: '' }); setCotizando(''); if (m !== 'PYG') traerCotizacion(m) }}>
                {MONEDAS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
              <label className="rc-label" htmlFor="rc-tc">Tasa de Cambio :</label>
              <div className="rc-tc">
                <input id="rc-tc" className="q-input q-input--num" inputMode="decimal" readOnly={f.moneda === 'PYG'} tabIndex={f.moneda === 'PYG' ? -1 : 0}
                  value={f.moneda === 'PYG' ? 1 : f.cambio} onChange={(e) => set({ cambio: e.target.value.replace(',', '.') })} />
                {cotizando && <small className="ct-hint">{cotizando}</small>}
              </div>

              <label className="rc-label" htmlFor="rc-total">Valor Total :</label>
              <div className="rc-total">
                {f.moneda === 'PYG'
                  ? <MontoInput id="rc-total" ref={totalRef} value={f.total} onChange={(v) => set({ total: v })} />
                  : <input id="rc-total" ref={totalRef} className="q-input q-input--num ct-monto" inputMode="decimal" value={f.total} placeholder="0,00" onChange={(e) => set({ total: e.target.value.replace(/[^\d.,]/g, '').replace(',', '.') })} />}
                {f.moneda !== 'PYG' && montoGs > 0 && <small className="ct-hint ct-num">Equivale a ₲ {gs(montoGs)}</small>}
                {montoGs > 0 && !nAplicadas && pendientes.length > 0 && (
                  <button type="button" className="ct-link rc-repartir" onClick={() => { repartir(); setTab('facturas') }}>
                    <Wand2 size={13} strokeWidth={1.9} /> Repartir entre las facturas más antiguas
                  </button>
                )}
              </div>
              <label className="rc-label" htmlFor="rc-pago">{c.medio} :</label>
              <CuentaSelect id="rc-pago" value={f.cuentaPago} onChange={(v) => set({ cuentaPago: v })} filtro={esDisponibilidad} />

              <label className="rc-label" htmlFor="rc-obs">Observación :</label>
              <textarea id="rc-obs" className="q-input rc-fila-full rc-obs" rows={2} value={f.concepto} onChange={(e) => set({ concepto: e.target.value })} />
            </div>
          )}

          {tab === 'facturas' && (
            <div className="rc-facturas">
              {!f.personaRuc ? (
                <p className="rc-nota">Primero elegí el {c.quien.toLowerCase()} en el encabezado: acá aparecen sus facturas a crédito pendientes.</p>
              ) : !pendientes.length ? (
                <p className="rc-nota">{f.personaNombre || f.personaRuc} {c.vacioFacturas}</p>
              ) : (
                <>
                  <div className="rc-facturas__barra">
                    <p className="rc-nota">Marcá las facturas que {esCobro ? 'cobra' : 'paga'} este recibo. Se aplica el saldo completo; podés cambiarlo para un pago parcial. El valor total se arma solo.</p>
                    <div className="rc-facturas__acciones">
                      <button type="button" className="q-btn q-btn--line rc-mini" onClick={cobrarTodo}><CheckSquare size={14} strokeWidth={1.9} /> Marcar todas</button>
                      {nAplicadas > 0 && <button type="button" className="q-btn q-btn--line rc-mini" onClick={() => setAplic({})}>Desmarcar</button>}
                    </div>
                  </div>
                  <div className="ct-tabla-wrap rc-facturas__wrap">
                    <table className="q-table ct-tabla rc-tabla">
                      <thead>
                        <tr>
                          <th className="rc-col-chk"><span className="sr-only">Aplicar</span></th>
                          <th>Fecha</th><th>Número</th><th className="ct-der">Antigüedad</th>
                          <th className="ct-der">Total</th><th className="ct-der">Saldo</th><th className="ct-der rc-col-aplicar">A aplicar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendientes.map((x) => {
                          const on = n0(f.aplic[x.id]) > 0
                          const d = dias(x.fecha)
                          return (
                            <tr key={x.id} className={on ? 'is-on' : ''}>
                              <td className="rc-col-chk"><input type="checkbox" checked={on} onChange={(e) => marcar(x, e.target.checked)} aria-label={`Aplicar factura ${x.numero}`} /></td>
                              <td className="ct-mono">{fechaCorta(x.fecha)}</td>
                              <td className="ct-mono">{x.numero}{x.tipo.startsWith('nd') && <span className="rc-tag">N. débito</span>}</td>
                              <td className="ct-num"><span className={`rc-dias ${d > 90 ? 'is-90' : d > 60 ? 'is-60' : d > 30 ? 'is-30' : ''}`}>{d} d</span></td>
                              <td className="ct-num">{gs(x.total)}</td>
                              <td className="ct-num ct-strong">{gs(x.saldo)}</td>
                              <td className="rc-col-aplicar">
                                <MontoInput value={f.aplic[x.id] || ''} aria-label={`Importe aplicado a ${x.numero}`}
                                  onChange={(v) => { const a = { ...f.aplic }; if (n0(v)) a[x.id] = Math.min(n0(v), x.saldo); else delete a[x.id]; setAplic(a) }} />
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="ct-total">
                          <td colSpan={5}>{nAplicadas} de {pendientes.length} aplicadas</td>
                          <td className="ct-num">{gs(saldoTotal)}</td>
                          <td className="ct-num">{gs(aplicado)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {tab === 'asiento' && (
            <div className="rc-asiento">
              <p className="rc-nota">El asiento se arma solo con el encabezado y las facturas: {esCobro ? 'entra a caja o banco y baja la cuenta del cliente' : 'baja la deuda con el proveedor y sale de caja o banco'}. Solo elegí las cuentas si no son las de siempre.</p>
              <div className="rc-asiento__cuentas">
                <div className="q-field">
                  <label className="q-label" htmlFor="rc-pago2">{c.medio}</label>
                  <CuentaSelect id="rc-pago2" value={f.cuentaPago} onChange={(v) => set({ cuentaPago: v })} filtro={esDisponibilidad} />
                </div>
                <div className="q-field">
                  <label className="q-label" htmlFor="rc-contra">Cuenta que se cancela</label>
                  <CuentaSelect id="rc-contra" value={f.cuenta} onChange={(v) => set({ cuenta: v })} />
                </div>
              </div>
              {lineas.length ? <AsientoPreview lineas={lineas} titulo={nroAsiento ? `Asiento Nº ${nroAsiento} del Libro Diario` : 'Asiento que se registrará'} />
                : <p className="rc-nota rc-nota--vacio">{f.anulado ? 'El recibo está anulado: no genera asiento.' : 'Sin importe todavía: cargá el valor total o marcá facturas.'}</p>}
            </div>
          )}

          {tab === 'info' && (
            <dl className="rc-info">
              <div>
                <dt><UserRound size={14} strokeWidth={1.9} /> Cargado por</dt>
                <dd>{f.id ? (f.creadoPor?.nombre || 'Sin registro (cargado antes de esta versión)') : usuarioActual().nombre}{(f.id ? f.creadoPor?.email : usuarioActual().email) && <small>{f.id ? f.creadoPor?.email : usuarioActual().email}</small>}</dd>
              </div>
              <div>
                <dt><Clock size={14} strokeWidth={1.9} /> Fecha y hora de carga</dt>
                <dd>{f.creadoEn ? fechaHora(f.creadoEn) : 'Se registra al guardar'}</dd>
              </div>
              <div>
                <dt><Pencil size={14} strokeWidth={1.9} /> Última modificación</dt>
                <dd>{f.editadoEn ? <>{fechaHora(f.editadoEn)}{f.editadoPor?.nombre && <small>por {f.editadoPor.nombre}</small>}</> : 'Sin modificaciones'}</dd>
              </div>
              <div>
                <dt>Asiento en el Diario</dt>
                <dd>{nroAsiento ? `Nº ${nroAsiento}` : f.anulado ? 'No genera (anulado)' : f.id ? '—' : 'Se numera al guardar'}</dd>
              </div>
              {f.id && f.aplicaciones?.length > 0 && (
                <div>
                  <dt>Facturas canceladas</dt>
                  <dd>{f.aplicaciones.map((a) => `${a.numero} (₲ ${gs(a.monto)})`).join(' · ')}</dd>
                </div>
              )}
              <p className="rc-nota">Contra: {nombreCuenta(f.cuenta)} · {c.medio}: {nombreCuenta(f.cuentaPago)}</p>
            </dl>
          )}
        </div>

        {errores.length > 0 && (
          <div className="am-error" role="alert">
            <AlertTriangle size={18} strokeWidth={2} aria-hidden="true" />
            <ul>{errores.map((e) => <li key={e}>{e}</li>)}</ul>
          </div>
        )}

        <footer className="am-modal__foot">
          <button type="button" className="q-btn q-btn--line" onClick={() => onCerrar(false)}><X size={15} strokeWidth={1.8} /> Cancelar</button>
          <button type="button" className="q-btn q-btn--primary" onClick={guardar} title="Alt+G"><Check size={15} strokeWidth={2} /> <span><u>G</u>uardar</span></button>
        </footer>
      </div>
    </div>,
    document.querySelector('.q-app') || document.body
  )
}

/** número con decimales escrito en el campo (moneda extranjera) */
function n0Dec(v) {
  const x = Number(String(v ?? '').replace(',', '.'))
  return Number.isFinite(x) ? x : 0
}
function fmtMoneda(v, moneda) {
  return moneda === 'PYG' || !moneda ? gs(v) : n0Dec(v).toLocaleString('es-PY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/* ── impresión del recibo ───────────────────────────────────── */

const escapar = (s) => String(s ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]))

const imprimirRecibo = (d, contribuyente) => {
  const esCobro = d.tipo === 'recibo-cobro'
  const mon = d.moneda && d.moneda !== 'PYG' ? d.moneda : 'PYG'
  const importe = mon === 'PYG' ? n0(d.monto) : n0Dec(d.montoMoneda)
  const nombreMon = { PYG: 'guaraníes', USD: 'dólares americanos', BRL: 'reales', ARS: 'pesos argentinos', EUR: 'euros' }[mon]
  const facturas = (d.aplicaciones || []).map((a) => `<tr><td>${escapar(a.numero)}</td><td>${fechaCorta(a.fecha)}</td><td class="n">${gs(a.monto)}</td></tr>`).join('')
  const w = window.open('', '_blank', 'width=820,height=640')
  if (!w) return false
  w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Recibo ${escapar(d.numero)}</title><style>
    body{font:13px/1.5 -apple-system,'Segoe UI',Roboto,sans-serif;color:#0b1b33;margin:32px}
    .r{border:1.5px solid #0b1b33;border-radius:10px;padding:22px 26px;max-width:720px}
    header{display:flex;justify-content:space-between;gap:20px;border-bottom:1px solid #dce5f0;padding-bottom:12px;margin-bottom:14px}
    h1{font-size:17px;margin:0} header p{margin:2px 0 0;color:#3a4a63;font-size:12px}
    .num{text-align:right} .num b{display:block;font-size:15px} .num span{font-family:ui-monospace,Consolas,monospace}
    .monto{font-size:20px;font-weight:700;font-family:ui-monospace,Consolas,monospace;border:1px solid #0b1b33;border-radius:6px;padding:4px 12px;display:inline-block}
    p.t{margin:14px 0} table{width:100%;border-collapse:collapse;margin-top:6px} td,th{padding:4px 6px;border-bottom:1px solid #dce5f0;text-align:left;font-size:12px}
    th{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#6b7a90} .n{text-align:right;font-family:ui-monospace,Consolas,monospace}
    .firma{margin-top:56px;display:flex;justify-content:flex-end} .firma div{border-top:1px solid #0b1b33;width:240px;text-align:center;padding-top:4px;font-size:12px}
    .anulado{color:#b42318;font-weight:700;letter-spacing:.2em}
  </style></head><body><div class="r">
    <header><div><h1>${escapar(esCobro ? contribuyente.razonSocial : d.personaNombre)}</h1><p>RUC ${escapar(esCobro ? contribuyente.ruc : d.personaRuc)}${d.timbrado ? ` · Timbrado ${escapar(d.timbrado)}` : ''}</p></div>
    <div class="num"><b>RECIBO ${d.anulado ? '<span class="anulado">ANULADO</span>' : ''}</b><span>Nº ${escapar(d.numero)}</span><p>${fechaCorta(d.fecha)}</p></div></header>
    <span class="monto">${mon === 'PYG' ? '₲' : escapar(mon)} ${mon === 'PYG' ? gs(importe) : importe.toLocaleString('es-PY', { minimumFractionDigits: 2 })}</span>
    <p class="t">Recibí de <b>${escapar(esCobro ? d.personaNombre : contribuyente.razonSocial)}</b> (RUC ${escapar(esCobro ? d.personaRuc : contribuyente.ruc)})
    la suma de <b>${escapar(nombreMon)} ${escapar(enLetras(Math.floor(importe)))}</b>${d.aplicaciones?.length ? ' en concepto de pago de las siguientes facturas:' : ` ${d.concepto ? `en concepto de ${escapar(d.concepto)}` : 'a cuenta'}.`}</p>
    ${facturas ? `<table><thead><tr><th>Factura</th><th>Fecha</th><th class="n">Importe ₲</th></tr></thead><tbody>${facturas}</tbody></table>` : ''}
    ${d.aplicaciones?.length && d.concepto ? `<p class="t">${escapar(d.concepto)}</p>` : ''}
    <div class="firma"><div>Firma y aclaración</div></div>
  </div><script>window.onload=()=>window.print()</script></body></html>`)
  w.document.close()
  return true
}

/* ── grilla ─────────────────────────────────────────────────── */

export default function Recibos({ tipo }) {
  const { comprobantes, ejercicio, contribuyente } = useContable()
  const c = COPY[tipo]
  const [mes, setMes] = useState(() => (String(new Date().getFullYear()) === String(ejercicio) ? mesActual() : ''))
  const [busca, setBusca] = useState('')
  const [orden, setOrden] = useState({ campo: 'numero', dir: -1 })
  const [selId, setSelId] = useState(null)
  const [modal, setModal] = useState(null)
  const [aviso, setAviso] = useState(null)
  const buscaRef = useRef(null)

  const COLUMNAS = [
    { id: 'numero', label: 'Número', valor: (d) => d.numero },
    { id: 'fecha', label: 'Fecha', valor: (d) => d.fecha },
    { id: 'persona', label: c.quien, valor: (d) => d.personaNombre, ancho: true },
    { id: 'facturas', label: 'Facturas', valor: (d) => d.facturaRef || '' },
    { id: 'moneda', label: 'Moneda', valor: (d) => monedaCorta(d.moneda) },
    { id: 'total', label: 'Total', valor: (d) => n0(d.monto), num: true }
  ]

  const q = normalizar(busca)
  const filas = comprobantes.items
    .filter((d) => d.tipo === tipo && String(d.fecha || '').startsWith(mes ? `${ejercicio}-${mes}` : String(ejercicio)))
    .filter((d) => !q || normalizar(`${d.numero} ${d.timbrado} ${d.personaRuc} ${d.personaNombre} ${d.concepto || ''} ${d.facturaRef || ''} ${d.anulado ? 'anulado' : ''}`).includes(q))
  const col = COLUMNAS.find((x) => x.id === orden.campo)
  const ordenadas = filas.slice().sort((a, b) => {
    const va = col.valor(a)
    const vb = col.valor(b)
    const v = typeof va === 'number' ? va - vb : String(va || '').localeCompare(String(vb || ''))
    return (v || (a.numero || '').localeCompare(b.numero || '')) * orden.dir
  })
  const sel = filas.find((d) => d.id === selId) || null
  const total = ordenadas.reduce((s, d) => s + (d.anulado ? 0 : n0(d.monto)), 0)

  const fechaDefecto = () => {
    const hoy = hoyISO()
    if (hoy.startsWith(String(ejercicio)) && (!mes || hoy.slice(5, 7) === mes)) return hoy
    return mes ? `${ejercicio}-${mes}-01` : ''
  }
  const nuevo = () => { setAviso(null); setModal(formVacio(tipo, fechaDefecto())) }
  const modificar = (d = sel) => { if (d) { setAviso(null); setModal(formDesdeDoc(d)) } }
  const eliminar = () => {
    if (!sel) return
    if (window.confirm(`¿Eliminar el recibo ${sel.numero} de ${sel.personaNombre}? Las facturas que cancelaba vuelven a quedar pendientes y se quita su asiento.\n\nSi el recibo físico existe, conviene marcarlo como Anulado en vez de eliminarlo.`)) {
      comprobantes.eliminar(sel.id)
      setSelId(null)
      setAviso({ tono: 'ok', texto: 'Recibo eliminado.' })
    }
  }
  const imprimir = () => {
    if (sel && !imprimirRecibo(sel, contribuyente)) setAviso({ tono: 'err', texto: 'El navegador bloqueó la ventana de impresión. Permití ventanas emergentes para Quadra.' })
  }
  const exportar = () => exportarExcel(`${c.titulo} ${contribuyente.ruc} ${ejercicio}${mes ? `-${mes}` : ''}`, c.titulo, [
    [`${c.titulo} · ${contribuyente.razonSocial}`], [],
    ['Número', 'Fecha', 'Timbrado', 'RUC', c.quien, 'Facturas', 'Moneda', 'Tasa', 'Total moneda', 'Total ₲', 'Estado', 'Cargado por'],
    ...ordenadas.map((d) => [d.numero, fechaCorta(d.fecha), d.timbrado, d.personaRuc, d.personaNombre, d.facturaRef, monedaCorta(d.moneda), Number(d.cambio) || 1,
      d.montoMoneda ?? n0(d.monto), d.anulado ? 0 : n0(d.monto), d.anulado ? 'Anulado' : '', d.creadoPor?.nombre || '']),
    ['', '', '', '', 'TOTAL', '', '', '', '', total]
  ])

  useEffect(() => {
    const onKey = (e) => {
      if (modal) return
      const k = e.key.toLowerCase()
      if (e.ctrlKey && k === 'f') { e.preventDefault(); buscaRef.current?.focus() }
      if (e.altKey && k === 'n') { e.preventDefault(); nuevo() }
      if (e.altKey && k === 'm') { e.preventDefault(); modificar() }
      if (e.altKey && k === 'e') { e.preventDefault(); eliminar() }
      if (e.altKey && k === 'p') { e.preventDefault(); imprimir() }
      const enLista = document.activeElement?.closest?.('.rc-lista')
      if (sel && k === 'enter' && enLista) { e.preventDefault(); modificar() }
      if (sel && k === 'delete' && enLista) { e.preventDefault(); eliminar() }
      if (['arrowdown', 'arrowup'].includes(k) && enLista) {
        e.preventDefault()
        const i = ordenadas.findIndex((d) => d.id === selId)
        const n = ordenadas[Math.min(Math.max(i + (k === 'arrowdown' ? 1 : -1), 0), ordenadas.length - 1)]
        if (n) { setSelId(n.id); document.getElementById(`rc-row-${n.id}`)?.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  const th = (x) => (
    <th key={x.id} className={`${x.num ? 'ct-der' : ''} ${x.ancho ? 'rc-col-ancha' : ''}`} aria-sort={orden.campo === x.id ? (orden.dir > 0 ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="am-sort" onClick={() => setOrden({ campo: x.id, dir: orden.campo === x.id ? -orden.dir : 1 })}>
        {x.label}
        {orden.campo === x.id ? (orden.dir > 0 ? <ChevronUp size={13} strokeWidth={2} /> : <ChevronDown size={13} strokeWidth={2} />) : <ChevronDown size={13} strokeWidth={2} className="am-sort__off" />}
      </button>
    </th>
  )

  return (
    <div className="q-sheet q-sheet--wide ct-sheet">
      <PageHead title={c.titulo} status={comprobantes.status} />

      <div className="am-barra">
        <div className="am-barra__acciones" role="toolbar" aria-label="Acciones sobre recibos">
          <button type="button" className="q-btn q-btn--primary" onClick={nuevo} title="Alt+N"><Plus size={16} strokeWidth={2} /> <span><u>N</u>uevo</span></button>
          <button type="button" className="q-btn q-btn--line" onClick={() => modificar()} disabled={!sel} title="Alt+M · Enter · doble clic"><Pencil size={15} strokeWidth={1.8} /> <span><u>M</u>odificar</span></button>
          <button type="button" className="q-btn q-btn--line am-btn-del" onClick={eliminar} disabled={!sel} title="Alt+E · Supr"><Trash2 size={15} strokeWidth={1.8} /> <span><u>E</u>liminar</span></button>
          <span className="am-barra__sep" aria-hidden="true" />
          <button type="button" className="q-btn q-btn--line" onClick={imprimir} disabled={!sel} title="Alt+P · imprime el recibo seleccionado con el importe en letras"><Printer size={15} strokeWidth={1.8} /> Imprimir</button>
          <button type="button" className="q-btn q-btn--line" onClick={exportar} disabled={!ordenadas.length}><Download size={15} strokeWidth={1.8} /> Excel</button>
        </div>
        <div className="am-barra__filtros">
          <label className="am-periodo">
            <span>Periodo:</span>
            <select className="q-input ct-select" value={ejercicio} disabled aria-label="Año del ejercicio"><option>{ejercicio}</option></select>
            <select className="q-input ct-select" value={mes} onChange={(e) => { setMes(e.target.value); setSelId(null) }} aria-label="Mes">
              <option value="">Todos</option>
              {MESES.map((m, i) => <option key={m} value={String(i + 1).padStart(2, '0')}>{String(i + 1).padStart(2, '0')}</option>)}
            </select>
          </label>
          <label className="am-buscar">
            <Search size={15} strokeWidth={1.8} aria-hidden="true" />
            <span className="sr-only">Buscar</span>
            <input ref={buscaRef} className="q-input" type="search" value={busca} placeholder="BUSCAR [CTRL+F]" onChange={(e) => setBusca(e.target.value)} />
          </label>
        </div>
      </div>

      {aviso && (
        <div className={`q-alert ${aviso.tono === 'ok' ? 'q-alert--ok' : ''} am-alert`} role="status">
          <p>{aviso.texto}</p>
          <button type="button" className="ct-icon" onClick={() => setAviso(null)} aria-label="Cerrar aviso"><X size={14} strokeWidth={1.8} /></button>
        </div>
      )}

      <div className="q-card ct-card">
        <div className="ct-tabla-wrap">
          <table className="q-table ct-tabla am-lista rc-lista">
            <thead><tr>{COLUMNAS.map(th)}</tr></thead>
            <tbody>
              {ordenadas.length === 0 ? (
                <tr><td colSpan={COLUMNAS.length} className="am-vacio">No se encontraron registros coincidentes</td></tr>
              ) : ordenadas.map((d) => (
                <tr key={d.id} id={`rc-row-${d.id}`} tabIndex={0} className={`am-fila ${selId === d.id ? 'is-sel' : ''} ${d.anulado ? 'is-anulado' : ''}`} aria-selected={selId === d.id}
                  onFocus={() => setSelId(d.id)} onClick={() => setSelId(d.id)} onDoubleClick={() => modificar(d)}>
                  <td className="ct-mono">{d.numero}</td>
                  <td className="ct-mono">{fechaCorta(d.fecha)}</td>
                  <td>
                    <span className="rc-persona-cel">
                      <span className="ct-mono rc-ruc">{d.personaRuc}</span> {d.personaNombre}
                      {d.anulado && <span className="rc-tag rc-tag--anulado">Anulado</span>}
                    </span>
                  </td>
                  <td className="ct-mono rc-col-fac" title={d.facturaRef}>{d.aplicaciones?.length > 1 ? `${d.aplicaciones.length} facturas` : d.facturaRef || <span className="rc-acuenta">a cuenta</span>}</td>
                  <td>{monedaCorta(d.moneda)}</td>
                  <td className="ct-num ct-strong">{d.moneda && d.moneda !== 'PYG' ? fmtMoneda(d.montoMoneda, d.moneda) : gs(d.monto)}</td>
                </tr>
              ))}
            </tbody>
            {ordenadas.length > 0 && (
              <tfoot>
                <tr className="ct-total">
                  <td colSpan={5}>{ordenadas.length} {ordenadas.length === 1 ? 'recibo' : 'recibos'} · total en guaraníes {mes ? `de ${MESES[Number(mes) - 1].toLowerCase()}` : 'del ejercicio'}</td>
                  <td className="ct-num">{gs(total)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {modal && (
        <ModalRecibo key={modal.id || 'nuevo'} inicial={modal} mesRef={mes}
          onCerrar={(ok) => { if (ok) setAviso({ tono: 'ok', texto: modal.id ? 'Recibo modificado.' : 'Recibo registrado. Su asiento ya está en el Libro Diario.' }); setModal(null) }} />
      )}
    </div>
  )
}
