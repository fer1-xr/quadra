import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, FileDown, FileSpreadsheet } from 'lucide-react'
import { useContable } from './ContableContext'
import { analizarRuc, MESES } from '../../services/contabilidad'
import { formularioDe, estructuraDe, calcularFormulario, nombreDeclarante } from '../../services/formularios'
import { pdfFormulario, excelFormulario } from './formularioOficial'
import '../../styles/AsientosManuales.css'
import '../../styles/Reportes.css'

/**
 * Descarga de un formulario de la DNIT (120, 515, 516, 500 o 501): se elige
 * el período y se baja en PDF o Excel con el formato oficial.
 */
export default function DescargaFormulario({ id, onCerrar }) {
  const f = formularioDe(id)
  const e = estructuraDe(id)
  const { comprobantes, contribuyente, ejercicio: ejCliente } = useContable()
  const mensual = f.periodo === 'mensual'
  const [anio, setAnio] = useState(ejCliente)
  const [mes, setMes] = useState(() => {
    // por defecto, el mes anterior: el que se declara este mes
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return String(d.getMonth() + 1).padStart(2, '0')
  })
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const panel = useRef(null)

  useEffect(() => {
    panel.current?.querySelector('select')?.focus()
    const tecla = (ev) => { if (ev.key === 'Escape') onCerrar() }
    document.addEventListener('keydown', tecla)
    return () => document.removeEventListener('keydown', tecla)
  }, [onCerrar])

  const cargando = comprobantes.status === 'loading'
  const anios = Array.from({ length: 6 }, (_, i) => ejCliente + 1 - i)

  const descargar = async (formato) => {
    setError('')
    setOcupado(true)
    try {
      const valores = calcularFormulario(id, {
        docs: comprobantes.items,
        ejercicio: anio,
        mes,
        conIva: (contribuyente.impuestos || []).includes('iva'),
        saldoInicialIva: Number(localStorage.getItem(`quadra_iva_inicial_${contribuyente.clienteId}_${anio}`)) || 0
      })
      const partes = String(contribuyente.ruc || '').split('-')
      const { base, dv } = analizarRuc(contribuyente.ruc)
      const periodo = mensual ? `${mes}-${anio}` : String(anio)
      const cab = {
        numero: f.numero,
        ruc: base || partes[0],
        dv: dv ?? partes[1] ?? '',
        ...nombreDeclarante(contribuyente.razonSocial),
        mes,
        anio: String(anio),
        archivo: `Formulario ${f.numero} ${contribuyente.ruc} ${periodo}`
      }
      if (formato === 'pdf') pdfFormulario(e, valores, cab)
      else await excelFormulario(e, valores, cab)
    } catch (err) {
      setError('No se pudo generar el archivo. Probá de nuevo.')
      console.error(err)
    } finally {
      setOcupado(false)
    }
  }

  return createPortal(
    <div className="q-content am-overlay" role="presentation" onMouseDown={(ev) => { if (ev.target === ev.currentTarget) onCerrar() }}>
      <div className="am-modal fm-modal" role="dialog" aria-modal="true" aria-labelledby="fm-titulo" ref={panel}>
        <header className="am-modal__head">
          <h2 id="fm-titulo" className="am-modal__title">Formulario {f.numero} · {f.nombre}</h2>
          <button type="button" className="q-ghost-icon" onClick={onCerrar} aria-label="Cerrar"><X size={18} strokeWidth={1.7} /></button>
        </header>
        <div className="fm-modal__body">
          {mensual && (
            <label className="rp-campo"><span className="q-label">Mes</span>
              <select className="q-input ct-select" value={mes} onChange={(ev) => setMes(ev.target.value)}>
                {MESES.map((m, i) => <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
              </select>
            </label>
          )}
          <label className="rp-campo"><span className="q-label">{mensual ? 'Año' : 'Ejercicio fiscal'}</span>
            <select className="q-input ct-select" value={anio} onChange={(ev) => setAnio(Number(ev.target.value))}>
              {anios.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
        </div>
        {error && <p className="ct-hint is-warn fm-modal__error" role="alert">{error}</p>}
        <footer className="fm-modal__foot">
          <button type="button" className="q-btn q-btn--line" disabled={cargando || ocupado} onClick={() => descargar('excel')}>
            <FileSpreadsheet size={16} strokeWidth={1.8} /> Excel
          </button>
          <button type="button" className="q-btn q-btn--primary" disabled={cargando || ocupado} onClick={() => descargar('pdf')}>
            <FileDown size={16} strokeWidth={1.8} /> {cargando ? 'Cargando datos…' : 'PDF'}
          </button>
        </footer>
      </div>
    </div>,
    document.querySelector('.q-app') || document.body
  )
}
