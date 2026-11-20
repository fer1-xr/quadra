import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Pencil, X, Download, BookCheck, Sparkles, Package, Receipt, Calculator, ChevronRight, AlertTriangle } from 'lucide-react'
import PageHead, { Figures } from '../PageHead'
import { useContable } from './ContableContext'
import { MontoInput, CuentaSelect, Errores, Vacio, AsientoPreview, PersonaFields, exportarExcel } from './ui'
import {
  CATEGORIAS_ACTIVO, CLASES_AVU, ANIO_LEY_6380, claseDe, residualPctDe, cuadroActivo, cuadroActivoAnios, cuadroGeneral,
  asientoActivos, siguienteCodigoActivo, inicioDepreciacion, esAnterior6380, faltaVfn2019, timbradoValido, gs, fechaCorta, n0
} from '../../services/contabilidad'
import { excelCuadroDnit } from './cuadroDepreciacionExcel'
import '../../styles/AsientosManuales.css'
import '../../styles/ActivosFijos.css'

const esPPE = (c) => c.codigo.startsWith('1.2.03.') && c.codigo !== '1.2.03.08'
const categoriaDe = (id) => CATEGORIAS_ACTIVO.find((c) => c.id === id) || CATEGORIAS_ACTIVO[3]
const pctTxt = (p) => `${Math.round(Number(p) * 100)}%`

/** cierra la ventana con Escape */
const useEscape = (onCerrar) => {
  useEffect(() => {
    const tecla = (e) => { if (e.key === 'Escape') onCerrar() }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [onCerrar])
}

/* ── ventana de alta / modificación de un bien (IRE) ───────── */

function BienModal({ inicial, onCerrar }) {
  const { activos, personas, ejercicio, contribuyente, quienTimbro } = useContable()
  const [f, setF] = useState(inicial)
  const [errores, setErrores] = useState([])
  const [codigoAuto, setCodigoAuto] = useState(!inicial.id)
  const [contableDistinto, setContableDistinto] = useState(
    !!inicial.id && (
      (n0(inicial.costoContable) > 0 && n0(inicial.costoContable) !== n0(inicial.valorOrigen)) ||
      (Number(inicial.vidaUtilContable) > 0 && Number(inicial.vidaUtilContable) !== Number(inicial.vidaUtil))
    )
  )
  const [porTimbrado, setPorTimbrado] = useState(null)
  const primero = useRef(null)
  const set = (c) => { setF((x) => ({ ...x, ...c })); setErrores([]) }

  useEscape(onCerrar)
  useEffect(() => { primero.current?.focus() }, [])

  const clase = claseDe(f)
  const esTerreno = clase.id === 'terrenos'
  const otros = activos.items.filter((a) => a.id !== f.id)

  // la clase del Art. 31 fija la vida útil y el porcentaje de valor residual
  const cambiarClase = (id) => {
    const cl = CLASES_AVU.find((c) => c.id === id)
    const g = categoriaDe(cl.grupo)
    set({
      claseAvu: cl.id,
      categoria: g.id,
      cuenta: g.id !== f.categoria ? g.cuenta : f.cuenta,
      vidaUtil: cl.vida,
      residualPct: cl.residual,
      ...(codigoAuto && g.id !== f.categoria ? { codigo: siguienteCodigoActivo(otros, g.id) } : {})
    })
  }

  // timbrado completo: trae el proveedor que ya lo usó en otra carga
  const cambiarTimbrado = (v) => {
    const numero = v.replace(/\D/g, '').slice(0, 8)
    set({ timbrado: numero })
    if (!timbradoValido(numero)) return
    const q = quienTimbro(numero)
    if (q && (!f.personaRuc || f.personaRuc === porTimbrado?.ruc)) {
      const p = personas.items.find((x) => x.ruc === q.ruc)
      set({ timbrado: numero, personaRuc: q.ruc, personaNombre: p?.nombre || q.nombre })
      setPorTimbrado(q)
    }
  }

  // vista previa con el mismo cálculo del cuadro
  const costo = n0(f.valorOrigen)
  const vida = Number(f.vidaUtil) || 0
  const cantidad = Math.max(Number(f.cantidad) || 1, 1)
  const anioAlta = Number((f.fechaAlta || '').slice(0, 4)) || ejercicio
  const anterior = esAnterior6380(f)
  const desde = inicioDepreciacion({ ...f, fechaAlta: f.fechaAlta || `${ejercicio}-01-01` })
  const hasta = desde + Math.max(Math.ceil(vida), 1) - 1
  const pct = residualPctDe(f)
  const previa = costo && (!anterior || f.vfn2019 !== '')
    ? cuadroActivoAnios({ ...f, valorOrigen: costo, vidaUtil: vida, fechaBaja: '', coeficientes: {} }, Math.max(hasta, ANIO_LEY_6380))
    : []
  const primeraCuota = previa.find((x) => x.cuota > 0)

  const guardar = (e) => {
    e.preventDefault()
    const errs = []
    const codigo = (f.codigo || '').trim().toUpperCase()
    if (!f.descripcion.trim()) errs.push('Describí el bien.')
    if (codigo && otros.some((a) => String(a.codigo || '').toUpperCase() === codigo)) errs.push(`El código ${codigo} ya lo tiene otro bien.`)
    if (!(Number(f.cantidad) >= 1)) errs.push('La cantidad tiene que ser 1 o más.')
    if (!f.fechaAlta) errs.push('Indicá la fecha de la factura de compra.')
    if (!costo) errs.push('El costo fiscal sin IVA tiene que ser mayor a cero.')
    if (!esTerreno && !(vida > 0)) errs.push('Indicá los años de vida útil.')
    if (anterior && !n0(f.vfn2019)) errs.push(`Bien comprado antes de ${ANIO_LEY_6380}: indicá el valor fiscal neto al 31/12/${ANIO_LEY_6380 - 1} (RG 77/20, art. 2).`)
    if (f.timbrado && !timbradoValido(f.timbrado)) errs.push('El timbrado tiene 8 dígitos.')
    if (f.timbradoVence && f.fechaAlta && f.timbradoVence < f.fechaAlta) errs.push('El timbrado ya estaba vencido a la fecha de la factura.')
    if (contableDistinto && !n0(f.costoContable)) errs.push('Indicá el costo contable o desmarcá la opción de valores contables distintos.')
    if (f.fechaBaja && f.fechaBaja < f.fechaAlta) errs.push('La baja no puede ser anterior al alta.')
    if (errs.length) { setErrores(errs); return }

    const ruc = (f.personaRuc || '').trim()
    const nombre = (f.personaNombre || '').trim()
    if (ruc && nombre) personas.asegurar(ruc, nombre, 'proveedor')
    activos.guardar({
      ...f,
      codigo: codigo || siguienteCodigoActivo(otros, f.categoria),
      descripcion: f.descripcion.trim(),
      cantidad: Number(f.cantidad) || 1,
      personaRuc: ruc,
      personaNombre: nombre,
      valorOrigen: costo,
      vidaUtil: esTerreno ? 0 : vida,
      claseAvu: clase.id,
      residualPct: pct,
      computarDesde: f.computarDesde || 'actual',
      vfn2019: anterior ? n0(f.vfn2019) : '',
      depAcum2019: anterior ? n0(f.depAcum2019) : '',
      costoContable: contableDistinto ? n0(f.costoContable) : costo,
      vidaUtilContable: contableDistinto && Number(f.vidaUtilContable) > 0 ? Number(f.vidaUtilContable) : (esTerreno ? 0 : vida),
      coeficientes: f.coeficientes || {}
    })
    onCerrar()
  }

  return createPortal(
    <div className="q-content am-overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar() }}>
      <form className="af-modal" role="dialog" aria-modal="true" aria-labelledby="af-titulo" onSubmit={guardar} noValidate>
        <header className="af-modal__head">
          <div>
            <h2 id="af-titulo">{f.id ? 'Modificar bien' : 'Registrar bien'}</h2>
            <p>Activo fijo · {contribuyente.razonSocial} · Ejercicio {ejercicio}</p>
          </div>
          <button type="button" className="q-ghost-icon" onClick={onCerrar} aria-label="Cerrar"><X size={18} strokeWidth={1.8} /></button>
        </header>

        <div className="af-modal__body">
          <section className="af-sec" aria-labelledby="af-s1">
            <h3 id="af-s1"><Package size={15} strokeWidth={1.8} aria-hidden="true" /> El bien</h3>
            <div className="ct-grid">
              <div className="q-field ct-span-2">
                <label className="q-label" htmlFor="af-clase">Tipo de bien <small>Dto. 3182/19 art. 31</small></label>
                <select id="af-clase" ref={primero} className="q-input ct-select" value={clase.id} onChange={(e) => cambiarClase(e.target.value)}>
                  {CATEGORIAS_ACTIVO.map((g) => (
                    <optgroup key={g.id} label={g.label}>
                      {CLASES_AVU.filter((c) => c.grupo === g.id).map((c) => (
                        <option key={c.id} value={c.id}>{c.label}{c.vida ? ` · ${c.vida} años · residual ${pctTxt(c.residual)}` : ''}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="q-field">
                <label className="q-label" htmlFor="af-cod">Código</label>
                <input id="af-cod" className="q-input q-input--num" value={f.codigo || ''} placeholder={siguienteCodigoActivo(otros, f.categoria)}
                  onChange={(e) => { setCodigoAuto(false); set({ codigo: e.target.value.toUpperCase() }) }} />
              </div>
              <div className="q-field">
                <label className="q-label" htmlFor="af-cant">Cantidad</label>
                <input id="af-cant" className="q-input q-input--num" type="number" min="1" step="1" value={f.cantidad} onChange={(e) => set({ cantidad: e.target.value })} />
              </div>
              <div className="q-field af-full">
                <label className="q-label" htmlFor="af-desc">Descripción</label>
                <input id="af-desc" className="q-input" value={f.descripcion} placeholder="p. ej. Camioneta Toyota Hilux 2024, chapa ABC 123" onChange={(e) => set({ descripcion: e.target.value })} />
              </div>
            </div>
          </section>

          <section className="af-sec" aria-labelledby="af-s2">
            <h3 id="af-s2"><Receipt size={15} strokeWidth={1.8} aria-hidden="true" /> Factura de compra</h3>
            <div className="ct-grid">
              <PersonaFields ruc={f.personaRuc || ''} nombre={f.personaNombre || ''} rotulo={<>RUC del proveedor <small>opcional</small></>}
                onChange={({ personaRuc, personaNombre }) => { setPorTimbrado(null); set({ personaRuc, personaNombre }) }} />
              <div className="q-field">
                <label className="q-label" htmlFor="af-fecha">Fecha de compra</label>
                <input id="af-fecha" className="q-input" type="date" value={f.fechaAlta} onChange={(e) => set({ fechaAlta: e.target.value })} />
              </div>
              <div className="q-field">
                <label className="q-label" htmlFor="af-fact">N.º de factura <small>opcional</small></label>
                <input id="af-fact" className="q-input q-input--num" value={f.comprobante || ''} placeholder="001-001-0000001" onChange={(e) => set({ comprobante: e.target.value })} />
              </div>
              <div className="q-field">
                <label className="q-label" htmlFor="af-timb">Timbrado <small>opcional</small></label>
                <input id="af-timb" className="q-input q-input--num" inputMode="numeric" maxLength={8} value={f.timbrado || ''} placeholder="12345678" onChange={(e) => cambiarTimbrado(e.target.value)} />
                {porTimbrado && <small className="ct-hint">Proveedor tomado del timbrado.</small>}
              </div>
              <div className="q-field">
                <label className="q-label" htmlFor="af-vence">Vence el timbrado <small>opcional</small></label>
                <input id="af-vence" className="q-input" type="date" value={f.timbradoVence || ''} onChange={(e) => set({ timbradoVence: e.target.value })} />
              </div>
            </div>
          </section>

          <section className="af-sec" aria-labelledby="af-s3">
            <h3 id="af-s3"><Calculator size={15} strokeWidth={1.8} aria-hidden="true" /> Valuación y depreciación</h3>
            <div className="ct-grid">
              <div className="q-field ct-span-2">
                <label className="q-label" htmlFor="af-costo">Costo total fiscal sin IVA</label>
                <MontoInput id="af-costo" value={f.valorOrigen} onChange={(v) => set({ valorOrigen: v })} />
              </div>
              <div className="q-field">
                <label className="q-label" htmlFor="af-vida">Vida útil fiscal</label>
                <div className="af-sufijo">
                  <input id="af-vida" className="q-input q-input--num" type="number" min="0" value={esTerreno ? '' : f.vidaUtil} disabled={esTerreno} placeholder={esTerreno ? '—' : ''} onChange={(e) => set({ vidaUtil: e.target.value })} />
                  <span>años</span>
                </div>
                {!esTerreno && Number(f.vidaUtil) !== clase.vida && <small className="ct-hint is-warn">El art. 31 fija {clase.vida} años{anterior ? '; los bienes anteriores a 2020 siguen con la norma de su compra' : ''}.</small>}
              </div>
              <div className="q-field">
                <span className="q-label">Valor residual fiscal</span>
                <div className="af-dato"><strong>{pctTxt(pct)}</strong>{(anterior ? n0(f.vfn2019) : costo) > 0 && <span>{gs((anterior ? n0(f.vfn2019) : costo) * pct)}</span>}</div>
              </div>
              <div className="q-field">
                <span className="q-label" id="af-desde-l">Computar desde</span>
                <div className="ct-seg ct-seg--sm af-seg" role="radiogroup" aria-labelledby="af-desde-l">
                  {[{ id: 'actual', label: String(anioAlta), t: 'Ejercicio de la compra' }, { id: 'siguiente', label: String(anioAlta + 1), t: 'Ejercicio siguiente a la compra' }].map((o) => (
                    <button key={o.id} type="button" role="radio" aria-checked={f.computarDesde === o.id} className={f.computarDesde === o.id ? 'is-on' : ''} disabled={esTerreno}
                      onClick={() => set({ computarDesde: o.id })} title={o.t}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              {anterior && (
                <div className="af-ley af-full">
                  <p><AlertTriangle size={14} strokeWidth={1.9} aria-hidden="true" /> Bien comprado antes de la Ley 6380/19: el cuadro arranca en {ANIO_LEY_6380} con sus valores fiscales al 31/12/{ANIO_LEY_6380 - 1}, y el valor residual se calcula sobre ese valor neto (RG 77/20, art. 2).</p>
                  <div className="ct-grid">
                    <div className="q-field ct-span-2">
                      <label className="q-label" htmlFor="af-vfn19">Valor fiscal neto al 31/12/{ANIO_LEY_6380 - 1}</label>
                      <MontoInput id="af-vfn19" value={f.vfn2019 ?? ''} onChange={(v) => set({ vfn2019: v })} />
                    </div>
                    <div className="q-field ct-span-2">
                      <label className="q-label" htmlFor="af-dep19">Depreciación acumulada al 31/12/{ANIO_LEY_6380 - 1} <small>opcional</small></label>
                      <MontoInput id="af-dep19" value={f.depAcum2019 ?? ''} onChange={(v) => set({ depAcum2019: v })} />
                    </div>
                  </div>
                </div>
              )}
              <div className="q-field ct-span-2">
                <label className="q-label" htmlFor="af-cta">Cuenta contable</label>
                <CuentaSelect id="af-cta" value={f.cuenta} onChange={(v) => set({ cuenta: v })} filtro={esPPE} />
              </div>
              <label className="af-check ct-span-2">
                <input type="checkbox" checked={contableDistinto} onChange={(e) => { setContableDistinto(e.target.checked); setErrores([]) }} />
                <span>El costo o la vida útil contable son distintos de los fiscales</span>
              </label>
              {contableDistinto && (
                <>
                  <div className="q-field ct-span-2">
                    <label className="q-label" htmlFor="af-costo-c">Costo total contable sin IVA</label>
                    <MontoInput id="af-costo-c" value={f.costoContable} onChange={(v) => set({ costoContable: v })} />
                  </div>
                  <div className="q-field">
                    <label className="q-label" htmlFor="af-vida-c">Vida útil contable</label>
                    <div className="af-sufijo">
                      <input id="af-vida-c" className="q-input q-input--num" type="number" min="0" value={f.vidaUtilContable || ''} placeholder={String(vida || '')} onChange={(e) => set({ vidaUtilContable: e.target.value })} />
                      <span>años</span>
                    </div>
                  </div>
                </>
              )}
              {f.id && (
                <div className="q-field">
                  <label className="q-label" htmlFor="af-baja">Venta o baja <small>opcional</small></label>
                  <input id="af-baja" className="q-input" type="date" value={f.fechaBaja || ''} onChange={(e) => set({ fechaBaja: e.target.value })} />
                </div>
              )}
            </div>
          </section>

          <div className="af-resumen" aria-live="polite">
            {esTerreno ? (
              <p><strong>Los terrenos no se deprecian.</strong> Solo se revalúan cuando el Poder Ejecutivo establece un coeficiente.</p>
            ) : primeraCuota ? (
              <>
                <div><span>Valor residual</span><strong>{gs(primeraCuota.residual)}</strong></div>
                <div><span>Cuota anual</span><strong>{gs(primeraCuota.cuota)}</strong></div>
                <div><span>Se deprecia</span><strong>{anterior ? `${ANIO_LEY_6380} → ${hasta}` : `${desde} → ${hasta}`}</strong></div>
                {cantidad > 1 && <div><span>Costo por unidad</span><strong>{gs(costo / cantidad)}</strong></div>}
              </>
            ) : anterior && costo && previa.length ? (
              <p>Este bien terminó su vida útil fiscal antes de {ANIO_LEY_6380}: queda a su valor neto, sin cuota de depreciación.</p>
            ) : (
              <p>Cargá el costo{anterior ? ` y el valor fiscal neto al 31/12/${ANIO_LEY_6380 - 1}` : ''} para ver la cuota anual: (costo − valor residual) ÷ años de vida útil.</p>
            )}
          </div>

          <Errores lista={errores} />
        </div>

        <footer className="af-modal__foot">
          <button type="button" className="q-btn q-btn--line" onClick={onCerrar}>Cancelar</button>
          <button type="submit" className="q-btn q-btn--primary">{f.id ? 'Guardar cambios' : 'Registrar bien'}</button>
        </footer>
      </form>
    </div>,
    document.querySelector('.q-app') || document.body
  )
}

/** Catastro de bienes del activo fijo (IRE) */
export function ActivosFijos() {
  const { activos, ejercicio, nombreCuenta } = useContable()
  const [form, setForm] = useState(null)

  const nuevo = () => {
    const cat = categoriaDe('maquinarias')
    const cl = claseDe({ categoria: cat.id })
    setForm({
      claseAvu: cl.id, categoria: cat.id, codigo: siguienteCodigoActivo(activos.items, cat.id), descripcion: '', cantidad: 1,
      personaRuc: '', personaNombre: '', comprobante: '', fechaAlta: `${ejercicio}-01-01`, timbrado: '', timbradoVence: '',
      valorOrigen: '', vidaUtil: cl.vida, residualPct: cl.residual, computarDesde: 'actual', cuenta: cat.cuenta,
      vfn2019: '', depAcum2019: '', costoContable: '', vidaUtilContable: '', fechaBaja: '', coeficientes: {}
    })
  }
  const cerrar = useCallbackEstable(() => setForm(null))

  const lista = activos.items.slice().sort((a, b) => (a.fechaAlta || '').localeCompare(b.fechaAlta || ''))
  const vigentes = lista.filter((a) => !a.fechaBaja)
  const totalOrigen = vigentes.reduce((s, a) => s + n0(a.valorOrigen), 0)
  const cuotas = lista.reduce((s, a) => s + (cuadroActivo(a, ejercicio)?.cuota || 0), 0)

  return (
    <div className="q-sheet q-sheet--wide ct-sheet">
      <PageHead
        title="Bienes del activo fijo"
        lede="Catastro de los bienes de uso del contribuyente, con la vida útil y el valor residual del art. 31 del Decreto 3182/19. Con estos datos Quadra arma el cuadro de depreciación de la RG 77/20."
        equation={[{ v: 'Cuota' }, { op: '=' }, { op: '(' }, { v: 'VFN' }, { op: '−' }, { v: 'VR' }, { op: ')' }, { op: '÷' }, { v: 'AVU', sub: 'rest+1' }]}
        caption="línea recta con valor residual"
        status={activos.status}
      />
      <Figures items={[
        { label: 'Bienes en uso', value: vigentes.length },
        { label: 'Costo fiscal', value: gs(totalOrigen) },
        { label: `Depreciación ${ejercicio}`, value: gs(cuotas), tone: cuotas ? 'ok' : undefined },
        { label: 'Dados de baja', value: lista.length - vigentes.length }
      ]} />
      <div className="ct-toolbar">
        <div className="ct-toolbar__end">
          <button type="button" className="q-btn q-btn--primary" onClick={nuevo}><Plus size={16} strokeWidth={1.8} /> Registrar bien</button>
        </div>
      </div>

      {form && <BienModal inicial={form} onCerrar={cerrar} />}

      {lista.length === 0 ? (
        <Vacio titulo="Sin bienes cargados">Cargá rodados, inmuebles, muebles, equipos y maquinarias para calcular su revalúo y depreciación.</Vacio>
      ) : (
        <div className="q-card ct-card">
          <div className="ct-tabla-wrap">
            <table className="q-table ct-tabla">
              <thead><tr><th>Código</th><th>Bien</th><th>Tipo (art. 31)</th><th>Compra</th><th className="ct-der">Vida útil</th><th className="ct-der">Residual</th><th>Deprecia desde</th><th className="ct-der">Costo fiscal</th><th>Estado</th><th><span className="sr-only">Acciones</span></th></tr></thead>
              <tbody>
                {lista.map((a) => (
                  <tr key={a.id}>
                    <td className="ct-mono">{a.codigo || '—'}</td>
                    <td className="ct-nombre">
                      {a.descripcion}{Number(a.cantidad) > 1 && <span className="ct-sub"> × {a.cantidad}</span>}
                      {a.personaNombre && <div className="ct-sub">{a.personaNombre}{a.comprobante ? ` · ${a.comprobante}` : ''}</div>}
                      {faltaVfn2019(a) && <div className="ct-hint is-warn">Falta el valor fiscal neto al 31/12/{ANIO_LEY_6380 - 1}</div>}
                    </td>
                    <td className="ct-sub" title={nombreCuenta(a.cuenta)}>{claseDe(a).label}</td>
                    <td className="ct-mono">{fechaCorta(a.fechaAlta)}</td>
                    <td className="ct-num">{a.vidaUtil ? `${a.vidaUtil} años` : '—'}</td>
                    <td className="ct-num">{pctTxt(residualPctDe(a))}</td>
                    <td className="ct-mono">{a.vidaUtil ? (esAnterior6380(a) && inicioDepreciacion(a) < ANIO_LEY_6380 ? `${inicioDepreciacion(a)} (ant.)` : inicioDepreciacion(a)) : '—'}</td>
                    <td className="ct-num ct-strong">{gs(a.valorOrigen)}</td>
                    <td>{a.fechaBaja ? <span className="ct-estado is-err">Baja {fechaCorta(a.fechaBaja)}</span> : <span className="ct-estado is-ok">En uso</span>}</td>
                    <td className="ct-acciones">
                      <button type="button" className="ct-icon" onClick={() => setForm({ cantidad: 1, computarDesde: 'actual', vfn2019: '', depAcum2019: '', ...a, claseAvu: claseDe(a).id, residualPct: residualPctDe(a) })} aria-label={`Modificar ${a.descripcion}`} title="Modificar"><Pencil size={14} strokeWidth={1.8} /></button>
                      <button type="button" className="ct-icon ct-icon--del" onClick={() => window.confirm(`¿Eliminar ${a.descripcion}? Se quita también del cuadro de depreciación.`) && activos.eliminar(a.id)} aria-label={`Eliminar ${a.descripcion}`} title="Eliminar"><X size={14} strokeWidth={1.8} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

/** función que no cambia entre renders (para no re-suscribir el Escape) */
function useCallbackEstable(fn) {
  const ref = useRef(fn)
  ref.current = fn
  return useMemo(() => (...args) => ref.current(...args), [])
}

/* ── generador automático del cuadro ───────────────────────── */

const leerCoef = (v) => {
  const t = String(v ?? '').trim().replace(',', '.')
  if (!t) return null
  const n = Number(t)
  return n > 0 && n < 10 ? n : NaN
}
const verCoef = (v) => (v == null || v === '' ? '' : String(v).replace('.', ','))

/** bienes que en `anio` se revalúan con el coeficiente general (los comprados en ejercicios anteriores) */
const revaluables = (activos, anio) => activos.filter((a) => {
  const alta = Number((a.fechaAlta || '').slice(0, 4))
  const baja = a.fechaBaja ? Number(a.fechaBaja.slice(0, 4)) : Infinity
  return alta && alta < anio && baja >= anio
})

function GeneradorModal({ onCerrar, onListo }) {
  const { activos, comprobantes, ejercicio, contribuyente } = useContable()
  const primerAnio = Math.min(ejercicio, ...activos.items.map((a) => Number((a.fechaAlta || '').slice(0, 4)) || ejercicio))
  const anios = useMemo(() => {
    const l = []
    for (let y = ejercicio; y >= primerAnio; y--) l.push(y)
    return l
  }, [ejercicio, primerAnio])

  // coeficiente que ya comparten todos los bienes revaluables del año
  const [iniciales] = useState(() => Object.fromEntries(anios.map((y) => {
    const vals = [...new Set(revaluables(activos.items, y).map((a) => String(a.coeficientes?.[y] ?? '')))]
    return [y, vals.length === 1 ? verCoef(vals[0]) : '']
  })))
  const [coefs, setCoefs] = useState(iniciales)
  const [asientos, setAsientos] = useState(false)
  const [errores, setErrores] = useState([])

  useEscape(onCerrar)

  const generar = () => {
    const malos = anios.filter((y) => Number.isNaN(leerCoef(coefs[y])))
    if (malos.length) { setErrores([`Revisá el coeficiente de ${malos.join(', ')}: tiene que ser un número como 1,0350.`]); return }

    // cada bien recibe el coeficiente general de cada año que se completó o se borró
    const nuevos = new Map(activos.items.map((a) => [a.id, a]))
    anios.forEach((y) => {
      const valor = leerCoef(coefs[y])
      if (valor == null && !iniciales[y]) return // vacío y sin dato previo: cada bien queda como está
      revaluables(activos.items, y).forEach((a0) => {
        const a = nuevos.get(a0.id)
        const c = { ...(a.coeficientes || {}) }
        if (valor == null) delete c[y]
        else c[y] = String(valor)
        nuevos.set(a.id, { ...a, coeficientes: c })
      })
    })
    activos.items.forEach((a) => {
      const n = nuevos.get(a.id)
      if (JSON.stringify(n.coeficientes || {}) !== JSON.stringify(a.coeficientes || {})) activos.guardar(n)
    })

    let registrados = 0
    if (asientos) {
      const lista = [...nuevos.values()]
      anios.forEach((y) => {
        const lineas = asientoActivos(lista, y)
        if (!lineas.length) return
        const id = `dep-${contribuyente.clienteId}-${y}`
        const previo = comprobantes.items.find((d) => d.id === id)
        comprobantes.guardar({
          id, tipo: 'depreciacion', fecha: `${y}-12-31`,
          concepto: `Depreciación del activo fijo · ejercicio ${y}`,
          lineas, creadoEn: previo?.creadoEn
        })
        registrados++
      })
    }
    onListo({ anios: anios.length, bienes: activos.items.length, registrados })
  }

  return createPortal(
    <div className="q-content am-overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar() }}>
      <div className="af-modal af-modal--sm" role="dialog" aria-modal="true" aria-labelledby="af-gen-titulo">
        <header className="af-modal__head">
          <div>
            <h2 id="af-gen-titulo">Generar cuadro de depreciación</h2>
            <p>{activos.items.length} {activos.items.length === 1 ? 'bien' : 'bienes'} · ejercicios {primerAnio} a {ejercicio}</p>
          </div>
          <button type="button" className="q-ghost-icon" onClick={onCerrar} aria-label="Cerrar"><X size={18} strokeWidth={1.8} /></button>
        </header>
        <div className="af-modal__body">
          <p className="af-intro">Quadra calcula cada ejercicio con el método de la RG 77/20: a cada bien le resta su valor residual y reparte el resto entre los años de vida útil que le quedan. Desde 2020 el revalúo solo corresponde cuando <strong>el Poder Ejecutivo lo establece</strong> (variación del IPC de al menos 20%, art. 11 Ley 6380/19): cargá el coeficiente solo en esos ejercicios y dejá vacío el resto.</p>
          <div className="af-coefs">
            {anios.map((y) => {
              const n = revaluables(activos.items, y).length
              return (
                <label key={y} className={`af-coef ${n ? '' : 'is-off'}`}>
                  <span className="af-coef__anio">{y}</span>
                  <span className="af-coef__n">{n ? `${n} ${n === 1 ? 'bien' : 'bienes'} a revaluar` : 'solo altas del año'}</span>
                  <input className="q-input q-input--num" inputMode="decimal" value={coefs[y]} placeholder="1,0000" disabled={!n}
                    aria-label={`Coeficiente de revalúo ${y}`} onChange={(e) => { setCoefs((c) => ({ ...c, [y]: e.target.value })); setErrores([]) }} />
                </label>
              )
            })}
          </div>
          <p className="ct-hint">El coeficiente se aplica sobre (VFN del ejercicio anterior − valor residual) de los bienes comprados en ejercicios anteriores. Para un bien puntual, ajustalo en el detalle del año.</p>
          <label className="af-check">
            <input type="checkbox" checked={asientos} onChange={(e) => setAsientos(e.target.checked)} />
            <span>Registrar también el asiento de cierre de cada ejercicio en el Libro Diario</span>
          </label>
          <Errores lista={errores} />
        </div>
        <footer className="af-modal__foot">
          <button type="button" className="q-btn q-btn--line" onClick={onCerrar}>Cancelar</button>
          <button type="button" className="q-btn q-btn--primary" onClick={generar}><Sparkles size={16} strokeWidth={1.8} /> Generar cuadro</button>
        </footer>
      </div>
    </div>,
    document.querySelector('.q-app') || document.body
  )
}

/** Cuadro de revalúo y depreciación: resumen por ejercicio y detalle por bien */
export function RevaluoDepreciacion() {
  const { activos, comprobantes, ejercicio, contribuyente } = useContable()
  const [anio, setAnio] = useState(ejercicio)
  const [generando, setGenerando] = useState(false)
  const [aviso, setAviso] = useState('')
  const cerrarGenerador = useCallbackEstable(() => setGenerando(false))

  const cuadro = useMemo(() => cuadroGeneral(activos.items, ejercicio), [activos.items, ejercicio])
  const sel = cuadro.find((r) => r.anio === anio) || cuadro[0]
  const anioSel = sel?.anio ?? ejercicio
  const filas = sel?.filas || []
  const elegir = (y) => { setAnio(y); setAviso('') }

  const setCoef = (a, valor) => {
    const coef = valor.trim().replace(',', '.')
    if (coef === String(a.coeficientes?.[anioSel] ?? '')) return
    const c = { ...(a.coeficientes || {}) }
    if (coef) c[anioSel] = coef
    else delete c[anioSel]
    activos.guardar({ ...a, coeficientes: c })
    setAviso('')
  }

  const lineas = asientoActivos(activos.items, anioSel)
  const idDe = (y) => `dep-${contribuyente.clienteId}-${y}`
  const yaRegistrado = comprobantes.items.find((d) => d.id === idDe(anioSel))

  const contabilizar = () => {
    comprobantes.guardar({
      id: idDe(anioSel),
      tipo: 'depreciacion',
      fecha: `${anioSel}-12-31`,
      concepto: `Depreciación del activo fijo · ejercicio ${anioSel}`,
      lineas,
      creadoEn: yaRegistrado?.creadoEn
    })
    setAviso(yaRegistrado ? `Asiento de cierre ${anioSel} actualizado en el Libro Diario.` : `Asiento de cierre registrado en el Libro Diario al 31/12/${anioSel}.`)
  }

  const [exportando, setExportando] = useState(false)
  const exportar = async () => {
    setExportando(true)
    try {
      await excelCuadroDnit({ cuadro, anio: anioSel, contribuyente })
    } catch (err) {
      console.error('No se pudo generar el Excel del cuadro:', err)
      setAviso('')
      window.alert('No se pudo generar el Excel. Probá de nuevo.')
    } finally {
      setExportando(false)
    }
  }

  const tot = filas.reduce((t, { f }) => ({
    costo: t.costo + f.costo,
    residual: t.residual + f.residual,
    vfnAnterior: t.vfnAnterior + f.vfnAnterior,
    base: t.base + f.base,
    cuota: t.cuota + f.cuota,
    depCierre: t.depCierre + f.depCierre,
    neto: t.neto + f.neto
  }), { costo: 0, residual: 0, vfnAnterior: 0, base: 0, cuota: 0, depCierre: 0, neto: 0 })
  const sinVfn2019 = activos.items.filter(faltaVfn2019)

  return (
    <div className="q-sheet q-sheet--wide ct-sheet">
      <PageHead
        title="Cuadro de depreciación"
        lede="Cuadro de depreciación de los bienes del activo fijo de cada ejercicio, con el método y el modelo de la RG 77/20: valor residual, vida útil restante y cuota anual. Descargalo en el formato de la DNIT y registrá el asiento de cierre en el Libro Diario."
        equation={[{ v: 'VFN', sub: 'cierre' }, { op: '=' }, { op: '(' }, { v: 'VFN', sub: 'ant' }, { op: '−' }, { v: 'VR' }, { op: ')' }, { op: '×' }, { v: 'coef' }, { op: '+' }, { v: 'VR' }, { op: '−' }, { v: 'Cuota' }]}
        caption="columnas 9 a 13 del cuadro"
        status={activos.status}
      />

      {cuadro.length === 0 ? (
        <Vacio titulo="Sin bienes para calcular">Cargá los bienes en Catastros → Revalúo &amp; Depreciación → Bienes del activo fijo.</Vacio>
      ) : (
        <>
          <Figures items={[
            { label: `VFN inicial ${anioSel}`, value: gs(sel.vfnInicial) },
            { label: 'Revalúo del ejercicio', value: gs(sel.revaluo) },
            { label: 'Depreciación del ejercicio', value: gs(sel.depreciacion), tone: 'ok' },
            { label: `VFN al 31/12/${anioSel}`, value: gs(sel.vfnFinal) }
          ]} />

          <div className="ct-toolbar">
            <div className="ct-toolbar__end">
              <button type="button" className="q-btn q-btn--line" onClick={exportar} disabled={exportando} title="Cuadro de depreciación en el modelo de la RG 77/20">
                <Download size={16} strokeWidth={1.8} /> {exportando ? 'Generando…' : `Excel DNIT ${anioSel}`}
              </button>
              <button type="button" className="q-btn q-btn--primary" onClick={() => setGenerando(true)}><Sparkles size={16} strokeWidth={1.8} /> Generar cuadro</button>
            </div>
          </div>
          {aviso && <div className="q-alert q-alert--ok af-aviso" role="status">{aviso}</div>}
          {sinVfn2019.length > 0 && (
            <div className="q-alert af-aviso af-aviso--warn" role="note">
              <AlertTriangle size={15} strokeWidth={1.9} aria-hidden="true" /> {sinVfn2019.length === 1 ? 'Un bien comprado' : `${sinVfn2019.length} bienes comprados`} antes de {ANIO_LEY_6380} no {sinVfn2019.length === 1 ? 'tiene' : 'tienen'} el valor fiscal neto al 31/12/{ANIO_LEY_6380 - 1}: {sinVfn2019.map((a) => a.descripcion).join(', ')}. Cargalo en el bien para que el cuadro siga la RG 77/20.
            </div>
          )}

          <div className="q-card ct-card">
            <div className="ct-tabla-wrap">
              <table className="q-table ct-tabla af-ejercicios">
                <caption className="sr-only">Cuadro por ejercicio. Elegí un ejercicio para ver el detalle por bien.</caption>
                <thead>
                  <tr>
                    <th>Ejercicio</th><th>Período</th><th className="ct-der">Bienes</th><th className="ct-der">Altas</th>
                    <th className="ct-der">VFN inicial</th><th className="ct-der">Revalúo</th><th className="ct-der">Depreciación</th><th className="ct-der">VFN final</th><th><span className="sr-only">Detalle</span></th>
                  </tr>
                </thead>
                <tbody>
                  {cuadro.map((r) => (
                    <tr key={r.anio} className={r.anio === anioSel ? 'is-sel' : ''} onClick={() => elegir(r.anio)}>
                      <td>
                        <button type="button" className="af-anio" aria-pressed={r.anio === anioSel} onClick={(e) => { e.stopPropagation(); elegir(r.anio) }}>{r.anio}</button>
                        {comprobantes.items.some((d) => d.id === idDe(r.anio)) && <span className="ct-estado is-ok af-reg" title="Asiento de cierre registrado en el Libro Diario">en Diario</span>}
                      </td>
                      <td className="ct-mono ct-sub">01/01 – 31/12/{r.anio}</td>
                      <td className="ct-num">{r.filas.length}</td>
                      <td className="ct-num">{r.altas ? gs(r.altas) : '—'}</td>
                      <td className="ct-num">{gs(r.vfnInicial)}</td>
                      <td className="ct-num">{r.revaluo ? gs(r.revaluo) : '—'}</td>
                      <td className="ct-num">{gs(r.depreciacion)}</td>
                      <td className="ct-num ct-strong">{gs(r.vfnFinal)}</td>
                      <td className="ct-acciones"><ChevronRight size={15} strokeWidth={1.8} aria-hidden="true" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="af-detalle-head">
            <h2>Detalle del ejercicio {anioSel}</h2>
            <p className="ct-sub">Valores fiscales del modelo de la RG 77/20 (columnas 2 a 13). El Excel DNIT trae además los valores contables (14 a 22).</p>
          </div>
          <div className="q-card ct-card">
            <div className="ct-tabla-wrap">
              <table className="q-table ct-tabla af-dnit">
                <thead>
                  <tr className="af-dnit__n">
                    <th /><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th>7</th><th>8</th><th>9</th><th>10</th><th>11</th><th>12</th><th>13</th>
                  </tr>
                  <tr>
                    <th>Código</th><th>Bien</th><th className="ct-der">Costo de adquisición</th><th>Fecha de adquisición</th><th className="ct-der">Coef. de revalúo</th>
                    <th className="ct-der">% valor residual</th><th className="ct-der">Valor residual fiscal</th><th className="ct-der">Años vida útil</th><th className="ct-der">Años restantes</th>
                    <th className="ct-der">VFN ejercicio anterior</th><th className="ct-der">Valor a depreciar (9−6)×4</th><th className="ct-der">Cuota anual</th><th className="ct-der">Dep. acumulada</th><th className="ct-der">VFN al cierre</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map(({ a, f }) => (
                    <tr key={a.id}>
                      <td className="ct-mono">{a.codigo || '—'}</td>
                      <td className="ct-nombre">
                        {a.descripcion}
                        {f.baja && <div className="ct-sub">Baja {fechaCorta(a.fechaBaja)} · cuota por {Math.round(f.proporcion * 12)} meses</div>}
                        {f.vfnUltimoIracis != null && f.anio === ANIO_LEY_6380 && <div className="ct-sub">VFN IRACIS/IRAGRO {gs(f.vfnUltimoIracis)}</div>}
                      </td>
                      <td className="ct-num">{gs(f.costo)}</td>
                      <td className="ct-mono">{fechaCorta(a.fechaAlta)}</td>
                      <td className="ct-der">
                        <input key={`${a.id}-${anioSel}-${a.coeficientes?.[anioSel] ?? ''}`} className="q-input q-input--num ct-coef" inputMode="decimal"
                          defaultValue={verCoef(a.coeficientes?.[anioSel])} placeholder="—"
                          aria-label={`Coeficiente de revalúo ${anioSel} de ${a.descripcion}`} onBlur={(e) => setCoef(a, e.target.value)} />
                      </td>
                      <td className="ct-num">{pctTxt(f.residualPct)}</td>
                      <td className="ct-num">{gs(f.residual)}</td>
                      <td className="ct-num">{f.vida || '—'}</td>
                      <td className="ct-num">{f.vida ? f.restantes : '—'}</td>
                      <td className="ct-num">{gs(f.vfnAnterior)}</td>
                      <td className="ct-num">{gs(f.base)}</td>
                      <td className="ct-num ct-strong">{gs(f.cuota)}</td>
                      <td className="ct-num">{gs(f.depCierre)}</td>
                      <td className="ct-num ct-strong">{gs(f.neto)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="ct-total">
                    <td colSpan={2}>Totales</td>
                    <td className="ct-num">{gs(tot.costo)}</td>
                    <td colSpan={3} />
                    <td className="ct-num">{gs(tot.residual)}</td>
                    <td colSpan={2} />
                    <td className="ct-num">{gs(tot.vfnAnterior)}</td>
                    <td className="ct-num">{gs(tot.base)}</td>
                    <td className="ct-num">{gs(tot.cuota)}</td>
                    <td className="ct-num">{gs(tot.depCierre)}</td>
                    <td className="ct-num">{gs(tot.neto)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="q-card ct-form">
            <AsientoPreview lineas={lineas} titulo={`Asiento de cierre al 31/12/${anioSel}`} />
            {!lineas.length && <p className="ct-sub">Sin revalúo ni depreciación para registrar en este ejercicio.</p>}
            <div className="ct-form__actions">
              <button type="button" className="q-btn q-btn--primary" disabled={!lineas.length} onClick={contabilizar}>
                <BookCheck size={16} strokeWidth={1.8} /> {yaRegistrado ? 'Actualizar asiento en el Diario' : 'Registrar en el Libro Diario'}
              </button>
            </div>
          </div>
        </>
      )}

      {generando && (
        <GeneradorModal
          onCerrar={cerrarGenerador}
          onListo={({ anios, bienes, registrados }) => {
            setGenerando(false)
            setAnio(ejercicio)
            setAviso(`Cuadro generado: ${anios} ${anios === 1 ? 'ejercicio' : 'ejercicios'}, ${bienes} ${bienes === 1 ? 'bien' : 'bienes'}${registrados ? ` · ${registrados} ${registrados === 1 ? 'asiento registrado' : 'asientos registrados'} en el Libro Diario` : ''}.`)
          }}
        />
      )}
    </div>
  )
}

// tipos de bien del registro simple; cada uno cae en una categoría del activo fijo
// para que los datos sirvan tal cual si el cliente pasa a liquidar IRE
export const TIPOS_BIEN = [
  { id: 'inmueble', label: 'Casa / inmueble', categoria: 'edificios', ident: 'Finca o cta. cte. catastral', ej: 'p. ej. Casa en Lambaré' },
  { id: 'terreno', label: 'Terreno', categoria: 'terrenos', ident: 'Finca o cta. cte. catastral', ej: 'p. ej. Lote 12, manzana B, Luque' },
  { id: 'auto', label: 'Automóvil / camioneta', categoria: 'rodados', ident: 'Chapa o chasis', ej: 'p. ej. Toyota Hilux 2024' },
  { id: 'moto', label: 'Motocicleta', categoria: 'rodados', ident: 'Chapa o chasis', ej: 'p. ej. Honda CG 150 2023' },
  { id: 'camion', label: 'Camión / otro rodado', categoria: 'rodados', ident: 'Chapa o chasis', ej: 'p. ej. Camión Mercedes-Benz Atego' },
  { id: 'maquinaria', label: 'Maquinaria y equipos', categoria: 'maquinarias', ident: 'N.º de serie', ej: 'p. ej. Tractor John Deere 5075E' },
  { id: 'muebles', label: 'Muebles y útiles', categoria: 'muebles', ident: 'Identificación', ej: 'p. ej. Juego de escritorio' },
  { id: 'informatica', label: 'Equipos de informática', categoria: 'informatica', ident: 'N.º de serie', ej: 'p. ej. Notebook Lenovo ThinkPad' },
  { id: 'otro', label: 'Otro bien', categoria: 'herramientas', ident: 'Identificación', ej: 'Describí el bien' }
]
const tipoBien = (a) => TIPOS_BIEN.find((t) => t.id === a.tipoBien) || TIPOS_BIEN.find((t) => t.categoria === a.categoria) || TIPOS_BIEN[TIPOS_BIEN.length - 1]

/** Registro de bienes del activo fijo, sin revalúo ni depreciación (IVA, IRP, IRP-RSP, IRP-RGC) */
export function BienesRegistro() {
  const { activos, ejercicio, contribuyente } = useContable()
  const [form, setForm] = useState(null)
  const [errores, setErrores] = useState([])
  const [filtro, setFiltro] = useState('')
  const set = (c) => { setForm((f) => ({ ...f, ...c })); setErrores([]) }

  const nuevo = () => {
    setForm({ tipoBien: 'inmueble', descripcion: '', identificacion: '', ubicacion: '', fechaAlta: `${ejercicio}-01-01`, valorOrigen: '', comprobante: '', fechaBaja: '', observaciones: '' })
    setErrores([])
  }

  const guardar = (e) => {
    e.preventDefault()
    const errs = []
    if (!form.descripcion.trim()) errs.push('Describí el bien.')
    if (!form.fechaAlta) errs.push('Indicá la fecha de adquisición.')
    if (!n0(form.valorOrigen)) errs.push('El valor de adquisición tiene que ser mayor a cero.')
    if (form.fechaBaja && form.fechaBaja < form.fechaAlta) errs.push('La baja no puede ser anterior a la adquisición.')
    if (errs.length) { setErrores(errs); return }
    const tb = TIPOS_BIEN.find((x) => x.id === form.tipoBien)
    const cat = CATEGORIAS_ACTIVO.find((c) => c.id === tb.categoria)
    // categoría, cuenta y vida útil se completan solas; si no cambió la categoría se conservan
    const mismaCat = form.categoria === cat.id
    activos.guardar({
      ...form,
      descripcion: form.descripcion.trim(),
      identificacion: (form.identificacion || '').trim(),
      valorOrigen: n0(form.valorOrigen),
      categoria: cat.id,
      cuenta: mismaCat && form.cuenta ? form.cuenta : cat.cuenta,
      vidaUtil: mismaCat && form.vidaUtil != null ? form.vidaUtil : cat.vida,
      coeficientes: form.coeficientes || {}
    })
    setForm(null)
  }

  const todos = activos.items.slice().sort((a, b) => (a.fechaAlta || '').localeCompare(b.fechaAlta || ''))
  const lista = filtro ? todos.filter((a) => tipoBien(a).id === filtro) : todos
  const vigentes = todos.filter((a) => !a.fechaBaja)
  const total = vigentes.reduce((s, a) => s + n0(a.valorOrigen), 0)
  const rodados = vigentes.filter((a) => a.categoria === 'rodados').length
  const inmuebles = vigentes.filter((a) => a.categoria === 'edificios' || a.categoria === 'terrenos').length
  const tf = form && TIPOS_BIEN.find((x) => x.id === form.tipoBien)

  const exportar = () => exportarExcel(`Bienes del activo fijo ${contribuyente.ruc}`, 'Bienes', [
    [`Bienes del activo fijo · ${contribuyente.razonSocial} · RUC ${contribuyente.ruc}`], [],
    ['Tipo', 'Descripción', 'Identificación', 'Ubicación', 'Adquisición', 'Valor de adquisición', 'Documento', 'Baja', 'Observaciones'],
    ...lista.map((a) => [tipoBien(a).label, a.descripcion, a.identificacion || '', a.ubicacion || '', fechaCorta(a.fechaAlta), n0(a.valorOrigen), a.comprobante || '', a.fechaBaja ? fechaCorta(a.fechaBaja) : '', a.observaciones || '']),
    ['TOTAL', '', '', '', '', lista.reduce((s, a) => s + n0(a.valorOrigen), 0)]
  ])

  return (
    <div className="q-sheet q-sheet--wide ct-sheet">
      <PageHead
        title="Bienes del activo fijo"
        lede="Registro de los bienes del contribuyente: casas, terrenos, autos, motos y demás. Llevá el valor de adquisición, su documento respaldatorio y, si corresponde, la fecha de venta o baja."
        status={activos.status}
      />
      <Figures items={[
        { label: 'Bienes vigentes', value: vigentes.length },
        { label: 'Inmuebles', value: inmuebles },
        { label: 'Rodados', value: rodados },
        { label: 'Valor de adquisición', value: gs(total) }
      ]} />
      <div className="ct-toolbar">
        <div className="q-field">
          <label className="q-label" htmlFor="bn-filtro">Tipo de bien</label>
          <select id="bn-filtro" className="q-input ct-select" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="">Todos</option>
            {TIPOS_BIEN.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
        </div>
        <div className="ct-toolbar__end">
          {lista.length > 0 && <button type="button" className="q-btn q-btn--line" onClick={exportar}><Download size={16} strokeWidth={1.8} /> Excel</button>}
          {!form && <button type="button" className="q-btn q-btn--primary" onClick={nuevo}><Plus size={16} strokeWidth={1.8} /> Nuevo bien</button>}
        </div>
      </div>

      {form && (
        <form className="q-card ct-form" onSubmit={guardar} noValidate>
          <div className="ct-form__head">
            <h2 className="ct-form__title">{form.id ? 'Editar bien' : 'Nuevo bien'}</h2>
            <button type="button" className="q-ghost-icon" onClick={() => setForm(null)} aria-label="Cerrar formulario"><X size={18} strokeWidth={1.7} /></button>
          </div>
          <div className="ct-grid">
            <div className="q-field">
              <label className="q-label" htmlFor="bn-tipo">Tipo de bien</label>
              <select id="bn-tipo" className="q-input ct-select" value={form.tipoBien} onChange={(e) => set({ tipoBien: e.target.value })}>
                {TIPOS_BIEN.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
              </select>
            </div>
            <div className="q-field ct-span-2">
              <label className="q-label" htmlFor="bn-desc">Descripción</label>
              <input id="bn-desc" className="q-input" value={form.descripcion} placeholder={tf.ej} onChange={(e) => set({ descripcion: e.target.value })} />
            </div>
            <div className="q-field">
              <label className="q-label" htmlFor="bn-ident">{tf.ident} <small>opcional</small></label>
              <input id="bn-ident" className="q-input" value={form.identificacion || ''} onChange={(e) => set({ identificacion: e.target.value })} />
            </div>
            <div className="q-field ct-span-2">
              <label className="q-label" htmlFor="bn-ubic">Ubicación <small>opcional</small></label>
              <input id="bn-ubic" className="q-input" value={form.ubicacion || ''} placeholder="Dirección, ciudad o departamento" onChange={(e) => set({ ubicacion: e.target.value })} />
            </div>
            <div className="q-field">
              <label className="q-label" htmlFor="bn-alta">Fecha de adquisición</label>
              <input id="bn-alta" className="q-input" type="date" value={form.fechaAlta} onChange={(e) => set({ fechaAlta: e.target.value })} />
            </div>
            <div className="q-field">
              <label className="q-label" htmlFor="bn-valor">Valor de adquisición</label>
              <MontoInput id="bn-valor" value={form.valorOrigen} onChange={(v) => set({ valorOrigen: v })} />
            </div>
            <div className="q-field">
              <label className="q-label" htmlFor="bn-doc">Factura o escritura <small>opcional</small></label>
              <input id="bn-doc" className="q-input" value={form.comprobante || ''} placeholder="001-001-0000001 o N.º de escritura" onChange={(e) => set({ comprobante: e.target.value })} />
            </div>
            <div className="q-field">
              <label className="q-label" htmlFor="bn-baja">Fecha de venta o baja <small>opcional</small></label>
              <input id="bn-baja" className="q-input" type="date" value={form.fechaBaja || ''} onChange={(e) => set({ fechaBaja: e.target.value })} />
            </div>
            <div className="q-field ct-span-2">
              <label className="q-label" htmlFor="bn-obs">Observaciones <small>opcional</small></label>
              <input id="bn-obs" className="q-input" value={form.observaciones || ''} onChange={(e) => set({ observaciones: e.target.value })} />
            </div>
          </div>
          <Errores lista={errores} />
          <div className="ct-form__actions">
            <button type="submit" className="q-btn q-btn--primary">{form.id ? 'Guardar cambios' : 'Agregar bien'}</button>
            <button type="button" className="q-btn q-btn--line" onClick={() => setForm(null)}>Cancelar</button>
          </div>
        </form>
      )}

      {lista.length === 0 ? (
        !form && <Vacio titulo={filtro ? 'Sin bienes de este tipo' : 'Sin bienes cargados'}>Registrá las casas, terrenos, autos, motos y demás bienes del contribuyente.</Vacio>
      ) : (
        <div className="q-card ct-card">
          <div className="ct-tabla-wrap">
            <table className="q-table ct-tabla">
              <thead><tr><th>Bien</th><th>Tipo</th><th>Identificación</th><th>Adquisición</th><th className="ct-der">Valor</th><th>Estado</th><th><span className="sr-only">Acciones</span></th></tr></thead>
              <tbody>
                {lista.map((a) => (
                  <tr key={a.id}>
                    <td className="ct-nombre">{a.descripcion}{a.ubicacion && <div className="ct-sub">{a.ubicacion}</div>}</td>
                    <td className="ct-sub">{tipoBien(a).label}</td>
                    <td className="ct-mono">{a.identificacion || '—'}</td>
                    <td className="ct-mono">{fechaCorta(a.fechaAlta)}</td>
                    <td className="ct-num ct-strong">{gs(a.valorOrigen)}</td>
                    <td>{a.fechaBaja ? <span className="ct-estado is-err">Baja {fechaCorta(a.fechaBaja)}</span> : <span className="ct-estado is-ok">Vigente</span>}</td>
                    <td className="ct-acciones">
                      <button type="button" className="ct-icon" onClick={() => { setForm({ ...a, tipoBien: tipoBien(a).id }); setErrores([]) }} aria-label={`Editar ${a.descripcion}`} title="Editar"><Pencil size={14} strokeWidth={1.8} /></button>
                      <button type="button" className="ct-icon ct-icon--del" onClick={() => window.confirm(`¿Eliminar ${a.descripcion}?`) && activos.eliminar(a.id)} aria-label={`Eliminar ${a.descripcion}`} title="Eliminar"><X size={14} strokeWidth={1.8} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
