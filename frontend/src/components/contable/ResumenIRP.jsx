import React, { useMemo, useState } from 'react'
import { FileDown } from 'lucide-react'
import PageHead, { Figures } from '../PageHead'
import { useContable } from './ContableContext'
import { MontoInput, Vacio } from './ui'
import GraficoLineas from './GraficoLineas'
import { gs, fechaCorta, MESES } from '../../services/contabilidad'
import {
  resumenIRPRSP, resumenIRPRGC, historico, montoRenta, mesCorto, COLORES_ANIO,
  UMBRAL_IRP_RSP, TASA_IRP_RGC, PRESUNTA_IRP_RGC
} from '../../services/reportes'
import { nuevoPdf, tablaPdf, piePdf, subtituloPdf, graficoLineasPdf, asegurar, TINTA, TINTA_2, TINTA_3 } from './pdf'
import '../../styles/Reportes.css'

const AVISO = 'Los valores presentados son estimaciones basadas en los comprobantes cargados al momento del cálculo y pueden variar conforme a cambios en la normativa fiscal o a ajustes en la información proporcionada. Este documento no reemplaza la liquidación final y tiene fines exclusivamente informativos.'
const NOTA_DEDUCIBLES = 'Los importes deducibles corresponden a los comprobantes que cumplen con las regulaciones fiscales: los importados de Marangatu con la marca «Imputa IRP» y los cargados en Quadra.'
const pct = (t) => `${Math.round(t * 100)}%`

/** textos de cada informe: IRP por servicios personales (515) o por ganancia de capital (516) */
const TIPOS_INFORME = {
  rsp: {
    titulo: 'Resumen de IRP · Servicios personales',
    tituloPdf: 'RESUMEN DE IMPUESTO A LA RENTA PERSONAL',
    subPdf: 'Servicios personales (IRP-RSP) · Formulario 515',
    lede: 'Ingresos y egresos del año con su parte deducible, la renta neta y el impuesto por tramos del 8 %, 9 % y 10 %, como en el Formulario 515. Bajalo en PDF con el gráfico para mandarlo al cliente.',
    equation: [{ v: 'IRP' }, { op: '=' }, { v: 'Renta' }, { op: '×' }, { v: '8 · 9 · 10 %' }],
    caption: 'escala progresiva',
    egresos: 'egresos',
    archivo: 'Resumen IRP-RSP'
  },
  rgc: {
    titulo: 'Resumen de IRP · Ganancia de capital',
    tituloPdf: 'RESUMEN DE IRP · GANANCIA DE CAPITAL',
    subPdf: 'Rentas y ganancias del capital (IRP-RGC) · Formulario 516',
    lede: 'Precio de venta contra precio de compra y gastos del año, la renta neta real y la presunta (30 % del precio de venta), y el impuesto del 8 % sobre la menor, como en el Formulario 516. Bajalo en PDF con el gráfico.',
    equation: [{ v: 'IRP' }, { op: '=' }, { v: 'min(Real, 30 %)' }, { op: '×' }, { v: '8 %' }],
    caption: 'renta neta imponible',
    egresos: 'costos',
    archivo: 'Resumen IRP-RGC'
  }
}

/**
 * Resumen de IRP del ejercicio, con el mismo formato que se entrega al cliente:
 * identificación, estadística de ingresos de tres años, ingresos y egresos con
 * su parte deducible, determinación del impuesto y total a pagar. Se descarga en PDF.
 */
export default function ResumenIRP({ tipo = 'rsp' }) {
  const { comprobantes, contribuyente, ejercicio, usuario, usuarioNombre } = useContable()
  const T = TIPOS_INFORME[tipo]
  const rsp = tipo === 'rsp'
  const conIva = (contribuyente.impuestos || []).includes('iva')
  const [anio, setAnio] = useState(ejercicio)
  const clave = `quadra_irp_donaciones_${contribuyente.clienteId}_${anio}`
  const [donaciones, setDonaciones] = useState(() => Number(localStorage.getItem(clave)) || '')
  const cambiarAnio = (a) => {
    setAnio(a)
    setDonaciones(Number(localStorage.getItem(`quadra_irp_donaciones_${contribuyente.clienteId}_${a}`)) || '')
  }
  const cambiarDonaciones = (v) => { setDonaciones(v); localStorage.setItem(clave, String(v || '')) }

  const r = useMemo(() => (rsp
    ? resumenIRPRSP(comprobantes.items, anio, { conIva, donaciones })
    : resumenIRPRGC(comprobantes.items, anio, { conIva })), [rsp, comprobantes.items, anio, conIva, donaciones])
  // tres años, una línea por año; el más reciente lleva el primer color
  const hist = useMemo(() => historico(comprobantes.items, anio, 3, montoRenta(conIva)), [comprobantes.items, anio, conIva])
  const series = [...hist].reverse().map((a, i) => ({ nombre: String(a.anio), color: COLORES_ANIO[i], valores: a.ventas, conDatos: a.ventas.some((v) => v) })).filter((s) => s.conDatos).reverse()
  const MESES_CORTOS = MESES.map((_, i) => mesCorto(i))
  const desde = `${anio}-01-01`
  const hasta = `${anio}-12-31`
  const preparadoPor = usuarioNombre || usuario || ''
  const sinMovimiento = !r.ingresos.n && !r.egresos.n

  /* filas compartidas entre la pantalla y el PDF */
  const filasMovimiento = [
    { d: 'Total de ingresos', i: r.ingresos.importe, x: r.ingresos.deducible },
    { d: rsp ? 'Total de egresos' : 'Total de costos (precio de compra y gastos)', i: r.egresos.importe, x: r.egresos.deducible },
    ...(rsp ? [{ d: 'Donaciones, aportes y contribuciones', i: r.donaciones, x: r.donaciones }] : []),
    { d: 'Saldo al final del periodo', i: r.saldo.importe, x: r.saldo.deducible, total: true }
  ]
  const filasImpuesto = rsp
    ? [
        { d: 'Monto sobre el que se calcula el impuesto a la renta', n: r.aplica ? `Aplica si los ingresos deducibles superan Gs. ${gs(UMBRAL_IRP_RSP)}` : `No aplica: los ingresos deducibles no superan Gs. ${gs(UMBRAL_IRP_RSP)}`, v: r.base, fuerte: true },
        ...r.tramos.map((t, k) => ({
          d: `Impuesto al ${pct(t.tasa)}`,
          n: k === 0 ? `Aplicable hasta Gs. ${gs(t.hasta)}` : t.hasta === Infinity ? `Por ingresos mayores a Gs. ${gs(t.desde)}` : `De Gs. ${gs(t.desde + 1)} a Gs. ${gs(t.hasta)}`,
          v: t.impuesto
        }))
      ]
    : [
        { d: 'Precio de venta', n: conIva ? 'Ingresos deducibles, excluido el IVA' : 'Ingresos deducibles', v: r.venta },
        { d: 'Precio de compra más gastos de venta', n: 'Costos deducibles', v: r.costo },
        { d: 'Renta neta real', n: 'Precio de venta menos precio de compra y gastos', v: r.real },
        { d: 'Renta neta presunta', n: `${pct(PRESUNTA_IRP_RGC)} del precio de venta`, v: r.presunta },
        { d: 'Renta neta imponible', n: r.porPresunta ? 'El menor valor: la renta presunta' : 'El menor valor: la renta real', v: r.imponible, fuerte: true },
        { d: `Impuesto al ${pct(TASA_IRP_RGC)}`, n: 'Tasa única sobre la renta neta imponible', v: r.impuesto }
      ]

  const pdf = () => {
    const doc = nuevoPdf('portrait')
    const W = doc.internal.pageSize.getWidth()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.setTextColor(TINTA)
    doc.text(T.tituloPdf, W / 2, 18, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(TINTA_2)
    doc.text(`${T.subPdf} · importes en guaraníes${conIva ? ', sin IVA' : ''}`, W / 2, 23.5, { align: 'center' })
    let y = 31
    y = tablaPdf(doc, y, {
      cols: [{ t: 'Razón social / nombres y apellidos', w: 3 }, { t: 'RUC', w: 1.1 }, { t: 'Desde', w: 1 }, { t: 'Hasta', w: 1 }, { t: 'Preparado por', w: 2 }],
      filas: [[contribuyente.razonSocial, contribuyente.ruc, fechaCorta(desde), fechaCorta(hasta), preparadoPor || '-']]
    })
    y = subtituloPdf(doc, y + 2, 'Estadísticas de ingresos', `Ingresos mensuales de ${anio - 2} a ${anio}, una línea por año.`)
    if (series.length) y = graficoLineasPdf(doc, y + 3, { etiquetas: MESES_CORTOS, series, alto: 52 })
    else {
      doc.setFontSize(9)
      doc.setTextColor(TINTA_3)
      doc.text('Sin ingresos registrados en los últimos tres años.', 14, y + 2)
      y += 10
    }
    y = asegurar(doc, y, 40)
    y = subtituloPdf(doc, y, `Resumen de ingresos y ${T.egresos} en ${anio}`)
    y = tablaPdf(doc, y, {
      cols: [{ t: 'Descripción', w: 4 }, { t: 'Importe', w: 1.4, der: true }, { t: 'Deducibles ¹', w: 1.4, der: true }],
      filas: filasMovimiento.map((f) => [f.d, gs(f.i), gs(f.x)]),
      estilos: filasMovimiento.map((f) => (f.total ? { tipo: 'total' } : {}))
    })
    y = asegurar(doc, y, 50)
    y = subtituloPdf(doc, y, rsp ? `Impuesto a la Renta Personal en ${anio}` : `Impuesto a la Renta Personal · Ganancia de capital en ${anio}`)
    y = tablaPdf(doc, y, {
      cols: [{ t: 'Descripción', w: 4 }, { t: 'Importe IRP', w: 1.4, der: true }],
      filas: filasImpuesto.map((f) => [f.d, gs(f.v)]),
      estilos: filasImpuesto.map((f) => ({ ...(f.fuerte ? { tipo: 'subtotal' } : {}), nota: f.n }))
    })
    y = asegurar(doc, y, 22)
    y = subtituloPdf(doc, y, 'Resumen')
    y = tablaPdf(doc, y, {
      cols: [{ t: 'Descripción', w: 4 }, { t: 'Importe', w: 1.4, der: true }],
      filas: [['Impuesto a pagar', `Gs. ${gs(r.impuesto)}`]],
      estilos: [{ tipo: 'total' }]
    })
    const lineas = doc.splitTextToSize(AVISO, W - 28)
    const nota = doc.splitTextToSize(`¹ ${NOTA_DEDUCIBLES}`, W - 28)
    y = asegurar(doc, y + 2, 10 + lineas.length * 4 + nota.length * 3.6)
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8.5)
    doc.setTextColor(TINTA_2)
    doc.text('AVISO LEGAL:', 14, y)
    doc.text(lineas, 14, y + 4.5)
    y += 6 + lineas.length * 4
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(TINTA_3)
    doc.text(nota, 14, y + 2)
    piePdf(doc, `${T.titulo} · ${contribuyente.razonSocial}`)
    doc.save(`${T.archivo} ${contribuyente.ruc} ${anio}.pdf`)
  }

  const anios = Array.from({ length: 5 }, (_, i) => ejercicio - i)

  return (
    <div className="q-sheet q-sheet--wide ct-sheet rp-irp">
      <PageHead title={T.titulo} lede={T.lede} equation={T.equation} caption={T.caption} status={comprobantes.status} />

      <div className="rp-filtros">
        <label className="rp-campo"><span className="q-label">Período fiscal</span>
          <select className="q-input ct-select" value={anio} onChange={(e) => cambiarAnio(Number(e.target.value))}>
            {anios.map((a) => <option key={a} value={a}>Ejercicio {a}</option>)}
          </select>
        </label>
        {rsp && (
          <label className="rp-campo"><span className="q-label">Donaciones, aportes y contribuciones</span>
            <MontoInput value={donaciones} onChange={cambiarDonaciones} aria-label="Donaciones, aportes y contribuciones deducibles" />
          </label>
        )}
        <div className="rp-acciones">
          <button type="button" className="q-btn q-btn--primary" onClick={pdf} disabled={sinMovimiento}><FileDown size={16} strokeWidth={1.8} /> Descargar PDF</button>
        </div>
      </div>

      <Figures items={[
        { label: 'Ingresos deducibles', value: gs(r.ingresos.deducible) },
        { label: rsp ? 'Egresos deducibles' : 'Costos deducibles', value: gs(r.egresos.deducible) },
        rsp ? { label: 'Renta neta imponible', value: gs(r.base) } : { label: 'Renta neta imponible', value: gs(r.imponible) },
        { label: 'Impuesto a pagar', value: gs(r.impuesto) }
      ]} />

      {sinMovimiento ? (
        <Vacio titulo={`Sin comprobantes en ${anio}`}>Cargá las facturas emitidas (ingresos) y las de tus proveedores ({T.egresos}) del ejercicio {anio}, o importalas desde Marangatu, y el resumen se arma solo.</Vacio>
      ) : (
        <>
          <section className="q-card ct-card" aria-label="Identificación">
            <div className="ct-tabla-wrap">
              <table className="q-table ct-tabla ct-tabla--mini">
                <thead><tr><th>Razón social / nombres y apellidos</th><th>RUC</th><th>Desde</th><th>Hasta</th><th>Preparado por</th></tr></thead>
                <tbody><tr>
                  <td className="ct-nombre">{contribuyente.razonSocial}</td>
                  <td className="ct-mono">{contribuyente.ruc}</td>
                  <td className="ct-mono">{fechaCorta(desde)}</td>
                  <td className="ct-mono">{fechaCorta(hasta)}</td>
                  <td>{preparadoPor || '—'}</td>
                </tr></tbody>
              </table>
            </div>
          </section>

          <section className="q-card ct-card rp-graficos">
            {series.length
              ? <GraficoLineas titulo={`Estadísticas de ingresos · ${anio - 2} a ${anio}`} etiquetas={MESES_CORTOS} series={series} alto={260} />
              : <p className="rp-nota">Sin ingresos registrados entre {anio - 2} y {anio}.</p>}
          </section>

          <div className="q-card ct-card">
            <h2 className="rp-graf__titulo rp-irp__titulo">Resumen de ingresos y {T.egresos} en {anio}</h2>
            <div className="ct-tabla-wrap">
              <table className="q-table ct-tabla">
                <thead><tr><th>Descripción</th><th className="ct-der">Importe</th><th className="ct-der">Deducibles ¹</th></tr></thead>
                <tbody>
                  {filasMovimiento.filter((f) => !f.total).map((f) => (
                    <tr key={f.d}><td>{f.d}</td><td className="ct-num">{gs(f.i)}</td><td className="ct-num">{gs(f.x)}</td></tr>
                  ))}
                </tbody>
                <tfoot>
                  {filasMovimiento.filter((f) => f.total).map((f) => (
                    <tr key={f.d} className="ct-total"><td>{f.d}</td><td className={`ct-num ${f.i < 0 ? 'is-neg' : ''}`}>{gs(f.i)}</td><td className={`ct-num ${f.x < 0 ? 'is-neg' : ''}`}>{gs(f.x)}</td></tr>
                  ))}
                </tfoot>
              </table>
            </div>
          </div>

          <div className="q-card ct-card">
            <h2 className="rp-graf__titulo rp-irp__titulo">{rsp ? `Impuesto a la Renta Personal en ${anio}` : `Impuesto a la Renta Personal · Ganancia de capital en ${anio}`}</h2>
            <div className="ct-tabla-wrap">
              <table className="q-table ct-tabla">
                <thead><tr><th>Descripción</th><th className="ct-der">Importe IRP</th></tr></thead>
                <tbody>
                  {filasImpuesto.map((f) => (
                    <tr key={f.d}>
                      <td><span className={f.fuerte ? 'ct-strong' : undefined}>{f.d}</span><br /><small className="ct-glosa">{f.n}</small></td>
                      <td className={`ct-num ${f.fuerte ? 'ct-strong' : ''}`}>{gs(f.v)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="ct-total"><td>Impuesto a pagar</td><td className="ct-num">{gs(r.impuesto)}</td></tr></tfoot>
              </table>
            </div>
          </div>

          <p className="rp-nota"><em>Aviso legal: {AVISO}</em></p>
          <p className="rp-nota">¹ {NOTA_DEDUCIBLES}</p>
        </>
      )}
    </div>
  )
}
