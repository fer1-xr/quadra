import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import axios from 'axios'
import {
  Plus, Pencil, Trash2, Upload, Download, X, Check, Search, ChevronUp, ChevronDown, AlertTriangle,
  FileSpreadsheet, Sparkles, ScanLine, Split, Wand2, RefreshCw, Zap, BadgeCheck
} from 'lucide-react'
import PageHead from '../PageHead'
import { useContable } from './ContableContext'
import { MontoInput, AsientoPreview, exportarExcel } from './ui'
import { Buscador } from './AsientosManuales'
import { rucDnitExacto } from '../../services/rucDnit'
import { API_BASE_URL, authHeaders } from '../../services/api'
import {
  TIPOS, CTA, totalesDe, lineasDe, gs, fechaCorta, hoyISO, formatearNumero, numeroValido, timbradoValido,
  siguienteNumero, timbradoVigente, analizarRuc, n0, MESES, leerCDC, formatearCDC, fechaRapida, dvRuc
} from '../../services/contabilidad'
import { leerLibro } from '../../services/importarLibro'
import '../../styles/LibroIVA.css'

/* ── constantes ─────────────────────────────────────────────── */

const MONEDAS = [
  { id: 'PYG', label: 'Guaraní', corto: 'GS' },
  { id: 'USD', label: 'Dólar', corto: 'USD' },
  { id: 'BRL', label: 'Real', corto: 'BRL' },
  { id: 'ARS', label: 'Peso argentino', corto: 'ARS' },
  { id: 'EUR', label: 'Euro', corto: 'EUR' }
]

const TIPOS_TIMB = [
  { id: 'preimpreso', label: 'Preimpreso' },
  { id: 'electronico', label: 'Electrónico' },
  { id: 'autoimpresor', label: 'Autoimpresor' }
]

const normalizar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const mesActual = () => String(new Date().getMonth() + 1).padStart(2, '0')
const nuevaKey = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

/** lado del asiento donde va el neto (gasto o ingreso) */
const ladoNeto = (tipo) => (['compra', 'nd-compra', 'nc-venta'].includes(tipo) ? 'debe' : 'haber')

/* ── formulario ─────────────────────────────────────────────── */

const formVacio = (tipo, fecha = '') => ({
  tipo,
  cdc: '',
  tipoTimbrado: 'preimpreso',
  timbrado: '',
  numero: '',
  personaRuc: '',
  personaNombre: '',
  fecha,
  fechaTxt: fecha ? fechaCorta(fecha) : '',
  condicion: 'contado',
  cuentaPago: CTA.CAJA,
  moneda: 'PYG',
  cambio: 1,
  g10: '',
  g5: '',
  ex: '',
  cuenta: TIPOS[tipo].cuenta,
  imputaciones: [],
  asociado: '',
  concepto: ''
})

const formDesdeDoc = (d) => {
  const orig = d.montosOrig
  return {
    ...formVacio(d.tipo, d.fecha),
    ...d,
    fechaTxt: fechaCorta(d.fecha),
    moneda: d.moneda || 'PYG',
    cambio: d.cambio || 1,
    g10: orig ? orig.g10 : d.gravada10,
    g5: orig ? orig.g5 : d.gravada5,
    ex: orig ? orig.ex : d.exenta,
    imputaciones: (d.imputaciones || []).map((i) => ({ ...i, key: nuevaKey() })),
    cuentaPago: d.cuentaPago || CTA.CAJA
  }
}

/** montos del formulario convertidos a guaraníes, con la forma de un comprobante */
const aDoc = (f) => {
  const tc = f.moneda === 'PYG' ? 1 : Number(f.cambio) || 0
  const conv = (v) => Math.round(n0(v) * tc)
  return {
    ...f,
    numero: formatearNumero(f.numero),
    gravada10: conv(f.g10),
    gravada5: conv(f.g5),
    exenta: conv(f.ex),
    imputaciones: f.imputaciones.map(({ key, ...i }) => ({ ...i, monto: n0(i.monto) }))
  }
}

/* ── ventana de carga ───────────────────────────────────────── */

function ModalComprobante({ inicial, tipos, onCerrar, mesRef }) {
  const { comprobantes, timbrados, personas, imputables, nombreCuenta, ejercicio, contribuyente } = useContable()
  const [f, setF] = useState(inicial)
  const [tab, setTab] = useState('encabezado')
  const [errores, setErrores] = useState([])
  const [sugerido, setSugerido] = useState(null)
  const [cargados, setCargados] = useState(0)
  const [cotizando, setCotizando] = useState('')
  const [personaNueva, setPersonaNueva] = useState(false)
  const panel = useRef(null)
  const primerCampo = useRef(null)

  const t = TIPOS[f.tipo]
  const esCompra = t.lado === 'compra'
  const quien = esCompra ? 'Proveedor' : 'Cliente'
  const set = (c) => { setF((x) => ({ ...x, ...c })); setErrores([]) }

  const doc = aDoc(f)
  const x = totalesDe(doc)
  const neto = x.base10 + x.base5 + x.ex
  const lineas = lineasDe(doc)
  const otros = comprobantes.items.filter((d) => d.id !== f.id)

  const misTimbrados = timbrados.items.filter((m) => m.tipo === t.timbradoTipo)

  // avisos en vivo
  const repetido = f.numero && f.personaRuc
    ? otros.find((d) => d.tipo === f.tipo && d.numero === formatearNumero(f.numero) && d.personaRuc === f.personaRuc)
    : null
  const timbradoDeOtro = esCompra && timbradoValido(f.timbrado) && f.personaRuc
    ? otros.find((d) => TIPOS[d.tipo]?.lado === 'compra' && d.timbrado === f.timbrado && d.personaRuc && d.personaRuc !== f.personaRuc)
    : null
  const rucInfo = analizarRuc(f.personaRuc)

  const opcionesPersona = useMemo(() => personas.items
    .filter((p) => p.tipo === 'ambos' || p.tipo === (esCompra ? 'proveedor' : 'cliente') || !p.tipo)
    .concat(personas.items.filter((p) => p.tipo && p.tipo !== 'ambos' && p.tipo !== (esCompra ? 'proveedor' : 'cliente')))
    .map((p) => ({ value: p.ruc, code: p.ruc, text: p.nombre, label: `${p.ruc} · ${p.nombre}`, search: `${p.ruc} ${p.nombre}` }))
    // persona elegida del padrón de la DNIT que todavía no está en Personas
    .concat(f.personaRuc && f.personaNombre && !personas.items.some((p) => p.ruc === f.personaRuc)
      ? [{ value: f.personaRuc, code: f.personaRuc, text: f.personaNombre, label: `${f.personaRuc} · ${f.personaNombre}`, search: `${f.personaRuc} ${f.personaNombre}`, extra: 'nuevo' }]
      : []), [personas.items, esCompra, f.personaRuc, f.personaNombre])
  const opcionesCuenta = useMemo(() => imputables.map((c) => ({
    value: c.codigo, code: c.codigo, text: c.nombre, label: `${c.codigo} · ${c.nombre}`, search: `${c.codigo} ${c.nombre}`
  })), [imputables])

  /* navegación con Enter: pasa al siguiente campo marcado con data-nav */
  const siguiente = (desde) => {
    const actual = desde || document.activeElement
    // con el CDC leído, saltar los campos que ya se completaron: nombre → timbrado → condición
    if (leerCDC(f.cdc) && ['lf-cdc', 'lf-nombre', 'lf-timbrado'].includes(actual?.id)) {
      const pendiente = ['lf-nombre', 'lf-timbrado'].map((id) => document.getElementById(id)).find((el) => el && el !== actual && !el.value)
      const destino = pendiente || document.getElementById('lf-cond')
      if (destino) { destino.focus(); destino.select?.(); return }
    }
    const campos = [...(panel.current?.querySelectorAll('[data-nav]:not([disabled])') || [])]
    const i = campos.indexOf(actual)
    const prox = campos[i + 1]
    if (prox) { prox.focus(); prox.select?.() } else guardar(false)
  }
  const alEnter = (e) => {
    if (e.key === 'Enter' && !e.ctrlKey && !e.altKey && !e.shiftKey) { e.preventDefault(); siguiente(e.currentTarget) }
  }
  const nav = { 'data-nav': true, onKeyDown: alEnter }

  /* memoria por persona: completa con lo que se usó la última vez */
  const recordar = (ruc, base) => {
    const previo = otros
      .filter((d) => d.personaRuc === ruc && TIPOS[d.tipo]?.lado === t.lado && d.tipo !== 'nc-compra' && d.tipo !== 'nc-venta')
      .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))[0]
    if (!previo) { setSugerido(null); return base }
    const c = { ...base }
    const usados = []
    if (esCompra && !f.timbrado && previo.timbrado) { c.timbrado = previo.timbrado; c.tipoTimbrado = previo.tipoTimbrado || c.tipoTimbrado; usados.push('timbrado') }
    if (previo.cuenta && f.cuenta === TIPOS[f.tipo].cuenta) { c.cuenta = previo.cuenta; usados.push('cuenta') }
    if (previo.condicion) { c.condicion = previo.condicion; c.cuentaPago = previo.cuentaPago || CTA.CAJA; usados.push('condición') }
    if (previo.moneda && previo.moneda !== 'PYG' && f.moneda === 'PYG') { c.moneda = previo.moneda; usados.push('moneda') }
    setSugerido(usados.length ? { fecha: previo.fecha, numero: previo.numero, usados } : null)
    return c
  }

  // `item.dnit`: viene del padrón de RUC de la DNIT, se agrega a Personas al guardar
  const elegirPersona = (ruc, item) => {
    if (!ruc) { set({ personaRuc: '', personaNombre: '' }); return }
    const p = personas.items.find((x) => x.ruc === ruc)
    setPersonaNueva(false)
    setF((prev) => recordar(ruc, { ...prev, personaRuc: ruc, personaNombre: p?.nombre || (item?.dnit ? item.text : prev.personaNombre) }))
    setErrores([])
    setTimeout(() => siguiente(document.getElementById('lf-persona')), 0)
  }

  /** RUC escrito que no está en Personas: completa el DV y pide el nombre */
  const rucLibre = async (texto) => {
    const limpio = String(texto || '').trim()
    if (!limpio) { siguiente(document.getElementById('lf-persona')); return }
    let ruc = limpio
    if (/^\d{3,9}$/.test(limpio)) ruc = `${limpio}-${dvRuc(limpio)}`
    if (!analizarRuc(ruc).formato) { setErrores(['Escribí un RUC (80012345-6) o buscá por nombre.']); return }
    const p = personas.items.find((x) => x.ruc === ruc)
    if (p) { elegirPersona(ruc); return }
    const enPadron = await rucDnitExacto(ruc)
    if (enPadron) { elegirPersona(enPadron.ruc, { dnit: true, text: enPadron.nombre }); return }
    setF((prev) => recordar(ruc, { ...prev, personaRuc: ruc, personaNombre: '' }))
    setPersonaNueva(true)
    setTimeout(() => document.getElementById('lf-nombre')?.focus(), 0)
  }

  const aplicarCDC = (texto) => {
    const c = leerCDC(texto)
    if (!c) {
      if (String(texto).replace(/\D/g, '').length) setErrores(['El CDC tiene 44 dígitos. Copialo completo del KuDE o del correo de la factura.'])
      return false
    }
    const tipoDoc = { 'nota-credito': esCompra ? 'nc-compra' : 'nc-venta', 'nota-debito': esCompra ? 'nd-compra' : 'nd-venta' }[c.tipoDoc] || (esCompra ? 'compra' : 'venta')
    const p = personas.items.find((x) => x.ruc === c.ruc)
    setF((prev) => recordar(c.ruc, {
      ...prev,
      cdc: c.cdc,
      tipo: tipos.includes(tipoDoc) ? tipoDoc : prev.tipo,
      tipoTimbrado: 'electronico',
      numero: c.numero,
      personaRuc: esCompra ? c.ruc : prev.personaRuc,
      personaNombre: esCompra ? (p?.nombre || '') : prev.personaNombre,
      fecha: c.fecha || prev.fecha,
      fechaTxt: c.fecha ? fechaCorta(c.fecha) : prev.fechaTxt
    }))
    setPersonaNueva(esCompra && !p)
    setErrores([])
    // con el CDC solo falta el timbrado (si no lo recordamos) y los importes
    setTimeout(() => {
      const destino = esCompra && !p ? 'lf-nombre' : 'lf-timbrado'
      const el = document.getElementById(destino)
      if (el && !el.value) el.focus()
      else document.getElementById('lf-g10')?.focus()
    }, 0)
    return true
  }

  const fijarFecha = (txt) => {
    const iso = fechaRapida(txt, ejercicio, mesRef || (f.fecha ? f.fecha.slice(5, 7) : mesActual()))
    set({ fechaTxt: iso ? fechaCorta(iso) : txt, fecha: iso })
    return iso
  }

  // timbrado propio y número siguiente en ventas
  const elegirTimbradoPropio = (numero, tipo = f.tipo) => {
    const tim = timbrados.items.find((m) => m.numero === numero && m.tipo === TIPOS[tipo].timbradoTipo)
    set({ timbrado: numero, numero: tim ? siguienteNumero(tim, otros) : f.numero, tipoTimbrado: f.tipoTimbrado })
  }
  useEffect(() => {
    if (!t.emitido || f.id || f.timbrado) return
    const vig = misTimbrados.find((m) => timbradoVigente(m, f.fecha || hoyISO())) || misTimbrados[0]
    if (vig) elegirTimbradoPropio(vig.numero)
  }, [f.tipo]) // eslint-disable-line react-hooks/exhaustive-deps

  const traerCotizacion = async () => {
    if (f.moneda === 'PYG') return
    if (!f.fecha) { setErrores(['Indicá la fecha para traer la cotización de la DNIT.']); return }
    setCotizando('…')
    try {
      const auth = await authHeaders()
      const r = await axios.post(`${API_BASE_URL}/api/cotizacion`, { fecha: f.fecha, moneda: f.moneda }, { headers: { ...auth } })
      if (r.data?.success) {
        const v = esCompra ? r.data.data.vendedor : r.data.data.comprador
        set({ cambio: v })
        setCotizando(`DNIT ${esCompra ? 'vendedor' : 'comprador'} del ${fechaCorta(r.data.data.fecha)}`)
      } else setCotizando(r.data?.message || 'Sin cotización')
    } catch (err) {
      setCotizando(err.response?.data?.message || 'No se pudo consultar la DNIT; cargalo a mano.')
    }
  }

  /* reparto del neto en varias cuentas */
  const repartido = f.imputaciones.reduce((s, i) => s + n0(i.monto), 0)
  const setImp = (lista) => set({ imputaciones: lista })

  const guardar = (yNuevo) => {
    const d = aDoc(f)
    const errs = []
    if (!d.fecha) errs.push('Indicá la fecha (podés escribir solo el día, p. ej. «15»).')
    else if (!d.fecha.startsWith(String(ejercicio))) errs.push(`La fecha tiene que estar dentro del ejercicio ${ejercicio}.`)
    if (!timbradoValido(d.timbrado)) errs.push('El timbrado tiene 8 dígitos.')
    if (!numeroValido(d.numero)) errs.push('El número tiene el formato 001-001-0000001.')
    if (!analizarRuc(d.personaRuc).formato) errs.push(`Indicá el RUC del ${quien.toLowerCase()}.`)
    if (!String(d.personaNombre || '').trim()) errs.push(`Escribí el nombre o razón social del ${quien.toLowerCase()}.`)
    if (!totalesDe(d).total) errs.push('Cargá al menos un importe: gravada 10%, gravada 5% o exenta.')
    if (f.moneda !== 'PYG' && !(Number(f.cambio) > 0)) errs.push('Indicá el tipo de cambio.')
    if (!d.cuenta) errs.push('Elegí la cuenta de imputación.')
    if (d.imputaciones.length && repartido !== neto) errs.push(`El reparto en cuentas suma ₲ ${gs(repartido)} y el neto es ₲ ${gs(neto)}.`)
    if (t.asociado && d.asociado && !numeroValido(formatearNumero(d.asociado))) errs.push('La factura asociada tiene el formato 001-001-0000001.')
    if (repetido) errs.push(`Ya está cargado: ${TIPOS[repetido.tipo].label.toLowerCase()} ${repetido.numero} del ${fechaCorta(repetido.fecha)}.`)
    if (errs.length) { setErrores(errs); setTab('encabezado'); return }

    personas.asegurar(d.personaRuc, d.personaNombre.trim(), esCompra ? 'proveedor' : 'cliente')
    const { fechaTxt, g10, g5, ex, ...resto } = d
    comprobantes.guardar({
      ...resto,
      personaNombre: d.personaNombre.trim(),
      asociado: d.asociado ? formatearNumero(d.asociado) : '',
      cuentaPago: d.condicion === 'contado' ? d.cuentaPago : null,
      montosOrig: f.moneda === 'PYG' ? null : { g10: n0(g10), g5: n0(g5), ex: n0(ex) },
      editadoEn: f.id ? new Date().toISOString() : null
    })

    if (!yNuevo) { onCerrar(true); return }
    // guardar y seguir: conserva tipo, fecha, moneda; en ventas también el timbrado
    const base = { ...formVacio(f.tipo, f.fecha), moneda: f.moneda, cambio: f.cambio, tipoTimbrado: f.tipoTimbrado }
    if (t.emitido && f.timbrado) {
      const tim = misTimbrados.find((m) => m.numero === f.timbrado)
      base.timbrado = f.timbrado
      base.numero = tim ? siguienteNumero(tim, [...otros, { ...resto }]) : ''
    }
    setF(base)
    setCargados((n) => n + 1)
    setSugerido(null)
    setPersonaNueva(false)
    setTab('encabezado')
    setTimeout(() => (t.emitido ? document.getElementById('lf-persona') : primerCampo.current)?.focus(), 0)
  }

  // atajos de la ventana
  useEffect(() => {
    const onKey = (e) => {
      const k = e.key.toLowerCase()
      if (e.altKey && k === 'e') { e.preventDefault(); setTab('encabezado') }
      if (e.altKey && k === 'd') { e.preventDefault(); setTab('debe') }
      if (e.altKey && k === 'h') { e.preventDefault(); setTab('haber') }
      if (e.altKey && k === 'g') { e.preventDefault(); guardar(false) }
      if (e.ctrlKey && k === 'enter') { e.preventDefault(); guardar(!f.id) }
      if (k === 'escape') onCerrar(cargados > 0)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  useEffect(() => { (t.emitido ? document.getElementById('lf-persona') : primerCampo.current)?.focus() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const TABS = [
    { id: 'encabezado', label: 'Encabezado', tecla: 'E' },
    { id: 'debe', label: 'Asiento Debe', tecla: 'D', n: lineas.filter((l) => l.debe).length },
    { id: 'haber', label: 'Asiento Haber', tecla: 'H', n: lineas.filter((l) => l.haber).length }
  ]
  const conTecla = (tb) => {
    const i = tb.label.indexOf(tb.tecla)
    return <span>{tb.label.slice(0, i)}<u>{tb.tecla}</u>{tb.label.slice(i + 1)}</span>
  }
  const mon = MONEDAS.find((m) => m.id === f.moneda)

  /* pestaña de asiento (debe / haber) */
  const ladoAsiento = (lado) => {
    const propias = lineas.filter((l) => (lado === 'debe' ? l.debe : l.haber))
    const editable = ladoNeto(f.tipo) === lado
    const cuentasNeto = new Set(f.imputaciones.length ? f.imputaciones.map((i) => i.cuenta) : [f.cuenta])
    const automaticas = editable ? propias.filter((l) => !cuentasNeto.has(l.cuenta)) : propias
    return (
      <div className="lf-asiento">

        {editable && (
          <section className="lf-reparto" aria-label="Imputación del neto">
            <header className="lf-reparto__head">
              <h3>Neto ₲ {gs(neto)}</h3>
              {f.imputaciones.length ? (
                <button type="button" className="ct-link" onClick={() => setImp([])}>Una sola cuenta</button>
              ) : (
                <button type="button" className="q-btn q-btn--line lf-mini" onClick={() => setImp([{ key: nuevaKey(), cuenta: f.cuenta, monto: neto }, { key: nuevaKey(), cuenta: '', monto: '' }])}>
                  <Split size={14} strokeWidth={1.8} /> Repartir
                </button>
              )}
            </header>
            {!f.imputaciones.length ? (
              <div className="lf-reparto__una">
                <Buscador id="lf-cta-tab" items={opcionesCuenta} valor={f.cuenta} onElegir={(v) => v && set({ cuenta: v })} placeholder="Cuenta de imputación" ariaLabel="Cuenta de imputación" />
                <strong className="ct-num">₲ {gs(neto)}</strong>
              </div>
            ) : (
              <>
                {f.imputaciones.map((i, n) => (
                  <div key={i.key} className="lf-reparto__fila">
                    <Buscador id={`lf-imp-${i.key}`} items={opcionesCuenta} valor={i.cuenta} onElegir={(v) => setImp(f.imputaciones.map((y) => (y.key === i.key ? { ...y, cuenta: v } : y)))} placeholder={`Cuenta ${n + 1}`} ariaLabel={`Cuenta ${n + 1}`} />
                    <MontoInput value={i.monto} aria-label={`Monto de la cuenta ${n + 1}`} onChange={(v) => setImp(f.imputaciones.map((y) => (y.key === i.key ? { ...y, monto: v } : y)))} />
                    <button type="button" className="ct-icon ct-icon--del" onClick={() => setImp(f.imputaciones.filter((y) => y.key !== i.key))} aria-label={`Quitar cuenta ${n + 1}`}><Trash2 size={14} strokeWidth={1.8} /></button>
                  </div>
                ))}
                <div className="lf-reparto__pie">
                  <button type="button" className="ct-link" onClick={() => setImp([...f.imputaciones, { key: nuevaKey(), cuenta: '', monto: neto - repartido > 0 ? neto - repartido : '' }])}>
                    <Plus size={13} strokeWidth={2} /> Agregar cuenta
                  </button>
                  <span className={`lf-reparto__estado ${repartido === neto ? 'is-ok' : 'is-err'}`}>
                    {gs(repartido)} / {gs(neto)}
                  </span>
                  {repartido !== neto && neto - repartido > 0 && f.imputaciones.length > 0 && (
                    <button type="button" className="am-cuadrar" onClick={() => {
                      const ult = f.imputaciones[f.imputaciones.length - 1]
                      setImp(f.imputaciones.map((y) => (y.key === ult.key ? { ...y, monto: n0(y.monto) + (neto - repartido) } : y)))
                    }}><Wand2 size={13} strokeWidth={1.8} /> ₲ {gs(neto - repartido)}</button>
                  )}
                </div>
              </>
            )}
          </section>
        )}

        <table className="q-table ct-tabla ct-tabla--mini lf-asiento__tabla">
          <thead><tr><th>Código</th><th>Cuenta</th><th className="ct-der">{lado === 'debe' ? 'Debe' : 'Haber'}</th><th /></tr></thead>
          <tbody>
            {(editable ? propias : automaticas).map((l, i) => (
              <tr key={i}>
                <td className="ct-mono ct-cod">{l.cuenta}</td>
                <td>{nombreCuenta(l.cuenta)}</td>
                <td className="ct-num">{gs(lado === 'debe' ? l.debe : l.haber)}</td>
                <td />
              </tr>
            ))}
            {!propias.length && <tr><td colSpan={4} className="am-vacio">Sin datos</td></tr>}
          </tbody>
          <tfoot>
            <tr className="ct-total"><td colSpan={2}>Total {lado === 'debe' ? 'Debe' : 'Haber'}</td><td className="ct-num">{gs(propias.reduce((s, l) => s + (lado === 'debe' ? l.debe : l.haber), 0))}</td><td /></tr>
          </tfoot>
        </table>
      </div>
    )
  }

  return createPortal(
    <div className="q-content am-overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar(cargados > 0) }}>
      <div className="am-modal lf-modal" role="dialog" aria-modal="true" aria-labelledby="lf-titulo" ref={panel}>
        <header className="am-modal__head">
          <div>
            {cargados > 0 && <p className="am-modal__eyebrow">{cargados} cargados</p>}
            <h2 id="lf-titulo" className="am-modal__title">{f.id ? `Modificar ${t.label.toLowerCase()}` : `Registrar ${t.label.toLowerCase()}`}</h2>
          </div>
          <button type="button" className="q-ghost-icon" onClick={() => onCerrar(cargados > 0)} aria-label="Cerrar"><X size={18} strokeWidth={1.7} /></button>
        </header>

        <div className="am-tabs" role="tablist">
          {TABS.map((tb) => (
            <button key={tb.id} type="button" role="tab" aria-selected={tab === tb.id} className={tab === tb.id ? 'is-on' : ''} onClick={() => setTab(tb.id)}>
              {conTecla(tb)}{tb.n !== undefined && <span className="am-tabs__n">{tb.n}</span>}
            </button>
          ))}
        </div>

        <div className="am-modal__body lf-body">
          {tab === 'encabezado' && (
            <div className="lf-cab">
              <div className="lf-campos">
                {/* CDC: pegar y listo */}
                <div className="lf-cdc">
                  <label className="q-label" htmlFor="lf-cdc">CDC</label>
                  <div className="lf-cdc__row">
                    <ScanLine size={16} strokeWidth={1.8} aria-hidden="true" className="lf-cdc__ico" />
                    <input
                      id="lf-cdc" ref={primerCampo} className="q-input q-input--num lf-cdc__input" inputMode="numeric" autoComplete="off"
                      value={formatearCDC(f.cdc)} placeholder=""
                      data-nav
                      onChange={(e) => {
                        const d = e.target.value.replace(/\D/g, '').slice(0, 44)
                        set({ cdc: d })
                        if (d.length === 44) aplicarCDC(d)
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter') return
                        e.preventDefault()
                        if (!f.cdc || !aplicarCDC(f.cdc)) siguiente(e.currentTarget)
                      }}
                    />
                    {leerCDC(f.cdc) && <span className="lf-cdc__ok"><BadgeCheck size={15} strokeWidth={1.9} /> Leído</span>}
                  </div>
                </div>

                <div className="lf-grid">
                  <div className="q-field">
                    <label className="q-label" htmlFor="lf-tipo">Tipo de doc.</label>
                    <select id="lf-tipo" className="q-input ct-select" value={f.tipo} disabled={!!f.id || tipos.length === 1} {...nav}
                      onChange={(e) => { const tp = e.target.value; set({ tipo: tp, cuenta: f.cuenta === TIPOS[f.tipo].cuenta ? TIPOS[tp].cuenta : f.cuenta, ...(TIPOS[tp].emitido ? { timbrado: '', numero: '' } : {}) }) }}>
                      {tipos.map((id) => <option key={id} value={id}>{TIPOS[id].label}</option>)}
                    </select>
                  </div>
                  <div className="q-field">
                    <label className="q-label" htmlFor="lf-tt">Tipo timbrado</label>
                    <select id="lf-tt" className="q-input ct-select" value={f.tipoTimbrado} onChange={(e) => set({ tipoTimbrado: e.target.value })} {...nav}>
                      {TIPOS_TIMB.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
                    </select>
                  </div>
                  <div className="q-field">
                    <label className="q-label" htmlFor="lf-timbrado">Timbrado</label>
                    {t.emitido && misTimbrados.length > 0 ? (
                      <select id="lf-timbrado" className="q-input ct-select" value={f.timbrado} onChange={(e) => elegirTimbradoPropio(e.target.value)} {...nav}>
                        <option value="">Elegí…</option>
                        {misTimbrados.map((m) => <option key={m.id} value={m.numero}>{m.numero} · {m.establecimiento}-{m.punto}{timbradoVigente(m, f.fecha || hoyISO()) ? '' : ' (vencido)'}</option>)}
                      </select>
                    ) : (
                      <input id="lf-timbrado" className={`q-input q-input--num ${timbradoDeOtro ? 'is-warn' : ''}`} inputMode="numeric" maxLength={8} value={f.timbrado} placeholder="12345678"
                        onChange={(e) => set({ timbrado: e.target.value.replace(/\D/g, '') })} {...nav} />
                    )}
                  </div>
                  <div className="q-field">
                    <label className="q-label" htmlFor="lf-numero">{f.tipo.startsWith('nc') ? 'Nota de crédito' : f.tipo.startsWith('nd') ? 'Nota de débito' : 'Factura'} Nº</label>
                    <input id="lf-numero" className={`q-input q-input--num ${repetido ? 'is-invalid' : ''}`} value={f.numero} placeholder="001-001-0000001"
                      onChange={(e) => set({ numero: e.target.value })} onBlur={() => set({ numero: formatearNumero(f.numero) })}
                      data-nav onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); set({ numero: formatearNumero(f.numero) }); siguiente(e.currentTarget) } }} />
                  </div>

                  <div className="q-field lf-span-3">
                    <label className="q-label" htmlFor="lf-persona">{quien}</label>
                    <Buscador
                      id="lf-persona"
                      items={opcionesPersona}
                      valor={f.personaRuc}
                      onElegir={elegirPersona}
                      onEnterVacio={rucLibre}
                      dnit
                      onTexto={() => setPersonaNueva(false)}
                      placeholder="RUC o nombre"
                      ariaLabel={quien}
                      inputProps={{ 'data-nav': true }}
                    />
                    {f.personaRuc && rucInfo.formato && !rucInfo.valido && <small className="ct-hint is-warn">DV {rucInfo.esperado}</small>}
                  </div>
                  <div className="q-field">
                    <label className="q-label" htmlFor="lf-fecha">Fecha</label>
                    <input id="lf-fecha" className="q-input q-input--num" value={f.fechaTxt} placeholder="dd/mm/aaaa" autoComplete="off"
                      onChange={(e) => set({ fechaTxt: e.target.value, fecha: fechaRapida(e.target.value, ejercicio, mesRef || mesActual()) || '' })}
                      onBlur={(e) => fijarFecha(e.target.value)}
                      data-nav onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); fijarFecha(e.currentTarget.value); siguiente(e.currentTarget) } }} />
                  </div>

                  {personaNueva && (
                    <div className="q-field lf-span-4 lf-nueva">
                      <label className="q-label" htmlFor="lf-nombre">Razón social</label>
                      <input id="lf-nombre" className="q-input" value={f.personaNombre} onChange={(e) => set({ personaNombre: e.target.value })} {...nav} />
                    </div>
                  )}

                  <div className="q-field">
                    <span className="q-label" id="lf-cond-l">Condición</span>
                    <button type="button" id="lf-cond" className="lf-toggle" aria-labelledby="lf-cond-l" aria-pressed={f.condicion === 'credito'}
                      onClick={() => set({ condicion: f.condicion === 'contado' ? 'credito' : 'contado' })}
                      data-nav
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); siguiente(e.currentTarget) }
                        if (['ArrowLeft', 'ArrowRight'].includes(e.key)) { e.preventDefault(); set({ condicion: f.condicion === 'contado' ? 'credito' : 'contado' }) }
                      }}>
                      <span className={f.condicion === 'contado' ? 'is-on' : ''}>Contado</span>
                      <span className={f.condicion === 'credito' ? 'is-on' : ''}>Crédito</span>
                    </button>
                  </div>
                  {f.condicion === 'contado' ? (
                    <div className="q-field">
                      <label className="q-label" htmlFor="lf-pago">{esCompra ? 'Pagado desde' : 'Cobrado en'}</label>
                      <select id="lf-pago" className="q-input ct-select" value={f.cuentaPago} onChange={(e) => set({ cuentaPago: e.target.value })} {...nav}>
                        {imputables.filter((c) => c.codigo.startsWith('1.1.01.')).map((c) => <option key={c.codigo} value={c.codigo}>{c.nombre}</option>)}
                      </select>
                    </div>
                  ) : <div className="q-field lf-credito"><span className="q-label">Cuenta</span><span className="lf-credito__txt">{nombreCuenta(esCompra ? CTA.PROVEEDORES : CTA.DEUDORES)}</span></div>}
                  <div className="q-field">
                    <label className="q-label" htmlFor="lf-moneda">Moneda</label>
                    <select id="lf-moneda" className="q-input ct-select" value={f.moneda} onChange={(e) => { set({ moneda: e.target.value, cambio: e.target.value === 'PYG' ? 1 : '' }); setCotizando('') }} {...nav}>
                      {MONEDAS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                    </select>
                  </div>
                  <div className="q-field">
                    <label className="q-label" htmlFor="lf-cambio">Cambio</label>
                    <div className="lf-cambio">
                      <input id="lf-cambio" className="q-input q-input--num" inputMode="decimal" value={f.moneda === 'PYG' ? 1 : f.cambio} disabled={f.moneda === 'PYG'}
                        onChange={(e) => set({ cambio: e.target.value.replace(',', '.') })} {...nav} />
                      {f.moneda !== 'PYG' && (
                        <button type="button" className="ct-icon" onClick={traerCotizacion} title="Traer cotización de la DNIT" aria-label="Traer cotización de la DNIT"><RefreshCw size={14} strokeWidth={1.8} /></button>
                      )}
                    </div>
                    {cotizando && <small className="ct-hint">{cotizando}</small>}
                  </div>

                  <div className="q-field">
                    <label className="q-label" htmlFor="lf-g10">Grav. 10%</label>
                    <MontoInput id="lf-g10" value={f.g10} onChange={(v) => set({ g10: v })} {...nav} />
                  </div>
                  <div className="q-field">
                    <label className="q-label" htmlFor="lf-g5">Grav. 5%</label>
                    <MontoInput id="lf-g5" value={f.g5} onChange={(v) => set({ g5: v })} {...nav} />
                  </div>
                  <div className="q-field">
                    <label className="q-label" htmlFor="lf-ex">Exentas</label>
                    <MontoInput id="lf-ex" value={f.ex} onChange={(v) => set({ ex: v })} {...nav} />
                  </div>
                  {t.asociado ? (
                    <div className="q-field">
                      <label className="q-label" htmlFor="lf-asoc">Factura asociada</label>
                      <input id="lf-asoc" className="q-input q-input--num" value={f.asociado} placeholder="001-001-0000001" onChange={(e) => set({ asociado: e.target.value })} onBlur={() => set({ asociado: formatearNumero(f.asociado) })} {...nav} />
                    </div>
                  ) : <div />}

                  <div className="q-field lf-span-2">
                    <label className="q-label" htmlFor="lf-cuenta">Cuenta</label>
                    {f.imputaciones.length ? (
                      <button type="button" className="q-input lf-repartida" onClick={() => setTab(ladoNeto(f.tipo))} data-nav onKeyDown={alEnter}>
                        {f.imputaciones.map((i) => i.cuenta).filter(Boolean).join(' · ')}
                      </button>
                    ) : (
                      <Buscador id="lf-cuenta" items={opcionesCuenta} valor={f.cuenta}
                        onElegir={(v) => { if (v) { set({ cuenta: v }); setTimeout(() => siguiente(document.getElementById('lf-cuenta')), 0) } }}
                        onEnterVacio={() => siguiente(document.getElementById('lf-cuenta'))}
                        placeholder="Código o nombre" ariaLabel="Cuenta de imputación" inputProps={{ 'data-nav': true }} />
                    )}
                  </div>
                  <div className="q-field lf-span-2">
                    <label className="q-label" htmlFor="lf-obs">Observación</label>
                    <input id="lf-obs" className="q-input" value={f.concepto} onChange={(e) => set({ concepto: e.target.value })} {...nav} />
                  </div>
                </div>
              </div>

              {/* liquidación en vivo */}
              <aside className="lf-liq" aria-label="Liquidación del comprobante">
                <p className="lf-liq__title">Liquidación</p>
                <dl>
                  <div><dt>Gravado 10%</dt><dd className="ct-num">{gs(x.base10)}</dd></div>
                  <div><dt>IVA 10%</dt><dd className="ct-num">{gs(x.iva10)}</dd></div>
                  <div><dt>Gravado 5%</dt><dd className="ct-num">{gs(x.base5)}</dd></div>
                  <div><dt>IVA 5%</dt><dd className="ct-num">{gs(x.iva5)}</dd></div>
                  <div><dt>Exentas</dt><dd className="ct-num">{gs(x.ex)}</dd></div>
                  <div className="lf-liq__iva"><dt>Total IVA</dt><dd className="ct-num">{gs(x.iva10 + x.iva5)}</dd></div>
                </dl>
                <div className="lf-liq__total">
                  <span>Total {f.moneda !== 'PYG' ? 'en guaraníes' : ''}</span>
                  <strong className="ct-num">₲ {gs(x.total)}</strong>
                  {f.moneda !== 'PYG' && <small className="ct-num">{mon.corto} {(n0(f.g10) + n0(f.g5) + n0(f.ex)).toLocaleString('es-PY')} × {f.cambio || 0}</small>}
                </div>
                {sugerido && (
                  <p className="lf-memoria"><Sparkles size={13} strokeWidth={1.8} aria-hidden="true" /> Datos de la factura {sugerido.numero}</p>
                )}
                {repetido && <p className="lf-alerta is-err"><AlertTriangle size={13} strokeWidth={2} aria-hidden="true" /> Ya cargaste este número el {fechaCorta(repetido.fecha)}.</p>}
                {timbradoDeOtro && <p className="lf-alerta"><AlertTriangle size={13} strokeWidth={2} aria-hidden="true" /> El timbrado {f.timbrado} ya figura con otro RUC ({timbradoDeOtro.personaNombre}). Revisalo.</p>}
                {f.fecha && !f.fecha.startsWith(String(ejercicio)) && <p className="lf-alerta is-err"><AlertTriangle size={13} strokeWidth={2} aria-hidden="true" /> La fecha está fuera del ejercicio {ejercicio}.</p>}
              </aside>
            </div>
          )}
          {tab === 'debe' && ladoAsiento('debe')}
          {tab === 'haber' && ladoAsiento('haber')}
        </div>

        {errores.length > 0 && (
          <div className="am-error" role="alert">
            <AlertTriangle size={18} strokeWidth={2} aria-hidden="true" />
            <ul>{errores.map((e) => <li key={e}>{e}</li>)}</ul>
          </div>
        )}

        <footer className="am-modal__foot">
          <button type="button" className="q-btn q-btn--line" onClick={() => onCerrar(cargados > 0)}><X size={15} strokeWidth={1.8} /> Cancelar</button>
          {!f.id && <button type="button" className="q-btn q-btn--line" onClick={() => guardar(true)}><Zap size={15} strokeWidth={1.8} /> Guardar y otro</button>}
          <button type="button" className="q-btn q-btn--primary" onClick={() => guardar(false)}><Check size={15} strokeWidth={2} /> <span><u>G</u>uardar</span></button>
        </footer>
      </div>
    </div>,
    document.querySelector('.q-app') || document.body
  )
}

/* ── grilla del libro ───────────────────────────────────────── */

const COLUMNAS = [
  { id: 'numero', label: 'Factura', valor: (r) => r.d.numero, cls: 'ct-mono' },
  { id: 'timbrado', label: 'Timbrado', valor: (r) => r.d.timbrado, cls: 'ct-mono' },
  { id: 'tipo', label: 'Tipo', valor: (r) => TIPOS[r.d.tipo].corto },
  { id: 'fecha', label: 'Fecha', valor: (r) => r.d.fecha, cls: 'ct-mono' },
  { id: 'ruc', label: 'RUC', valor: (r) => r.d.personaRuc, cls: 'ct-mono' },
  { id: 'nombre', label: null, valor: (r) => r.d.personaNombre },
  { id: 'cond', label: 'C.V.', valor: (r) => r.d.condicion },
  { id: 'moneda', label: 'Mon.', valor: (r) => r.d.moneda || 'PYG' },
  { id: 'iva', label: 'IVA', valor: (r) => r.iva, num: true },
  { id: 'total', label: 'Total', valor: (r) => r.total, num: true },
  { id: 'cdc', label: 'CDC', valor: (r) => (r.d.cdc ? 1 : 0) }
]

export default function RegistroFiscal({ titulo, lede, tipos, libro = false }) {
  const { comprobantes, ejercicio, contribuyente, nombreCuenta, personas } = useContable()
  const lado = TIPOS[tipos[0]].lado
  const esCompra = lado === 'compra'
  const [mes, setMes] = useState(() => (String(new Date().getFullYear()) === String(ejercicio) ? mesActual() : ''))
  const [busca, setBusca] = useState('')
  const [orden, setOrden] = useState({ campo: 'fecha', dir: 1 })
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [selId, setSelId] = useState(null)
  const [modal, setModal] = useState(null)
  const [aviso, setAviso] = useState(null)
  const buscaRef = useRef(null)
  const archivoRef = useRef(null)

  const q = normalizar(busca)
  const filas = useMemo(() => comprobantes.items
    .filter((d) => tipos.includes(d.tipo) && String(d.fecha || '').startsWith(mes ? `${ejercicio}-${mes}` : String(ejercicio)))
    .filter((d) => filtroTipo === 'todos' || d.tipo.split('-')[0] === filtroTipo)
    .filter((d) => !q || normalizar(`${d.numero} ${d.timbrado} ${d.personaRuc} ${d.personaNombre} ${d.concepto || ''} ${d.cdc || ''}`).includes(q))
    .map((d) => {
      const s = TIPOS[d.tipo].signo
      const x = totalesDe(d)
      return { d, s, x, iva: s * (x.iva10 + x.iva5), total: s * x.total }
    }), [comprobantes.items, tipos, ejercicio, mes, q, filtroTipo])

  const col = COLUMNAS.find((c) => c.id === orden.campo)
  const ordenadas = filas.slice().sort((a, b) => {
    const va = col.valor(a)
    const vb = col.valor(b)
    const v = typeof va === 'number' ? va - vb : String(va || '').localeCompare(String(vb || ''))
    return (v || (a.d.fecha || '').localeCompare(b.d.fecha || '') || (a.d.numero || '').localeCompare(b.d.numero || '')) * orden.dir
  })

  const tot = filas.reduce((t, r) => ({
    base10: t.base10 + r.s * r.x.base10, iva10: t.iva10 + r.s * r.x.iva10, base5: t.base5 + r.s * r.x.base5,
    iva5: t.iva5 + r.s * r.x.iva5, ex: t.ex + r.s * r.x.ex, total: t.total + r.total
  }), { base10: 0, iva10: 0, base5: 0, iva5: 0, ex: 0, total: 0 })

  const sel = filas.find((r) => r.d.id === selId)?.d || null
  const sinTimbrado = filas.filter((r) => !r.d.timbrado).length

  const fechaDefecto = () => {
    const hoy = hoyISO()
    if (hoy.startsWith(String(ejercicio)) && (!mes || hoy.slice(5, 7) === mes)) return hoy
    return mes ? `${ejercicio}-${mes}-01` : ''
  }

  const nuevo = () => { setAviso(null); setModal(formVacio(tipos[0], fechaDefecto())) }
  const modificar = (d = sel) => { if (d) { setAviso(null); setModal(formDesdeDoc(d)) } }
  const eliminar = () => {
    if (!sel) return
    if (window.confirm(`¿Eliminar ${TIPOS[sel.tipo].label.toLowerCase()} ${sel.numero} de ${sel.personaNombre}? También se quita su asiento del Diario y del Mayor.`)) {
      comprobantes.eliminar(sel.id)
      setSelId(null)
      setAviso({ tono: 'ok', texto: 'Eliminado.' })
    }
  }

  const recordarCuenta = (ruc, tipo) => comprobantes.items
    .filter((d) => d.personaRuc === ruc && d.tipo === tipo && d.cuenta)
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))[0]?.cuenta

  const importar = async (file, origen) => {
    if (!file) return
    try {
      const r = await leerLibro(file, { lado, tipos, ejercicio, existentes: comprobantes.items, recordarCuenta })
      r.docs.forEach((d) => {
        personas.asegurar(d.personaRuc, d.personaNombre, esCompra ? 'proveedor' : 'cliente')
        comprobantes.guardar(d)
      })
      const partes = [`${r.docs.length} importados`]
      if (r.duplicados) partes.push(`${r.duplicados} duplicados omitidos`)
      setAviso({
        tono: r.errores.length ? (r.docs.length ? 'warn' : 'err') : 'ok',
        texto: `${partes.join(' · ')}${r.errores.length ? ` · ${r.errores.length} con errores:` : ''}`,
        lista: r.errores.slice(0, 12)
      })
    } catch (err) {
      setAviso({ tono: 'err', texto: err.message || 'No pude leer el archivo.' })
    }
    if (archivoRef.current) archivoRef.current.value = ''
  }
  const [origenImport, setOrigenImport] = useState('Excel')
  const abrirImport = (origen) => { setOrigenImport(origen); archivoRef.current?.click() }

  const exportar = () => {
    const cab = ['Fecha', 'Tipo', 'Timbrado', 'Número', 'RUC', esCompra ? 'Proveedor' : 'Cliente', 'Condición', 'Moneda', 'Gravada 10%', 'IVA 10%', 'Gravada 5%', 'IVA 5%', 'Exenta', 'Total', 'Cuenta', 'CDC']
    const data = ordenadas.map((r) => [fechaCorta(r.d.fecha), TIPOS[r.d.tipo].label, r.d.timbrado, r.d.numero, r.d.personaRuc, r.d.personaNombre, r.d.condicion === 'credito' ? 'Crédito' : 'Contado', r.d.moneda || 'PYG', r.s * r.x.base10, r.s * r.x.iva10, r.s * r.x.base5, r.s * r.x.iva5, r.s * r.x.ex, r.total, r.d.cuenta, r.d.cdc || ''])
    exportarExcel(`${titulo} ${contribuyente.ruc} ${ejercicio}${mes ? `-${mes}` : ''}`, titulo, [[`${titulo} · ${contribuyente.razonSocial} · RUC ${contribuyente.ruc}`], [], cab, ...data, ['', '', '', '', '', 'TOTAL', '', '', tot.base10, tot.iva10, tot.base5, tot.iva5, tot.ex, tot.total]])
  }

  const descargarModelo = () => exportarExcel(`Modelo ${titulo}`, titulo, [
    ['Fecha', 'Tipo', 'Timbrado', 'Numero', 'RUC', 'Razon social', 'Condicion', 'Gravada 10%', 'Gravada 5%', 'Exenta', 'Cuenta', 'CDC'],
    [`05/${mes || '01'}/${ejercicio}`, 'Factura', '12345678', '001-001-0000123', '80012345-6', 'Proveedor Ejemplo S.A.', 'Contado', 1100000, 0, 0, esCompra ? '5.1.01.02' : '4.1.01.01', '']
  ])

  useEffect(() => {
    const onKey = (e) => {
      if (modal) return
      const k = e.key.toLowerCase()
      if (e.ctrlKey && k === 'f') { e.preventDefault(); buscaRef.current?.focus() }
      if (e.altKey && k === 'n') { e.preventDefault(); nuevo() }
      if (sel && k === 'enter' && document.activeElement?.closest?.('.lf-lista')) { e.preventDefault(); modificar() }
      if (sel && k === 'delete' && document.activeElement?.closest?.('.lf-lista')) { e.preventDefault(); eliminar() }
      if (['arrowdown', 'arrowup'].includes(k) && document.activeElement?.closest?.('.lf-lista')) {
        e.preventDefault()
        const i = ordenadas.findIndex((r) => r.d.id === selId)
        const n = ordenadas[Math.min(Math.max(i + (k === 'arrowdown' ? 1 : -1), 0), ordenadas.length - 1)]
        if (n) setSelId(n.d.id)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  const cerrarModal = (huboCambios) => {
    if (huboCambios) setAviso({ tono: 'ok', texto: modal?.id ? 'Modificado.' : 'Registrado.' })
    setModal(null)
  }

  const th = (c) => (
    <th key={c.id} className={c.num ? 'ct-der' : ''} aria-sort={orden.campo === c.id ? (orden.dir > 0 ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="am-sort" onClick={() => setOrden({ campo: c.id, dir: orden.campo === c.id ? -orden.dir : 1 })}>
        {c.label || (esCompra ? 'Proveedor' : 'Cliente')}
        {orden.campo === c.id ? (orden.dir > 0 ? <ChevronUp size={13} strokeWidth={2} /> : <ChevronDown size={13} strokeWidth={2} />) : <ChevronDown size={13} strokeWidth={2} className="am-sort__off" />}
      </button>
    </th>
  )

  return (
    <div className="q-sheet q-sheet--wide ct-sheet">
      <PageHead title={titulo} status={comprobantes.status} />

      <div className="am-barra">
        <div className="am-barra__acciones" role="toolbar" aria-label="Acciones del libro">
          <button type="button" className="q-btn q-btn--primary" onClick={nuevo} title="Alt+N"><Plus size={16} strokeWidth={2} /> <span><u>N</u>uevo</span></button>
          <button type="button" className="q-btn q-btn--line" onClick={() => modificar()} disabled={!sel} title="Enter sobre la fila"><Pencil size={15} strokeWidth={1.8} /> Modificar</button>
          <button type="button" className="q-btn q-btn--line am-btn-del" onClick={eliminar} disabled={!sel} title="Supr sobre la fila"><Trash2 size={15} strokeWidth={1.8} /> Eliminar</button>
          {libro && (
            <>
              <span className="am-barra__sep" aria-hidden="true" />
              <button type="button" className="q-btn q-btn--line lf-btn-mrg" onClick={() => abrirImport('Marangatu')} title={`Registro de comprobantes descargado de Marangatu (RG90), .xlsx o .csv`}>
                <Download size={15} strokeWidth={1.8} /> Importar Marangatu
              </button>
              <button type="button" className="q-btn q-btn--line" onClick={() => abrirImport('Excel')} title="Planilla con el modelo de Quadra">
                <Upload size={15} strokeWidth={1.8} /> Importar
              </button>
              <button type="button" className="ct-icon" onClick={descargarModelo} title="Descargar modelo Excel" aria-label="Descargar modelo Excel"><FileSpreadsheet size={15} strokeWidth={1.8} /></button>
            </>
          )}
          <button type="button" className="q-btn q-btn--line" onClick={exportar} disabled={!filas.length}><FileSpreadsheet size={15} strokeWidth={1.8} /> Excel</button>
          <input ref={archivoRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => importar(e.target.files[0], origenImport)} />
        </div>
        <div className="am-barra__filtros">
          <label className="am-periodo">
            <span>Período</span>
            <select className="q-input ct-select" value={ejercicio} disabled aria-label="Año del ejercicio"><option>{ejercicio}</option></select>
            <select className="q-input ct-select" value={mes} onChange={(e) => { setMes(e.target.value); setSelId(null) }} aria-label="Mes">
              <option value="">Todos</option>
              {MESES.map((m, i) => <option key={m} value={String(i + 1).padStart(2, '0')}>{String(i + 1).padStart(2, '0')} · {m}</option>)}
            </select>
          </label>
          <label className="am-buscar">
            <Search size={15} strokeWidth={1.8} aria-hidden="true" />
            <span className="sr-only">Buscar</span>
            <input ref={buscaRef} className="q-input" type="search" value={busca} placeholder="Buscar  [Ctrl+F]" onChange={(e) => setBusca(e.target.value)} />
          </label>
        </div>
      </div>

      {tipos.length > 1 && (
        <div className="lf-filtros" role="tablist" aria-label="Filtrar por tipo">
          {[{ id: 'todos', label: 'Todos' }, { id: lado, label: 'Facturas' }, { id: 'nc', label: 'Notas de crédito' }, { id: 'nd', label: 'Notas de débito' }].map((o) => (
            <button key={o.id} type="button" role="tab" aria-selected={filtroTipo === o.id} className={filtroTipo === o.id ? 'is-on' : ''} onClick={() => setFiltroTipo(o.id)}>
              {o.label}
              <span>{comprobantes.items.filter((d) => tipos.includes(d.tipo) && String(d.fecha || '').startsWith(mes ? `${ejercicio}-${mes}` : String(ejercicio)) && (o.id === 'todos' || d.tipo.split('-')[0] === o.id)).length}</span>
            </button>
          ))}
          {sinTimbrado > 0 && <span className="lf-filtros__aviso"><AlertTriangle size={13} strokeWidth={2} /> {sinTimbrado} sin timbrado</span>}
        </div>
      )}

      {aviso && (
        <div className={`q-alert ${aviso.tono === 'ok' ? 'q-alert--ok' : ''} ${aviso.tono === 'warn' ? 'am-alert--warn' : ''} am-alert`} role="status">
          <div>
            <p>{aviso.texto}</p>
            {aviso.lista?.length > 0 && <ul>{aviso.lista.map((e) => <li key={e}>{e}</li>)}</ul>}
          </div>
          <button type="button" className="ct-icon" onClick={() => setAviso(null)} aria-label="Cerrar aviso"><X size={14} strokeWidth={1.8} /></button>
        </div>
      )}

      <div className="q-card ct-card">
        <div className="ct-tabla-wrap">
          <table className="q-table ct-tabla am-lista lf-lista">
            <thead><tr>{COLUMNAS.map(th)}</tr></thead>
            <tbody>
              {ordenadas.length === 0 ? (
                <tr><td colSpan={COLUMNAS.length} className="am-vacio">No se encontraron registros</td></tr>
              ) : ordenadas.map((r) => (
                <tr key={r.d.id} className={`am-fila ${selId === r.d.id ? 'is-sel' : ''} ${r.s < 0 ? 'ct-neg' : ''}`} aria-selected={selId === r.d.id}
                  tabIndex={0} onFocus={() => setSelId(r.d.id)}
                  onClick={() => setSelId(r.d.id)} onDoubleClick={() => modificar(r.d)}>
                  <td className="ct-mono">{r.d.numero}</td>
                  <td className="ct-mono">{r.d.timbrado || <span className="lf-falta">falta</span>}</td>
                  <td><span className={`ct-chip is-${r.d.tipo.split('-')[0]}`}>{TIPOS[r.d.tipo].corto}</span></td>
                  <td className="ct-mono">{fechaCorta(r.d.fecha)}</td>
                  <td className="ct-mono">{r.d.personaRuc}</td>
                  <td className="ct-nombre">{r.d.personaNombre}</td>
                  <td><span className={`lf-cv ${r.d.condicion === 'credito' ? 'is-cr' : ''}`}>{r.d.condicion === 'credito' ? 'CR' : 'CO'}</span></td>
                  <td className="ct-mono">{MONEDAS.find((m) => m.id === (r.d.moneda || 'PYG'))?.corto}</td>
                  <td className="ct-num">{gs(r.iva)}</td>
                  <td className="ct-num ct-strong">{gs(r.total)}</td>
                  <td>{r.d.cdc ? <span className="lf-cdc-si" title={formatearCDC(r.d.cdc)}><BadgeCheck size={15} strokeWidth={1.9} /><span className="sr-only">Con CDC</span></span> : ''}</td>
                </tr>
              ))}
            </tbody>
            {ordenadas.length > 0 && (
              <tfoot>
                <tr className="ct-total">
                  <td colSpan={8}>Totales {mes ? `de ${MESES[Number(mes) - 1].toLowerCase()}` : 'del ejercicio'}</td>
                  <td className="ct-num">{gs(tot.iva10 + tot.iva5)}</td>
                  <td className="ct-num">{gs(tot.total)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {sel && (
        <section className="q-card ct-form am-detalle-sel" aria-label="Detalle del comprobante seleccionado">
          <header className="am-detalle-sel__head">
            <div>
              <h3>{sel.numero} · {sel.personaNombre}</h3>
            </div>
          </header>
          <AsientoPreview lineas={lineasDe(sel)} titulo="Asiento" />
        </section>
      )}

      {modal && <ModalComprobante key={modal.id || 'nuevo'} inicial={modal} tipos={tipos} onCerrar={cerrarModal} mesRef={mes} />}
    </div>
  )
}
