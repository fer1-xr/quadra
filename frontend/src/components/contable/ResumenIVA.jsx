import React, { useMemo, useState } from 'react'
import { FileDown, TrendingUp, TrendingDown } from 'lucide-react'
import PageHead, { Figures } from '../PageHead'
import { useContable } from './ContableContext'
import { Vacio } from './ui'
import GraficoLineas from './GraficoLineas'
import { gs, fechaCorta, hoyISO, MESES } from '../../services/contabilidad'
import { resumenIVA, historico, mesesEntre, mesCorto, COLOR_INGRESOS, COLOR_GASTOS, COLORES_ANIO } from '../../services/reportes'
import { nuevoPdf, encabezadoPdf, cifrasPdf, tablaPdf, piePdf, subtituloPdf, graficoLineasPdf, asegurar, TINTA_2 } from './pdf'
import '../../styles/Reportes.css'

const ultimoDia = (y, m) => new Date(y, m, 0).getDate()
const rango = (y, m1, m2) => ({ desde: `${y}-${String(m1).padStart(2, '0')}-01`, hasta: `${y}-${String(m2).padStart(2, '0')}-${ultimoDia(y, m2)}` })

const periodos = (y) => [
  { id: 'ej', label: `Ejercicio ${y}`, ...rango(y, 1, 12) },
  { id: 's1', label: `1º semestre ${y}`, ...rango(y, 1, 6) },
  { id: 's2', label: `2º semestre ${y}`, ...rango(y, 7, 12) },
  ...[1, 2, 3, 4].map((t) => ({ id: `t${t}`, label: `${t}º trimestre ${y}`, ...rango(y, t * 3 - 2, t * 3) })),
  ...MESES.map((m, i) => ({ id: `m${i}`, label: `${m} ${y}`, ...rango(y, i + 1, i + 1) })),
  { id: 'ant', label: `Ejercicio ${y - 1}`, ...rango(y - 1, 1, 12) }
]

/** texto en PDF: la fuente estándar no trae el símbolo ₲ */
const pg = (n) => `Gs. ${gs(n)}`

/**
 * Resumen general de IVA de un período: ingresos, gastos y diferencia mes a mes,
 * débito y crédito fiscal, mes de mayor venta y de mayor gasto, e histórico de
 * cinco años con una línea por año. Se descarga en PDF con los gráficos.
 */
export default function ResumenIVA() {
  const { comprobantes, contribuyente, ejercicio } = useContable()
  const conIva = (contribuyente.impuestos || []).includes('iva') || !(contribuyente.impuestos || []).length
  const ops = periodos(ejercicio)
  const [desde, setDesde] = useState(ops[0].desde)
  const [hasta, setHasta] = useState(() => { const h = hoyISO(); return h.startsWith(String(ejercicio)) ? h : ops[0].hasta })
  const fechasMal = !desde || !hasta || desde > hasta
  const sel = ops.find((p) => p.desde === desde && p.hasta === hasta)?.id || ''

  const r = useMemo(() => (fechasMal ? null : resumenIVA(comprobantes.items, desde, hasta)), [comprobantes.items, desde, hasta, fechasMal])
  const anioFin = Number((hasta || hoyISO()).slice(0, 4))
  const hist = useMemo(() => historico(comprobantes.items, anioFin, 5), [comprobantes.items, anioFin])
  // el año más reciente siempre lleva el primer color; años sin movimiento no dibujan línea
  const anios = [...hist].reverse().map((a, i) => ({ ...a, color: COLORES_ANIO[i] })).filter((a) => a.conDatos)

  const variosAnios = r && r.meses.length && r.meses[0].mes.slice(0, 4) !== r.meses[r.meses.length - 1].mes.slice(0, 4)
  const etiquetas = r ? r.meses.map((m) => `${mesCorto(Number(m.mes.slice(5)) - 1)}${variosAnios ? ` ${m.mes.slice(2, 4)}` : ''}`) : []
  const seriesPeriodo = r ? [
    { nombre: 'Ingresos', color: COLOR_INGRESOS, valores: r.meses.map((m) => m.ingresos) },
    { nombre: 'Gastos', color: COLOR_GASTOS, valores: r.meses.map((m) => m.gastos) }
  ] : []
  const idx = (m) => (m ? r.meses.findIndex((x) => x.mes === m.mes) : -1)
  const destacados = r ? [
    r.mayorVenta && { serie: 0, indice: idx(r.mayorVenta), texto: `Mayor venta · ${mesCorto(Number(r.mayorVenta.mes.slice(5)) - 1)}` },
    r.mayorGasto && { serie: 1, indice: idx(r.mayorGasto), texto: `Mayor gasto · ${mesCorto(Number(r.mayorGasto.mes.slice(5)) - 1)}` }
  ].filter(Boolean) : []
  const MESES_CORTOS = MESES.map((_, i) => mesCorto(i))
  const seriesVentas = anios.map((a) => ({ nombre: String(a.anio), color: a.color, valores: a.ventas }))
  const seriesGastos = anios.map((a) => ({ nombre: String(a.anio), color: a.color, valores: a.gastos }))

  const t = r?.tot
  const masIngresos = t && t.dif >= 0
  const conclusion = t && (t.ingresos || t.gastos)
    ? `En el período hubo más ${masIngresos ? 'ingresos que gastos' : 'gastos que ingresos'}: la diferencia es de ${gs(Math.abs(t.dif))}.`
    : ''

  const pdf = () => {
    if (!r) return
    const doc = nuevoPdf('portrait')
    let y = encabezadoPdf(doc, {
      titulo: 'Resumen general de IVA',
      lineas: [`${contribuyente.razonSocial} · RUC ${contribuyente.ruc}`, `Período: del ${fechaCorta(desde)} al ${fechaCorta(hasta)} · importes en guaraníes con IVA incluido`]
    })
    y = cifrasPdf(doc, y, [
      { label: 'Total ingresos', valor: pg(t.ingresos), nota: r.mayorVenta ? `Mayor venta: ${r.mayorVenta.nombre}` : 'Sin ventas' },
      { label: 'Total gastos', valor: pg(t.gastos), nota: r.mayorGasto ? `Mayor gasto: ${r.mayorGasto.nombre}` : 'Sin gastos' },
      { label: 'Diferencia', valor: pg(t.dif), nota: masIngresos ? 'Más ingresos que gastos' : 'Más gastos que ingresos' },
      ...(conIva ? [{ label: t.saldoIva >= 0 ? 'IVA a pagar' : 'Saldo a favor IVA', valor: pg(Math.abs(t.saldoIva)), nota: `Débito ${gs(t.df)} · Crédito ${gs(t.cf)}` }] : [])
    ])
    y = subtituloPdf(doc, y, 'Ingresos y gastos por mes', 'Totales mensuales del período elegido; los puntos grandes marcan el mes de mayor venta y de mayor gasto.')
    y = graficoLineasPdf(doc, y + 3, { etiquetas, series: seriesPeriodo, destacados, alto: 58 })
    y = asegurar(doc, y, 40)
    y = subtituloPdf(doc, y, 'Detalle mensual')
    const cols = [{ t: 'Mes', w: 1.7 }, { t: 'Ingresos', w: 1.5, der: true }, { t: 'Gastos', w: 1.5, der: true }, { t: 'Diferencia', w: 1.5, der: true }, { t: 'Resultado', w: 1.3 },
      ...(conIva ? [{ t: 'IVA débito', w: 1.3, der: true }, { t: 'IVA crédito', w: 1.3, der: true }, { t: 'Saldo IVA', w: 1.3, der: true }] : [])]
    const fila = (m, nombre) => [nombre, gs(m.ingresos), gs(m.gastos), gs(m.dif), m.ingresos || m.gastos ? (m.dif >= 0 ? 'Más ingresos' : 'Más gastos') : '-',
      ...(conIva ? [gs(m.df), gs(m.cf), gs(m.saldoIva)] : [])]
    y = tablaPdf(doc, y, {
      cols,
      filas: [...r.meses.map((m) => fila(m, m.nombre)), fila(t, 'Total del período')],
      estilos: [...r.meses.map((m) => (m.dif < 0 ? { tono: '#b42318' } : {})), { tipo: 'total' }]
    })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(TINTA_2)
    if (t.ingresos || t.gastos) {
      y = asegurar(doc, y, 8)
      doc.text(`En el período hubo más ${masIngresos ? 'ingresos que gastos' : 'gastos que ingresos'}: la diferencia es de ${pg(Math.abs(t.dif))}.`, 14, y)
    }

    doc.addPage()
    y = encabezadoPdf(doc, { titulo: 'Histórico de los últimos cinco años', lineas: [`${contribuyente.razonSocial} · ${anioFin - 4} a ${anioFin} · una línea por año`] })
    if (anios.length) {
      y = subtituloPdf(doc, y, 'Ventas por mes', 'Ingresos mensuales de cada año.')
      y = graficoLineasPdf(doc, y + 3, { etiquetas: MESES_CORTOS, series: seriesVentas, alto: 52 })
      y = subtituloPdf(doc, y, 'Gastos por mes', 'Gastos mensuales de cada año.')
      y = graficoLineasPdf(doc, y + 3, { etiquetas: MESES_CORTOS, series: seriesGastos, alto: 52 })
      y = asegurar(doc, y, 40)
      tablaPdf(doc, y, {
        cols: [{ t: 'Año', w: 0.8 }, { t: 'Ventas', w: 1.6, der: true }, { t: 'Gastos', w: 1.6, der: true }, { t: 'Diferencia', w: 1.6, der: true }, { t: 'Mayor venta', w: 1.4 }, { t: 'Mayor gasto', w: 1.4 }],
        filas: anios.map((a) => [String(a.anio), gs(a.totalVentas), gs(a.totalGastos), gs(a.dif), a.mesMayorVenta || '-', a.mesMayorGasto || '-'])
      })
    } else {
      doc.setFontSize(10)
      doc.text('No hay comprobantes en los últimos cinco años.', 14, y)
    }
    piePdf(doc, `Resumen general de IVA · ${contribuyente.razonSocial}`)
    doc.save(`Resumen de IVA ${contribuyente.ruc} ${desde} a ${hasta}.pdf`)
  }

  return (
    <div className="q-sheet q-sheet--wide ct-sheet">
      <PageHead
        title="Resumen general de IVA"
        lede="Ingresos contra gastos del período que elijas, mes a mes, con el IVA de cada lado y el histórico de los últimos cinco años. Bajalo en PDF con los gráficos para mandarlo al cliente."
        equation={[{ v: 'Dif' }, { op: '=' }, { v: 'Ingresos' }, { op: '−' }, { v: 'Gastos' }]}
        caption="resultado del período"
        status={comprobantes.status} />

      <div className="rp-filtros">
        <label className="rp-campo"><span className="q-label">Período rápido</span>
          <select className="q-input ct-select" value={sel} onChange={(e) => { const p = ops.find((x) => x.id === e.target.value); if (p) { setDesde(p.desde); setHasta(p.hasta) } }}>
            <option value="">Personalizado</option>
            {ops.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </label>
        <label className="rp-campo"><span className="q-label">Desde</span>
          <input className="q-input" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} aria-invalid={fechasMal} />
        </label>
        <label className="rp-campo"><span className="q-label">Hasta</span>
          <input className="q-input" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} aria-invalid={fechasMal} />
        </label>
        <div className="rp-acciones">
          <button type="button" className="q-btn q-btn--primary" onClick={pdf} disabled={fechasMal || !r}><FileDown size={16} strokeWidth={1.8} /> Descargar PDF</button>
        </div>
      </div>
      {fechasMal && <p className="ct-hint is-warn" role="alert">La fecha desde tiene que ser anterior a la fecha hasta.</p>}

      {r && (
        <>
          <Figures items={[
            { label: 'Total ingresos', value: gs(t.ingresos) },
            { label: 'Total gastos', value: gs(t.gastos) },
            { label: masIngresos ? 'Diferencia · más ingresos' : 'Diferencia · más gastos', value: gs(t.dif), tone: masIngresos ? 'ok' : 'err' },
            conIva
              ? { label: t.saldoIva >= 0 ? 'IVA a pagar' : 'Saldo a favor de IVA', value: gs(Math.abs(t.saldoIva)) }
              : { label: 'Comprobantes', value: t.n }
          ]} />

          {!t.n ? (
            <Vacio titulo="Sin comprobantes en el período">Del {fechaCorta(desde)} al {fechaCorta(hasta)} no hay compras ni ventas cargadas. Probá con otro período.</Vacio>
          ) : (
            <>
              <section className="q-card ct-card rp-graficos">
                <GraficoLineas titulo={`Ingresos y gastos por mes · ${mesesEntre(desde, hasta).length} meses`} etiquetas={etiquetas} series={seriesPeriodo} destacados={destacados} />
                <p className="rp-nota">
                  {r.mayorVenta && <><TrendingUp size={14} strokeWidth={1.8} aria-hidden="true" /> Mayor venta: <strong>{r.mayorVenta.nombre}</strong> (₲ {gs(r.mayorVenta.ingresos)}). </>}
                  {r.mayorGasto && <><TrendingDown size={14} strokeWidth={1.8} aria-hidden="true" /> Mayor gasto: <strong>{r.mayorGasto.nombre}</strong> (₲ {gs(r.mayorGasto.gastos)}). </>}
                  {conclusion}
                </p>
              </section>

              <div className="q-card ct-card">
                <div className="ct-tabla-wrap">
                  <table className="q-table ct-tabla">
                    <thead><tr><th>Mes</th><th className="ct-der">Ingresos</th><th className="ct-der">Gastos</th><th className="ct-der">Diferencia</th><th>Resultado</th>
                      {conIva && <><th className="ct-der">IVA débito</th><th className="ct-der">IVA crédito</th><th className="ct-der">Retenciones</th><th className="ct-der">Saldo IVA</th></>}</tr></thead>
                    <tbody>
                      {r.meses.map((m) => (
                        <tr key={m.mes}>
                          <td>{m.nombre}</td>
                          <td className="ct-num">{gs(m.ingresos)}</td>
                          <td className="ct-num">{gs(m.gastos)}</td>
                          <td className={`ct-num ct-strong ${m.dif < 0 ? 'is-neg' : ''}`}>{gs(m.dif)}</td>
                          <td>{m.ingresos || m.gastos ? <span className={`rp-signo ${m.dif >= 0 ? 'is-pos' : 'is-neg'}`}>{m.dif >= 0 ? '▲ Más ingresos' : '▼ Más gastos'}</span> : '—'}</td>
                          {conIva && <><td className="ct-num">{gs(m.df)}</td><td className="ct-num">{gs(m.cf)}</td><td className="ct-num">{m.ret ? gs(m.ret) : ''}</td><td className={`ct-num ${m.saldoIva < 0 ? 'is-neg' : ''}`}>{gs(m.saldoIva)}</td></>}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr className="ct-total"><td>Total</td><td className="ct-num">{gs(t.ingresos)}</td><td className="ct-num">{gs(t.gastos)}</td><td className="ct-num">{gs(t.dif)}</td><td>{masIngresos ? 'Más ingresos' : 'Más gastos'}</td>
                      {conIva && <><td className="ct-num">{gs(t.df)}</td><td className="ct-num">{gs(t.cf)}</td><td className="ct-num">{gs(t.ret)}</td><td className="ct-num">{gs(t.saldoIva)}</td></>}</tr></tfoot>
                  </table>
                </div>
              </div>
            </>
          )}

          <section className="q-card ct-card rp-graficos" aria-label="Histórico de cinco años">
            <h2 className="rp-graf__titulo">Histórico {anioFin - 4} a {anioFin} · una línea por año</h2>
            {anios.length ? (
              <>
                <div className="rp-dos">
                  <GraficoLineas titulo="Ventas por mes" etiquetas={MESES_CORTOS} series={seriesVentas} alto={260} />
                  <GraficoLineas titulo="Gastos por mes" etiquetas={MESES_CORTOS} series={seriesGastos} alto={260} />
                </div>
                <div className="ct-tabla-wrap">
                  <table className="q-table ct-tabla ct-tabla--mini">
                    <thead><tr><th>Año</th><th className="ct-der">Ventas</th><th className="ct-der">Gastos</th><th className="ct-der">Diferencia</th><th>Mes de mayor venta</th><th>Mes de mayor gasto</th></tr></thead>
                    <tbody>
                      {anios.map((a) => (
                        <tr key={a.anio}>
                          <td className="rp-anio"><span className="rp-leyenda__marca" style={{ background: a.color }} aria-hidden="true" />{a.anio}</td>
                          <td className="ct-num">{gs(a.totalVentas)}</td>
                          <td className="ct-num">{gs(a.totalGastos)}</td>
                          <td className={`ct-num ${a.dif < 0 ? 'is-neg' : ''}`}>{gs(a.dif)}</td>
                          <td>{a.mesMayorVenta || '—'}</td>
                          <td>{a.mesMayorGasto || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : <p className="rp-nota">No hay comprobantes entre {anioFin - 4} y {anioFin}.</p>}
          </section>
        </>
      )}
    </div>
  )
}
