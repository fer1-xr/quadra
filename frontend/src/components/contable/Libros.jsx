import React, { useMemo, useState } from 'react'
import { Download, ArrowLeft } from 'lucide-react'
import PageHead, { Figures } from '../PageHead'
import { useContable } from './ContableContext'
import { PeriodoSelect, exportarExcel, Vacio } from './ui'
import { armarDiario, armarMayor, gs, fechaCorta, TIPOS, compararCodigos, naturaleza } from '../../services/contabilidad'

export function LibroDiario() {
  const { comprobantes, ejercicio, nombreCuenta, contribuyente } = useContable()
  const [mes, setMes] = useState('')
  const [busca, setBusca] = useState('')

  const diario = useMemo(() => armarDiario(comprobantes.items, ejercicio), [comprobantes.items, ejercicio])
  const q = busca.trim().toLowerCase()
  const vista = diario
    .filter((a) => !mes || a.fecha.slice(5, 7) === mes)
    .filter((a) => !q || `${a.concepto} ${a.lineas.map((l) => `${l.cuenta} ${nombreCuenta(l.cuenta)}`).join(' ')}`.toLowerCase().includes(q))

  const tot = vista.reduce((t, a) => {
    a.lineas.forEach((l) => { t.debe += l.debe; t.haber += l.haber })
    return t
  }, { debe: 0, haber: 0 })

  const exportar = () => {
    const filas = [[`Libro Diario · ${contribuyente.razonSocial} · RUC ${contribuyente.ruc} · Ejercicio ${ejercicio}`], [], ['Asiento', 'Fecha', 'Cuenta', 'Denominación', 'Concepto', 'Debe', 'Haber']]
    vista.forEach((a) => a.lineas.forEach((l, i) => filas.push([i ? '' : a.numero, i ? '' : fechaCorta(a.fecha), l.cuenta, nombreCuenta(l.cuenta), i ? (l.glosa || '') : a.concepto, l.debe || '', l.haber || ''])))
    filas.push(['', '', '', '', 'TOTALES', tot.debe, tot.haber])
    exportarExcel(`Libro Diario ${contribuyente.ruc} ${ejercicio}${mes ? `-${mes}` : ''}`, 'Libro Diario', filas)
  }

  return (
    <div className="q-sheet q-sheet--wide ct-sheet">
      <PageHead
        title="Libro Diario"
        lede="Todos los asientos del ejercicio en orden cronológico: los que generan compras, ventas, notas, recibos y retenciones, más los asientos manuales."
        equation={[{ op: 'Σ' }, { v: 'Debe' }, { op: '−' }, { op: 'Σ' }, { v: 'Haber' }, { op: '=' }, { n: '0' }]}
        caption={tot.debe === tot.haber ? 'el libro cuadra' : `diferencia ${gs(tot.debe - tot.haber)}`}
        status={comprobantes.status}
      />
      <Figures items={[
        { label: 'Asientos', value: vista.length },
        { label: 'Total Debe', value: gs(tot.debe) },
        { label: 'Total Haber', value: gs(tot.haber) },
        { label: 'Diferencia', value: gs(tot.debe - tot.haber), tone: tot.debe === tot.haber ? 'ok' : 'err' }
      ]} />
      <div className="ct-toolbar">
        <PeriodoSelect value={mes} onChange={setMes} ejercicio={ejercicio} />
        <label className="ct-buscar">
          <span className="q-label">Buscar</span>
          <input className="q-input" type="search" value={busca} placeholder="Concepto, cuenta, proveedor…" onChange={(e) => setBusca(e.target.value)} />
        </label>
        <div className="ct-toolbar__end">
          {vista.length > 0 && <button type="button" className="q-btn q-btn--line" onClick={exportar}><Download size={16} strokeWidth={1.8} /> Excel</button>}
        </div>
      </div>

      {vista.length === 0 ? (
        <Vacio titulo={diario.length ? 'No hay asientos en esta vista' : 'El Diario está vacío'}>
          Cargá una compra, una venta o un asiento manual desde el menú Movimientos y el asiento aparece acá automáticamente.
        </Vacio>
      ) : (
        <div className="q-card ct-card">
          <div className="ct-tabla-wrap">
            <table className="q-table ct-tabla ct-diario">
              <thead>
                <tr><th>Nº</th><th>Fecha</th><th>Cuenta</th><th>Denominación / concepto</th><th className="ct-der">Debe</th><th className="ct-der">Haber</th></tr>
              </thead>
              {vista.map((a) => (
                <tbody key={a.doc.id} className="ct-diario__asiento">
                  <tr className="ct-diario__cab">
                    <td className="ct-mono">{a.numero}</td>
                    <td className="ct-mono">{fechaCorta(a.fecha)}</td>
                    <td colSpan={4}>
                      <span className={`ct-chip is-${a.doc.tipo.split('-')[0]}`}>{TIPOS[a.doc.tipo]?.corto}</span> {a.concepto}
                    </td>
                  </tr>
                  {a.lineas.map((l, i) => (
                    <tr key={i}>
                      <td /><td />
                      <td className="ct-mono ct-cod">{l.cuenta}</td>
                      <td className={l.haber ? 'ct-haber' : ''}>{nombreCuenta(l.cuenta)}{l.glosa && <small className="ct-glosa"> · {l.glosa}</small>}</td>
                      <td className="ct-num">{l.debe ? gs(l.debe) : ''}</td>
                      <td className="ct-num">{l.haber ? gs(l.haber) : ''}</td>
                    </tr>
                  ))}
                </tbody>
              ))}
              <tfoot>
                <tr className="ct-total"><td colSpan={4}>Totales</td><td className="ct-num">{gs(tot.debe)}</td><td className="ct-num">{gs(tot.haber)}</td></tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export function LibroMayor() {
  const { comprobantes, ejercicio, nombreCuenta, contribuyente } = useContable()
  const [cuenta, setCuenta] = useState('')
  const [busca, setBusca] = useState('')

  const diario = useMemo(() => armarDiario(comprobantes.items, ejercicio), [comprobantes.items, ejercicio])
  const mayor = useMemo(() => armarMayor(diario), [diario])
  const cuentas = [...mayor.values()].sort((a, b) => compararCodigos(a.cuenta, b.cuenta))
  const sel = cuenta ? mayor.get(cuenta) : null

  const totD = cuentas.reduce((s, c) => s + c.debe, 0)
  const totH = cuentas.reduce((s, c) => s + c.haber, 0)
  const q = busca.trim().toLowerCase()
  const visibles = cuentas.filter((c) => !q || `${c.cuenta} ${nombreCuenta(c.cuenta)}`.toLowerCase().includes(q))

  const exportar = () => {
    const filas = [[`Libro Mayor · ${contribuyente.razonSocial} · RUC ${contribuyente.ruc} · Ejercicio ${ejercicio}`], []]
    const lista = sel ? [sel] : cuentas
    lista.forEach((c) => {
      filas.push([`${c.cuenta} ${nombreCuenta(c.cuenta)}`], ['Asiento', 'Fecha', 'Concepto', 'Debe', 'Haber', 'Saldo'])
      c.movimientos.forEach((m) => filas.push([m.numero, fechaCorta(m.fecha), m.concepto, m.debe || '', m.haber || '', m.saldo]))
      filas.push(['', '', 'Totales', c.debe, c.haber, c.saldo], [])
    })
    exportarExcel(`Libro Mayor ${contribuyente.ruc} ${ejercicio}${sel ? ` ${sel.cuenta}` : ''}`, 'Libro Mayor', filas)
  }

  return (
    <div className="q-sheet q-sheet--wide ct-sheet">
      <PageHead
        title={sel ? `Mayor · ${nombreCuenta(sel.cuenta)}` : 'Libro Mayor'}
        lede={sel ? `Cuenta ${sel.cuenta}, de saldo ${naturaleza(sel.cuenta)}. Cada movimiento viene de un asiento del Diario.` : 'El saldo de cada cuenta, armado con los asientos del Diario. Elegí una cuenta para ver sus movimientos.'}
        equation={[{ v: 'S', sub: 'n' }, { op: '=' }, { v: 'S', sub: 'n−1' }, { op: '+' }, { v: 'D' }, { op: '−' }, { v: 'H' }]}
        caption="saldo corrido por cuenta"
        status={comprobantes.status}
      />

      <div className="ct-toolbar">
        {sel ? (
          <button type="button" className="q-btn q-btn--line" onClick={() => setCuenta('')}><ArrowLeft size={16} strokeWidth={1.8} /> Todas las cuentas</button>
        ) : (
          <label className="ct-buscar">
            <span className="q-label">Buscar cuenta</span>
            <input className="q-input" type="search" value={busca} placeholder="Código o nombre" onChange={(e) => setBusca(e.target.value)} />
          </label>
        )}
        <label className="ct-periodo">
          <span className="q-label">Cuenta</span>
          <select className="q-input ct-select" value={cuenta} onChange={(e) => setCuenta(e.target.value)}>
            <option value="">Balance de sumas y saldos</option>
            {cuentas.map((c) => <option key={c.cuenta} value={c.cuenta}>{c.cuenta} · {nombreCuenta(c.cuenta)}</option>)}
          </select>
        </label>
        <div className="ct-toolbar__end">
          {cuentas.length > 0 && <button type="button" className="q-btn q-btn--line" onClick={exportar}><Download size={16} strokeWidth={1.8} /> Excel</button>}
        </div>
      </div>

      {cuentas.length === 0 ? (
        <Vacio titulo="Sin movimientos todavía">Las cuentas aparecen acá apenas registres comprobantes o asientos en el ejercicio {ejercicio}.</Vacio>
      ) : sel ? (
        <>
          <Figures items={[
            { label: 'Movimientos', value: sel.movimientos.length },
            { label: 'Debe', value: gs(sel.debe) },
            { label: 'Haber', value: gs(sel.haber) },
            { label: `Saldo ${naturaleza(sel.cuenta)}`, value: gs(sel.saldo), tone: sel.saldo < 0 ? 'err' : 'ok' }
          ]} />
          <div className="q-card ct-card">
            <div className="ct-tabla-wrap">
              <table className="q-table ct-tabla">
                <thead><tr><th>Asiento</th><th>Fecha</th><th>Concepto</th><th className="ct-der">Debe</th><th className="ct-der">Haber</th><th className="ct-der">Saldo</th></tr></thead>
                <tbody>
                  {sel.movimientos.map((m, i) => (
                    <tr key={i}>
                      <td className="ct-mono">{m.numero}</td>
                      <td className="ct-mono">{fechaCorta(m.fecha)}</td>
                      <td className="ct-nombre">{m.concepto}</td>
                      <td className="ct-num">{m.debe ? gs(m.debe) : ''}</td>
                      <td className="ct-num">{m.haber ? gs(m.haber) : ''}</td>
                      <td className={`ct-num ct-strong ${m.saldo < 0 ? 'is-neg' : ''}`}>{gs(m.saldo)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="ct-total"><td colSpan={3}>Totales</td><td className="ct-num">{gs(sel.debe)}</td><td className="ct-num">{gs(sel.haber)}</td><td className="ct-num">{gs(sel.saldo)}</td></tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          <Figures items={[
            { label: 'Cuentas con movimiento', value: cuentas.length },
            { label: 'Sumas Debe', value: gs(totD) },
            { label: 'Sumas Haber', value: gs(totH) },
            { label: 'Diferencia', value: gs(totD - totH), tone: totD === totH ? 'ok' : 'err' }
          ]} />
          <div className="q-card ct-card">
            <div className="ct-tabla-wrap">
              <table className="q-table ct-tabla">
                <thead>
                  <tr><th>Código</th><th>Cuenta</th><th className="ct-der">Debe</th><th className="ct-der">Haber</th><th className="ct-der">Saldo deudor</th><th className="ct-der">Saldo acreedor</th></tr>
                </thead>
                <tbody>
                  {visibles.map((c) => {
                    const neto = c.debe - c.haber
                    return (
                      <tr key={c.cuenta} className="ct-clic" onClick={() => setCuenta(c.cuenta)}>
                        <td className="ct-mono ct-cod">{c.cuenta}</td>
                        <td><button type="button" className="ct-link" onClick={(e) => { e.stopPropagation(); setCuenta(c.cuenta) }}>{nombreCuenta(c.cuenta)}</button></td>
                        <td className="ct-num">{gs(c.debe)}</td>
                        <td className="ct-num">{gs(c.haber)}</td>
                        <td className="ct-num">{neto > 0 ? gs(neto) : ''}</td>
                        <td className="ct-num">{neto < 0 ? gs(-neto) : ''}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="ct-total">
                    <td colSpan={2}>Totales</td>
                    <td className="ct-num">{gs(totD)}</td>
                    <td className="ct-num">{gs(totH)}</td>
                    <td className="ct-num">{gs(cuentas.reduce((s, c) => s + Math.max(c.debe - c.haber, 0), 0))}</td>
                    <td className="ct-num">{gs(cuentas.reduce((s, c) => s + Math.max(c.haber - c.debe, 0), 0))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
