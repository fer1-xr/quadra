import React, { useState } from 'react'
import { Card, CardBody } from '@heroui/react'
import { BookOpen, Check, Download, Landmark, RotateCcw, X } from 'lucide-react'
import PageHead, { Figures } from './PageHead'
import ConciliacionCarga from './ConciliacionCarga'
import { useContribuyente } from '../services/historialService'
import { conciliar, descargarExcel, leerExtracto, leerLibro } from '../services/conciliacionBancaria'

const fmt = (n) => (Number(n) || 0).toLocaleString('es-PY', { maximumFractionDigits: 2 })
const mov = (n) => `${n} ${n === 1 ? 'movimiento' : 'movimientos'}`

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
  const limpiar = () => { setResultado(null); setError('') }

  const ejecutar = async () => {
    if (!libro || !extracto) { setError('Cargá el libro mayor / bancos y el extracto bancario en PDF.'); return }
    setCargando(true)
    limpiar()
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

  const reiniciar = () => { setLibro(null); setExtracto(null); limpiar() }

  const r = resultado
  const cierra = r && r.diferencia === 0
  const avisos = r ? [...r.libro.avisos, ...r.banco.avisos] : []

  return (
    <div className="q-sheet">
      <PageHead
        title="Conciliación Bancaria"
        lede="Compará el libro mayor / bancos con el extracto del banco. Quadra cruza los movimientos y te devuelve un Excel con lo que coincide y lo que falta en cada lado."
      />

      <ConciliacionCarga
        error={error}
        cargando={cargando}
        cargandoTexto="Conciliando..."
        onEjecutar={ejecutar}
        boton="Conciliar y descargar Excel"
        resultadoDescripcion="El Excel trae el resumen, los movimientos que coinciden y lo que falta en el banco y en el libro."
        lados={[
          {
            titulo: 'Libro mayor / bancos',
            corto: 'el libro mayor / bancos',
            origen: 'Exportalo desde tu sistema contable: el mayor de la cuenta del banco, del mes que vas a conciliar.',
            icono: BookOpen,
            archivos: libro ? [libro] : [],
            accept: '.xlsx,.xls,.csv',
            formatos: '.xlsx · .xls · .csv',
            onAgregar: ([f]) => { setLibro(f); limpiar() },
            onQuitar: () => { setLibro(null); limpiar() }
          },
          {
            titulo: 'Extracto bancario',
            corto: 'el extracto del banco',
            origen: 'Descargalo de la banca web en PDF, del mismo mes y la misma cuenta.',
            icono: Landmark,
            archivos: extracto ? [extracto] : [],
            accept: '.pdf,.xlsx,.xls,.csv',
            formatos: '.pdf · .xlsx · .csv',
            onAgregar: ([f]) => { setExtracto(f); limpiar() },
            onQuitar: () => { setExtracto(null); limpiar() }
          }
        ]}
      />

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
              { label: 'Coinciden', value: r.pares.length },
              { label: 'Falta en el banco', value: r.depositos.length + r.cheques.length },
              { label: 'Falta en el libro', value: r.creditos.length + r.debitos.length },
              { label: 'Diferencia sin explicar', value: fmt(r.diferencia), tone: cierra ? undefined : 'err' }
            ]} />

            <table className="cc-estado-cuenta">
              <caption className="sr-only">Estado de la conciliación</caption>
              <tbody>
                <tr className="is-saldo"><th scope="row">Saldo final según el banco</th><td>{fmt(r.banco.saldoFinal)}</td></tr>
                <tr><th scope="row">Más: depósitos del libro que el banco todavía no acreditó</th><td>{fmt(r.totales.depositos)}<small>{mov(r.depositos.length)}</small></td></tr>
                <tr><th scope="row">Menos: cheques y pagos del libro que el banco todavía no debitó</th><td>{fmt(r.totales.cheques)}<small>{mov(r.cheques.length)}</small></td></tr>
                <tr><th scope="row">Menos: créditos del banco que faltan en el libro</th><td>{fmt(r.totales.creditos)}<small>{mov(r.creditos.length)}</small></td></tr>
                <tr><th scope="row">Más: débitos del banco (comisiones, impuestos) que faltan en el libro</th><td>{fmt(r.totales.debitos)}<small>{mov(r.debitos.length)}</small></td></tr>
                <tr className="is-saldo is-sub"><th scope="row">Saldo del banco ajustado</th><td>{fmt(r.saldoAjustado)}</td></tr>
                <tr className="is-saldo"><th scope="row">Saldo final según el libro</th><td>{fmt(r.libro.saldoFinal)}</td></tr>
                <tr className={`is-total ${cierra ? 'is-ok' : 'is-err'}`}><th scope="row">Diferencia sin explicar</th><td>{fmt(r.diferencia)}</td></tr>
              </tbody>
            </table>

            {avisos.length > 0 && (
              <ul className="q-list">
                {avisos.slice(0, 8).map((a) => <li key={a}>{a}</li>)}
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
