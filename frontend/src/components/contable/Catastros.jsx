import React, { useMemo, useState } from 'react'
import { Plus, Pencil, X } from 'lucide-react'
import PageHead, { Figures } from '../PageHead'
import { useContable } from './ContableContext'
import { Errores, Vacio } from './ui'
import {
  analizarRuc, dvRuc, nivelDe, padreDe, compararCodigos, naturaleza, TIPOS_TIMBRADO, timbradoValido,
  timbradoVigente, fechaCorta, hoyISO, lineasDe, armarDiario
} from '../../services/contabilidad'

/* ── personas ───────────────────────────────────────────────── */

const TIPOS_PERSONA = [
  { id: 'proveedor', label: 'Proveedor' },
  { id: 'cliente', label: 'Cliente' },
  { id: 'ambos', label: 'Cliente y proveedor' }
]

export function Personas() {
  const { personas, comprobantes } = useContable()
  const [form, setForm] = useState(null)
  const [errores, setErrores] = useState([])
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('todas')

  const usados = useMemo(() => new Set(comprobantes.items.map((d) => d.personaRuc)), [comprobantes.items])
  const q = busca.trim().toLowerCase()
  const lista = personas.items
    .filter((p) => filtro === 'todas' || p.tipo === filtro || p.tipo === 'ambos')
    .filter((p) => !q || `${p.ruc} ${p.nombre} ${p.email || ''}`.toLowerCase().includes(q))
    .sort((a, b) => a.nombre.localeCompare(b.nombre))

  const set = (c) => { setForm((f) => ({ ...f, ...c })); setErrores([]) }
  const base = (form?.rucBase || '').replace(/\D/g, '')

  const guardar = (e) => {
    e.preventDefault()
    const ruc = `${base}-${form.dv}`
    const errs = []
    if (base.length < 3) errs.push('El RUC (sin dígito verificador) tiene entre 3 y 9 dígitos.')
    if (form.dv === '' || !/^\d$/.test(String(form.dv))) errs.push('Indicá el dígito verificador.')
    if (!form.nombre.trim()) errs.push('Escribí el nombre o razón social.')
    if (personas.items.some((p) => p.ruc === ruc && p.id !== form.id)) errs.push(`El RUC ${ruc} ya está catastrado.`)
    if (errs.length) { setErrores(errs); return }
    const { rucBase, dv, ...resto } = form
    personas.guardar({ ...resto, ruc, nombre: form.nombre.trim(), valido: analizarRuc(ruc).valido })
    setForm(null)
  }

  const editar = (p) => {
    const r = analizarRuc(p.ruc)
    setForm({ ...p, rucBase: r.base, dv: r.dv ?? '' })
    setErrores([])
  }

  return (
    <div className="q-sheet q-sheet--wide ct-sheet">
      <PageHead
        title="Personas"
        lede="Catastro de RUC de clientes y proveedores. Lo comparten todos tus contribuyentes y se completa solo cuando cargás comprobantes."
        equation={[{ v: 'DV' }, { op: '=' }, { n: '11' }, { op: '−' }, { op: '(' }, { op: 'Σ' }, { v: 'd·k' }, { v: ' mód 11' }, { op: ')' }]}
        caption="dígito verificador del RUC"
        status={personas.status}
      />
      <Figures items={[
        { label: 'Personas', value: personas.items.length },
        { label: 'Proveedores', value: personas.items.filter((p) => p.tipo !== 'cliente').length },
        { label: 'Clientes', value: personas.items.filter((p) => p.tipo !== 'proveedor').length },
        { label: 'DV a revisar', value: personas.items.filter((p) => !analizarRuc(p.ruc).valido).length, tone: personas.items.some((p) => !analizarRuc(p.ruc).valido) ? 'err' : undefined }
      ]} />

      <div className="ct-toolbar">
        <div className="ct-seg ct-seg--sm" role="tablist" aria-label="Filtrar">
          {[{ id: 'todas', label: 'Todas' }, ...TIPOS_PERSONA.slice(0, 2).map((t) => ({ ...t, label: `${t.label}es` }))].map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={filtro === t.id} className={filtro === t.id ? 'is-on' : ''} onClick={() => setFiltro(t.id)}>{t.label}</button>
          ))}
        </div>
        <label className="ct-buscar">
          <span className="q-label">Buscar</span>
          <input className="q-input" type="search" value={busca} placeholder="RUC o nombre" onChange={(e) => setBusca(e.target.value)} />
        </label>
        <div className="ct-toolbar__end">
          {!form && <button type="button" className="q-btn q-btn--primary" onClick={() => { setForm({ rucBase: '', dv: '', nombre: '', tipo: 'proveedor', telefono: '', email: '', direccion: '' }); setErrores([]) }}><Plus size={16} strokeWidth={1.8} /> Nueva persona</button>}
        </div>
      </div>

      {form && (
        <form className="q-card ct-form" onSubmit={guardar} noValidate>
          <div className="ct-form__head">
            <h2 className="ct-form__title">{form.id ? 'Editar persona' : 'Nueva persona'}</h2>
            <button type="button" className="q-ghost-icon" onClick={() => setForm(null)} aria-label="Cerrar formulario"><X size={18} strokeWidth={1.7} /></button>
          </div>
          <div className="ct-grid">
            <div className="q-field">
              <label className="q-label" htmlFor="pe-ruc">RUC</label>
              <div className="ct-ruc">
                <input id="pe-ruc" className="q-input q-input--num" inputMode="numeric" maxLength={9} value={form.rucBase} placeholder="80012345"
                  onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); set({ rucBase: v, dv: v.length >= 3 ? String(dvRuc(v)) : form.dv }) }} />
                <span aria-hidden="true">−</span>
                <input className="q-input q-input--num ct-dv" inputMode="numeric" maxLength={1} value={form.dv} aria-label="Dígito verificador" onChange={(e) => set({ dv: e.target.value.replace(/\D/g, '') })} />
              </div>
              {base.length >= 3 && String(dvRuc(base)) !== String(form.dv) && <small className="ct-hint is-warn">Según el cálculo de la SET el DV es {dvRuc(base)}.</small>}
            </div>
            <div className="q-field ct-span-2">
              <label className="q-label" htmlFor="pe-nom">Nombre o razón social</label>
              <input id="pe-nom" className="q-input" value={form.nombre} onChange={(e) => set({ nombre: e.target.value })} />
            </div>
            <div className="q-field">
              <label className="q-label" htmlFor="pe-tipo">Tipo</label>
              <select id="pe-tipo" className="q-input ct-select" value={form.tipo} onChange={(e) => set({ tipo: e.target.value })}>
                {TIPOS_PERSONA.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div className="q-field">
              <label className="q-label" htmlFor="pe-tel">Teléfono <small>opcional</small></label>
              <input id="pe-tel" className="q-input" value={form.telefono || ''} onChange={(e) => set({ telefono: e.target.value })} />
            </div>
            <div className="q-field">
              <label className="q-label" htmlFor="pe-mail">Correo <small>opcional</small></label>
              <input id="pe-mail" className="q-input" type="email" value={form.email || ''} onChange={(e) => set({ email: e.target.value })} />
            </div>
            <div className="q-field ct-span-2">
              <label className="q-label" htmlFor="pe-dir">Dirección <small>opcional</small></label>
              <input id="pe-dir" className="q-input" value={form.direccion || ''} onChange={(e) => set({ direccion: e.target.value })} />
            </div>
          </div>
          <Errores lista={errores} />
          <div className="ct-form__actions">
            <button type="submit" className="q-btn q-btn--primary">{form.id ? 'Guardar cambios' : 'Agregar persona'}</button>
            <button type="button" className="q-btn q-btn--line" onClick={() => setForm(null)}>Cancelar</button>
          </div>
        </form>
      )}

      {lista.length === 0 ? (
        !form && <Vacio titulo={personas.items.length ? 'Nada coincide con la búsqueda' : 'Todavía no hay personas'}>Agregá los RUC de tus clientes y proveedores, o cargá un comprobante y se agregan solos.</Vacio>
      ) : (
        <div className="q-card ct-card">
          <div className="ct-tabla-wrap">
            <table className="q-table ct-tabla">
              <thead><tr><th>RUC</th><th>Nombre o razón social</th><th>Tipo</th><th>Contacto</th><th><span className="sr-only">Acciones</span></th></tr></thead>
              <tbody>
                {lista.map((p) => {
                  const r = analizarRuc(p.ruc)
                  return (
                    <tr key={p.id}>
                      <td className="ct-mono">{p.ruc}{!r.valido && <span className="ct-cond is-warn" title={`DV esperado: ${r.esperado ?? '—'}`}>revisar DV</span>}</td>
                      <td className="ct-nombre">{p.nombre}</td>
                      <td>{TIPOS_PERSONA.find((t) => t.id === p.tipo)?.label || '—'}</td>
                      <td className="ct-sub">{[p.telefono, p.email].filter(Boolean).join(' · ') || '—'}</td>
                      <td className="ct-acciones">
                        <button type="button" className="ct-icon" onClick={() => editar(p)} aria-label={`Editar ${p.nombre}`} title="Editar"><Pencil size={14} strokeWidth={1.8} /></button>
                        <button type="button" className="ct-icon ct-icon--del" disabled={usados.has(p.ruc)}
                          title={usados.has(p.ruc) ? 'Tiene comprobantes cargados en este contribuyente' : 'Eliminar'}
                          onClick={() => window.confirm(`¿Eliminar a ${p.nombre}?`) && personas.eliminar(p.id)} aria-label={`Eliminar ${p.nombre}`}><X size={14} strokeWidth={1.8} /></button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── plan de cuentas ────────────────────────────────────────── */

export function PlanCuentas() {
  const { plan, cuentas, comprobantes, ejercicio } = useContable()
  const [form, setForm] = useState(null)
  const [errores, setErrores] = useState([])
  const [busca, setBusca] = useState('')

  const usadas = useMemo(() => {
    const s = new Set()
    comprobantes.items.forEach((d) => lineasDe(d).forEach((l) => s.add(l.cuenta)))
    return s
  }, [comprobantes.items])
  const conMovimiento = useMemo(() => armarDiario(comprobantes.items, ejercicio).length, [comprobantes.items, ejercicio])

  const padres = plan.filter((c) => nivelDe(c.codigo) <= 3)
  const sugerirCodigo = (padre) => {
    const hijos = plan.filter((c) => padreDe(c.codigo) === padre).map((c) => Number(c.codigo.split('.').pop()))
    const sig = (hijos.length ? Math.max(...hijos) : 0) + 1
    return `${padre}.${nivelDe(padre) >= 2 ? String(sig).padStart(2, '0') : sig}`
  }

  const q = busca.trim().toLowerCase()
  const visibles = plan.filter((c) => !q || `${c.codigo} ${c.nombre}`.toLowerCase().includes(q))

  const guardar = (e) => {
    e.preventDefault()
    const codigo = form.codigo.trim()
    const errs = []
    if (!form.padre) errs.push('Elegí el rubro donde va la cuenta.')
    if (!codigo.startsWith(`${form.padre}.`) || nivelDe(codigo) !== nivelDe(form.padre) + 1 || !/^[\d.]+$/.test(codigo)) errs.push(`El código tiene que colgar de ${form.padre}, p. ej. ${sugerirCodigo(form.padre)}.`)
    if (plan.some((c) => c.codigo === codigo && c.id !== form.id)) errs.push(`El código ${codigo} ya existe.`)
    if (!form.nombre.trim()) errs.push('Escribí el nombre de la cuenta.')
    if (errs.length) { setErrores(errs); return }
    cuentas.guardar({ id: form.id, codigo, nombre: form.nombre.trim(), imputable: nivelDe(codigo) >= 4 })
    setForm(null)
  }

  return (
    <div className="q-sheet q-sheet--wide ct-sheet">
      <PageHead
        title="Plan de cuentas"
        lede="Estructura base según los rubros de la RG 49/2014 (Activo, Pasivo, Patrimonio Neto, Ingresos, Costos y Gastos). Podés sumar cuentas propias de este contribuyente; las de cuarto nivel son imputables."
        equation={[{ v: 'A' }, { op: '=' }, { v: 'P' }, { op: '+' }, { v: 'PN' }]}
        caption="ecuación patrimonial"
        status={cuentas.status}
      />
      <Figures items={[
        { label: 'Cuentas', value: plan.length },
        { label: 'Imputables', value: plan.filter((c) => c.imputable).length },
        { label: 'Propias', value: cuentas.items.length },
        { label: 'Asientos del ejercicio', value: conMovimiento }
      ]} />
      <div className="ct-toolbar">
        <label className="ct-buscar">
          <span className="q-label">Buscar</span>
          <input className="q-input" type="search" value={busca} placeholder="Código o nombre" onChange={(e) => setBusca(e.target.value)} />
        </label>
        <div className="ct-toolbar__end">
          {!form && <button type="button" className="q-btn q-btn--primary" onClick={() => { setForm({ padre: '', codigo: '', nombre: '' }); setErrores([]) }}><Plus size={16} strokeWidth={1.8} /> Nueva cuenta</button>}
        </div>
      </div>

      {form && (
        <form className="q-card ct-form" onSubmit={guardar} noValidate>
          <div className="ct-form__head">
            <h2 className="ct-form__title">{form.id ? 'Editar cuenta' : 'Nueva cuenta contable'}</h2>
            <button type="button" className="q-ghost-icon" onClick={() => setForm(null)} aria-label="Cerrar formulario"><X size={18} strokeWidth={1.7} /></button>
          </div>
          <div className="ct-grid">
            <div className="q-field ct-span-2">
              <label className="q-label" htmlFor="pc-padre">Rubro (cuenta madre)</label>
              <select id="pc-padre" className="q-input ct-select" value={form.padre} disabled={!!form.id}
                onChange={(e) => { setForm({ ...form, padre: e.target.value, codigo: e.target.value ? sugerirCodigo(e.target.value) : '' }); setErrores([]) }}>
                <option value="">Elegí dónde va…</option>
                {padres.map((c) => <option key={c.codigo} value={c.codigo}>{'  '.repeat(nivelDe(c.codigo) - 1)}{c.codigo} · {c.nombre}</option>)}
              </select>
            </div>
            <div className="q-field">
              <label className="q-label" htmlFor="pc-cod">Código</label>
              <input id="pc-cod" className="q-input q-input--num" value={form.codigo} disabled={!!form.id} onChange={(e) => { setForm({ ...form, codigo: e.target.value }); setErrores([]) }} />
              {form.codigo && <small className="ct-hint">{nivelDe(form.codigo) >= 4 ? 'Imputable: recibe asientos.' : 'Agrupadora: suma a sus subcuentas.'} Saldo {naturaleza(form.codigo)}.</small>}
            </div>
            <div className="q-field ct-span-2">
              <label className="q-label" htmlFor="pc-nom">Nombre</label>
              <input id="pc-nom" className="q-input" value={form.nombre} placeholder="p. ej. Banco Itaú – cuenta corriente" onChange={(e) => { setForm({ ...form, nombre: e.target.value }); setErrores([]) }} />
            </div>
          </div>
          <Errores lista={errores} />
          <div className="ct-form__actions">
            <button type="submit" className="q-btn q-btn--primary">{form.id ? 'Guardar cambios' : 'Agregar cuenta'}</button>
            <button type="button" className="q-btn q-btn--line" onClick={() => setForm(null)}>Cancelar</button>
          </div>
        </form>
      )}

      <div className="q-card ct-card">
        <div className="ct-tabla-wrap">
          <table className="q-table ct-tabla ct-plan">
            <thead><tr><th>Código</th><th>Cuenta</th><th>Tipo</th><th>Saldo</th><th>Origen</th><th><span className="sr-only">Acciones</span></th></tr></thead>
            <tbody>
              {visibles.map((c) => {
                const nivel = nivelDe(c.codigo)
                return (
                  <tr key={c.codigo} className={`ct-plan__n${nivel}`}>
                    <td className="ct-mono ct-cod">{c.codigo}</td>
                    <td style={{ paddingLeft: `${10 + (nivel - 1) * 18}px` }}>{c.nombre}</td>
                    <td className="ct-sub">{c.imputable ? 'Imputable' : 'Agrupadora'}</td>
                    <td className="ct-sub">{naturaleza(c.codigo) === 'deudora' ? 'Deudor' : 'Acreedor'}</td>
                    <td>{c.base ? <span className="ct-cond">RG 49</span> : <span className="ct-cond is-own">Propia</span>}</td>
                    <td className="ct-acciones">
                      {!c.base && (
                        <>
                          <button type="button" className="ct-icon" onClick={() => { setForm({ ...c, padre: padreDe(c.codigo) }); setErrores([]) }} aria-label={`Editar ${c.nombre}`} title="Editar"><Pencil size={14} strokeWidth={1.8} /></button>
                          <button type="button" className="ct-icon ct-icon--del" disabled={usadas.has(c.codigo) || plan.some((x) => padreDe(x.codigo) === c.codigo)}
                            title={usadas.has(c.codigo) ? 'Tiene asientos registrados' : 'Eliminar'}
                            onClick={() => window.confirm(`¿Eliminar la cuenta ${c.codigo} ${c.nombre}?`) && cuentas.eliminar(c.id)} aria-label={`Eliminar ${c.nombre}`}><X size={14} strokeWidth={1.8} /></button>
                        </>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ── timbrados ──────────────────────────────────────────────── */

export function Timbrados() {
  const { timbrados, comprobantes } = useContable()
  const [form, setForm] = useState(null)
  const [errores, setErrores] = useState([])
  const hoy = hoyISO()

  const usos = (t) => comprobantes.items.filter((d) => String(d.timbrado) === String(t.numero) && String(d.numero || '').startsWith(`${t.establecimiento}-${t.punto}-`)).length
  const lista = timbrados.items.slice().sort((a, b) => (b.fin || '').localeCompare(a.fin || ''))
  const set = (c) => { setForm((f) => ({ ...f, ...c })); setErrores([]) }

  const guardar = (e) => {
    e.preventDefault()
    const errs = []
    if (!timbradoValido(form.numero)) errs.push('El número de timbrado tiene 8 dígitos.')
    if (!/^\d{3}$/.test(form.establecimiento) || !/^\d{3}$/.test(form.punto)) errs.push('Establecimiento y punto de expedición tienen 3 dígitos (001).')
    if (!form.inicio || !form.fin) errs.push('Indicá el inicio y el fin de vigencia.')
    else if (form.fin < form.inicio) errs.push('El fin de vigencia no puede ser anterior al inicio.')
    if (!(Number(form.desde) > 0) || (form.hasta && Number(form.hasta) < Number(form.desde))) errs.push('Revisá el rango de numeración autorizado.')
    if (timbrados.items.some((t) => t.id !== form.id && t.numero === form.numero && t.tipo === form.tipo && t.establecimiento === form.establecimiento && t.punto === form.punto)) errs.push('Ese timbrado ya está cargado para este documento y punto de expedición.')
    if (errs.length) { setErrores(errs); return }
    timbrados.guardar({ ...form, desde: Number(form.desde), hasta: form.hasta ? Number(form.hasta) : null })
    setForm(null)
  }

  return (
    <div className="q-sheet q-sheet--wide ct-sheet">
      <PageHead
        title="Timbrados"
        lede="Los timbrados autorizados por la DNIT para los documentos que emite este contribuyente. Al cargar una venta, nota o recibo, Quadra propone el siguiente número."
        equation={[{ v: 'Nº' }, { op: '=' }, { v: 'Est' }, { op: '−' }, { v: 'Pto' }, { op: '−' }, { v: 'Sec' }]}
        caption="001-001-0000001"
        status={timbrados.status}
      />
      <Figures items={[
        { label: 'Timbrados', value: lista.length },
        { label: 'Vigentes', value: lista.filter((t) => timbradoVigente(t, hoy)).length, tone: 'ok' },
        { label: 'Vencidos', value: lista.filter((t) => t.fin && t.fin < hoy).length, tone: lista.some((t) => t.fin && t.fin < hoy) ? 'err' : undefined }
      ]} />
      <div className="ct-toolbar">
        <div className="ct-toolbar__end">
          {!form && <button type="button" className="q-btn q-btn--primary" onClick={() => { setForm({ numero: '', tipo: 'factura', establecimiento: '001', punto: '001', desde: 1, hasta: '', inicio: hoy, fin: '' }); setErrores([]) }}><Plus size={16} strokeWidth={1.8} /> Nuevo timbrado</button>}
        </div>
      </div>

      {form && (
        <form className="q-card ct-form" onSubmit={guardar} noValidate>
          <div className="ct-form__head">
            <h2 className="ct-form__title">{form.id ? 'Editar timbrado' : 'Nuevo timbrado'}</h2>
            <button type="button" className="q-ghost-icon" onClick={() => setForm(null)} aria-label="Cerrar formulario"><X size={18} strokeWidth={1.7} /></button>
          </div>
          <div className="ct-grid">
            <div className="q-field">
              <label className="q-label" htmlFor="ti-num">Número de timbrado</label>
              <input id="ti-num" className="q-input q-input--num" inputMode="numeric" maxLength={8} value={form.numero} placeholder="12345678" onChange={(e) => set({ numero: e.target.value.replace(/\D/g, '') })} />
            </div>
            <div className="q-field">
              <label className="q-label" htmlFor="ti-tipo">Documento</label>
              <select id="ti-tipo" className="q-input ct-select" value={form.tipo} onChange={(e) => set({ tipo: e.target.value })}>
                {TIPOS_TIMBRADO.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div className="q-field">
              <label className="q-label" htmlFor="ti-est">Establecimiento</label>
              <input id="ti-est" className="q-input q-input--num" maxLength={3} value={form.establecimiento} onChange={(e) => set({ establecimiento: e.target.value.replace(/\D/g, '') })} onBlur={() => set({ establecimiento: form.establecimiento.padStart(3, '0') })} />
            </div>
            <div className="q-field">
              <label className="q-label" htmlFor="ti-pto">Punto de expedición</label>
              <input id="ti-pto" className="q-input q-input--num" maxLength={3} value={form.punto} onChange={(e) => set({ punto: e.target.value.replace(/\D/g, '') })} onBlur={() => set({ punto: form.punto.padStart(3, '0') })} />
            </div>
            <div className="q-field">
              <label className="q-label" htmlFor="ti-desde">Numeración desde</label>
              <input id="ti-desde" className="q-input q-input--num" inputMode="numeric" value={form.desde} onChange={(e) => set({ desde: e.target.value.replace(/\D/g, '') })} />
            </div>
            <div className="q-field">
              <label className="q-label" htmlFor="ti-hasta">Hasta <small>opcional</small></label>
              <input id="ti-hasta" className="q-input q-input--num" inputMode="numeric" value={form.hasta || ''} onChange={(e) => set({ hasta: e.target.value.replace(/\D/g, '') })} />
            </div>
            <div className="q-field">
              <label className="q-label" htmlFor="ti-ini">Inicio de vigencia</label>
              <input id="ti-ini" className="q-input" type="date" value={form.inicio} onChange={(e) => set({ inicio: e.target.value })} />
            </div>
            <div className="q-field">
              <label className="q-label" htmlFor="ti-fin">Fin de vigencia</label>
              <input id="ti-fin" className="q-input" type="date" value={form.fin} onChange={(e) => set({ fin: e.target.value })} />
            </div>
          </div>
          <Errores lista={errores} />
          <div className="ct-form__actions">
            <button type="submit" className="q-btn q-btn--primary">{form.id ? 'Guardar cambios' : 'Agregar timbrado'}</button>
            <button type="button" className="q-btn q-btn--line" onClick={() => setForm(null)}>Cancelar</button>
          </div>
        </form>
      )}

      {lista.length === 0 ? (
        !form && <Vacio titulo="Sin timbrados cargados">Cargá el timbrado de tus facturas, notas de crédito, notas de débito, recibos y comprobantes de retención.</Vacio>
      ) : (
        <div className="q-card ct-card">
          <div className="ct-tabla-wrap">
            <table className="q-table ct-tabla">
              <thead><tr><th>Timbrado</th><th>Documento</th><th>Est.–Pto.</th><th className="ct-der">Numeración</th><th>Vigencia</th><th className="ct-der">Usados</th><th>Estado</th><th><span className="sr-only">Acciones</span></th></tr></thead>
              <tbody>
                {lista.map((t) => {
                  const vigente = timbradoVigente(t, hoy)
                  const n = usos(t)
                  return (
                    <tr key={t.id}>
                      <td className="ct-mono ct-strong">{t.numero}</td>
                      <td>{TIPOS_TIMBRADO.find((x) => x.id === t.tipo)?.label}</td>
                      <td className="ct-mono">{t.establecimiento}-{t.punto}</td>
                      <td className="ct-mono">{t.desde}{t.hasta ? ` – ${t.hasta}` : ' en adelante'}</td>
                      <td className="ct-mono">{fechaCorta(t.inicio)} – {fechaCorta(t.fin)}</td>
                      <td className="ct-num">{n}</td>
                      <td><span className={`ct-estado ${vigente ? 'is-ok' : t.fin && t.fin < hoy ? 'is-err' : 'is-warn'}`}>{vigente ? 'Vigente' : t.fin && t.fin < hoy ? 'Vencido' : 'Aún no vigente'}</span></td>
                      <td className="ct-acciones">
                        <button type="button" className="ct-icon" onClick={() => { setForm({ ...t, hasta: t.hasta || '' }); setErrores([]) }} aria-label={`Editar timbrado ${t.numero}`} title="Editar"><Pencil size={14} strokeWidth={1.8} /></button>
                        <button type="button" className="ct-icon ct-icon--del" disabled={n > 0} title={n ? 'Tiene comprobantes emitidos' : 'Eliminar'} onClick={() => window.confirm(`¿Eliminar el timbrado ${t.numero}?`) && timbrados.eliminar(t.id)} aria-label={`Eliminar timbrado ${t.numero}`}><X size={14} strokeWidth={1.8} /></button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

