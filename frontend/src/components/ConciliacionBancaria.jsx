import React, { useState } from 'react'
import { Card, CardBody, Spinner } from '@heroui/react'
import { BookOpen, Check, Download, FileText, Play, RotateCcw, X } from 'lucide-react'
import PageHead, { Figures } from './PageHead'
import { useContribuyente } from '../services/historialService'
import { conciliar, descargarExcel, leerExtracto, leerLibro } from '../services/conciliacionBancaria'

const fmt = (n) => (Number(n) || 0).toLocaleString('es-PY', { maximumFractionDigits: 2 })

function Zona({ id, archivo, onFile, onChange, icono: Icono, accept, formatos }) {
  return (
    <label htmlFor={id} className={`q-drop ${archivo ? 'is-filled' : ''}`}>
      {archivo ? <Check size={20} strokeWidth={1.8} /> : <Icono size={20} strokeWidth={1.6} />}
      <span>{archivo ? archivo.name : 'Seleccionar archivo'}</span>
      <small>{formatos}</small>
      <input
        id={id}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => { onFile(e.target.files[0] || null); onChange(); e.target.value = '' }}
      />
    </label>
  )
}

/**
 * Conciliación bancaria por carga de archivos: libro mayor / bancos del sistema
 * del usuario contra el extracto del banco en PDF. El resultado se descarga en Excel.
 */
function ConciliacionBancaria() {
  const contribuyente = useContribuyente()
  const [libro, setLibro] = useState(null)
  const [extracto, setExtracto] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState(null)

  const opts = { libroNombre: libro?.name, extractoNombre: extracto?.name, cliente: contribuyente?.razonSocial }

  const ejecutar = async () => {
    if (!libro || !extracto) { setError('Cargá el libro mayor / bancos de tu sistema y el extracto bancario en PDF.'); return }
    setCargando(true)
    setError('')
    setResultado(null)
    try {
      const [l, b] = await Promise.all([leerLibro(libro), leerExtracto(extracto)])
      const r = conciliar(l, b)
      setResultado(r)
      await descargarExcel(r, opts)
    } catch (e) {
      setError(e?.message || 'No se pudo hacer la conciliación.')
    } finally {
      setCargando(false)
    }
  }

  const limpiar = () => { setResultado(null); setError('') }
  const reiniciar = () => { setLibro(null); setExtracto(null); setResultado(null); setError('') }

  const r = resultado
  const cierra = r && r.diferencia === 0

  return (
    <div className="q-sheet">
      <PageHead
        title="Conciliación Bancaria"
        lede="Compará el libro mayor / bancos de tu sistema con el extracto del banco. Quadra cruza los movimientos y te devuelve un Excel con lo que coincide y lo que falta en cada lado."
      />
      <Card className="q-card" shadow="none">
        <CardBody className="q-card__body">
          {error && (
            <div className="q-alert" role="alert">
              <X size={16} strokeWidth={2} />
              {error}
            </div>
          )}

          <div className="q-field-group">
            <span className="q-label">Libro mayor / bancos de tu sistema</span>
            <div className="q-drop-grid">
              <Zona id="cb-libro" archivo={libro} onFile={setLibro} onChange={limpiar} icono={BookOpen} accept=".xlsx,.xls,.csv" formatos=".xlsx · .xls · .csv" />
            </div>
          </div>

          <div className="q-field-group">
            <span className="q-label">Extracto bancario (PDF)</span>
            <div className="q-drop-grid">
              <Zona id="cb-extracto" archivo={extracto} onFile={setExtracto} onChange={limpiar} icono={FileText} accept=".pdf,.xlsx,.xls,.csv" formatos=".pdf · también .xlsx o .csv" />
            </div>
          </div>

          <button
            type="button"
            className="q-btn q-btn--primary q-btn--block"
            onClick={ejecutar}
            disabled={cargando || !libro || !extracto}
          >
            {cargando ? <Spinner size="sm" color="current" /> : <Play size={16} strokeWidth={1.8} />}
            {cargando ? 'Conciliando...' : 'Conciliar y descargar Excel'}
          </button>
        </CardBody>
      </Card>

      {r && (
        <Card className="q-card" shadow="none">
          <CardBody className="q-card__body">
            <div className={`q-alert ${cierra ? 'is-ok' : ''}`} role="status">
              {cierra ? <Check size={16} strokeWidth={2} /> : <X size={16} strokeWidth={2} />}
              {cierra
                ? 'La conciliación cierra. El Excel ya se descargó.'
                : `Quedan ${fmt(Math.abs(r.diferencia))} sin explicar. El Excel ya se descargó: revisá las hojas «Falta en el banco» y «Falta en el libro».`}
            </div>
            <Figures items={[
              { label: 'Saldo según el banco', value: fmt(r.banco.saldoFinal) },
              { label: 'Saldo según el libro', value: fmt(r.libro.saldoFinal) },
              { label: 'Coinciden', value: r.pares.length },
              { label: 'Falta en el banco', value: r.depositos.length + r.cheques.length },
              { label: 'Falta en el libro', value: r.creditos.length + r.debitos.length },
              { label: 'Diferencia sin explicar', value: fmt(r.diferencia), tone: cierra ? 'ok' : 'err' }
            ]} />
            {[...r.libro.avisos, ...r.banco.avisos].length > 0 && (
              <ul className="q-list">
                {[...r.libro.avisos, ...r.banco.avisos].slice(0, 8).map((a) => <li key={a}>{a}</li>)}
              </ul>
            )}
            <div className="q-actions">
              <button type="button" className="q-btn q-btn--line" onClick={() => descargarExcel(r, opts)}>
                <Download size={16} strokeWidth={1.8} /> Descargar Excel otra vez
              </button>
              <button type="button" className="q-btn q-btn--line" onClick={reiniciar}>
                <RotateCcw size={16} strokeWidth={1.8} /> Nueva conciliación
              </button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  )
}

export default ConciliacionBancaria
