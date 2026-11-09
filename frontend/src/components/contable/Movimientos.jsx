import React, { useMemo, useState } from 'react'
import { Plus, Pencil, X, Download } from 'lucide-react'
import PageHead, { Figures } from '../PageHead'
import { useContable } from './ContableContext'
import { MontoInput, CuentaSelect, PersonaFields, PeriodoSelect, enPeriodo, Errores, AsientoPreview, exportarExcel, Vacio, esDisponibilidad } from './ui'
import {
  TIPOS, CTA, totalesDe, lineasDe, gs, fechaCorta, hoyISO, formatearNumero, numeroValido, timbradoValido,
  siguienteNumero, analizarRuc, saldoPersona, n0
} from '../../services/contabilidad'

const fechaInicial = (ejercicio) => {
  const hoy = hoyISO()
  return hoy.startsWith(String(ejercicio)) ? hoy : `${ejercicio}-01-01`
}

/* ── recibos y retenciones ──────────────────────────────────── */

const CONFIG = {
  'recibo-cobro': {
    titulo: 'Recibos de cobro', lede: 'Lo que cobrás a tus clientes. Cada recibo cancela saldo de Deudores por ventas contra caja o banco.',
    nuevo: 'Nuevo recibo de cobro', persona: 'RUC del cliente', contra: CTA.DEUDORES, eq: [{ v: 'Caja' }, { op: '↑' }, { op: '=' }, { v: 'Deudores' }, { op: '↓' }]
  },
  'recibo-pago': {
    titulo: 'Recibos de pago', lede: 'Lo que pagás a tus proveedores. Cada recibo cancela saldo de Proveedores contra caja o banco.',
    nuevo: 'Nuevo recibo de pago', persona: 'RUC del proveedor', contra: CTA.PROVEEDORES, eq: [{ v: 'Proveedores' }, { op: '↓' }, { op: '=' }, { v: 'Caja' }, { op: '↓' }]
  },
  'ret-recibida': {
    titulo: 'Retenciones de IVA recibidas', lede: 'Comprobantes de retención que te entregan tus clientes agentes de retención. Quedan como crédito a tu favor.',
    nuevo: 'Cargar retención recibida', persona: 'RUC del agente de retención', contra: CTA.DEUDORES, eq: [{ v: 'R' }, { op: '=' }, { v: 'IVA', sub: 'factura' }, { op: '×' }, { v: '%' }]
  },
  'ret-emitida': {
    titulo: 'Retenciones de IVA emitidas', lede: 'Retenciones que practicás a tus proveedores como agente de retención. Quedan como deuda a ingresar a la DNIT.',
    nuevo: 'Emitir retención', persona: 'RUC del proveedor', contra: CTA.PROVEEDORES, eq: [{ v: 'R' }, { op: '=' }, { v: 'IVA', sub: 'factura' }, { op: '×' }, { v: '%' }]
  }
}

const PORCENTAJES = [30, 50, 70, 100]

function FormMovimiento({ inicial, onCerrar }) {
  const { comprobantes, timbrados, personas, ejercicio } = useContable()
  const [f, setF] = useState(inicial)
  const [errores, setErrores] = useState([])
  const t = TIPOS[f.tipo]
  const cfg = CONFIG[f.tipo]
  const esRet = f.tipo.startsWith('ret')
  const set = (c) => { setF((x) => ({ ...x, ...c })); setErrores([]) }

  const misTimbrados = timbrados.items.filter((x) => x.tipo === t.timbradoTipo)
  const saldo = f.personaRuc ? saldoPersona(comprobantes.items.filter((d) => d.id !== f.id), f.personaRuc, t.lado) : 0

  // facturas de la persona, para tomar el IVA en las retenciones
  const facturas = useMemo(() => comprobantes.items
    .filter((d) => d.personaRuc === f.personaRuc && d.tipo === (t.lado === 'venta' ? 'venta' : 'compra'))
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')), [comprobantes.items, f.personaRuc, t.lado])

  const recalcular = (cambio) => {
    const nx = { ...f, ...cambio }
    set({ ...cambio, monto: Math.round((n0(nx.ivaFactura) * Number(nx.porcentaje || 0)) / 100) })
  }

  const elegirFactura = (numero) => {
    const fac = facturas.find((d) => d.numero === numero)
    if (!fac) { set({ facturaRef: numero }); return }
    const x = totalesDe(fac)
    recalcular({ facturaRef: numero, ivaFactura: x.iva10 + x.iva5 })
  }

  const guardar = (e) => {
    e.preventDefault()
    const numero = formatearNumero(f.numero)
    const errs = []
    if (!f.fecha?.startsWith(String(ejercicio))) errs.push(`La fecha tiene que estar dentro del ejercicio ${ejercicio}.`)
    if (!numeroValido(numero)) errs.push('El número tiene el formato 001-001-0000001.')
    if (f.timbrado && !timbradoValido(f.timbrado)) errs.push('El timbrado tiene 8 dígitos.')
    if (esRet && !timbradoValido(f.timbrado)) errs.push('Indicá el timbrado del comprobante de retención.')
    if (!analizarRuc(f.personaRuc).formato) errs.push('El RUC tiene el formato 80012345-6.')
    if (!f.personaNombre.trim()) errs.push('Escribí el nombre o razón social.')
    if (!n0(f.monto)) errs.push(esRet ? 'El monto retenido tiene que ser mayor a cero.' : 'Indicá el monto del recibo.')
    if (!esRet && !f.cuentaPago) errs.push('Elegí la cuenta de caja o banco.')
    if (comprobantes.items.some((d) => d.id !== f.id && d.tipo === f.tipo && d.numero === numero && d.personaRuc === f.personaRuc)) errs.push(`El número ${numero} ya está cargado para esta persona.`)
    if (errs.length) { setErrores(errs); return }
    personas.asegurar(f.personaRuc, f.personaNombre.trim(), t.lado === 'compra' ? 'proveedor' : 'cliente')
    comprobantes.guardar({ ...f, numero, personaNombre: f.personaNombre.trim(), monto: n0(f.monto), facturaRef: formatearNumero(f.facturaRef) })
    onCerrar()
  }

  return (
    <form className="q-card ct-form" onSubmit={guardar} noValidate>
      <div className="ct-form__head">
        <h2 className="ct-form__title">{f.id ? `Editar ${t.label.toLowerCase()}` : cfg.nuevo}</h2>
        <button type="button" className="q-ghost-icon" onClick={onCerrar} aria-label="Cerrar formulario"><X size={18} strokeWidth={1.7} /></button>
      </div>
      <div className="ct-grid">
        <div className="q-field">
          <label className="q-label" htmlFor="mv-fecha">Fecha</label>
          <input id="mv-fecha" className="q-input" type="date" value={f.fecha} min={`${ejercicio}-01-01`} max={`${ejercicio}-12-31`} onChange={(e) => set({ fecha: e.target.value })} />
        </div>
        <div className="q-field">
          <label className="q-label" htmlFor="mv-tim">Timbrado {!esRet && <small>opcional</small>}</label>
          {t.emitido && misTimbrados.length > 0 ? (
            <select id="mv-tim" className="q-input ct-select" value={f.timbrado} onChange={(e) => {
              const tim = misTimbrados.find((m) => m.numero === e.target.value)
              set({ timbrado: e.target.value, numero: tim && !f.id ? siguienteNumero(tim, comprobantes.items) : f.numero })
            }}>
              <option value="">Elegí un timbrado…</option>
              {misTimbrados.map((m) => <option key={m.id} value={m.numero}>{m.numero} · {m.establecimiento}-{m.punto}</option>)}
            </select>
          ) : (
            <input id="mv-tim" className="q-input q-input--num" inputMode="numeric" maxLength={8} value={f.timbrado} placeholder="12345678" onChange={(e) => set({ timbrado: e.target.value.replace(/\D/g, '') })} />
          )}
        </div>
        <div className="q-field">
          <label className="q-label" htmlFor="mv-num">Número</label>
          <input id="mv-num" className="q-input q-input--num" value={f.numero} placeholder="001-001-0000001" onChange={(e) => set({ numero: e.target.value })} onBlur={() => set({ numero: formatearNumero(f.numero) })} />
        </div>

        <PersonaFields ruc={f.personaRuc} nombre={f.personaNombre} rotulo={cfg.persona} onChange={set} />

        {esRet ? (
          <>
            <div className="q-field">
              <label className="q-label" htmlFor="mv-fac">Factura retenida</label>
              <input id="mv-fac" className="q-input q-input--num" list="mv-facturas" value={f.facturaRef} placeholder="001-001-0000001" onChange={(e) => elegirFactura(e.target.value)} />
              <datalist id="mv-facturas">{facturas.map((d) => <option key={d.id} value={d.numero}>{fechaCorta(d.fecha)} · IVA {gs(totalesDe(d).iva10 + totalesDe(d).iva5)}</option>)}</datalist>
            </div>
            <div className="q-field">
              <label className="q-label" htmlFor="mv-iva">IVA de la factura</label>
              <MontoInput id="mv-iva" value={f.ivaFactura} onChange={(v) => recalcular({ ivaFactura: v })} />
            </div>
            <fieldset className="q-field ct-fieldset">
              <legend className="q-label">Porcentaje retenido</legend>
              <div className="ct-seg ct-seg--sm">
                {PORCENTAJES.map((p) => (
                  <button key={p} type="button" role="radio" aria-checked={Number(f.porcentaje) === p} className={Number(f.porcentaje) === p ? 'is-on' : ''} onClick={() => recalcular({ porcentaje: p })}>{p}%</button>
                ))}
              </div>
            </fieldset>
            <div className="q-field">
              <label className="q-label" htmlFor="mv-monto">Monto retenido</label>
              <MontoInput id="mv-monto" value={f.monto} onChange={(v) => set({ monto: v })} />
            </div>
          </>
        ) : (
          <>
            <div className="q-field">
              <label className="q-label" htmlFor="mv-monto">Monto</label>
              <MontoInput id="mv-monto" value={f.monto} onChange={(v) => set({ monto: v })} />
              {f.personaRuc && <small className="ct-hint ct-num">Saldo pendiente: ₲ {gs(saldo)}</small>}
            </div>
            <div className="q-field">
              <label className="q-label" htmlFor="mv-pago">{t.lado === 'venta' ? 'Cobrado en' : 'Pagado desde'}</label>
              <CuentaSelect id="mv-pago" value={f.cuentaPago} onChange={(v) => set({ cuentaPago: v })} filtro={esDisponibilidad} />
            </div>
            <div className="q-field">
              <label className="q-label" htmlFor="mv-fac">Facturas que cancela <small>opcional</small></label>
              <input id="mv-fac" className="q-input" value={f.facturaRef} placeholder="001-001-0000123, 001-001-0000124" onChange={(e) => set({ facturaRef: e.target.value })} />
            </div>
          </>
        )}
        <div className="q-field ct-span-2">
          <label className="q-label" htmlFor="mv-contra">Cuenta que se cancela</label>
          <CuentaSelect id="mv-contra" value={f.cuenta} onChange={(v) => set({ cuenta: v })} />
        </div>
        <div className="q-field ct-span-2">
          <label className="q-label" htmlFor="mv-con">Concepto <small>opcional</small></label>
          <input id="mv-con" className="q-input" value={f.concepto} onChange={(e) => set({ concepto: e.target.value })} />
        </div>
      </div>

      <AsientoPreview lineas={lineasDe(f)} />
      <Errores lista={errores} />
      <div className="ct-form__actions">
        <button type="submit" className="q-btn q-btn--primary">{f.id ? 'Guardar cambios' : 'Guardar y registrar asiento'}</button>
        <button type="button" className="q-btn q-btn--line" onClick={onCerrar}>Cancelar</button>
      </div>
    </form>
  )
}

export function RegistroMovimientos({ tipo }) {
  const { comprobantes, ejercicio, contribuyente } = useContable()
  const cfg = CONFIG[tipo]
  const esRet = tipo.startsWith('ret')
  const [mes, setMes] = useState('')
  const [form, setForm] = useState(null)

  const vacio = () => ({
    tipo, fecha: fechaInicial(ejercicio), timbrado: '', numero: '', personaRuc: '', personaNombre: '', monto: '',
    cuentaPago: CTA.CAJA, cuenta: cfg.contra, facturaRef: '', ivaFactura: '', porcentaje: 30, concepto: ''
  })

  const filas = comprobantes.items
    .filter((d) => d.tipo === tipo && enPeriodo(d.fecha, ejercicio, mes))
    .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '') || (a.numero || '').localeCompare(b.numero || ''))
  const total = filas.reduce((s, d) => s + n0(d.monto), 0)

  const exportar = () => exportarExcel(`${cfg.titulo} ${contribuyente.ruc} ${ejercicio}`, cfg.titulo, [
    [`${cfg.titulo} · ${contribuyente.razonSocial}`], [],
    ['Fecha', 'Timbrado', 'Número', 'RUC', 'Nombre', esRet ? 'Factura' : 'Facturas', ...(esRet ? ['IVA factura', '%'] : []), 'Monto'],
    ...filas.map((d) => [fechaCorta(d.fecha), d.timbrado, d.numero, d.personaRuc, d.personaNombre, d.facturaRef, ...(esRet ? [n0(d.ivaFactura), d.porcentaje] : []), n0(d.monto)]),
    ['', '', '', '', 'TOTAL', '', ...(esRet ? ['', ''] : []), total]
  ])

  return (
    <div className="q-sheet q-sheet--wide ct-sheet">
      <PageHead title={cfg.titulo} lede={cfg.lede} equation={cfg.eq} caption={esRet ? 'sobre el IVA de la factura' : 'cancelación de saldos'} status={comprobantes.status} />
      <Figures items={[
        { label: esRet ? 'Retenciones' : 'Recibos', value: filas.length },
        { label: 'Total', value: gs(total), tone: 'ok' },
        { label: 'Período', value: mes ? mes : 'Ejercicio' }
      ]} />
      <div className="ct-toolbar">
        <PeriodoSelect value={mes} onChange={setMes} ejercicio={ejercicio} />
        <div className="ct-toolbar__end">
          {filas.length > 0 && <button type="button" className="q-btn q-btn--line" onClick={exportar}><Download size={16} strokeWidth={1.8} /> Excel</button>}
          {!form && <button type="button" className="q-btn q-btn--primary" onClick={() => setForm(vacio())}><Plus size={16} strokeWidth={1.8} /> {cfg.nuevo}</button>}
        </div>
      </div>

      {form && <FormMovimiento key={form.id || 'nuevo'} inicial={form} onCerrar={() => setForm(null)} />}

      {filas.length === 0 ? (
        !form && <Vacio titulo={mes ? 'Nada cargado en este mes' : 'Todavía no hay registros'}>Cada registro genera su asiento en el Libro Diario.</Vacio>
      ) : (
        <div className="q-card ct-card">
          <div className="ct-tabla-wrap">
            <table className="q-table ct-tabla">
              <thead>
                <tr>
                  <th>Fecha</th><th>Timbrado</th><th>Número</th><th>RUC</th><th>Nombre</th><th>{esRet ? 'Factura' : 'Facturas'}</th>
                  {esRet && <><th className="ct-der">IVA factura</th><th className="ct-der">%</th></>}
                  <th className="ct-der">Monto</th><th><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {filas.map((d) => (
                  <tr key={d.id}>
                    <td className="ct-mono">{fechaCorta(d.fecha)}</td>
                    <td className="ct-mono">{d.timbrado}</td>
                    <td className="ct-mono">{d.numero}</td>
                    <td className="ct-mono">{d.personaRuc}</td>
                    <td className="ct-nombre">{d.personaNombre}</td>
                    <td className="ct-mono">{d.facturaRef}</td>
                    {esRet && <><td className="ct-num">{gs(d.ivaFactura)}</td><td className="ct-num">{d.porcentaje}%</td></>}
                    <td className="ct-num ct-strong">{gs(d.monto)}</td>
                    <td className="ct-acciones">
                      <button type="button" className="ct-icon" onClick={() => setForm({ ...vacio(), ...d })} aria-label={`Editar ${d.numero}`} title="Editar"><Pencil size={14} strokeWidth={1.8} /></button>
                      <button type="button" className="ct-icon ct-icon--del" onClick={() => window.confirm(`¿Eliminar ${d.numero}? También se quita su asiento.`) && comprobantes.eliminar(d.id)} aria-label={`Eliminar ${d.numero}`} title="Eliminar"><X size={14} strokeWidth={1.8} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="ct-total">
                  <td colSpan={esRet ? 8 : 6}>Total</td>
                  <td className="ct-num">{gs(total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
