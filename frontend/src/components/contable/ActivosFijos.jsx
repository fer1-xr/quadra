import React, { useState } from 'react'
import { Plus, Pencil, X, Download, BookCheck } from 'lucide-react'
import PageHead, { Figures } from '../PageHead'
import { useContable } from './ContableContext'
import { MontoInput, CuentaSelect, Errores, Vacio, AsientoPreview, exportarExcel } from './ui'
import { CATEGORIAS_ACTIVO, cuadroActivo, asientoActivos, gs, fechaCorta, n0 } from '../../services/contabilidad'

const esPPE = (c) => c.codigo.startsWith('1.2.03.') && c.codigo !== '1.2.03.08'

/** Catastro de bienes del activo fijo */
export function ActivosFijos() {
  const { activos, ejercicio, nombreCuenta } = useContable()
  const [form, setForm] = useState(null)
  const [errores, setErrores] = useState([])
  const set = (c) => { setForm((f) => ({ ...f, ...c })); setErrores([]) }

  const nuevo = () => {
    const cat = CATEGORIAS_ACTIVO[2]
    setForm({ descripcion: '', categoria: cat.id, cuenta: cat.cuenta, vidaUtil: cat.vida, fechaAlta: `${ejercicio}-01-01`, valorOrigen: '', comprobante: '', fechaBaja: '', coeficientes: {} })
    setErrores([])
  }

  const guardar = (e) => {
    e.preventDefault()
    const errs = []
    if (!form.descripcion.trim()) errs.push('Describí el bien.')
    if (!form.fechaAlta) errs.push('Indicá la fecha de alta.')
    if (!n0(form.valorOrigen)) errs.push('El valor de origen tiene que ser mayor a cero.')
    if (form.categoria !== 'terrenos' && !(Number(form.vidaUtil) > 0)) errs.push('Indicá los años de vida útil.')
    if (form.fechaBaja && form.fechaBaja < form.fechaAlta) errs.push('La baja no puede ser anterior al alta.')
    if (errs.length) { setErrores(errs); return }
    activos.guardar({ ...form, descripcion: form.descripcion.trim(), valorOrigen: n0(form.valorOrigen), vidaUtil: Number(form.vidaUtil) || 0 })
    setForm(null)
  }

  const lista = activos.items.slice().sort((a, b) => (a.fechaAlta || '').localeCompare(b.fechaAlta || ''))
  const totalOrigen = lista.reduce((s, a) => s + n0(a.valorOrigen), 0)

  return (
    <div className="q-sheet q-sheet--wide ct-sheet">
      <PageHead
        title="Bienes del activo fijo"
        lede="Catastro de los bienes de uso del contribuyente. Con estos datos Quadra calcula el revalúo y la depreciación de cada ejercicio."
        equation={[{ v: 'Cuota' }, { op: '=' }, { v: 'V', sub: 'rev' }, { op: '÷' }, { v: 'Vida útil' }]}
        caption="línea recta sobre valor revaluado"
        status={activos.status}
      />
      <Figures items={[
        { label: 'Bienes', value: lista.length },
        { label: 'Valor de origen', value: gs(totalOrigen) },
        { label: 'Dados de baja', value: lista.filter((a) => a.fechaBaja).length }
      ]} />
      <div className="ct-toolbar">
        <div className="ct-toolbar__end">
          {!form && <button type="button" className="q-btn q-btn--primary" onClick={nuevo}><Plus size={16} strokeWidth={1.8} /> Nuevo bien</button>}
        </div>
      </div>

      {form && (
        <form className="q-card ct-form" onSubmit={guardar} noValidate>
          <div className="ct-form__head">
            <h2 className="ct-form__title">{form.id ? 'Editar bien' : 'Nuevo bien del activo fijo'}</h2>
            <button type="button" className="q-ghost-icon" onClick={() => setForm(null)} aria-label="Cerrar formulario"><X size={18} strokeWidth={1.7} /></button>
          </div>
          <div className="ct-grid">
            <div className="q-field ct-span-2">
              <label className="q-label" htmlFor="af-desc">Descripción</label>
              <input id="af-desc" className="q-input" value={form.descripcion} placeholder="p. ej. Camioneta Toyota Hilux 2024" onChange={(e) => set({ descripcion: e.target.value })} />
            </div>
            <div className="q-field">
              <label className="q-label" htmlFor="af-cat">Categoría</label>
              <select id="af-cat" className="q-input ct-select" value={form.categoria} onChange={(e) => {
                const c = CATEGORIAS_ACTIVO.find((x) => x.id === e.target.value)
                set({ categoria: c.id, cuenta: c.cuenta, vidaUtil: c.vida })
              }}>
                {CATEGORIAS_ACTIVO.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div className="q-field">
              <label className="q-label" htmlFor="af-vida">Vida útil (años)</label>
              <input id="af-vida" className="q-input q-input--num" type="number" min="0" value={form.vidaUtil} disabled={form.categoria === 'terrenos'} onChange={(e) => set({ vidaUtil: e.target.value })} />
              <small className="ct-hint">{form.categoria === 'terrenos' ? 'Los terrenos no se deprecian; solo se revalúan.' : 'Valor sugerido; ajustalo a la vida útil fiscal aplicable.'}</small>
            </div>
            <div className="q-field">
              <label className="q-label" htmlFor="af-alta">Fecha de alta</label>
              <input id="af-alta" className="q-input" type="date" value={form.fechaAlta} onChange={(e) => set({ fechaAlta: e.target.value })} />
            </div>
            <div className="q-field">
              <label className="q-label" htmlFor="af-valor">Valor de origen (sin IVA)</label>
              <MontoInput id="af-valor" value={form.valorOrigen} onChange={(v) => set({ valorOrigen: v })} />
            </div>
            <div className="q-field">
              <label className="q-label" htmlFor="af-comp">Factura de compra <small>opcional</small></label>
              <input id="af-comp" className="q-input q-input--num" value={form.comprobante || ''} placeholder="001-001-0000001" onChange={(e) => set({ comprobante: e.target.value })} />
            </div>
            <div className="q-field ct-span-2">
              <label className="q-label" htmlFor="af-cta">Cuenta contable</label>
              <CuentaSelect id="af-cta" value={form.cuenta} onChange={(v) => set({ cuenta: v })} filtro={esPPE} />
            </div>
            <div className="q-field">
              <label className="q-label" htmlFor="af-baja">Fecha de baja <small>opcional</small></label>
              <input id="af-baja" className="q-input" type="date" value={form.fechaBaja || ''} onChange={(e) => set({ fechaBaja: e.target.value })} />
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
        !form && <Vacio titulo="Sin bienes cargados">Cargá rodados, inmuebles, muebles, equipos y maquinarias para calcular su revalúo y depreciación.</Vacio>
      ) : (
        <div className="q-card ct-card">
          <div className="ct-tabla-wrap">
            <table className="q-table ct-tabla">
              <thead><tr><th>Bien</th><th>Cuenta</th><th>Alta</th><th className="ct-der">Vida útil</th><th className="ct-der">Valor de origen</th><th>Estado</th><th><span className="sr-only">Acciones</span></th></tr></thead>
              <tbody>
                {lista.map((a) => (
                  <tr key={a.id}>
                    <td className="ct-nombre">{a.descripcion}</td>
                    <td className="ct-sub">{nombreCuenta(a.cuenta)}</td>
                    <td className="ct-mono">{fechaCorta(a.fechaAlta)}</td>
                    <td className="ct-num">{a.vidaUtil ? `${a.vidaUtil} años` : '—'}</td>
                    <td className="ct-num ct-strong">{gs(a.valorOrigen)}</td>
                    <td>{a.fechaBaja ? <span className="ct-estado is-err">Baja {fechaCorta(a.fechaBaja)}</span> : <span className="ct-estado is-ok">En uso</span>}</td>
                    <td className="ct-acciones">
                      <button type="button" className="ct-icon" onClick={() => { setForm({ ...a }); setErrores([]) }} aria-label={`Editar ${a.descripcion}`} title="Editar"><Pencil size={14} strokeWidth={1.8} /></button>
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

/** Cuadro de revalúo y depreciación del ejercicio */
export function RevaluoDepreciacion() {
  const { activos, comprobantes, ejercicio, contribuyente } = useContable()
  const [aviso, setAviso] = useState('')

  const filas = activos.items
    .map((a) => ({ a, f: cuadroActivo(a, ejercicio) }))
    .filter((r) => r.f)
    .sort((x, y) => (x.a.fechaAlta || '').localeCompare(y.a.fechaAlta || ''))

  const tot = filas.reduce((t, { f }) => ({
    valorRevaluado: t.valorRevaluado + f.valorRevaluado,
    revaluo: t.revaluo + f.revaluoValor,
    depRevaluada: t.depRevaluada + f.depRevaluada,
    cuota: t.cuota + f.cuota,
    depCierre: t.depCierre + f.depCierre,
    neto: t.neto + f.neto
  }), { valorRevaluado: 0, revaluo: 0, depRevaluada: 0, cuota: 0, depCierre: 0, neto: 0 })

  const setCoef = (a, valor) => {
    const coef = valor.replace(',', '.')
    activos.guardar({ ...a, coeficientes: { ...(a.coeficientes || {}), [ejercicio]: coef } })
    setAviso('')
  }

  const lineas = asientoActivos(activos.items, ejercicio)
  const idAsiento = `dep-${contribuyente.clienteId}-${ejercicio}`
  const yaRegistrado = comprobantes.items.find((d) => d.id === idAsiento)

  const contabilizar = () => {
    comprobantes.guardar({
      id: idAsiento,
      tipo: 'depreciacion',
      fecha: `${ejercicio}-12-31`,
      concepto: `Revalúo y depreciación del activo fijo · ejercicio ${ejercicio}`,
      lineas,
      creadoEn: yaRegistrado?.creadoEn
    })
    setAviso(yaRegistrado ? 'Asiento de cierre actualizado en el Libro Diario.' : 'Asiento de cierre registrado en el Libro Diario al 31/12.')
  }

  const exportar = () => exportarExcel(`Revalúo y depreciación ${contribuyente.ruc} ${ejercicio}`, 'Revalúo', [
    [`Cuadro de revalúo y depreciación · ${contribuyente.razonSocial} · Ejercicio ${ejercicio}`], [],
    ['Bien', 'Alta', 'Valor al inicio', 'Coeficiente', 'Valor revaluado', 'Revalúo del ejercicio', 'Dep. acumulada revaluada', 'Depreciación del ejercicio', 'Dep. acumulada al cierre', 'Valor neto'],
    ...filas.map(({ a, f }) => [a.descripcion, fechaCorta(a.fechaAlta), f.valorInicio, f.coef, f.valorRevaluado, f.revaluoValor, f.depRevaluada, f.cuota, f.depCierre, f.neto]),
    ['TOTAL', '', '', '', tot.valorRevaluado, tot.revaluo, tot.depRevaluada, tot.cuota, tot.depCierre, tot.neto]
  ])

  return (
    <div className="q-sheet q-sheet--wide ct-sheet">
      <PageHead
        title="Revalúo y depreciación"
        lede={`Cuadro al cierre del ejercicio ${ejercicio}. Cargá el coeficiente de revalúo que publica la DNIT para cada bien; la depreciación se calcula sobre el valor revaluado, proporcional a los meses de uso.`}
        equation={[{ v: 'V', sub: 'rev' }, { op: '=' }, { v: 'V', sub: '0' }, { op: '×' }, { v: 'coef' }]}
        caption="coeficiente de revalúo del ejercicio"
        status={activos.status}
      />
      <Figures items={[
        { label: 'Valor revaluado', value: gs(tot.valorRevaluado) },
        { label: 'Revalúo del ejercicio', value: gs(tot.revaluo) },
        { label: 'Depreciación del ejercicio', value: gs(tot.cuota), tone: 'ok' },
        { label: 'Valor neto', value: gs(tot.neto) }
      ]} />

      {filas.length === 0 ? (
        <Vacio titulo={`Sin bienes para el ejercicio ${ejercicio}`}>Cargá los bienes en Catastros → Revalúo &amp; Depreciación → Bienes del activo fijo.</Vacio>
      ) : (
        <>
          <div className="q-card ct-card">
            <div className="ct-tabla-wrap">
              <table className="q-table ct-tabla">
                <thead>
                  <tr>
                    <th>Bien</th><th>Alta</th><th className="ct-der">Valor al inicio</th><th className="ct-der">Coeficiente</th><th className="ct-der">Valor revaluado</th>
                    <th className="ct-der">Revalúo</th><th className="ct-der">Dep. acum. revaluada</th><th className="ct-der">Dep. del ejercicio</th><th className="ct-der">Dep. acum. cierre</th><th className="ct-der">Valor neto</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map(({ a, f }) => (
                    <tr key={a.id}>
                      <td className="ct-nombre">{a.descripcion}</td>
                      <td className="ct-mono">{fechaCorta(a.fechaAlta)}</td>
                      <td className="ct-num">{gs(f.valorInicio)}</td>
                      <td className="ct-der">
                        <input className="q-input q-input--num ct-coef" inputMode="decimal" defaultValue={a.coeficientes?.[ejercicio] ?? ''} placeholder="1,0000"
                          aria-label={`Coeficiente de revalúo de ${a.descripcion}`} onBlur={(e) => setCoef(a, e.target.value)} />
                      </td>
                      <td className="ct-num">{gs(f.valorRevaluado)}</td>
                      <td className="ct-num">{gs(f.revaluoValor)}</td>
                      <td className="ct-num">{gs(f.depRevaluada)}</td>
                      <td className="ct-num ct-strong">{gs(f.cuota)}</td>
                      <td className="ct-num">{gs(f.depCierre)}</td>
                      <td className="ct-num ct-strong">{gs(f.neto)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="ct-total">
                    <td colSpan={4}>Totales</td>
                    <td className="ct-num">{gs(tot.valorRevaluado)}</td>
                    <td className="ct-num">{gs(tot.revaluo)}</td>
                    <td className="ct-num">{gs(tot.depRevaluada)}</td>
                    <td className="ct-num">{gs(tot.cuota)}</td>
                    <td className="ct-num">{gs(tot.depCierre)}</td>
                    <td className="ct-num">{gs(tot.neto)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="q-card ct-form">
            <AsientoPreview lineas={lineas} titulo={`Asiento de cierre al 31/12/${ejercicio}`} />
            {!lineas.length && <p className="ct-sub">Sin revalúo ni depreciación para registrar en este ejercicio.</p>}
            {aviso && <div className="q-alert q-alert--ok" role="status">{aviso}</div>}
            <div className="ct-form__actions">
              <button type="button" className="q-btn q-btn--primary" disabled={!lineas.length} onClick={contabilizar}>
                <BookCheck size={16} strokeWidth={1.8} /> {yaRegistrado ? 'Actualizar asiento en el Diario' : 'Registrar en el Libro Diario'}
              </button>
              <button type="button" className="q-btn q-btn--line" onClick={exportar}><Download size={16} strokeWidth={1.8} /> Excel</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
