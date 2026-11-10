import React, { useEffect, useMemo, useRef, useState } from 'react'
import '../../styles/Contabilidad.css'
import { FolderOpen, ArrowLeftRight, BarChart3, ArrowDownUp, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'
import { LIBROS, librosObligatorios, tieneRegla, impuestosActivos } from '../../services/informes'

const MENUS = [
  {
    id: 'catastros',
    label: 'Catastros',
    icon: FolderOpen,
    items: [
      { id: 'cotizacion', label: 'Cotizaciones' },
      {
        label: 'Revalúo & Depreciación',
        items: [
          { id: 'ct-activos', label: 'Bienes del activo fijo' },
          { id: 'ct-revaluo', label: 'Cuadro de revalúo y depreciación' }
        ]
      },
      { id: 'ct-personas', label: 'Personas' },
      { id: 'ct-plan', label: 'Plan de Cuentas' },
      { id: 'ct-timbrados', label: 'Timbrados' }
    ]
  },
  {
    id: 'movimientos',
    label: 'Movimientos',
    icon: ArrowLeftRight,
    items: [
      { id: 'ct-libro-compras', label: 'Compras', hint: 'facturas, ND y NC recibidas' },
      { id: 'ct-libro-ventas', label: 'Ventas', hint: 'facturas, ND y NC emitidas' },
      { id: 'ct-ingresos-egresos', label: 'Ingresos y Egresos', hint: 'IRP-RSP y RESIMPLE' },
      { id: 'ct-asientos', label: 'Asientos Manuales' },
      {
        label: 'Notas de Crédito',
        items: [
          { id: 'ct-nc-compra', label: 'Por compra (recibidas)' },
          { id: 'ct-nc-venta', label: 'Por venta (emitidas)' }
        ]
      },
      {
        label: 'Recibos',
        items: [
          { id: 'ct-recibo-cobro', label: 'De cobro (emitidos)' },
          { id: 'ct-recibo-pago', label: 'De pago (recibidos)' }
        ]
      },
      {
        label: 'Retenciones I.V.A.',
        items: [
          { id: 'ct-ret-emitida', label: 'Emitidas' },
          { id: 'ct-ret-recibida', label: 'Recibidas' }
        ]
      }
    ]
  },
  {
    id: 'informes',
    label: 'Informes',
    icon: BarChart3,
    items: [
      {
        label: 'Libros obligatorios',
        // se completa con los libros del régimen del contribuyente (menusPara)
        items: []
      },
      {
        label: 'Estados contables',
        items: [
          { id: 'ct-balance', label: 'Balance General' },
          { id: 'ct-resultados', label: 'Estado de Resultados' },
          { id: 'ct-mayor', label: 'Balance de sumas y saldos' }
        ]
      },
      { id: 'ct-iva', label: 'Liquidación de IVA', hint: 'Formulario 120, mes a mes' }
    ]
  },
  {
    id: 'impexp',
    label: 'Importar-Exportar',
    icon: ArrowDownUp,
    items: [
      { id: 'ct-importar', label: 'Importar', hint: 'Marangatu, Excel o respaldo' },
      { id: 'ct-exportar', label: 'Exportar', hint: 'libros, respaldo y plantillas' }
    ]
  }
]

// vistas que dependen del régimen: cada una se muestra solo si el impuesto la pide
const REGISTROS = ['ct-libro-compras', 'ct-libro-ventas', 'ct-ingresos-egresos', 'ct-asientos', 'ct-nc-compra', 'ct-nc-venta', 'ct-recibo-pago', 'ct-ret-emitida', 'ct-ret-recibida']
// en Informes, Compras y Ventas abren el generador de informes, no la carga
const INFORME_DE = { 'ct-libro-compras': 'ct-inf-compras', 'ct-libro-ventas': 'ct-inf-ventas' }
const LIBRO_CONTABLE = new Set(LIBROS.filter((l) => l.clase === 'contable').map((l) => l.id))

/**
 * Menús según el impuesto elegido al ingresar: Movimientos e Informes muestran
 * solo lo que pide el régimen. Sin regla para el impuesto, se ve todo.
 */
export const menusPara = (contribuyente) => {
  const regla = tieneRegla(contribuyente)
  const obl = new Set(librosObligatorios(contribuyente))
  // los recibos de cobro acompañan a los de pago
  if (obl.has('ct-recibo-pago')) obl.add('ct-recibo-cobro')
  const conIva = !regla || impuestosActivos(contribuyente).includes('iva')
  const conBalance = !regla || obl.has('ct-inventario')
  const ver = (id) => {
    if (id === 'ct-iva') return conIva
    if (id === 'ct-balance' || id === 'ct-resultados') return conBalance
    if (id === 'ct-recibo-cobro' || REGISTROS.includes(id)) return regla ? obl.has(id) : id !== 'ct-ingresos-egresos'
    return true
  }
  const filtrar = (items) => items
    .map((it) => {
      if (it.label === 'Libros obligatorios') {
        const ids = (regla ? [...obl] : librosObligatorios(null)).filter((id) => LIBRO_CONTABLE.has(id))
        return { ...it, items: ids.map((id) => ({ id: INFORME_DE[id] || id, label: LIBROS.find((l) => l.id === id).nombre, hint: INFORME_DE[id] ? 'filtros, rubricada y Excel' : undefined })) }
      }
      if (it.label === 'Balance de sumas y saldos' || it.id === 'ct-mayor') return conBalance || obl.has('ct-mayor') ? it : null
      return it.items ? { ...it, items: filtrar(it.items) } : (ver(it.id) ? it : null)
    })
    .filter((it) => it && (!it.items || it.items.length))
  return MENUS.map((m) => (m.id === 'movimientos' || m.id === 'informes' ? { ...m, items: filtrar(m.items) } : m))
}

const contiene = (item, vista) => item.id === vista || (item.items || []).some((x) => contiene(x, vista))

/** Isotipo de Marangatu (sistema de gestión tributaria de la DNIT) */
export function MarangatuIcono({ size = 22 }) {
  const nodos = [0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
    const r = (a * Math.PI) / 180
    return [12 + Math.cos(r) * 4.6, 12 + Math.sin(r) * 4.6]
  })
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="q-mrg__icon">
      <defs>
        <linearGradient id="mrg-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a5cf7e" />
          <stop offset="1" stopColor="#5e8a35" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="url(#mrg-g)" strokeWidth="1.15">
        {[0, 45, 90, 135].map((r) => <ellipse key={r} cx="12" cy="12" rx="10.6" ry="4.4" transform={`rotate(${r} 12 12)`} />)}
        {nodos.map(([x, y], i) => <line key={i} x1="12" y1="12" x2={x} y2={y} />)}
      </g>
      <g fill="#fff" stroke="url(#mrg-g)" strokeWidth="1.1">
        <circle cx="12" cy="12" r="1.35" />
        {nodos.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.25" />)}
      </g>
    </svg>
  )
}

function Lista({ items, vista, onElegir, nivel = 0 }) {
  // submenú abierto; el cambio por hover espera un instante para que el cursor
  // pueda cruzar en diagonal hasta el submenú sin que se cierre
  const [sub, setSub] = useState(null)
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  const hoverA = (label) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setSub(label), sub ? 220 : 60)
  }

  return (
    <ul className={`q-mb__list ${nivel ? 'q-mb__list--sub' : ''}`} role="menu">
      {items.map((it) => (
        <li key={it.id || it.label} role="none" className={`q-mb__li ${it.items ? 'has-sub' : ''} ${sub === it.label ? 'is-open' : ''}`}
          onMouseEnter={() => hoverA(it.items ? it.label : null)}>
          {it.items ? (
            <>
              <button type="button" role="menuitem" aria-haspopup="true" aria-expanded={sub === it.label}
                className={`q-mb__item ${contiene(it, vista) ? 'is-current' : ''}`}
                onClick={() => { clearTimeout(timer.current); setSub(sub === it.label ? null : it.label) }}
                onKeyDown={(e) => { if (e.key === 'ArrowRight') { e.preventDefault(); setSub(it.label) } if (e.key === 'ArrowLeft') setSub(null) }}>
                <span>{it.label}</span>
                <ChevronRight size={14} strokeWidth={1.8} aria-hidden="true" />
              </button>
              {sub === it.label && <Lista items={it.items} vista={vista} onElegir={onElegir} nivel={nivel + 1} />}
            </>
          ) : (
            <button type="button" role="menuitem" className={`q-mb__item ${it.id === vista ? 'is-current' : ''}`} aria-current={it.id === vista ? 'page' : undefined} onClick={() => onElegir(it.id)}>
              <span>{it.label}</span>
              {it.hint && <small className="q-mb__hint">{it.hint}</small>}
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}

/** Acceso directo a Marangatu (DNIT) */
export function MarangatuLink() {
  return (
    <a className="q-mrg" href="https://marangatu.set.gov.py/eset/login" target="_blank" rel="noopener noreferrer" title="Abrir Marangatu (DNIT) en una pestaña nueva">
      <MarangatuIcono size={18} />
      <span className="q-mrg__label">Marangatu</span>
      <ExternalLink size={12} strokeWidth={1.8} aria-hidden="true" className="q-mrg__ext" />
    </a>
  )
}

/** Menús del sistema contable (Catastros / Movimientos / Informes / Importar-Exportar) */
export default function MenuContable({ vista, onNavigate, habilitado, contribuyente }) {
  const [abierto, setAbierto] = useState(null)
  const menus = useMemo(() => menusPara(contribuyente), [contribuyente])
  const ref = useRef(null)

  useEffect(() => {
    if (!abierto) return undefined
    const fuera = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(null) }
    const tecla = (e) => { if (e.key === 'Escape') setAbierto(null) }
    document.addEventListener('pointerdown', fuera)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('pointerdown', fuera)
      document.removeEventListener('keydown', tecla)
    }
  }, [abierto])

  const elegir = (id) => {
    setAbierto(null)
    onNavigate(id)
  }

  return (
    <nav className="q-menubar" ref={ref} aria-label="Sistema contable" title={habilitado ? undefined : 'Elegí un contribuyente para usar el sistema contable'}>
      <ul className="q-menubar__menus">
        {menus.map((m) => {
          const Icon = m.icon
          const activo = m.items.some((x) => contiene(x, vista))
          return (
            <li key={m.id} className={`q-mb ${abierto === m.id ? 'is-open' : ''}`}
              onMouseEnter={() => abierto && abierto !== m.id && setAbierto(m.id)}>
              <button type="button" className={`q-mb__top ${activo ? 'is-current' : ''}`} aria-haspopup="true" aria-expanded={abierto === m.id}
                onClick={() => setAbierto(abierto === m.id ? null : m.id)}>
                <Icon size={15} strokeWidth={1.7} aria-hidden="true" />
                {m.label}
                <ChevronDown size={14} strokeWidth={1.8} aria-hidden="true" className="q-mb__caret" />
              </button>
              {abierto === m.id && <Lista items={m.items} vista={vista} onElegir={elegir} />}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
