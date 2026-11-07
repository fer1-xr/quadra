import React, { useCallback, useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { Cloud, CloudOff, HardDrive, Search, Trash2, FileSpreadsheet, ChevronDown, FolderOpen } from 'lucide-react'
import PageHead from './PageHead'
import {
  listarHistorial, eliminarDeHistorial,
  useContribuyente, MODULOS
} from '../services/historialService'
import '../styles/Historial.css'

const fFecha = (iso) => new Date(iso).toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' })
const fHora = (iso) => new Date(iso).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })

const humanizar = (k) => k
  .replace(/([a-z])([A-Z0-9])/g, '$1 $2')
  .replace(/[_-]/g, ' ')
  .replace(/^./, (c) => c.toUpperCase())

const fValor = (v) => {
  if (v == null || v === '') return '—'
  if (typeof v === 'number') return v.toLocaleString('es-PY', { maximumFractionDigits: 2 })
  if (typeof v === 'boolean') return v ? 'Sí' : 'No'
  if (typeof v === 'object') return Array.isArray(v) ? `${v.length} elementos` : '…'
  return String(v)
}

/** Separa los datos guardados en campos simples y tablas (arrays de objetos). */
function descomponer(datos, prefijo = '') {
  const campos = []
  const tablas = []
  if (Array.isArray(datos)) {
    tablas.push({ nombre: prefijo || 'Detalle', filas: datos })
    return { campos, tablas }
  }
  if (datos && typeof datos === 'object') {
    Object.entries(datos).forEach(([k, v]) => {
      if (Array.isArray(v) && v.length && typeof v[0] === 'object') {
        tablas.push({ nombre: humanizar(k), filas: v })
      } else if (v && typeof v === 'object' && !Array.isArray(v)) {
        const sub = descomponer(v, humanizar(k))
        campos.push(...sub.campos.map((c) => ({ ...c, k: `${humanizar(k)} · ${c.k}` })))
        tablas.push(...sub.tablas)
      } else {
        campos.push({ k: humanizar(k), v })
      }
    })
  }
  return { campos, tablas }
}

function exportarExcel(item) {
  const wb = XLSX.utils.book_new()
  const { campos, tablas } = descomponer(item.datos)
  const cabecera = [
    ['Contribuyente', item.cliente?.razonSocial],
    ['RUC', item.cliente?.ruc],
    ['Ejercicio', item.cliente?.ejercicio],
    ['Módulo', MODULOS[item.modulo] || item.modulo],
    ['Título', item.titulo],
    ['Guardado', `${fFecha(item.createdAt)} ${fHora(item.createdAt)}`],
    [],
    ...Object.entries(item.resumen || {}).map(([k, v]) => [k, v]),
    [],
    ...campos.map((c) => [c.k, typeof c.v === 'object' ? JSON.stringify(c.v) : c.v])
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cabecera), 'Resumen')
  tablas.forEach((t, i) => {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(t.filas), (t.nombre || `Tabla ${i + 1}`).slice(0, 31))
  })
  const nombre = `${item.modulo}_${(item.cliente?.razonSocial || 'cliente').replace(/[^\w]+/g, '_')}_${item.createdAt.slice(0, 10)}.xlsx`
  XLSX.writeFile(wb, nombre)
}

function Detalle({ item }) {
  const { campos, tablas } = useMemo(() => descomponer(item.datos), [item])
  return (
    <div className="q-hist__detail">
      {campos.length > 0 && (
        <dl className="q-hist__fields">
          {campos.map((c) => (
            <div key={c.k}><dt>{c.k}</dt><dd>{fValor(c.v)}</dd></div>
          ))}
        </dl>
      )}
      {tablas.map((t) => {
        const cols = Object.keys(t.filas[0] || {}).slice(0, 10)
        return (
          <div key={t.nombre} className="q-hist__table-wrap">
            <p className="q-label">{t.nombre} · {t.filas.length}</p>
            <div className="q-hist__scroll">
              <table className="q-hist__table">
                <thead><tr>{cols.map((c) => <th key={c} scope="col">{humanizar(c)}</th>)}</tr></thead>
                <tbody>
                  {t.filas.slice(0, 50).map((f, i) => (
                    <tr key={i}>{cols.map((c) => <td key={c}>{fValor(f[c])}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
            {t.filas.length > 50 && <p className="q-hist__more">Mostrando 50 de {t.filas.length}. Descargá el Excel para ver todo.</p>}
          </div>
        )
      })}
    </div>
  )
}

function Historial({ onAbrir }) {
  const contribuyente = useContribuyente()
  const [items, setItems] = useState([])
  const [nube, setNube] = useState(true)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [abierto, setAbierto] = useState(null)

  const cargar = useCallback(async () => {
    if (!contribuyente) return
    setCargando(true)
    setError('')
    try {
      const res = await listarHistorial(contribuyente.clienteId)
      setItems(res.items)
      setNube(res.nube)
    } catch (err) {
      setError('No se pudo cargar el historial')
      console.error(err)
    } finally {
      setCargando(false)
    }
  }, [contribuyente])

  useEffect(() => { cargar() }, [cargar])

  const modulosPresentes = useMemo(() => [...new Set(items.map((i) => i.modulo))], [items])

  const visibles = items.filter((i) => (
    (filtro === 'todos' || i.modulo === filtro) &&
    (!busqueda.trim() || `${i.titulo} ${MODULOS[i.modulo] || ''}`.toLowerCase().includes(busqueda.trim().toLowerCase()))
  ))

  const eliminar = async (item) => {
    if (!window.confirm(`¿Eliminar "${item.titulo}" del historial? No se puede deshacer.`)) return
    try {
      await eliminarDeHistorial(item)
      setItems((prev) => prev.filter((i) => i.id !== item.id))
    } catch {
      setError('No se pudo eliminar')
    }
  }

  if (!contribuyente) return null

  return (
    <div className="q-sheet q-sheet--wide q-hist">
      <PageHead
        title="Historial"
        lede={`Conciliaciones y cálculos guardados de ${contribuyente.razonSocial}. Quedan guardados hasta que los elimines.`}
        equation={[{ v: 'Guardado' }, { op: '=' }, { v: 'Conservado' }]}
        caption="sin vencimiento"
      />

      <div className="q-hist__bar">
        <div className="q-hist__chips" role="tablist" aria-label="Filtrar por módulo">
          {['todos', ...modulosPresentes].map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={filtro === m}
              className={`q-hist__chip ${filtro === m ? 'is-active' : ''}`}
              onClick={() => setFiltro(m)}
            >
              {m === 'todos' ? 'Todos' : MODULOS[m] || m}
              <span>{m === 'todos' ? items.length : items.filter((i) => i.modulo === m).length}</span>
            </button>
          ))}
        </div>
        <label className="q-hist__search">
          <Search size={15} strokeWidth={1.8} aria-hidden="true" />
          <input type="search" placeholder="Buscar en el historial" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} aria-label="Buscar en el historial" />
        </label>
        <span className={`q-hist__sync ${nube ? 'is-ok' : 'is-local'}`}>
          {nube ? <Cloud size={15} strokeWidth={1.8} /> : <CloudOff size={15} strokeWidth={1.8} />}
          {nube ? 'Sincronizado con la nube' : 'Solo en este equipo'}
        </span>
      </div>

      {error && <div className="q-alert" role="alert">{error}</div>}

      {cargando ? (
        <p className="q-hist__empty">Cargando historial…</p>
      ) : visibles.length === 0 ? (
        <div className="q-hist__empty">
          <FolderOpen size={24} strokeWidth={1.5} />
          <p>{items.length ? 'Nada coincide con el filtro.' : 'Todavía no guardaste nada para este contribuyente.'}</p>
          {!items.length && <small>En cada módulo, al terminar una conciliación o cálculo, usá <strong>Guardar en la nube</strong>.</small>}
        </div>
      ) : (
        <ul className="q-hist__list">
          {visibles.map((item) => {
            const open = abierto === item.id
            return (
              <li key={item.id} className={`q-hist__item ${open ? 'is-open' : ''}`}>
                <div className="q-hist__row">
                  <button type="button" className="q-hist__main" onClick={() => setAbierto(open ? null : item.id)} aria-expanded={open}>
                    <span className="q-hist__mod">{MODULOS[item.modulo] || item.modulo}</span>
                    <span className="q-hist__title">{item.titulo}</span>
                    {Object.keys(item.resumen || {}).length > 0 && (
                      <span className="q-hist__summary">
                        {Object.entries(item.resumen).map(([k, v]) => (
                          <span key={k}><em>{k}</em> {fValor(v)}</span>
                        ))}
                      </span>
                    )}
                    <span className="q-hist__dates">
                      <span>{fFecha(item.createdAt)} · {fHora(item.createdAt)}</span>
                      {item.origen === 'local' && <span className="is-local"><HardDrive size={12} strokeWidth={1.8} /> Pendiente de subir</span>}
                    </span>
                    <ChevronDown className="q-hist__caret" size={16} strokeWidth={1.8} aria-hidden="true" />
                  </button>
                  <div className="q-hist__actions">
                    {onAbrir?.canOpen(item) && (
                      <button type="button" className="q-hist__act q-hist__act--primary" onClick={() => onAbrir.open(item)}>
                        <FolderOpen size={15} strokeWidth={1.8} /> Abrir
                      </button>
                    )}
                    <button type="button" className="q-hist__act" onClick={() => exportarExcel(item)} title="Descargar Excel">
                      <FileSpreadsheet size={15} strokeWidth={1.8} /> Excel
                    </button>
                    <button type="button" className="q-hist__act q-hist__act--danger" onClick={() => eliminar(item)} aria-label={`Eliminar ${item.titulo}`} title="Eliminar">
                      <Trash2 size={15} strokeWidth={1.8} />
                    </button>
                  </div>
                </div>
                {open && <Detalle item={item} />}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default Historial
