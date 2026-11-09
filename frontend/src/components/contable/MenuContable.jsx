import React, { useEffect, useRef, useState } from 'react'
import '../../styles/Contabilidad.css'
import { FolderOpen, ArrowLeftRight, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'

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
      { id: 'ct-asientos', label: 'Asientos Manuales' },
      {
        label: 'Libros',
        items: [
          { id: 'ct-libro-compras', label: 'Libro Compras' },
          { id: 'ct-libro-ventas', label: 'Libro Ventas' },
          { id: 'ct-diario', label: 'Libro Diario' },
          { id: 'ct-mayor', label: 'Libro Mayor' }
        ]
      },
      {
        label: 'Notas de Crédito',
        items: [
          { id: 'ct-nc-compra', label: 'Por compra (recibidas)' },
          { id: 'ct-nc-venta', label: 'Por venta (emitidas)' }
        ]
      },
      {
        label: 'Notas de Débito',
        items: [
          { id: 'ct-nd-compra', label: 'Por compra (recibidas)' },
          { id: 'ct-nd-venta', label: 'Por venta (emitidas)' }
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
  }
]

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

/** Menús del sistema contable (Catastros / Movimientos) */
export default function MenuContable({ vista, onNavigate, habilitado }) {
  const [abierto, setAbierto] = useState(null)
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
        {MENUS.map((m) => {
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
