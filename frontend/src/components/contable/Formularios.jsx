import React, { useMemo, useState } from 'react'
import { FileDown, Download, RotateCcw } from 'lucide-react'
import PageHead, { Figures } from '../PageHead'
import { useContable } from './ContableContext'
import { MontoInput, exportarExcel } from './ui'
import { gs, MESES, analizarRuc } from '../../services/contabilidad'
import { formularioDe, armarFormulario, periodoTexto } from '../../services/formularios'
import { nuevoPdf, encabezadoPdf, cifrasPdf, subtituloPdf, tablaPdf, piePdf, asegurar, TINTA_2, TINTA_3 } from './pdf'
import '../../styles/Reportes.css'

const pg = (n) => `Gs. ${gs(n)}`
const leer = (clave) => { try { return JSON.parse(localStorage.getItem(clave)) || {} } catch { return {} } }

/**
 * Formulario de declaración jurada (120, 515, 516, 500 o 501) armado con los
 * movimientos del contribuyente: vista previa renglón por renglón, datos que
 * no salen de los comprobantes (anticipos, retenciones, saldos a favor…) y
 * descarga en PDF o Excel para cargarlo en Marangatu.
 */
export default function Formulario({ id }) {
  const f = formularioDe(id)
  const { comprobantes, contribuyente, ejercicio: ejCliente } = useContable()
  const mensual = f.periodo === 'mensual'
  const [ejercicio, setEjercicio] = useState(ejCliente)
  const [mes, setMes] = useState(() => {
    // por defecto, el mes anterior (el que se declara este mes)
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return d.getFullYear() === ejCliente ? String(d.getMonth() + 1).padStart(2, '0') : '12'
  })
  const [tipoDj, setTipoDj] = useState('Original')

  const periodo = mensual ? `${ejercicio}-${mes}` : String(ejercicio)
  const clave = `quadra_form_${contribuyente.clienteId}_${f.numero}_${periodo}`
  const [ajustes, setAjustes] = useState({})
  const [claveAj, setClaveAj] = useState(null)
  // al cambiar de período se cargan los datos guardados de ese período
  if (claveAj !== clave) { setClaveAj(clave); setAjustes(leer(clave)) }
  const cambiar = (k, v) => {
    const sig = { ...ajustes, [k]: v }
    setAjustes(sig)
    localStorage.setItem(clave, JSON.stringify(sig))
  }
  const limpiar = () => { setAjustes({}); localStorage.removeItem(clave) }

  const imps = contribuyente.impuestos || []
  const conIva = imps.includes('iva')
  const saldoInicialIva = Number(localStorage.getItem(`quadra_iva_inicial_${contribuyente.clienteId}_${ejercicio}`)) || 0
  const r = useMemo(
    () => armarFormulario(id, { docs: comprobantes.items, ejercicio, mes, aj: ajustes, conIva, saldoInicialIva }),
    [id, comprobantes.items, ejercicio, mes, ajustes, conIva, saldoInicialIva]
  )
  const per = periodoTexto(f, ejercicio, mes)
  const { base, dv } = analizarRuc(contribuyente.ruc)
  const titulo = `Formulario ${f.numero} · ${f.nombre}`
  const nombreArchivo = `Formulario ${f.numero} ${contribuyente.ruc} ${periodo}`
  const conDatos = Object.values(ajustes).some((v) => v !== '' && v != null)

  const valorTxt = (fl, i) => {
    if (fl.texto) return i === 0 ? fl.texto : ''
    const v = fl.vals[i]
    return v == null ? '' : gs(v)
  }

  const pdf = () => {
    const doc = nuevoPdf('portrait')
    let y = encabezadoPdf(doc, {
      titulo: `Formulario ${f.numero} · ${f.impuesto}`,
      lineas: [
        `${contribuyente.razonSocial} · RUC ${base || contribuyente.ruc}${dv != null ? ` · DV ${dv}` : ''}`,
        `Período: ${per} · Declaración ${tipoDj.toLowerCase()} · importes en guaraníes`
      ]
    })
    y = cifrasPdf(doc, y, r.cifras.map((c) => ({ label: c.label, valor: pg(c.valor) })))
    r.rubros.forEach((rb) => {
      y = asegurar(doc, y, 30)
      y = subtituloPdf(doc, y, rb.titulo)
      y = tablaPdf(doc, y, {
        cols: [{ t: 'Inc.', w: 0.5 }, { t: 'Concepto', w: rb.cols.length > 1 ? 4.2 : 5.4 }, ...rb.cols.map((t) => ({ t, w: 1.6, der: true }))],
        filas: rb.filas.map((fl) => [fl.inc, fl.concepto + (fl.clave && fl.auto == null ? ' *' : ''), ...rb.cols.map((_, i) => valorTxt(fl, i))]),
        estilos: rb.filas.map((fl) => (fl.tipo ? { tipo: fl.tipo === 'subtotal' ? 'subtotal' : 'total' } : {}))
      })
    })
    if (r.escala?.length) {
      y = asegurar(doc, y, 30)
      y = subtituloPdf(doc, y, 'Cálculo por tramos de la escala')
      y = tablaPdf(doc, y, {
        cols: [{ t: 'Tramo', w: 3 }, { t: 'Tasa', w: 0.8, der: true }, { t: 'Renta del tramo', w: 1.6, der: true }, { t: 'Impuesto', w: 1.6, der: true }],
        filas: r.escala.map((e) => [`De ${gs(e.desde)} a ${e.hasta === Infinity ? 'más' : gs(e.hasta)}`, `${Math.round(e.tasa * 100)} %`, gs(e.base), gs(e.impuesto)])
      })
    }
    y = asegurar(doc, y, 26)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(TINTA_2)
    const notas = [
      ...(r.rubros.some((rb) => rb.filas.some((fl) => fl.clave && fl.auto == null)) ? ['* Dato cargado por el usuario: no surge de los comprobantes.'] : []),
      ...r.notas,
      'Borrador de trabajo para cargar en Marangatu (DNIT). No reemplaza la declaración jurada presentada: verificá cada casilla antes de enviar.'
    ]
    notas.forEach((n) => {
      doc.splitTextToSize(n, 182).forEach((l) => { y = asegurar(doc, y, 5); doc.text(l, 14, y); y += 4 })
      y += 1
    })
    y = asegurar(doc, y, 24)
    doc.setDrawColor(TINTA_3)
    doc.line(120, y + 14, 196, y + 14)
    doc.setTextColor(TINTA_3)
    doc.text('Firma del contribuyente o representante', 158, y + 18.5, { align: 'center' })
    piePdf(doc, `${titulo} · ${contribuyente.razonSocial} · ${per}`)
    doc.save(`${nombreArchivo}.pdf`)
  }

  const excel = () => {
    const filas = [
      [`Formulario ${f.numero} · ${f.impuesto}`],
      [`${contribuyente.razonSocial} · RUC ${contribuyente.ruc}`],
      [`Período: ${per} · Declaración ${tipoDj.toLowerCase()}`],
      []
    ]
    r.rubros.forEach((rb) => {
      filas.push([rb.titulo])
      filas.push(['Inc.', 'Concepto', ...rb.cols])
      rb.filas.forEach((fl) => filas.push([fl.inc, fl.concepto, ...rb.cols.map((_, i) => (fl.texto ? (i ? '' : fl.texto) : fl.vals[i] ?? ''))]))
      filas.push([])
    })
    r.notas.forEach((n) => filas.push([n]))
    exportarExcel(nombreArchivo, `F${f.numero}`, filas)
  }

  const anios = [ejCliente, ejCliente - 1, ejCliente - 2]

  return (
    <div className="q-sheet q-sheet--wide ct-sheet">
      <PageHead
        title={titulo}
        lede={`${f.impuesto}. Quadra completa los renglones con los comprobantes cargados; agregá los datos que no salen de las facturas y descargalo para pasarlo a Marangatu.`}
        equation={mensual
          ? [{ v: 'IVA' }, { op: '=' }, { v: 'DF' }, { op: '−' }, { v: 'CF' }, { op: '−' }, { v: 'SF', sub: 'ant' }]
          : [{ v: 'Imp' }, { op: '=' }, { v: 'Renta' }, { op: '×' }, { v: 'tasa' }]}
        caption={`${f.periodo === 'mensual' ? 'declaración mensual' : 'declaración anual'}`}
        status={comprobantes.status} />

      <div className="rp-filtros">
        {mensual && (
          <label className="rp-campo"><span className="q-label">Mes</span>
            <select className="q-input ct-select" value={mes} onChange={(e) => setMes(e.target.value)}>
              {MESES.map((m, i) => <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
            </select>
          </label>
        )}
        <label className="rp-campo"><span className="q-label">{mensual ? 'Año' : 'Ejercicio fiscal'}</span>
          <select className="q-input ct-select" value={ejercicio} onChange={(e) => setEjercicio(Number(e.target.value))}>
            {anios.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        <label className="rp-campo"><span className="q-label">Tipo de declaración</span>
          <select className="q-input ct-select" value={tipoDj} onChange={(e) => setTipoDj(e.target.value)}>
            <option>Original</option>
            <option>Rectificativa</option>
          </select>
        </label>
        <div className="rp-acciones">
          {conDatos && <button type="button" className="q-btn q-btn--line" onClick={limpiar} title="Borrar los datos cargados a mano en este período"><RotateCcw size={16} strokeWidth={1.8} /> Limpiar datos</button>}
          <button type="button" className="q-btn q-btn--line" onClick={excel}><Download size={16} strokeWidth={1.8} /> Excel</button>
          <button type="button" className="q-btn q-btn--primary" onClick={pdf}><FileDown size={16} strokeWidth={1.8} /> Descargar PDF</button>
        </div>
      </div>

      <Figures items={r.cifras.map((c) => ({ label: c.label, value: gs(c.valor), tone: c.tono }))} />
      {!r.comprobantes && <p className="ct-hint is-warn" role="status">No hay movimientos en {per}: el formulario sale en cero salvo los datos que cargues.</p>}

      {r.rubros.map((rb) => (
        <section key={rb.titulo} className="q-card ct-card" aria-label={rb.titulo}>
          <h2 className="rp-graf__titulo">{rb.titulo}</h2>
          <div className="ct-tabla-wrap">
            <table className="q-table ct-tabla">
              <thead><tr><th style={{ width: 56 }}>Inc.</th><th>Concepto</th>{rb.cols.map((c) => <th key={c} className="ct-der">{c}</th>)}</tr></thead>
              <tbody>
                {rb.filas.map((fl) => (
                  <tr key={fl.inc} className={fl.tipo === 'total' ? 'ct-total' : ''}>
                    <td className="ct-num">{fl.inc}</td>
                    <td className={fl.tipo ? 'ct-strong' : ''}>
                      {fl.concepto}
                      {fl.aplicado != null && fl.aplicado !== fl.vals[0] && <small className="ct-hint"> · se aplican {gs(fl.aplicado)}</small>}
                    </td>
                    {rb.cols.map((_, i) => (
                      <td key={i} className={`ct-num ${fl.tipo ? 'ct-strong' : ''}`}>
                        {fl.clave && i === 0 ? (
                          <MontoInput
                            aria-label={fl.concepto}
                            value={ajustes[fl.clave] ?? ''}
                            placeholder={fl.auto != null ? gs(fl.auto) : '0'}
                            onChange={(v) => cambiar(fl.clave, v)} />
                        ) : valorTxt(fl, i)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {r.escala?.length > 0 && (
        <section className="q-card ct-card" aria-label="Escala del IRP">
          <h2 className="rp-graf__titulo">Cálculo por tramos de la escala</h2>
          <div className="ct-tabla-wrap">
            <table className="q-table ct-tabla">
              <thead><tr><th>Tramo</th><th className="ct-der">Tasa</th><th className="ct-der">Renta del tramo</th><th className="ct-der">Impuesto</th></tr></thead>
              <tbody>
                {r.escala.map((e) => (
                  <tr key={e.desde}><td>De {gs(e.desde)} a {e.hasta === Infinity ? 'más' : gs(e.hasta)}</td><td className="ct-num">{Math.round(e.tasa * 100)} %</td><td className="ct-num">{gs(e.base)}</td><td className="ct-num">{gs(e.impuesto)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {r.notas.map((n) => <p key={n} className="inf-seccion__nota">{n}</p>)}
      <p className="inf-seccion__nota">Las casillas con recuadro las completás vos{mensual ? ' (vacías toman el valor sugerido)' : ''}; se guardan por período. Es un borrador para cargar en Marangatu: verificá cada casilla antes de presentar.</p>
    </div>
  )
}
