import React, { useMemo, useState } from 'react'
import { Download, Printer, Plus, X, Landmark, Scale } from 'lucide-react'
import PageHead, { Figures } from '../PageHead'
import { useContable } from './ContableContext'
import { PeriodoSelect, MontoInput, Vacio, exportarHojas } from './ui'
import {
  armarDiario, armarMayor, gs, fechaCorta, n0, TIPOS, TIPOS_FISCALES, totalesDe, compararCodigos
} from '../../services/contabilidad'
import {
  ingresosEgresos, saldosJerarquicos, resultadoDe, filasEstado, liquidacionIVA, detallesInventario
} from '../../services/informes'
import '../../styles/Informes.css'

/* ── datos comunes ──────────────────────────────────────────── */

/** Diario, Mayor y saldos jerárquicos del ejercicio, calculados una vez por hoja */
function useLibros() {
  const ctx = useContable()
  const { comprobantes, ejercicio } = ctx
  const diario = useMemo(() => armarDiario(comprobantes.items, ejercicio), [comprobantes.items, ejercicio])
  const mayor = useMemo(() => armarMayor(diario), [diario])
  const tot = useMemo(() => saldosJerarquicos(mayor), [mayor])
  const existencias = comprobantes.items.find((d) => d.tipo === 'inventario' && String(d.fecha || '').startsWith(String(ejercicio)))
  return { ...ctx, diario, mayor, tot, existencias }
}

const cierreDe = (ejercicio) => `${ejercicio}-12-31`
const encabezado = (titulo, { contribuyente, ejercicio }) => [[`${titulo} · ${contribuyente.razonSocial} · RUC ${contribuyente.ruc} · Ejercicio ${ejercicio}`], []]

/* ── hojas de Excel de cada libro (sirven para la hoja y para el paquete) ── */

const filasIVA = (docs, lado) => {
  const cab = ['Fecha', 'Tipo', 'Timbrado', 'Número', 'RUC', 'Razón social', 'Gravada 10%', 'IVA 10%', 'Gravada 5%', 'IVA 5%', 'Exenta', 'Total']
  const tot = Array(6).fill(0)
  const filas = docs
    .filter((d) => TIPOS_FISCALES.includes(d.tipo) && TIPOS[d.tipo].lado === lado)
    .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '') || (a.numero || '').localeCompare(b.numero || ''))
    .map((d) => {
      const s = TIPOS[d.tipo].signo
      const x = totalesDe(d)
      const v = [x.base10, x.iva10, x.base5, x.iva5, x.ex, x.total].map((n) => s * n)
      v.forEach((n, i) => { tot[i] += n })
      return [fechaCorta(d.fecha), TIPOS[d.tipo].label, d.timbrado, d.numero, d.personaRuc, d.personaNombre, ...v]
    })
  return [cab, ...filas, ['', '', '', '', '', 'TOTALES', ...tot]]
}

export const HOJAS = {
  'ct-diario': (L) => {
    const filas = [['Asiento', 'Fecha', 'Cuenta', 'Denominación', 'Concepto', 'Debe', 'Haber']]
    let d = 0
    let h = 0
    L.diario.forEach((a) => a.lineas.forEach((l, i) => {
      d += l.debe; h += l.haber
      filas.push([i ? '' : a.numero, i ? '' : fechaCorta(a.fecha), l.cuenta, L.nombreCuenta(l.cuenta), i ? (l.glosa || '') : a.concepto, l.debe || '', l.haber || ''])
    }))
    filas.push(['', '', '', '', 'TOTALES', d, h])
    return filas
  },
  'ct-mayor': (L) => {
    const filas = [['Código', 'Cuenta', 'Debe', 'Haber', 'Saldo deudor', 'Saldo acreedor']]
    ;[...L.mayor.values()].sort((a, b) => compararCodigos(a.cuenta, b.cuenta)).forEach((c) => {
      const neto = c.debe - c.haber
      filas.push([c.cuenta, L.nombreCuenta(c.cuenta), c.debe, c.haber, neto > 0 ? neto : '', neto < 0 ? -neto : ''])
    })
    return filas
  },
  'ct-inventario': (L) => {
    const det = detallesInventario({ docs: L.comprobantes.items, activos: L.activos.items, ejercicio: L.ejercicio, existencias: L.existencias })
    const filas = [[`Inventario al ${fechaCorta(cierreDe(L.ejercicio))}`], ['Código', 'Cuenta / detalle', 'Parcial', 'Total']]
    filasEstado(L.plan, L.tot, ['1', '2', '3']).forEach((f) => {
      filas.push([f.codigo, `${'  '.repeat(f.nivel - 1)}${f.nombre}`, '', f.saldo])
      ;(f.nivel === 4 ? det.get(f.codigo) || [] : []).forEach((x) => filas.push(['', `      ${x.detalle}`, x.importe, '']))
    })
    filas.push(['', 'Resultado del ejercicio', '', resultadoDe(L.tot)], [], ['Estado de Resultados'], ['Código', 'Cuenta', '', 'Importe'])
    filasEstado(L.plan, L.tot, ['4', '5']).forEach((f) => filas.push([f.codigo, `${'  '.repeat(f.nivel - 1)}${f.nombre}`, '', f.saldo]))
    filas.push(['', 'RESULTADO DEL EJERCICIO', '', resultadoDe(L.tot)])
    return filas
  },
  'ct-libro-compras': (L) => filasIVA(L.comprobantes.items.filter((d) => String(d.fecha || '').startsWith(String(L.ejercicio))), 'compra'),
  'ct-libro-ventas': (L) => filasIVA(L.comprobantes.items.filter((d) => String(d.fecha || '').startsWith(String(L.ejercicio))), 'venta'),
  'ct-ingresos-egresos': (L) => {
    const filas = ingresosEgresos(L.comprobantes.items, L.ejercicio)
    const ing = filas.reduce((s, m) => s + m.ingreso, 0)
    const egr = filas.reduce((s, m) => s + m.egreso, 0)
    return [
      ['Fecha', 'Comprobante', 'Número', 'RUC', 'Razón social', 'Ingreso', 'Egreso'],
      ...filas.map((m) => [fechaCorta(m.fecha), m.label, m.numero, m.ruc, m.nombre, m.ingreso || '', m.egreso || '']),
      ['', '', '', '', 'TOTALES', ing, egr],
      ['', '', '', '', 'DIFERENCIA', ing - egr, '']
    ]
  },
  'ct-iva': (L) => [
    ['Mes', 'Débito fiscal', 'Crédito fiscal', 'Retenciones', 'Saldo a favor anterior', 'A pagar', 'Saldo a favor'],
    ...liquidacionIVA(L.comprobantes.items, L.ejercicio).map((m) => [m.nombre, m.df, m.cf, m.ret, m.anterior, m.aPagar, m.aFavor])
  ]
}

export const NOMBRE_HOJA = {
  'ct-diario': 'Diario', 'ct-mayor': 'Mayor', 'ct-inventario': 'Inventario y Balances', 'ct-libro-compras': 'IVA Compras',
  'ct-libro-ventas': 'IVA Ventas', 'ct-ingresos-egresos': 'Ingresos y Egresos', 'ct-iva': 'Liquidación IVA'
}

/** descarga un libro suelto o el paquete completo del ejercicio en un solo Excel */
export const descargarLibros = (L, ids) => {
  const hojas = ids.filter((id) => HOJAS[id]).map((id) => ({ hoja: NOMBRE_HOJA[id], filas: [...encabezado(NOMBRE_HOJA[id], L), ...HOJAS[id](L)] }))
  const nombre = ids.length === 1 ? `${NOMBRE_HOJA[ids[0]]} ${L.contribuyente.ruc} ${L.ejercicio}` : `Libros ${L.contribuyente.ruc} ${L.ejercicio}`
  exportarHojas(nombre, hojas)
}

/* ── libro de ingresos y egresos ─────────────────────────────── */

export function LibroIngresosEgresos() {
  const L = useLibros()
  const [mes, setMes] = useState('')
  const [busca, setBusca] = useState('')
  const todos = useMemo(() => ingresosEgresos(L.comprobantes.items, L.ejercicio), [L.comprobantes.items, L.ejercicio])
  const prefijo = mes ? `${L.ejercicio}-${mes}` : String(L.ejercicio)
  const q = busca.trim().toLowerCase()
  const filas = todos.filter((m) => String(m.fecha).startsWith(prefijo)).filter((m) => !q || `${m.ruc} ${m.nombre} ${m.numero}`.toLowerCase().includes(q))
  const ing = filas.reduce((s, m) => s + m.ingreso, 0)
  const egr = filas.reduce((s, m) => s + m.egreso, 0)

  return (
    <div className="q-sheet q-sheet--wide ct-sheet">
      <PageHead
        title="Libro de Ingresos y Egresos"
        lede="Lo que cobraste y lo que gastaste en el año, comprobante por comprobante. Es el libro del IRP por servicios personales y del RESIMPLE: se llena solo con lo que cargás como ingreso (ventas) y egreso (compras)."
        equation={[{ v: 'Renta' }, { op: '=' }, { v: 'Ingresos' }, { op: '−' }, { v: 'Egresos' }]}
        caption="ingresos y egresos del ejercicio"
        status={L.comprobantes.status} />
      <Figures items={[
        { label: 'Ingresos', value: gs(ing) },
        { label: 'Egresos', value: gs(egr) },
        { label: 'Diferencia', value: gs(ing - egr), tone: ing - egr < 0 ? 'err' : 'ok' },
        { label: 'Comprobantes', value: filas.length }
      ]} />
      <div className="ct-toolbar">
        <PeriodoSelect value={mes} onChange={setMes} ejercicio={L.ejercicio} />
        <label className="ct-buscar">
          <span className="q-label">Buscar</span>
          <input className="q-input" type="search" value={busca} placeholder="RUC, nombre o número" onChange={(e) => setBusca(e.target.value)} />
        </label>
        <div className="ct-toolbar__end">
          <button type="button" className="q-btn q-btn--line" onClick={() => L.ir('ct-libro-ventas')}><Plus size={16} strokeWidth={1.8} /> Ingreso</button>
          <button type="button" className="q-btn q-btn--line" onClick={() => L.ir('ct-libro-compras')}><Plus size={16} strokeWidth={1.8} /> Egreso</button>
          {todos.length > 0 && <button type="button" className="q-btn q-btn--line" onClick={() => descargarLibros(L, ['ct-ingresos-egresos'])}><Download size={16} strokeWidth={1.8} /> Excel</button>}
        </div>
      </div>
      {!filas.length ? (
        <Vacio titulo="Sin ingresos ni egresos en esta vista">Cargá tus facturas emitidas como Ingreso y las de tus proveedores como Egreso; aparecen acá en orden de fecha.</Vacio>
      ) : (
        <div className="q-card ct-card">
          <div className="ct-tabla-wrap">
            <table className="q-table ct-tabla">
              <thead><tr><th>Fecha</th><th>Comprobante</th><th>Número</th><th>RUC</th><th>Razón social</th><th className="ct-der">Ingreso</th><th className="ct-der">Egreso</th></tr></thead>
              <tbody>
                {filas.map((m) => (
                  <tr key={m.id}>
                    <td className="ct-mono">{fechaCorta(m.fecha)}</td>
                    <td><span className={`ct-chip is-${m.tipo.split('-')[0]}`}>{TIPOS[m.tipo].corto}</span> {m.label}</td>
                    <td className="ct-mono">{m.numero}</td>
                    <td className="ct-mono">{m.ruc}</td>
                    <td className="ct-nombre">{m.nombre}</td>
                    <td className={`ct-num ${m.ingreso < 0 ? 'is-neg' : ''}`}>{m.ingreso ? gs(m.ingreso) : ''}</td>
                    <td className={`ct-num ${m.egreso < 0 ? 'is-neg' : ''}`}>{m.egreso ? gs(m.egreso) : ''}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="ct-total"><td colSpan={5}>Totales</td><td className="ct-num">{gs(ing)}</td><td className="ct-num">{gs(egr)}</td></tr></tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── estados contables ──────────────────────────────────────── */

function TablaEstado({ filas, total, totalLabel, onCuenta }) {
  return (
    <table className="q-table ct-tabla inf-estado">
      <tbody>
        {filas.map((f) => (
          <tr key={f.codigo} className={`inf-n${Math.min(f.nivel, 4)}`}>
            <td className="ct-mono ct-cod">{f.codigo}</td>
            <td>
              {f.nivel === 4 && onCuenta
                ? <button type="button" className="ct-link" onClick={() => onCuenta(f.codigo)}>{f.nombre}</button>
                : f.nombre}
            </td>
            <td className={`ct-num ${f.saldo < 0 ? 'is-neg' : ''}`}>{gs(f.saldo)}</td>
          </tr>
        ))}
      </tbody>
      {totalLabel && (
        <tfoot><tr className="ct-total"><td colSpan={2}>{totalLabel}</td><td className="ct-num">{gs(total)}</td></tr></tfoot>
      )}
    </table>
  )
}

function Balance({ L }) {
  const activo = L.tot.get('1') || 0
  const pasivo = L.tot.get('2') || 0
  const pn = L.tot.get('3') || 0
  const res = resultadoDe(L.tot)
  const dif = activo - pasivo - pn - res
  return (
    <>
      <Figures items={[
        { label: 'Activo', value: gs(activo) },
        { label: 'Pasivo', value: gs(pasivo) },
        { label: 'Patrimonio neto', value: gs(pn + res) },
        { label: 'A = P + PN', value: dif ? `Dif. ${gs(dif)}` : 'Cuadra', tone: dif ? 'err' : 'ok' }
      ]} />
      <div className="inf-dos">
        <div className="q-card ct-card">
          <h3 className="inf-card__titulo">Activo</h3>
          <TablaEstado filas={filasEstado(L.plan, L.tot, ['1'])} total={activo} totalLabel="Total activo" />
        </div>
        <div className="q-card ct-card">
          <h3 className="inf-card__titulo">Pasivo y patrimonio neto</h3>
          <TablaEstado filas={filasEstado(L.plan, L.tot, ['2', '3'])} />
          <table className="q-table ct-tabla inf-estado">
            <tbody><tr className="inf-n2"><td className="ct-mono ct-cod" /><td>Resultado del ejercicio</td><td className={`ct-num ${res < 0 ? 'is-neg' : ''}`}>{gs(res)}</td></tr></tbody>
            <tfoot><tr className="ct-total"><td colSpan={2}>Total pasivo y patrimonio</td><td className="ct-num">{gs(pasivo + pn + res)}</td></tr></tfoot>
          </table>
        </div>
      </div>
    </>
  )
}

function Resultados({ L }) {
  const ing = L.tot.get('4') || 0
  const egr = L.tot.get('5') || 0
  const res = ing - egr
  return (
    <>
      <Figures items={[
        { label: 'Ingresos', value: gs(ing) },
        { label: 'Costos y gastos', value: gs(egr) },
        { label: res >= 0 ? 'Utilidad' : 'Pérdida', value: gs(Math.abs(res)), tone: res >= 0 ? 'ok' : 'err' },
        { label: 'Margen', value: ing ? `${((res / ing) * 100).toLocaleString('es-PY', { maximumFractionDigits: 1 })} %` : '—' }
      ]} />
      <div className="q-card ct-card">
        <TablaEstado filas={filasEstado(L.plan, L.tot, ['4', '5'])} total={res} totalLabel={res >= 0 ? 'Utilidad del ejercicio' : 'Pérdida del ejercicio'} />
      </div>
    </>
  )
}

export function EstadosContables({ tipo }) {
  const L = useLibros()
  const balance = tipo === 'balance'
  const vacio = !L.diario.length
  return (
    <div className="q-sheet q-sheet--wide ct-sheet">
      <PageHead
        title={balance ? 'Balance General' : 'Estado de Resultados'}
        lede={balance
          ? `Situación patrimonial al ${fechaCorta(cierreDe(L.ejercicio))}, con los saldos del Mayor agrupados por rubro del plan de cuentas.`
          : `Ingresos menos costos y gastos del ejercicio ${L.ejercicio}, por rubro del plan de cuentas.`}
        equation={balance ? [{ v: 'A' }, { op: '=' }, { v: 'P' }, { op: '+' }, { v: 'PN' }] : [{ v: 'R' }, { op: '=' }, { v: 'I' }, { op: '−' }, { v: 'G' }]}
        caption={balance ? 'ecuación patrimonial' : 'resultado del ejercicio'}
        status={L.comprobantes.status} />
      <div className="ct-toolbar"><div className="ct-toolbar__end">
        {!vacio && (
          <div className="inf-acciones">
            <button type="button" className="q-btn q-btn--line" onClick={() => window.print()}><Printer size={16} strokeWidth={1.8} /> Imprimir</button>
            <button type="button" className="q-btn q-btn--line" onClick={() => descargarLibros(L, ['ct-inventario'])}><Download size={16} strokeWidth={1.8} /> Excel</button>
          </div>
        )}
      </div></div>
      {vacio
        ? <Vacio titulo="Todavía no hay saldos">Cargá comprobantes o asientos del ejercicio {L.ejercicio} y el estado se arma solo.</Vacio>
        : balance ? <Balance L={L} /> : <Resultados L={L} />}
    </div>
  )
}

/* ── libro inventario y balances ────────────────────────────── */

const itemVacio = () => ({ descripcion: '', unidad: 'u.', cantidad: '', costo: '' })

function Existencias({ L }) {
  const { comprobantes, ejercicio, existencias } = L
  const [items, setItems] = useState(() => (existencias?.items?.length ? existencias.items : [itemVacio()]))
  const [guardado, setGuardado] = useState('')
  const libros = L.mayor.get('1.1.05.01')?.saldo || 0
  const recuento = items.reduce((s, it) => s + Math.round(Number(it.cantidad || 0) * n0(it.costo)), 0)
  const dif = recuento - libros
  const set = (i, c) => { setItems((xs) => xs.map((x, k) => (k === i ? { ...x, ...c } : x))); setGuardado('') }

  const guardar = () => {
    const validos = items.filter((it) => it.descripcion.trim() && Number(it.cantidad))
    comprobantes.guardar({ ...(existencias || {}), tipo: 'inventario', fecha: cierreDe(ejercicio), concepto: 'Recuento físico de mercaderías', items: validos.map((it) => ({ ...it, descripcion: it.descripcion.trim(), cantidad: Number(it.cantidad), costo: n0(it.costo) })) })
    setGuardado('Recuento guardado.')
  }

  // ajuste de cierre (inventario periódico): lleva Mercaderías al recuento contra el costo de ventas
  const ajustar = () => {
    const cmv = '5.1.01.01'
    const m = Math.abs(dif)
    comprobantes.guardar({
      tipo: 'asiento', clase: 'ajuste', fecha: cierreDe(ejercicio), concepto: 'Ajuste de mercaderías por inventario físico al cierre', personaRuc: '', personaNombre: '',
      lineas: dif > 0
        ? [{ cuenta: '1.1.05.01', debe: m, haber: 0 }, { cuenta: cmv, debe: 0, haber: m }]
        : [{ cuenta: cmv, debe: m, haber: 0 }, { cuenta: '1.1.05.01', debe: 0, haber: m }]
    })
    guardar()
    setGuardado('Recuento guardado y asiento de ajuste registrado en el Diario.')
  }

  return (
    <section className="q-card ct-card inf-exist" aria-labelledby="inf-exist-t">
      <div className="inf-exist__head">
        <div>
          <h3 id="inf-exist-t" className="inf-card__titulo">Recuento físico de mercaderías</h3>
          <p className="inf-seccion__nota">Cantidad × costo unitario de lo que hay en depósito al cierre. Si no coincide con el libro, Quadra arma el asiento de ajuste.</p>
        </div>
        <dl className="inf-exist__cifras">
          <div><dt>Según libros</dt><dd>{gs(libros)}</dd></div>
          <div><dt>Según recuento</dt><dd>{gs(recuento)}</dd></div>
          <div className={dif ? 'is-warn' : 'is-ok'}><dt>Diferencia</dt><dd>{gs(dif)}</dd></div>
        </dl>
      </div>
      <div className="ct-tabla-wrap">
        <table className="q-table ct-tabla ct-tabla--mini inf-exist__tabla">
          <thead><tr><th>Artículo</th><th>Unidad</th><th className="ct-der">Cantidad</th><th className="ct-der">Costo unitario</th><th className="ct-der">Total</th><th /></tr></thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i}>
                <td><input className="q-input" aria-label="Artículo" value={it.descripcion} placeholder="p. ej. Cemento 50 kg" onChange={(e) => set(i, { descripcion: e.target.value })} /></td>
                <td><input className="q-input inf-corto" aria-label="Unidad" value={it.unidad} onChange={(e) => set(i, { unidad: e.target.value })} /></td>
                <td><input className="q-input q-input--num inf-corto" aria-label="Cantidad" inputMode="decimal" value={it.cantidad} onChange={(e) => set(i, { cantidad: e.target.value.replace(',', '.').replace(/[^\d.]/g, '') })} /></td>
                <td><MontoInput aria-label="Costo unitario" value={it.costo} onChange={(v) => set(i, { costo: v })}
                  onKeyDown={(e) => { if (e.key === 'Enter' && i === items.length - 1) { e.preventDefault(); setItems((xs) => [...xs, itemVacio()]) } }} /></td>
                <td className="ct-num">{gs(Number(it.cantidad || 0) * n0(it.costo))}</td>
                <td>{items.length > 1 && <button type="button" className="ct-icon ct-icon--del" aria-label="Quitar artículo" onClick={() => setItems((xs) => xs.filter((_, k) => k !== i))}><X size={14} /></button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="inf-exist__pie">
        <button type="button" className="q-btn q-btn--ghost" onClick={() => setItems((xs) => [...xs, itemVacio()])}><Plus size={15} strokeWidth={1.8} /> Artículo</button>
        <span className="ct-hint" role="status">{guardado || 'Enter en el costo agrega otra fila.'}</span>
        <span className="ct-toolbar__end">
          <button type="button" className="q-btn q-btn--line" onClick={guardar}>Guardar recuento</button>
          {dif !== 0 && recuento > 0 && <button type="button" className="q-btn q-btn--primary" onClick={ajustar}>Guardar y ajustar {gs(Math.abs(dif))}</button>}
        </span>
      </div>
    </section>
  )
}

export function LibroInventario() {
  const L = useLibros()
  const det = useMemo(() => detallesInventario({ docs: L.comprobantes.items, activos: L.activos.items, ejercicio: L.ejercicio, existencias: L.existencias }), [L.comprobantes.items, L.activos.items, L.ejercicio, L.existencias])
  const filas = filasEstado(L.plan, L.tot, ['1', '2', '3'])
  const [abiertas, setAbiertas] = useState(() => new Set())
  const alternar = (c) => setAbiertas((s) => { const n = new Set(s); if (n.has(c)) n.delete(c); else n.add(c); return n })

  return (
    <div className="q-sheet q-sheet--wide ct-sheet inf-imprimible">
      <PageHead
        title="Libro Inventario y Balances"
        lede={`Inventario al ${fechaCorta(cierreDe(L.ejercicio))}: cada bien, crédito y deuda que forma el patrimonio, con el detalle que lo respalda, seguido del Balance General y el Estado de Resultados. Es el libro que se transcribe y rubrica.`}
        equation={[{ v: 'Bienes' }, { op: '+' }, { v: 'Créditos' }, { op: '−' }, { v: 'Deudas' }, { op: '=' }, { v: 'PN' }]}
        caption="inventario de cierre"
        status={L.comprobantes.status} />
      <div className="ct-toolbar"><div className="ct-toolbar__end">
        <div className="inf-acciones">
          <button type="button" className="q-btn q-btn--line" onClick={() => window.print()}><Printer size={16} strokeWidth={1.8} /> Imprimir</button>
          <button type="button" className="q-btn q-btn--line" onClick={() => descargarLibros(L, ['ct-inventario'])}><Download size={16} strokeWidth={1.8} /> Excel</button>
        </div>
      </div></div>

      <p className="inf-solo-print">{L.contribuyente.razonSocial} · RUC {L.contribuyente.ruc} · Ejercicio {L.ejercicio}</p>

      <Existencias key={L.existencias?.id || 'nuevo'} L={L} />

      {!filas.length ? (
        <Vacio titulo="Sin saldos al cierre">Cuando registres comprobantes o asientos del ejercicio {L.ejercicio}, el inventario se arma solo.</Vacio>
      ) : (
        <>
          <h2 className="inf-seccion__titulo"><Landmark size={17} strokeWidth={1.7} aria-hidden="true" /> Inventario detallado</h2>
          <div className="q-card ct-card">
            <div className="ct-tabla-wrap">
              <table className="q-table ct-tabla inf-estado">
                <thead><tr><th>Código</th><th>Cuenta / detalle</th><th className="ct-der">Parcial</th><th className="ct-der">Total</th></tr></thead>
                <tbody>
                  {filas.map((f) => {
                    const d = f.nivel === 4 ? det.get(f.codigo) || [] : []
                    const abierta = abiertas.has(f.codigo)
                    return (
                      <React.Fragment key={f.codigo}>
                        <tr className={`inf-n${Math.min(f.nivel, 4)}`}>
                          <td className="ct-mono ct-cod">{f.codigo}</td>
                          <td>
                            {d.length
                              ? <button type="button" className="ct-link" aria-expanded={abierta} onClick={() => alternar(f.codigo)}>{f.nombre} <small className="ct-glosa">· {d.length} {abierta ? '▴' : '▾'}</small></button>
                              : f.nombre}
                          </td>
                          <td />
                          <td className={`ct-num ${f.saldo < 0 ? 'is-neg' : ''}`}>{gs(f.saldo)}</td>
                        </tr>
                        {d.map((x, i) => (
                          <tr key={i} className={`inf-det ${abierta ? '' : 'inf-det--oculto'}`}>
                            <td /><td className="ct-glosa">{x.detalle}</td><td className="ct-num">{gs(x.importe)}</td><td />
                          </tr>
                        ))}
                      </React.Fragment>
                    )
                  })}
                </tbody>
                <tfoot><tr className="ct-total"><td colSpan={3}>Resultado del ejercicio (a patrimonio)</td><td className="ct-num">{gs(resultadoDe(L.tot))}</td></tr></tfoot>
              </table>
            </div>
          </div>

          <h2 className="inf-seccion__titulo"><Scale size={17} strokeWidth={1.7} aria-hidden="true" /> Balance General</h2>
          <Balance L={L} />
          <h2 className="inf-seccion__titulo">Estado de Resultados</h2>
          <Resultados L={L} />
        </>
      )}
    </div>
  )
}

/* ── liquidación de IVA ─────────────────────────────────────── */

export function LiquidacionIVA() {
  const L = useLibros()
  const clave = `quadra_iva_inicial_${L.contribuyente.clienteId}_${L.ejercicio}`
  const [inicial, setInicial] = useState(() => Number(localStorage.getItem(clave)) || '')
  const meses = useMemo(() => liquidacionIVA(L.comprobantes.items, L.ejercicio, inicial), [L.comprobantes.items, L.ejercicio, inicial])
  const mesActual = new Date().getFullYear() === L.ejercicio ? new Date().getMonth() : -1
  const cambiarInicial = (v) => { setInicial(v); localStorage.setItem(clave, String(v || '')) }
  const tot = meses.reduce((t, m) => ({ df: t.df + m.df, cf: t.cf + m.cf, ret: t.ret + m.ret, aPagar: t.aPagar + m.aPagar }), { df: 0, cf: 0, ret: 0, aPagar: 0 })
  const ultimo = [...meses].reverse().find((m) => m.movimiento) || meses[0]

  return (
    <div className="q-sheet q-sheet--wide ct-sheet">
      <PageHead
        title="Liquidación de IVA"
        lede="Débito fiscal de tus ventas menos crédito fiscal de tus compras y retenciones recibidas, mes a mes. El saldo a favor pasa solo al mes siguiente, como en el Formulario 120."
        equation={[{ v: 'IVA' }, { op: '=' }, { v: 'DF' }, { op: '−' }, { v: 'CF' }, { op: '−' }, { v: 'Ret' }, { op: '−' }, { v: 'SF', sub: 'ant' }]}
        caption="Formulario 120"
        status={L.comprobantes.status} />
      <Figures items={[
        { label: 'Débito fiscal del año', value: gs(tot.df) },
        { label: 'Crédito fiscal del año', value: gs(tot.cf) },
        { label: 'Total a pagar', value: gs(tot.aPagar) },
        { label: `Saldo a favor · ${ultimo.nombre}`, value: gs(ultimo.aFavor), tone: 'ok' }
      ]} />
      <div className="ct-toolbar">
        <label className="ct-periodo">
          <span className="q-label">Saldo a favor de diciembre {L.ejercicio - 1}</span>
          <MontoInput value={inicial} onChange={cambiarInicial} />
        </label>
        <div className="ct-toolbar__end">
          <button type="button" className="q-btn q-btn--line" onClick={() => descargarLibros(L, ['ct-iva'])}><Download size={16} strokeWidth={1.8} /> Excel</button>
        </div>
      </div>
      <div className="q-card ct-card">
        <div className="ct-tabla-wrap">
          <table className="q-table ct-tabla">
            <thead><tr><th>Mes</th><th className="ct-der">Débito fiscal</th><th className="ct-der">Crédito fiscal</th><th className="ct-der">Retenciones</th><th className="ct-der">Saldo a favor anterior</th><th className="ct-der">A pagar</th><th className="ct-der">Saldo a favor</th></tr></thead>
            <tbody>
              {meses.map((m, i) => (
                <tr key={m.mes} className={`${i === mesActual ? 'inf-hoy' : ''} ${m.movimiento ? '' : 'inf-sin'}`}>
                  <td>{m.nombre}</td>
                  <td className="ct-num">{gs(m.df)}</td>
                  <td className="ct-num">{gs(m.cf)}</td>
                  <td className="ct-num">{m.ret ? gs(m.ret) : ''}</td>
                  <td className="ct-num">{m.anterior ? gs(m.anterior) : ''}</td>
                  <td className={`ct-num ct-strong ${m.aPagar ? 'is-neg' : ''}`}>{m.aPagar ? gs(m.aPagar) : ''}</td>
                  <td className="ct-num">{m.aFavor ? gs(m.aFavor) : ''}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="ct-total"><td>Totales</td><td className="ct-num">{gs(tot.df)}</td><td className="ct-num">{gs(tot.cf)}</td><td className="ct-num">{gs(tot.ret)}</td><td /><td className="ct-num">{gs(tot.aPagar)}</td><td /></tr></tfoot>
          </table>
        </div>
      </div>
      <p className="inf-seccion__nota">Vencimiento según el último dígito del RUC ({String(L.contribuyente.ruc || '').split('-')[0].slice(-1) || '—'}). Verificá siempre contra el Formulario 120 de Marangatu antes de presentar.</p>
    </div>
  )
}

