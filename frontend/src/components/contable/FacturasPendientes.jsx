import React, { useMemo, useState } from 'react'
import { FileDown, FileSpreadsheet } from 'lucide-react'
import PageHead, { Figures } from '../PageHead'
import { useContable } from './ContableContext'
import { Vacio, exportarHojas } from './ui'
import { gs, fechaCorta, hoyISO } from '../../services/contabilidad'
import { pendientesAl, TRAMOS, ORDEN_PENDIENTES } from '../../services/reportes'
import { nuevoPdf, encabezadoPdf, cifrasPdf, tablaPdf, piePdf, subtituloPdf, asegurar } from './pdf'
import '../../styles/Reportes.css'

// antigüedad = magnitud ordenada: un solo tono, de claro (reciente) a oscuro (más vieja)
const TONOS = { corriente: '#a9cbf2', d30: '#6aa3e6', d60: '#2a78d6', d90: '#1a4f94' }

/**
 * Facturas a crédito pendientes de pago (proveedores) o de cobro (clientes)
 * a una fecha de corte, con antigüedad de saldos. Se descarga en PDF o Excel.
 */
export default function FacturasPendientes({ lado }) {
  const { comprobantes, contribuyente, ir } = useContable()
  const compras = lado === 'compra'
  const titulo = compras ? 'Facturas pendientes de pago' : 'Facturas pendientes de cobro'
  const quien = compras ? 'Proveedor' : 'Cliente'
  const [corte, setCorte] = useState(hoyISO())
  const [busca, setBusca] = useState('')
  const [orden, setOrden] = useState('saldo')
  const [desdeDias, setDesdeDias] = useState('0')
  const [abiertos, setAbiertos] = useState(() => new Set())

  const datos = useMemo(() => pendientesAl(comprobantes.items, lado, corte), [comprobantes.items, lado, corte])
  const q = busca.trim().toLowerCase()
  const min = Number(desdeDias)
  const personas = useMemo(() => datos.personas
    .map((p) => {
      if (!min) return p
      const facturas = p.facturas.filter((f) => f.dias > min)
      return { ...p, facturas, saldo: facturas.reduce((s, f) => s + f.saldo, 0), total: facturas.reduce((s, f) => s + f.total, 0) }
    })
    .filter((p) => p.facturas.length && (!q || `${p.ruc} ${p.nombre}`.toLowerCase().includes(q)))
    .sort(ORDEN_PENDIENTES[orden]), [datos, min, q, orden])
  const saldo = personas.reduce((s, p) => s + p.saldo, 0)
  const nFacturas = personas.reduce((s, p) => s + p.facturas.length, 0)
  const tramos = Object.fromEntries(TRAMOS.map((t) => [t.id, personas.reduce((s, p) => s + p.facturas.filter((f) => f.tramo === t.id).reduce((a, f) => a + f.saldo, 0), 0)]))
  const filtros = [q && `${quien}: ${busca.trim()}`, min && `Con más de ${min} días`].filter(Boolean).join(' · ')
  const nombreArchivo = `${titulo} ${contribuyente.ruc} al ${corte}`

  const alternar = (ruc) => setAbiertos((s) => { const n = new Set(s); if (n.has(ruc)) n.delete(ruc); else n.add(ruc); return n })
  const todosAbiertos = personas.length > 0 && personas.every((p) => abiertos.has(p.ruc))

  const pdf = () => {
    const doc = nuevoPdf('portrait')
    let y = encabezadoPdf(doc, {
      titulo,
      lineas: [`${contribuyente.razonSocial} · RUC ${contribuyente.ruc}`, `Saldos al ${fechaCorta(corte)}${filtros ? ` · ${filtros}` : ''}`]
    })
    y = cifrasPdf(doc, y, [
      { label: compras ? 'Total a pagar' : 'Total a cobrar', valor: `Gs. ${gs(saldo)}`, nota: `${nFacturas} facturas` },
      { label: compras ? 'Proveedores' : 'Clientes', valor: String(personas.length) },
      { label: 'Vencido +30 días', valor: `Gs. ${gs(tramos.d30 + tramos.d60 + tramos.d90)}` },
      { label: 'Más de 90 días', valor: `Gs. ${gs(tramos.d90)}` }
    ])
    y = subtituloPdf(doc, y, 'Antigüedad de saldos')
    y = tablaPdf(doc, y, {
      cols: [{ t: quien, w: 3.2 }, { t: 'RUC', w: 1.3 }, ...TRAMOS.map((t) => ({ t: t.label, w: 1.3, der: true })), { t: 'Saldo', w: 1.4, der: true }],
      filas: [
        ...personas.map((p) => [p.nombre, p.ruc, ...TRAMOS.map((t) => (p.facturas.some((f) => f.tramo === t.id) ? gs(p.facturas.filter((f) => f.tramo === t.id).reduce((s, f) => s + f.saldo, 0)) : '')), gs(p.saldo)]),
        ['Total', '', ...TRAMOS.map((t) => gs(tramos[t.id])), gs(saldo)]
      ],
      estilos: [...personas.map(() => ({})), { tipo: 'total' }]
    })
    y = asegurar(doc, y, 30)
    y = subtituloPdf(doc, y, 'Detalle por factura')
    const filas = []
    const estilos = []
    personas.forEach((p) => {
      filas.push([`${p.nombre} · RUC ${p.ruc}`]); estilos.push({ tipo: 'grupo' })
      p.facturas.forEach((f) => { filas.push([fechaCorta(f.fecha), f.label, f.numero, String(f.dias), gs(f.total), gs(f.saldo)]); estilos.push(f.dias > 90 ? { tono: '#b42318' } : {}) })
      filas.push(['', '', `Subtotal ${p.nombre}`, '', gs(p.total), gs(p.saldo)]); estilos.push({ tipo: 'subtotal' })
    })
    filas.push(['', '', 'TOTAL', '', gs(personas.reduce((s, p) => s + p.total, 0)), gs(saldo)]); estilos.push({ tipo: 'total' })
    tablaPdf(doc, y, {
      cols: [{ t: 'Fecha', w: 1.1 }, { t: 'Comprobante', w: 2 }, { t: 'Número', w: 1.8 }, { t: 'Días', w: 0.7, der: true }, { t: 'Importe', w: 1.4, der: true }, { t: 'Saldo', w: 1.4, der: true }],
      filas,
      estilos
    })
    piePdf(doc, `${titulo} · ${contribuyente.razonSocial}`)
    doc.save(`${nombreArchivo}.pdf`)
  }

  const excel = () => {
    const filas = [[`${titulo} · ${contribuyente.razonSocial} · RUC ${contribuyente.ruc}`], [`Saldos al ${fechaCorta(corte)}${filtros ? ` · ${filtros}` : ''}`], [],
      [quien, 'RUC', 'Fecha', 'Comprobante', 'Número', 'Días', 'Antigüedad', 'Importe', 'Saldo']]
    personas.forEach((p) => {
      p.facturas.forEach((f) => filas.push([p.nombre, p.ruc, fechaCorta(f.fecha), f.label, f.numero, f.dias, TRAMOS.find((t) => t.id === f.tramo).label, f.total, f.saldo]))
      filas.push([`Subtotal ${p.nombre}`, '', '', '', '', '', '', p.total, p.saldo])
    })
    filas.push(['TOTAL', '', '', '', '', '', '', personas.reduce((s, p) => s + p.total, 0), saldo])
    const resumen = [[quien, 'RUC', ...TRAMOS.map((t) => t.label), 'Saldo'],
      ...personas.map((p) => [p.nombre, p.ruc, ...TRAMOS.map((t) => p.facturas.filter((f) => f.tramo === t.id).reduce((s, f) => s + f.saldo, 0)), p.saldo]),
      ['TOTAL', '', ...TRAMOS.map((t) => tramos[t.id]), saldo]]
    exportarHojas(nombreArchivo, [{ hoja: 'Detalle', filas }, { hoja: 'Antigüedad', filas: resumen }])
  }

  return (
    <div className="q-sheet q-sheet--wide ct-sheet">
      <PageHead
        title={titulo}
        lede={compras
          ? 'Lo que le debés a cada proveedor por facturas a crédito, descontando pagos, notas de crédito y retenciones. Elegí la fecha de corte y bajalo en PDF o Excel.'
          : 'Lo que te debe cada cliente por facturas a crédito, descontando cobros, notas de crédito y retenciones. Elegí la fecha de corte y bajalo en PDF o Excel.'}
        equation={[{ v: 'Saldo' }, { op: '=' }, { v: 'Facturas' }, { op: '−' }, { v: 'NC' }, { op: '−' }, { v: compras ? 'Pagos' : 'Cobros' }]}
        caption={`saldos al ${fechaCorta(corte)}`}
        status={comprobantes.status} />

      <div className="rp-filtros">
        <label className="rp-campo"><span className="q-label">Saldos al</span>
          <input className="q-input" type="date" value={corte} onChange={(e) => setCorte(e.target.value || hoyISO())} />
        </label>
        <label className="rp-campo rp-campo--ancho"><span className="q-label">{quien}</span>
          <input className="q-input" type="search" value={busca} placeholder="Todos · RUC o nombre" onChange={(e) => setBusca(e.target.value)} />
        </label>
        <label className="rp-campo"><span className="q-label">Antigüedad</span>
          <select className="q-input ct-select" value={desdeDias} onChange={(e) => setDesdeDias(e.target.value)}>
            <option value="0">Todas</option>
            <option value="30">Vencidas +30 días</option>
            <option value="60">Vencidas +60 días</option>
            <option value="90">Vencidas +90 días</option>
          </select>
        </label>
        <label className="rp-campo"><span className="q-label">Ordenar por</span>
          <select className="q-input ct-select" value={orden} onChange={(e) => setOrden(e.target.value)}>
            <option value="saldo">Mayor saldo</option>
            <option value="antiguedad">Más antigua</option>
            <option value="nombre">{quien}</option>
          </select>
        </label>
        <div className="rp-acciones">
          <button type="button" className="q-btn q-btn--primary" onClick={pdf} disabled={!personas.length}><FileDown size={16} strokeWidth={1.8} /> Descargar PDF</button>
          <button type="button" className="q-btn q-btn--line" onClick={excel} disabled={!personas.length}><FileSpreadsheet size={16} strokeWidth={1.8} /> Excel</button>
        </div>
      </div>

      <Figures items={[
        { label: compras ? 'Total a pagar' : 'Total a cobrar', value: gs(saldo) },
        { label: compras ? 'Proveedores' : 'Clientes', value: personas.length },
        { label: 'Facturas pendientes', value: nFacturas },
        { label: 'Más de 90 días', value: gs(tramos.d90), tone: tramos.d90 ? 'err' : 'ok' }
      ]} />

      {saldo > 0 && (
        <section className="q-card ct-card rp-tramos" aria-label="Antigüedad de saldos">
          <div className="rp-tramos__barra" aria-hidden="true">
            {TRAMOS.filter((t) => tramos[t.id] > 0).map((t) => <span key={t.id} style={{ flex: tramos[t.id], background: TONOS[t.id] }} />)}
          </div>
          <ul>
            {TRAMOS.map((t) => (
              <li key={t.id}><i style={{ background: TONOS[t.id] }} aria-hidden="true" />{t.label}<b>₲ {gs(tramos[t.id])}</b><span>{saldo ? `${Math.round((tramos[t.id] / saldo) * 100)} %` : ''}</span></li>
            ))}
          </ul>
        </section>
      )}

      {!personas.length ? (
        <Vacio titulo={datos.personas.length ? 'Nadie cumple con estos filtros' : 'No hay facturas pendientes'}
          accion={!datos.personas.length && <button type="button" className="q-btn q-btn--line" onClick={() => ir(compras ? 'ct-libro-compras' : 'ct-libro-ventas')}>Ir a {compras ? 'Compras' : 'Ventas'}</button>}>
          {datos.personas.length ? 'Probá con otra antigüedad o borrá la búsqueda.' : `Al ${fechaCorta(corte)} todas las facturas a crédito están ${compras ? 'pagadas' : 'cobradas'}.`}
        </Vacio>
      ) : (
        <div className="q-card ct-card">
          <div className="ct-toolbar">
            <p className="rp-nota">{personas.length} {compras ? (personas.length === 1 ? 'proveedor' : 'proveedores') : (personas.length === 1 ? 'cliente' : 'clientes')} · tocá un nombre para ver sus facturas</p>
            <div className="ct-toolbar__end">
              <button type="button" className="q-btn q-btn--line" onClick={() => setAbiertos(todosAbiertos ? new Set() : new Set(personas.map((p) => p.ruc)))}>{todosAbiertos ? 'Contraer todo' : 'Ver todas las facturas'}</button>
            </div>
          </div>
          <div className="ct-tabla-wrap">
            <table className="q-table ct-tabla">
              <thead><tr><th>{quien} / factura</th><th>Número</th><th className="ct-der">Días</th>{TRAMOS.map((t) => <th key={t.id} className="ct-der">{t.label}</th>)}<th className="ct-der">Saldo</th></tr></thead>
              <tbody>
                {personas.map((p) => (
                  <React.Fragment key={p.ruc}>
                    <tr className="rp-persona">
                      <td><button type="button" className="ct-link" aria-expanded={abiertos.has(p.ruc)} onClick={() => alternar(p.ruc)}>{p.nombre}</button> <small className="ct-glosa">RUC {p.ruc} · {p.facturas.length} {p.facturas.length === 1 ? 'factura' : 'facturas'}</small></td>
                      <td />
                      <td className={`ct-num rp-dias ${p.maxDias > 90 ? 'is-warn' : ''}`}>{p.maxDias}</td>
                      {TRAMOS.map((t) => { const v = p.facturas.filter((f) => f.tramo === t.id).reduce((s, f) => s + f.saldo, 0); return <td key={t.id} className="ct-num">{v ? gs(v) : ''}</td> })}
                      <td className="ct-num ct-strong">{gs(p.saldo)}</td>
                    </tr>
                    {abiertos.has(p.ruc) && p.facturas.map((f) => (
                      <tr key={f.id}>
                        <td className="ct-glosa">{fechaCorta(f.fecha)} · {f.label}</td>
                        <td className="ct-mono">{f.numero}</td>
                        <td className={`ct-num rp-dias ${f.dias > 90 ? 'is-warn' : ''}`}>{f.dias}</td>
                        {TRAMOS.map((t) => <td key={t.id} className="ct-num">{f.tramo === t.id ? gs(f.saldo) : ''}</td>)}
                        <td className="ct-num">{gs(f.saldo)}{f.saldo !== f.total && <small className="ct-glosa"> de {gs(f.total)}</small>}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
              <tfoot><tr className="ct-total"><td colSpan={3}>Total</td>{TRAMOS.map((t) => <td key={t.id} className="ct-num">{gs(tramos[t.id])}</td>)}<td className="ct-num">{gs(saldo)}</td></tr></tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
