import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import * as XLSX from 'xlsx'
import {
  Plus, Pencil, Trash2, Printer, Upload, Copy, Undo2, X, Check, Search, Scale, Wand2, ChevronUp, ChevronDown,
  FileSpreadsheet, AlertTriangle, CornerDownLeft
} from 'lucide-react'
import PageHead from '../PageHead'
import { useContable } from './ContableContext'
import { MontoInput, exportarExcel } from './ui'
import '../../styles/AsientosManuales.css'
import { armarDiario, armarMayor, gs, fechaCorta, hoyISO, n0, nuevoId, naturaleza, MESES, CTA } from '../../services/contabilidad'

/* ── constantes ─────────────────────────────────────────────── */

const CLASES = [
  { id: 'manual', label: 'Asiento manual' },
  { id: 'apertura', label: 'Asiento de apertura' },
  { id: 'ajuste', label: 'Asiento de ajuste' },
  { id: 'reclasificacion', label: 'Reclasificación' },
  { id: 'cierre', label: 'Asiento de cierre' }
]
const claseLabel = (id) => CLASES.find((c) => c.id === id)?.label || 'Asiento manual'

const IPS_PATRONAL = 0.165
const IPS_OBRERO = 0.09

/**
 * Modelos de asientos frecuentes. `monto` pide un importe base y reparte
 * con `f` (factor); `calcular` arma el asiento a partir de los libros.
 */
const MODELOS = [
  {
    id: 'iva', label: 'Liquidación mensual de IVA', clase: 'ajuste',
    desc: 'Compensa el débito fiscal del mes con el crédito fiscal y las retenciones recibidas.',
    calcular: true
  },
  {
    id: 'sueldos', label: 'Sueldos y cargas sociales', clase: 'manual', monto: 'Total de sueldos brutos del mes',
    desc: 'Devenga sueldos, aporte patronal (16,5%) y aporte obrero (9%) al IPS.',
    debe: [{ cuenta: '5.3.01.01', f: 1 }, { cuenta: '5.3.01.02', f: IPS_PATRONAL }],
    haber: [{ cuenta: '2.1.03.06', f: 1 - IPS_OBRERO }, { cuenta: '2.1.03.07', f: IPS_PATRONAL + IPS_OBRERO }]
  },
  {
    id: 'pago-ips', label: 'Pago de IPS', clase: 'manual', monto: 'Importe pagado al IPS',
    desc: 'Cancela el IPS a pagar desde el banco.',
    debe: [{ cuenta: '2.1.03.07', f: 1 }], haber: [{ cuenta: CTA.BANCO, f: 1 }]
  },
  {
    id: 'aguinaldo', label: 'Provisión de aguinaldo', clase: 'ajuste', monto: 'Total de sueldos del mes',
    desc: 'Provisiona la doceava parte de los sueldos del mes.',
    debe: [{ cuenta: '5.3.01.03', f: 1 / 12 }], haber: [{ cuenta: '2.1.04.01', f: 1 / 12 }]
  },
  {
    id: 'deposito', label: 'Depósito de caja en banco', clase: 'manual', monto: 'Importe depositado',
    desc: 'Pasa efectivo de caja a la cuenta corriente.',
    debe: [{ cuenta: CTA.BANCO, f: 1 }], haber: [{ cuenta: CTA.CAJA, f: 1 }]
  },
  {
    id: 'gastos-bancarios', label: 'Comisiones y gastos bancarios', clase: 'manual', monto: 'Importe debitado por el banco',
    desc: 'Registra débitos del extracto por comisiones y mantenimiento.',
    debe: [{ cuenta: '5.4.01.02', f: 1 }], haber: [{ cuenta: CTA.BANCO, f: 1 }]
  }
]

const normalizar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const mesActual = () => String(new Date().getMonth() + 1).padStart(2, '0')
const linea = (cuenta = '', valor = '') => ({ key: nuevoId(), cuenta, valor })
const totalDe = (lado) => lado.reduce((s, l) => s + n0(l.valor), 0)

/* ── buscador con autocompletado (cuentas y personas) ───────── */

export function Buscador({ id, items, valor, onElegir, placeholder, inputRef, onEnterVacio, ariaLabel, onTexto, inputProps = {} }) {
  const elegido = items.find((x) => x.value === valor)
  const [texto, setTexto] = useState(elegido?.label || valor || '')
  const [abierto, setAbierto] = useState(false)
  const [activo, setActivo] = useState(0)
  const listaId = `${id}-lista`

  useEffect(() => { setTexto(elegido?.label || valor || '') }, [valor]) // eslint-disable-line react-hooks/exhaustive-deps

  const q = normalizar(texto)
  const resultados = useMemo(() => {
    if (!q || (elegido && texto === elegido.label)) return items.slice(0, 40)
    // orden: código que empieza igual → nombre que empieza igual → palabra que empieza igual → contiene
    const nombre = (x) => normalizar(x.text || x.search)
    const porCodigo = items.filter((x) => normalizar(x.value).startsWith(q))
    const resto = items.filter((x) => !porCodigo.includes(x) && normalizar(x.search).includes(q))
    const rango = (x) => (nombre(x).startsWith(q) ? 0 : new RegExp(`(^|[^a-z0-9])${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(nombre(x)) ? 1 : 2)
    return [...porCodigo, ...resto.sort((a, b) => rango(a) - rango(b))].slice(0, 40)
  }, [items, q, elegido, texto])

  const elegir = (it) => {
    onElegir(it.value)
    setTexto(it.label)
    setAbierto(false)
  }

  return (
    <div className="am-busca">
      <Search size={15} strokeWidth={1.8} aria-hidden="true" className="am-busca__ico" />
      <input
        id={id}
        ref={inputRef}
        className="q-input am-busca__input"
        role="combobox"
        aria-expanded={abierto}
        aria-controls={listaId}
        aria-autocomplete="list"
        aria-label={ariaLabel}
        autoComplete="off"
        value={texto}
        placeholder={placeholder}
        {...inputProps}
        onFocus={(e) => { e.target.select(); setAbierto(true) }}
        onBlur={() => setTimeout(() => setAbierto(false), 140)}
        onChange={(e) => { setTexto(e.target.value); setAbierto(true); setActivo(0); onTexto?.(e.target.value); if (!e.target.value) onElegir('') }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setAbierto(true); setActivo((a) => Math.min(a + 1, resultados.length - 1)) }
          if (e.key === 'ArrowUp') { e.preventDefault(); setActivo((a) => Math.max(a - 1, 0)) }
          if (e.key === 'Enter') {
            e.preventDefault()
            if (abierto && resultados[activo] && !(elegido && texto === elegido.label)) elegir(resultados[activo])
            else { setAbierto(false); onEnterVacio?.(texto) }
          }
          if (e.key === 'Escape' && abierto) { e.stopPropagation(); setAbierto(false) }
        }}
      />
      {abierto && resultados.length > 0 && (
        <ul id={listaId} className="am-busca__lista" role="listbox">
          {resultados.map((it, i) => (
            <li key={it.value} role="option" aria-selected={i === activo} className={i === activo ? 'is-on' : ''}
              onMouseDown={(e) => { e.preventDefault(); elegir(it) }} onMouseEnter={() => setActivo(i)}>
              <span className="am-busca__cod">{it.code}</span>
              <span className="am-busca__txt">{it.text}</span>
              {it.extra && <span className="am-busca__extra">{it.extra}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ── pestaña Debe / Haber ───────────────────────────────────── */

function Lado({ lado, lineas, setLineas, opcionesCuenta, saldoDe, nombreCuenta, diferencia, cuadra }) {
  const [cuenta, setCuenta] = useState('')
  const [valor, setValor] = useState('')
  const [aviso, setAviso] = useState('')
  const cuentaRef = useRef(null)
  const valorRef = useRef(null)
  const rotulo = lado === 'debe' ? 'Debe' : 'Haber'
  // lo que le falta a este lado para igualar al otro
  const falta = lado === 'debe' ? -diferencia : diferencia

  useEffect(() => { cuentaRef.current?.focus() }, [])

  const agregar = () => {
    if (!cuenta) { setAviso('Elegí una cuenta contable.'); cuentaRef.current?.focus(); return }
    if (!n0(valor)) { setAviso('Indicá un valor mayor a cero.'); valorRef.current?.focus(); return }
    setLineas([...lineas, linea(cuenta, n0(valor))])
    setCuenta('')
    setValor('')
    setAviso('')
    cuentaRef.current?.focus()
  }

  const saldo = cuenta ? saldoDe(cuenta) : null

  return (
    <div className="am-lado">
      <div className="am-carga">
        <div className="am-carga__cuenta">
          <label className="q-label" htmlFor={`am-cta-${lado}`}>Cuenta contable</label>
          <Buscador
            id={`am-cta-${lado}`}
            items={opcionesCuenta}
            valor={cuenta}
            onElegir={(v) => { setCuenta(v); setAviso(''); if (v) setTimeout(() => valorRef.current?.focus(), 0) }}
            placeholder="Código o nombre"
            inputRef={cuentaRef}
            ariaLabel={`Cuenta contable del ${rotulo}`}
          />
          {saldo && (
            <small className="am-saldo">
              Saldo <strong className="ct-num">₲ {gs(saldo.saldo)}</strong>
            </small>
          )}
        </div>
        <div className="am-carga__valor">
          <label className="q-label" htmlFor={`am-val-${lado}`}>Valor</label>
          <MontoInput id={`am-val-${lado}`} value={valor} onChange={(v) => { setValor(v); setAviso('') }}
            ref={valorRef} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregar() } }} />
          {falta > 0 && (
            <button type="button" className="am-cuadrar" onClick={() => { setValor(falta); valorRef.current?.focus() }} title="Completa el valor con la diferencia pendiente">
              <Wand2 size={13} strokeWidth={1.8} aria-hidden="true" /> ₲ {gs(falta)}
            </button>
          )}
        </div>
        <button type="button" className="q-btn q-btn--primary am-carga__add" onClick={agregar} aria-label={`Agregar línea al ${rotulo}`}>
          <Plus size={16} strokeWidth={2} /> Agregar
          <kbd className="am-kbd"><CornerDownLeft size={11} strokeWidth={2} /></kbd>
        </button>
      </div>
      {aviso && <p className="am-aviso" role="alert">{aviso}</p>}

      <div className="am-grilla">
        <table className="q-table ct-tabla">
          <thead>
            <tr><th className="am-col-n">Nº</th><th>Código</th><th>Cuenta</th><th className="ct-der">Valor</th><th><span className="sr-only">Quitar</span></th></tr>
          </thead>
          <tbody>
            {lineas.length === 0 ? (
              <tr><td colSpan={5} className="am-vacio">Sin datos</td></tr>
            ) : lineas.map((l, i) => (
              <tr key={l.key}>
                <td className="ct-mono am-col-n">{i + 1}</td>
                <td className="ct-mono ct-cod">{l.cuenta}</td>
                <td>{nombreCuenta(l.cuenta)}</td>
                <td className="am-col-valor">
                  <MontoInput value={l.valor} aria-label={`Valor de ${nombreCuenta(l.cuenta)}`}
                    onChange={(v) => setLineas(lineas.map((x) => (x.key === l.key ? { ...x, valor: v } : x)))} />
                </td>
                <td className="ct-acciones">
                  <button type="button" className="ct-icon ct-icon--del" onClick={() => setLineas(lineas.filter((x) => x.key !== l.key))} aria-label={`Quitar ${nombreCuenta(l.cuenta)}`} title="Quitar línea">
                    <Trash2 size={14} strokeWidth={1.8} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          {lineas.length > 0 && (
            <tfoot>
              <tr className="ct-total"><td colSpan={3}>Total {rotulo}</td><td className="ct-num">{gs(totalDe(lineas))}</td><td /></tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}

/* ── ventana "Registrar asiento contable" ───────────────────── */

function ModalAsiento({ inicial, onCerrar, otros }) {
  const { comprobantes, personas, imputables, nombreCuenta, ejercicio, plan } = useContable()
  const [tab, setTab] = useState('encabezado')
  const [cab, setCab] = useState(inicial.cab)
  const [debe, setDebe] = useState(inicial.debe)
  const [haber, setHaber] = useState(inicial.haber)
  const [error, setError] = useState([])
  const [modelo, setModelo] = useState('')
  const [montoModelo, setMontoModelo] = useState('')
  const panel = useRef(null)

  const td = totalDe(debe)
  const th = totalDe(haber)
  const diferencia = td - th
  const cuadra = td > 0 && diferencia === 0

  // saldos de las cuentas sin contar este asiento (ayuda a decidir el importe)
  const mayor = useMemo(() => armarMayor(armarDiario(otros, ejercicio)), [otros, ejercicio])
  const saldoDe = (c) => {
    const m = mayor.get(c)
    return { saldo: m?.saldo || 0, movimientos: m?.movimientos.length || 0 }
  }

  const opcionesCuenta = useMemo(() => imputables.map((c) => ({
    value: c.codigo, code: c.codigo, text: c.nombre, label: `${c.codigo} · ${c.nombre}`, search: `${c.codigo} ${c.nombre}`
  })), [imputables])

  const opcionesPersona = useMemo(() => personas.items.map((p) => ({
    value: p.ruc, code: p.ruc, text: p.nombre, label: `${p.ruc} · ${p.nombre}`, search: `${p.ruc} ${p.nombre}`,
    extra: p.tipo === 'ambos' ? 'Cliente y proveedor' : p.tipo === 'cliente' ? 'Cliente' : 'Proveedor'
  })), [personas.items])

  const setC = (c) => { setCab((x) => ({ ...x, ...c })); setError([]) }

  const aplicarModelo = () => {
    const m = MODELOS.find((x) => x.id === modelo)
    if (!m) return
    const fecha = cab.fecha || hoyISO()
    if (m.calcular) {
      // liquidación de IVA del mes de la fecha del asiento
      const mes = fecha.slice(0, 7)
      const delMes = armarDiario(otros.filter((d) => (d.fecha || '').startsWith(mes)), ejercicio)
      const s = armarMayor(delMes)
      const sal = (c) => s.get(c)?.saldo || 0
      const df10 = sal(CTA.IVA_DF10)
      const df5 = sal(CTA.IVA_DF5)
      const df = df10 + df5
      if (df <= 0) { setError([`No hay débito fiscal registrado en ${MESES[Number(mes.slice(5)) - 1]} para liquidar.`]); return }
      let resto = df
      const hab = []
      ;[CTA.IVA_CF10, CTA.IVA_CF5, CTA.RET_IVA_RECIBIDAS].forEach((c) => {
        const usar = Math.min(Math.max(sal(c), 0), resto)
        if (usar > 0) { hab.push(linea(c, usar)); resto -= usar }
      })
      if (resto > 0) hab.push(linea('2.1.03.03', resto))
      setDebe([df10 && linea(CTA.IVA_DF10, df10), df5 && linea(CTA.IVA_DF5, df5)].filter(Boolean))
      setHaber(hab)
      setC({ clase: m.clase, concepto: `Liquidación de IVA · ${MESES[Number(mes.slice(5)) - 1]} ${mes.slice(0, 4)}` })
      setTab('debe')
      return
    }
    const base = n0(montoModelo)
    if (m.monto && !base) { setError([`Indicá ${m.monto.toLowerCase()} para aplicar el modelo.`]); return }
    const armar = (lista) => lista.map((x) => linea(x.cuenta, base ? Math.round(base * x.f) : ''))
    const d = armar(m.debe)
    const h = armar(m.haber)
    // ajuste de redondeo para que cuadre exacto
    const dif = totalDe(d) - totalDe(h)
    if (dif && h.length) h[h.length - 1].valor = n0(h[h.length - 1].valor) + dif
    setDebe(d)
    setHaber(h)
    setC({ clase: m.clase, concepto: cab.concepto || m.label })
    setTab('debe')
  }

  const guardar = () => {
    const errs = []
    if (!cab.fecha) errs.push('Indicá la fecha del asiento.')
    else if (!cab.fecha.startsWith(String(ejercicio))) errs.push(`La fecha tiene que estar dentro del ejercicio ${ejercicio}.`)
    if (!cab.concepto.trim()) errs.push('Escribí el detalle del asiento en Encabezado.')
    if (!debe.length) errs.push('Cargá al menos una cuenta en el Debe.')
    if (!haber.length) errs.push('Cargá al menos una cuenta en el Haber.')
    if ([...debe, ...haber].some((l) => !n0(l.valor))) errs.push('Hay líneas con valor cero: completalas o quitalas.')
    const desconocidas = [...debe, ...haber].filter((l) => !plan.some((c) => c.codigo === l.cuenta))
    if (desconocidas.length) errs.push(`Cuentas que no existen en el plan: ${desconocidas.map((l) => l.cuenta).join(', ')}.`)
    if (td !== th) errs.push(`El asiento no cuadra: Debe ₲ ${gs(td)} · Haber ₲ ${gs(th)} · Diferencia ₲ ${gs(Math.abs(diferencia))} ${diferencia > 0 ? 'de más en el Debe' : 'de más en el Haber'}.`)
    if (errs.length) { setError(errs); return }
    comprobantes.guardar({
      id: inicial.id,
      creadoEn: inicial.creadoEn,
      tipo: 'asiento',
      clase: cab.clase,
      fecha: cab.fecha,
      concepto: cab.concepto.trim(),
      personaRuc: cab.personaRuc || '',
      personaNombre: cab.personaRuc ? (personas.items.find((p) => p.ruc === cab.personaRuc)?.nombre || '') : '',
      lineas: [
        ...debe.map((l) => ({ cuenta: l.cuenta, debe: n0(l.valor), haber: 0 })),
        ...haber.map((l) => ({ cuenta: l.cuenta, debe: 0, haber: n0(l.valor) }))
      ],
      editadoEn: inicial.id ? new Date().toISOString() : null
    })
    onCerrar(true)
  }

  // atajos: Alt+E / Alt+D / Alt+H cambian de pestaña, Ctrl+Enter o Alt+G guardan, Esc cierra
  useEffect(() => {
    const onKey = (e) => {
      const k = e.key.toLowerCase()
      if (e.altKey && k === 'e') { e.preventDefault(); setTab('encabezado') }
      if (e.altKey && k === 'd') { e.preventDefault(); setTab('debe') }
      if (e.altKey && k === 'h') { e.preventDefault(); setTab('haber') }
      if ((e.altKey && k === 'g') || (e.ctrlKey && k === 'enter')) { e.preventDefault(); guardar() }
      if (k === 'escape') onCerrar(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  useEffect(() => { panel.current?.querySelector('input, select')?.focus() }, [])

  const TABS = [
    { id: 'encabezado', label: 'Encabezado', tecla: 'E' },
    { id: 'debe', label: 'Asiento Debe', tecla: 'D', n: debe.length },
    { id: 'haber', label: 'Asiento Haber', tecla: 'H', n: haber.length }
  ]
  const conTecla = (t) => {
    const i = t.label.indexOf(t.tecla)
    return <span>{t.label.slice(0, i)}<u>{t.tecla}</u>{t.label.slice(i + 1)}</span>
  }
  const modeloSel = MODELOS.find((m) => m.id === modelo)

  // se monta fuera de la hoja (que tiene animación con transform) para cubrir toda la pantalla
  return createPortal(
    <div className="q-content am-overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar(false) }}>
      <div className="am-modal" role="dialog" aria-modal="true" aria-labelledby="am-titulo" ref={panel}>
        <header className="am-modal__head">
          <div>
            <h2 id="am-titulo" className="am-modal__title">Registrar asiento contable</h2>
          </div>
          <button type="button" className="q-ghost-icon" onClick={() => onCerrar(false)} aria-label="Cerrar"><X size={18} strokeWidth={1.7} /></button>
        </header>

        <div className="am-tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'is-on' : ''} onClick={() => setTab(t.id)}>
              {conTecla(t)}
              {t.n !== undefined && <span className="am-tabs__n">{t.n}</span>}
            </button>
          ))}
        </div>

        {/* balance siempre visible */}
        <div className={`am-balance ${cuadra ? 'is-ok' : td || th ? 'is-err' : ''}`} aria-live="polite">
          <div><span>Debe</span><strong className="ct-num">{gs(td)}</strong></div>
          <div><span>Haber</span><strong className="ct-num">{gs(th)}</strong></div>
          <div><span>Diferencia</span><strong className="ct-num">{gs(Math.abs(diferencia))}</strong></div>
          <p className="am-balance__estado">
            <Scale size={15} strokeWidth={1.8} aria-hidden="true" />
            {cuadra ? 'Cuadra' : td || th ? (diferencia > 0 ? 'Falta en el Haber' : 'Falta en el Debe') : 'Sin importes'}
          </p>
        </div>

        <div className="am-modal__body">
          {tab === 'encabezado' && (
            <div className="am-cab">
              <div className="am-cab__grid">
                <div className="q-field">
                  <label className="q-label" htmlFor="am-clase">Tipo</label>
                  <select id="am-clase" className="q-input ct-select" value={cab.clase} onChange={(e) => setC({ clase: e.target.value })}>
                    {CLASES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
                <div className="q-field">
                  <label className="q-label" htmlFor="am-fecha">Fecha</label>
                  <input id="am-fecha" className="q-input" type="date" value={cab.fecha} min={`${ejercicio}-01-01`} max={`${ejercicio}-12-31`} onChange={(e) => setC({ fecha: e.target.value })} />
                </div>
                <div className="q-field">
                  <span className="q-label">Total</span>
                  <output className="am-total ct-num">₲ {gs(td)}</output>
                </div>
                <div className="q-field am-span">
                  <label className="q-label" htmlFor="am-persona">Persona</label>
                  <Buscador id="am-persona" items={opcionesPersona} valor={cab.personaRuc} onElegir={(v) => setC({ personaRuc: v })}
                    placeholder="RUC o nombre" ariaLabel="Persona" />
                </div>
                <div className="q-field am-span">
                  <label className="q-label" htmlFor="am-detalle">Detalle</label>
                  <textarea id="am-detalle" className="q-input am-detalle" rows={2} value={cab.concepto}
                    onChange={(e) => setC({ concepto: e.target.value })} />
                </div>
                <div className="am-span am-modelo">
                  <select className="q-input ct-select" value={modelo} aria-label="Modelo de asiento" onChange={(e) => { setModelo(e.target.value); setError([]) }}>
                    <option value="">Modelo…</option>
                    {MODELOS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                  {modeloSel?.monto && (
                    <MontoInput id="am-modelo-monto" value={montoModelo} onChange={setMontoModelo} aria-label={modeloSel.monto} placeholder="Monto"
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); aplicarModelo() } }} />
                  )}
                  {modeloSel && <button type="button" className="q-btn q-btn--line" onClick={aplicarModelo}>Aplicar</button>}
                </div>
              </div>

            </div>
          )}

          {tab === 'debe' && <Lado key="debe" lado="debe" lineas={debe} setLineas={(x) => { setDebe(x); setError([]) }} opcionesCuenta={opcionesCuenta} saldoDe={saldoDe} nombreCuenta={nombreCuenta} diferencia={diferencia} cuadra={cuadra} />}
          {tab === 'haber' && <Lado key="haber" lado="haber" lineas={haber} setLineas={(x) => { setHaber(x); setError([]) }} opcionesCuenta={opcionesCuenta} saldoDe={saldoDe} nombreCuenta={nombreCuenta} diferencia={diferencia} cuadra={cuadra} />}
        </div>

        {error.length > 0 && (
          <div className="am-error" role="alert">
            <AlertTriangle size={18} strokeWidth={2} aria-hidden="true" />
            <ul>{error.map((e) => <li key={e}>{e}</li>)}</ul>
          </div>
        )}

        <footer className="am-modal__foot">
          <button type="button" className="q-btn q-btn--line" onClick={() => onCerrar(false)}><X size={15} strokeWidth={1.8} /> Cancelar</button>
          <button type="button" className="q-btn q-btn--primary" onClick={guardar}><Check size={15} strokeWidth={2} /> <span><u>G</u>uardar</span></button>
        </footer>
      </div>
    </div>,
    document.querySelector('.q-app') || document.body
  )
}

/* ── importar desde Excel ───────────────────────────────────── */

const fechaExcel = (v) => {
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v)
    return d ? `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}` : ''
  }
  const s = String(v || '').trim()
  const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ''
}

const leerImportacion = async (file, plan, ejercicio) => {
  const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true })
  const filas = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' })
  const iCab = filas.findIndex((f) => f.some((c) => normalizar(c) === 'cuenta'))
  if (iCab < 0) throw new Error('No encontré la fila de títulos (Fecha, Concepto, Cuenta, Debe, Haber).')
  const cab = filas[iCab].map(normalizar)
  const col = (n) => cab.findIndex((c) => c === n)
  const [cF, cC, cCta, cD, cH] = [col('fecha'), col('concepto'), col('cuenta'), col('debe'), col('haber')]
  if ([cF, cC, cCta, cD, cH].some((x) => x < 0)) throw new Error('Faltan columnas: el modelo lleva Fecha, Concepto, Cuenta, Debe y Haber.')

  const grupos = []
  filas.slice(iCab + 1).forEach((f, i) => {
    if (!String(f[cCta]).trim() && !f[cD] && !f[cH]) return
    const fecha = fechaExcel(f[cF]) || grupos.at(-1)?.fecha || ''
    const concepto = String(f[cC] || '').trim() || grupos.at(-1)?.concepto || ''
    let g = grupos.at(-1)
    if (!g || g.fecha !== fecha || g.concepto !== concepto) { g = { fecha, concepto, lineas: [], fila: iCab + i + 2 }; grupos.push(g) }
    g.lineas.push({ cuenta: String(f[cCta]).trim(), debe: n0(String(f[cD]).replace(/\./g, '').replace(',', '.')), haber: n0(String(f[cH]).replace(/\./g, '').replace(',', '.')) })
  })

  const codigos = new Set(plan.filter((c) => c.imputable).map((c) => c.codigo))
  const validos = []
  const errores = []
  grupos.forEach((g) => {
    const d = g.lineas.reduce((s, l) => s + l.debe, 0)
    const h = g.lineas.reduce((s, l) => s + l.haber, 0)
    const malas = g.lineas.filter((l) => !codigos.has(l.cuenta)).map((l) => l.cuenta)
    const ref = `Fila ${g.fila} («${g.concepto || 'sin concepto'}»)`
    if (!g.fecha.startsWith(String(ejercicio))) errores.push(`${ref}: la fecha no es del ejercicio ${ejercicio}.`)
    else if (!g.concepto) errores.push(`${ref}: falta el concepto.`)
    else if (malas.length) errores.push(`${ref}: cuentas inexistentes o no imputables ${malas.join(', ')}.`)
    else if (d !== h || !d) errores.push(`${ref}: no cuadra (Debe ${gs(d)} · Haber ${gs(h)}).`)
    else validos.push(g)
  })
  return { validos, errores }
}

/* ── impresión ──────────────────────────────────────────────── */

const escapar = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

const imprimir = (asientos, contribuyente, titulo, nombreCuenta) => {
  const cuerpo = asientos.map((a) => {
    const filas = a.lineas.map((l) => `<tr><td class="c">${escapar(l.cuenta)}</td><td class="${l.haber ? 'h' : ''}">${escapar(nombreCuenta(l.cuenta))}</td><td class="n">${l.debe ? gs(l.debe) : ''}</td><td class="n">${l.haber ? gs(l.haber) : ''}</td></tr>`).join('')
    const t = a.lineas.reduce((s, l) => s + l.debe, 0)
    return `<section><h2><span>${fechaCorta(a.fecha)}</span> ${escapar(a.concepto)}<em>${escapar(claseLabel(a.clase))}${a.personaNombre ? ` · ${escapar(a.personaRuc)} ${escapar(a.personaNombre)}` : ''}</em></h2>
      <table><thead><tr><th>Código</th><th>Cuenta</th><th class="n">Debe</th><th class="n">Haber</th></tr></thead><tbody>${filas}</tbody>
      <tfoot><tr><td></td><td>Totales</td><td class="n">${gs(t)}</td><td class="n">${gs(t)}</td></tr></tfoot></table></section>`
  }).join('')
  const w = window.open('', '_blank', 'width=900,height=700')
  if (!w) return false
  w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapar(titulo)}</title><style>
    body{font:12px/1.4 -apple-system,'Segoe UI',Roboto,sans-serif;color:#0b1b33;margin:28px}
    header{border-bottom:2px solid #0b1b33;padding-bottom:8px;margin-bottom:18px}
    header h1{font-size:18px;margin:0} header p{margin:2px 0 0;color:#3a4a63}
    section{break-inside:avoid;margin-bottom:18px} h2{font-size:13px;margin:0 0 6px}
    h2 span{font-family:ui-monospace,Consolas,monospace;margin-right:8px} h2 em{display:block;font-weight:400;color:#6b7a90;font-style:normal}
    table{width:100%;border-collapse:collapse} th,td{padding:4px 6px;border-bottom:1px solid #dce5f0;text-align:left}
    th{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#6b7a90}
    .n{text-align:right;font-family:ui-monospace,Consolas,monospace} .c{font-family:ui-monospace,Consolas,monospace;color:#6b7a90;width:90px}
    .h{padding-left:28px} tfoot td{font-weight:600;border-bottom:3px double #0b1b33}
  </style></head><body><header><h1>${escapar(titulo)}</h1><p>${escapar(contribuyente.razonSocial)} · RUC ${escapar(contribuyente.ruc)} · Ejercicio ${escapar(contribuyente.ejercicio)}</p></header>${cuerpo}
  <script>window.onload=function(){window.print()}</script></body></html>`)
  w.document.close()
  return true
}

/* ── listado ────────────────────────────────────────────────── */

const aModal = (doc) => ({
  id: doc?.id,
  creadoEn: doc?.creadoEn,
  cab: {
    clase: doc?.clase || 'manual',
    fecha: doc?.fecha || '',
    concepto: doc?.concepto || '',
    personaRuc: doc?.personaRuc || ''
  },
  debe: (doc?.lineas || []).filter((l) => n0(l.debe)).map((l) => linea(l.cuenta, n0(l.debe))),
  haber: (doc?.lineas || []).filter((l) => n0(l.haber)).map((l) => linea(l.cuenta, n0(l.haber)))
})

export default function AsientosManuales() {
  const { comprobantes, ejercicio, nombreCuenta, contribuyente, plan } = useContable()
  const [mes, setMes] = useState(() => (String(new Date().getFullYear()) === String(ejercicio) ? mesActual() : ''))
  const [busca, setBusca] = useState('')
  const [orden, setOrden] = useState({ campo: 'fecha', dir: 1 })
  const [selId, setSelId] = useState(null)
  const [modal, setModal] = useState(null)
  const [aviso, setAviso] = useState(null) // { tono, texto, lista? }
  const buscaRef = useRef(null)
  const archivoRef = useRef(null)

  const fechaDefecto = () => {
    const hoy = hoyISO()
    if (hoy.startsWith(String(ejercicio)) && (!mes || hoy.slice(5, 7) === mes)) return hoy
    return `${ejercicio}-${mes || '01'}-01`
  }

  const todos = comprobantes.items.filter((d) => d.tipo === 'asiento')
  const numeros = useMemo(() => new Map(armarDiario(comprobantes.items, ejercicio).map((a) => [a.doc.id, a.numero])), [comprobantes.items, ejercicio])

  const q = normalizar(busca)
  const lista = todos
    .filter((d) => String(d.fecha || '').startsWith(mes ? `${ejercicio}-${mes}` : String(ejercicio)))
    .filter((d) => !q || normalizar(`${d.concepto} ${d.personaNombre || ''} ${d.personaRuc || ''} ${claseLabel(d.clase)} ${d.lineas.map((l) => `${l.cuenta} ${nombreCuenta(l.cuenta)}`).join(' ')}`).includes(q))
    .map((d) => ({ d, total: d.lineas.reduce((s, l) => s + n0(l.debe), 0) }))
    .sort((a, b) => {
      const v = orden.campo === 'total' ? a.total - b.total
        : orden.campo === 'concepto' ? a.d.concepto.localeCompare(b.d.concepto)
          : (a.d.fecha || '').localeCompare(b.d.fecha || '') || (a.d.creadoEn || '').localeCompare(b.d.creadoEn || '')
      return v * orden.dir
    })

  const sel = lista.find((r) => r.d.id === selId)?.d || null
  const otros = useMemo(() => comprobantes.items.filter((d) => d.id !== modal?.id), [comprobantes.items, modal?.id])
  const totalPeriodo = lista.reduce((s, r) => s + r.total, 0)

  const abrir = (doc, extra = {}) => { setAviso(null); setModal({ ...aModal(doc), ...extra }) }
  const nuevo = () => abrir(null, { cab: { ...aModal(null).cab, fecha: fechaDefecto() } })
  const modificar = () => sel && abrir(sel)
  const duplicar = () => sel && abrir(sel, { id: undefined, creadoEn: undefined, cab: { ...aModal(sel).cab, fecha: fechaDefecto(), concepto: `${sel.concepto} (copia)` } })
  const revertir = () => {
    if (!sel) return
    const base = aModal(sel)
    abrir(null, {
      cab: { ...base.cab, clase: 'ajuste', fecha: fechaDefecto(), concepto: `Reversión: ${sel.concepto}` },
      debe: base.haber.map((l) => linea(l.cuenta, l.valor)),
      haber: base.debe.map((l) => linea(l.cuenta, l.valor))
    })
  }
  const eliminar = () => {
    if (!sel) return
    if (window.confirm(`¿Eliminar el asiento «${sel.concepto}» del ${fechaCorta(sel.fecha)}? Se quita del Libro Diario y del Mayor.`)) {
      comprobantes.eliminar(sel.id)
      setSelId(null)
      setAviso({ tono: 'ok', texto: 'Eliminado.' })
    }
  }

  const cerrarModal = (guardado) => {
    if (guardado) setAviso({ tono: 'ok', texto: modal?.id ? 'Modificado.' : 'Registrado.' })
    setModal(null)
  }

  const imprimirLista = () => {
    const asientos = (sel ? [sel] : lista.map((r) => r.d))
    const titulo = sel ? `Asiento ${numeros.get(sel.id) || ''} · ${sel.concepto}` : `Asientos manuales · ${mes ? `${MESES[Number(mes) - 1]} ` : ''}${ejercicio}`
    if (!imprimir(asientos, contribuyente, titulo, nombreCuenta)) setAviso({ tono: 'err', texto: 'El navegador bloqueó la ventana de impresión. Permití ventanas emergentes para Quadra.' })
  }

  const importar = async (file) => {
    if (!file) return
    try {
      const { validos, errores } = await leerImportacion(file, plan, ejercicio)
      validos.forEach((g) => comprobantes.guardar({ tipo: 'asiento', clase: 'manual', fecha: g.fecha, concepto: g.concepto, personaRuc: '', personaNombre: '', lineas: g.lineas, importado: file.name }))
      setAviso({
        tono: errores.length ? (validos.length ? 'warn' : 'err') : 'ok',
        texto: `${validos.length} importados${errores.length ? ` · ${errores.length} con errores:` : ''}`,
        lista: errores
      })
    } catch (err) {
      setAviso({ tono: 'err', texto: err.message || 'No pude leer el archivo.' })
    }
    if (archivoRef.current) archivoRef.current.value = ''
  }

  const descargarModelo = () => exportarExcel('Modelo de importación de asientos', 'Asientos', [
    ['Fecha', 'Concepto', 'Cuenta', 'Debe', 'Haber'],
    [`01/01/${ejercicio}`, 'Asiento de apertura', '1.1.01.01', 5000000, ''],
    [`01/01/${ejercicio}`, 'Asiento de apertura', '3.1.01.01', '', 5000000]
  ])

  // Ctrl+F busca, Alt+N nuevo (si no hay ventana abierta)
  useEffect(() => {
    const onKey = (e) => {
      if (modal) return
      if (e.ctrlKey && e.key.toLowerCase() === 'f') { e.preventDefault(); buscaRef.current?.focus() }
      if (e.altKey && e.key.toLowerCase() === 'n') { e.preventDefault(); nuevo() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  const th = (campo, label, cls = '') => (
    <th className={cls} aria-sort={orden.campo === campo ? (orden.dir > 0 ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="am-sort" onClick={() => setOrden({ campo, dir: orden.campo === campo ? -orden.dir : 1 })}>
        {label}
        {orden.campo === campo ? (orden.dir > 0 ? <ChevronUp size={13} strokeWidth={2} /> : <ChevronDown size={13} strokeWidth={2} />) : <ChevronDown size={13} strokeWidth={2} className="am-sort__off" />}
      </button>
    </th>
  )

  return (
    <div className="q-sheet q-sheet--wide ct-sheet">
      <PageHead title="Asientos manuales" status={comprobantes.status} />

      <div className="am-barra">
        <div className="am-barra__acciones" role="toolbar" aria-label="Acciones sobre asientos">
          <button type="button" className="q-btn q-btn--primary" onClick={nuevo} title="Alt+N"><Plus size={16} strokeWidth={2} /> <span><u>N</u>uevo</span></button>
          <button type="button" className="q-btn q-btn--line" onClick={modificar} disabled={!sel}><Pencil size={15} strokeWidth={1.8} /> Modificar</button>
          <button type="button" className="q-btn q-btn--line" onClick={duplicar} disabled={!sel} title="Copia el asiento con fecha nueva"><Copy size={15} strokeWidth={1.8} /> Duplicar</button>
          <button type="button" className="q-btn q-btn--line" onClick={revertir} disabled={!sel} title="Arma el contraasiento invirtiendo Debe y Haber"><Undo2 size={15} strokeWidth={1.8} /> Revertir</button>
          <button type="button" className="q-btn q-btn--line am-btn-del" onClick={eliminar} disabled={!sel}><Trash2 size={15} strokeWidth={1.8} /> Eliminar</button>
          <span className="am-barra__sep" aria-hidden="true" />
          <button type="button" className="q-btn q-btn--line" onClick={imprimirLista} disabled={!lista.length} title={sel ? 'Imprime el asiento seleccionado' : 'Imprime los asientos del período'}><Printer size={15} strokeWidth={1.8} /> Imprimir</button>
          <button type="button" className="q-btn q-btn--line" onClick={() => archivoRef.current?.click()}><Upload size={15} strokeWidth={1.8} /> Importar</button>
          <button type="button" className="ct-icon" onClick={descargarModelo} title="Descargar modelo Excel" aria-label="Descargar modelo Excel"><FileSpreadsheet size={15} strokeWidth={1.8} /></button>
          <input ref={archivoRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => importar(e.target.files[0])} />
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
          <table className="q-table ct-tabla am-lista">
            <thead>
              <tr>
                {th('fecha', 'Fecha', 'am-col-fecha')}
                <th className="am-col-n">Nº</th>
                {th('concepto', 'Concepto')}
                <th className="ct-der am-col-n">Líneas</th>
                {th('total', 'Total', 'ct-der am-col-total')}
              </tr>
            </thead>
            <tbody>
              {lista.length === 0 ? (
                <tr><td colSpan={5} className="am-vacio">No se encontraron registros</td></tr>
              ) : lista.map(({ d, total }) => (
                <tr key={d.id} className={`am-fila ${selId === d.id ? 'is-sel' : ''}`} aria-selected={selId === d.id}
                  onClick={() => setSelId(selId === d.id ? null : d.id)} onDoubleClick={() => abrir(d)}>
                  <td className="ct-mono">{fechaCorta(d.fecha)}</td>
                  <td className="ct-mono am-col-n">{numeros.get(d.id) || ''}</td>
                  <td>
                    <button type="button" className="am-fila__btn" onClick={(e) => { e.stopPropagation(); setSelId(selId === d.id ? null : d.id) }} aria-pressed={selId === d.id}>
                      <span className="am-fila__concepto">{d.concepto}</span>
                      <span className="am-fila__meta">{claseLabel(d.clase)}{d.personaNombre ? ` · ${d.personaNombre}` : ''}{d.importado ? ' · importado' : ''}</span>
                    </button>
                  </td>
                  <td className="ct-num am-col-n">{d.lineas.length}</td>
                  <td className="ct-num ct-strong">{gs(total)}</td>
                </tr>
              ))}
            </tbody>
            {lista.length > 0 && (
              <tfoot>
                <tr className="ct-total"><td colSpan={4}>Total {mes ? `de ${MESES[Number(mes) - 1].toLowerCase()}` : 'del ejercicio'}</td><td className="ct-num">{gs(totalPeriodo)}</td></tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {sel && (
        <section className="q-card ct-form am-detalle-sel" aria-label="Detalle del asiento seleccionado">
          <header className="am-detalle-sel__head">
            <div>
              <h3>Nº {numeros.get(sel.id)} · {fechaCorta(sel.fecha)} · {sel.concepto}</h3>
            </div>
          </header>
          <table className="q-table ct-tabla ct-tabla--mini">
            <thead><tr><th>Código</th><th>Cuenta</th><th className="ct-der">Debe</th><th className="ct-der">Haber</th></tr></thead>
            <tbody>
              {sel.lineas.map((l, i) => (
                <tr key={i}>
                  <td className="ct-mono ct-cod">{l.cuenta}</td>
                  <td className={n0(l.haber) ? 'ct-haber' : ''}>{nombreCuenta(l.cuenta)}</td>
                  <td className="ct-num">{n0(l.debe) ? gs(l.debe) : ''}</td>
                  <td className="ct-num">{n0(l.haber) ? gs(l.haber) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}


      {modal && (
        <ModalAsiento
          key={modal.id || 'nuevo'}
          inicial={modal}
          onCerrar={cerrarModal}
          otros={otros}
        />
      )}
    </div>
  )
}
