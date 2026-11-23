import React, { useMemo, useState } from 'react'
import { Download, FileText, Printer, UserRound } from 'lucide-react'
import PageHead, { Figures } from '../PageHead'
import { useContable } from './ContableContext'
import { Vacio } from './ui'
import { gs } from '../../services/contabilidad'
import { ejerciciosRG49, filasRG49, sumasYSaldos, periodoDe } from '../../services/balances'
import { useCloudCollection } from '../../services/useCloudCollection'
import { excelSumasSaldos, excelAnexos } from './balancesExcel'
import { bloquesAnexo5, descargarWordAnexo5, descargarPdfAnexo5 } from './anexo5'
import '../../styles/Informes.css'
import '../../styles/Balances.css'

/* ── datos comunes ──────────────────────────────────────────── */

/** saldos RG 49/14 de los ejercicios pedidos (el primero es el que se presenta) */
function useBalances(anios) {
  const ctx = useContable()
  const { comprobantes, plan } = ctx
  const clave = anios.join(',')
  const datos = useMemo(() => ejerciciosRG49(comprobantes.items, plan, anios), [comprobantes.items, plan, clave])
  return { ...ctx, ...datos }
}

const CAMPOS_FIRMA = [
  ['representante', 'representanteLegal', 'Representante legal', 'Nombres y apellidos'],
  ['contador', 'contadorNombre', 'Contador/a', 'Nombres y apellidos'],
  ['contadorRuc', 'contadorRuc', 'RUC del contador/a', 'p. ej. 3188991-3'],
  ['auditor', 'auditorNombre', 'Auditor/a', 'Si corresponde'],
  ['auditorRuc', 'auditorRuc', 'RUC del auditor/a', ''],
  ['tipoSociedad', 'tipoSociedad', 'Tipo de sociedad', 'p. ej. JURIDICO (SOCIEDAD ANONIMA)'],
  ['actividad', 'actividadEconomica', 'Actividad económica', ''],
  ['domicilio', 'domicilioFiscal', 'Domicilio fiscal', '']
]

/**
 * Datos de identificación que piden los anexos y no salen de los libros
 * (representante legal, contador, auditor…). Se guardan en la ficha del cliente.
 */
function useFirmantes(contribuyente) {
  const [clientes, setClientes, status] = useCloudCollection('cliente', 'quadra_clientes')
  const id = String(contribuyente.clienteId)
  const cliente = clientes.find((c) => String(c.id) === id)
  const firmantes = Object.fromEntries(CAMPOS_FIRMA.map(([k, campo]) => [k, cliente?.[campo] || '']))
  if (!firmantes.actividad) firmantes.actividad = contribuyente.actividadLabel || ''
  const guardar = (f) => setClientes((xs) => xs.map((c) => (String(c.id) === id
    ? { ...c, ...Object.fromEntries(CAMPOS_FIRMA.map(([k, campo]) => [campo, String(f[k] || '').trim()])) }
    : c)))
  return { firmantes, guardar, status, listo: !!cliente }
}

/** encabezado de los anexos: lo que falta se completa una vez y queda en la ficha del cliente */
function DatosFirma({ contribuyente, firmantes, guardar, listo, campos = ['representante', 'contador', 'contadorRuc', 'auditor', 'auditorRuc'] }) {
  const [abierto, setAbierto] = useState(false)
  const [form, setForm] = useState(null)
  const faltan = campos.filter((k) => !['auditor', 'auditorRuc'].includes(k) && !firmantes[k])
  const resumen = [firmantes.representante && `Representante: ${firmantes.representante}`, firmantes.contador && `Contador/a: ${firmantes.contador}`].filter(Boolean).join(' · ')
  const abrir = () => { setForm({ ...firmantes }); setAbierto(true) }
  return (
    <section className="q-card ct-card bal-firma" aria-label="Datos del encabezado">
      <div className="bal-firma__fila">
        <UserRound size={17} strokeWidth={1.7} aria-hidden="true" />
        <p className="bal-firma__texto">
          <span className="bal-firma__quien"><strong>{contribuyente.razonSocial}</strong> · RUC {contribuyente.ruc}</span>
          <span>{resumen || 'Sin representante legal ni contador en la ficha del cliente.'}</span>
        </p>
        {!abierto && listo && (
          <button type="button" className={`q-btn ${faltan.length ? 'q-btn--primary' : 'q-btn--line'}`} onClick={abrir}>
            {faltan.length ? 'Completar datos' : 'Editar datos'}
          </button>
        )}
      </div>
      {abierto && form && (
        <form className="bal-firma__form" onSubmit={(e) => { e.preventDefault(); guardar(form); setAbierto(false) }}>
          {CAMPOS_FIRMA.filter(([k]) => campos.includes(k)).map(([k, , label, ph]) => (
            <label key={k} className="bal-firma__campo">
              <span className="q-label">{label}</span>
              <input className="q-input" value={form[k]} placeholder={ph} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
            </label>
          ))}
          <div className="bal-firma__acciones">
            <button type="button" className="q-btn q-btn--ghost" onClick={() => setAbierto(false)}>Cancelar</button>
            <button type="submit" className="q-btn q-btn--primary">Guardar en la ficha del cliente</button>
          </div>
        </form>
      )}
    </section>
  )
}

const neg = (v) => (Math.round(v) < 0 ? 'is-neg' : '')

/* ── balance de sumas y saldos ──────────────────────────────── */

export function BalanceSumasSaldos() {
  const { ejercicio } = useContable()
  const anios = useMemo(() => [ejercicio], [ejercicio])
  const L = useBalances(anios)
  const ej = L.ejercicios[0]
  const ss = useMemo(() => sumasYSaldos(L.mapa, ej), [L.mapa, ej])
  const p = periodoDe(ej.anio, L.contribuyente)
  const cuadra = Math.round(ss.total.debe) === Math.round(ss.total.haber) && Math.round(ss.total.activo) === Math.round(ss.total.pasivo)
  const COLS = ['debe', 'haber', 'sDebe', 'sHaber', 'activo', 'pasivo', 'perdidas', 'ganancias']

  return (
    <div className="q-sheet q-sheet--wide ct-sheet">
      <PageHead
        title="Balance de Sumas y Saldos"
        lede={`Todas las cuentas con movimiento del ${p.desde} al ${p.hasta}: lo que suma el Debe y el Haber en el Diario, el saldo de cada una y su pase al inventario (activo y pasivo) o a resultados (pérdidas y ganancias).`}
        equation={[{ v: 'Debe' }, { op: '=' }, { v: 'Haber' }]}
        caption="sumas iguales"
        status={L.comprobantes.status} />
      {ej.vacio ? (
        <Vacio titulo="Todavía no hay movimientos">Cargá comprobantes o asientos del ejercicio {ej.anio} y el balance se arma solo.</Vacio>
      ) : (
        <>
          <Figures items={[
            { label: 'Sumas del Debe', value: gs(ss.total.debe) },
            { label: 'Sumas del Haber', value: gs(ss.total.haber) },
            { label: ss.resultado >= 0 ? 'Ganancia del ejercicio' : 'Pérdida del ejercicio', value: gs(Math.abs(ss.resultado)), tone: ss.resultado >= 0 ? 'ok' : 'err' },
            { label: 'Control', value: cuadra ? 'Cuadra' : 'No cuadra', tone: cuadra ? 'ok' : 'err' }
          ]} />
          <div className="ct-toolbar"><div className="ct-toolbar__end inf-acciones">
            <button type="button" className="q-btn q-btn--line" onClick={() => window.print()}><Printer size={16} strokeWidth={1.8} /> Imprimir</button>
            <button type="button" className="q-btn q-btn--primary" onClick={() => excelSumasSaldos({ ss, contribuyente: L.contribuyente, anio: ej.anio })}><Download size={16} strokeWidth={1.8} /> Excel</button>
          </div></div>
          <div className="q-card ct-card">
            <div className="ct-tabla-wrap">
              <table className="q-table ct-tabla bal-ss">
                <thead>
                  <tr><th rowSpan={2}>Código</th><th rowSpan={2}>Descripción</th><th colSpan={2} className="ct-centro">Sumas</th><th colSpan={2} className="ct-centro">Saldos</th><th colSpan={2} className="ct-centro">Inventario</th><th colSpan={2} className="ct-centro">Resultados</th></tr>
                  <tr><th className="ct-der">Debe</th><th className="ct-der">Haber</th><th className="ct-der">Debe</th><th className="ct-der">Haber</th><th className="ct-der">Activo</th><th className="ct-der">Pasivo</th><th className="ct-der">Pérdidas</th><th className="ct-der">Ganancias</th></tr>
                </thead>
                <tbody>
                  {ss.filas.map((f) => (
                    <tr key={`${f.codigo}${f.resultado ? '-r' : ''}`} className={f.resultado ? 'bal-ss__res' : ''}>
                      <td className="ct-mono ct-cod">{f.codigo}</td>
                      <td>{f.nombre}</td>
                      {COLS.map((k) => <td key={k} className={`ct-num ${neg(f[k])}`}>{gs(f[k])}</td>)}
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="ct-total"><td colSpan={2}>Totales</td>{COLS.map((k) => <td key={k} className="ct-num">{gs(ss.total[k])}</td>)}</tr></tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/* ── Anexos 1 y 2 de la RG 49/14 ────────────────────────────── */

function TablaAnexo({ filas, anios, titulo }) {
  return (
    <div className="q-card ct-card">
      <h3 className="inf-card__titulo">{titulo}</h3>
      <div className="ct-tabla-wrap">
        <table className="q-table ct-tabla bal-anexo">
          <thead><tr><th>Código</th><th>Rubro</th>{anios.map((a) => <th key={a} className="ct-der">{a}</th>)}</tr></thead>
          <tbody>
            {filas.map((f, i) => {
              if (f.tipo === 'blanco') return <tr key={`b${i}`} className="bal-anexo__blanco" aria-hidden="true"><td colSpan={2 + anios.length} /></tr>
              if (f.tipo === 'texto') return <tr key={`t${i}`} className="bal-anexo__texto"><td /><td colSpan={1 + anios.length}>{f.texto}</td></tr>
              return (
                <tr key={f.codigo} className={f.negrita ? 'is-negrita' : ''}>
                  <td className="ct-mono ct-cod">{f.codigo}</td>
                  <td style={{ paddingLeft: `${10 + (f.nivel - 1) * 14}px` }}>{f.nombre}</td>
                  {f.valores.map((v, k) => <td key={k} className={`ct-num ${neg(v)}`}>{gs(v)}</td>)}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const ANIOS_MAX = 12

/**
 * Balance General (Anexo 1) y Estado de Resultados (Anexo 2) de la RG 49/14,
 * comparativo con el ejercicio anterior o, con `multi`, a 5 años o más.
 */
export function BalanceRG49({ multi = false }) {
  const { ejercicio, contribuyente } = useContable()
  const [cantidad, setCantidad] = useState(5)
  const anios = useMemo(() => Array.from({ length: multi ? cantidad : 2 }, (_, i) => ejercicio - i), [multi, cantidad, ejercicio])
  const L = useBalances(anios)
  const F = useFirmantes(contribuyente)
  const balance = useMemo(() => filasRG49(L.mapa, L.ejercicios, 'balance'), [L.mapa, L.ejercicios])
  const resultados = useMemo(() => filasRG49(L.mapa, L.ejercicios, 'resultados'), [L.mapa, L.ejercicios])
  const act = L.ejercicios[0]
  const dif = Math.round((act.tot.get('01') || 0) - (act.tot.get('02') || 0) - (act.tot.get('03') || 0))
  const conDatos = L.ejercicios.filter((e) => !e.vacio).map((e) => e.anio)

  const excel = () => excelAnexos({
    nombre: `${multi ? `Balance 49-14 ${anios.length} años` : 'Balance 49-14'} ${contribuyente.ruc || ''} ${ejercicio}`,
    mapa: L.mapa, ejercicios: L.ejercicios, filasBalance: balance, filasResultados: resultados, contribuyente, firmantes: F.firmantes
  })

  return (
    <div className="q-sheet q-sheet--wide ct-sheet">
      <PageHead
        title={multi ? `Balance 49/14 a ${anios.length} años` : 'Balance Resolución 49/14'}
        lede={multi
          ? `Anexo Nº 1 (Balance General) y Anexo Nº 2 (Estado de Resultados) de los ejercicios ${anios[anios.length - 1]} a ${anios[0]}, cada uno armado con los comprobantes y asientos cargados en ese año.`
          : `Anexo Nº 1 (Balance General) y Anexo Nº 2 (Estado de Resultados) del ejercicio ${ejercicio}, comparados con ${ejercicio - 1}, con los rubros de la RG 49/14. Cada cuenta de tu plan va debajo del rubro que le corresponde.`}
        equation={[{ v: 'A' }, { op: '=' }, { v: 'P' }, { op: '+' }, { v: 'PN' }]}
        caption="ecuación patrimonial"
        status={L.comprobantes.status} />

      <DatosFirma contribuyente={contribuyente} {...F} />

      {act.vacio && !(multi && conDatos.length) ? (
        <Vacio titulo="Todavía no hay saldos">Cargá comprobantes o asientos del ejercicio {ejercicio} y los anexos se arman solos.</Vacio>
      ) : (
        <>
          <Figures items={[
            { label: `Activo ${ejercicio}`, value: gs(act.tot.get('01')) },
            { label: `Pasivo ${ejercicio}`, value: gs(act.tot.get('02')) },
            { label: `Patrimonio neto ${ejercicio}`, value: gs(act.tot.get('03')) },
            { label: 'A = P + PN', value: dif ? `Dif. ${gs(dif)}` : 'Cuadra', tone: dif ? 'err' : 'ok' }
          ]} />
          <div className="ct-toolbar">
            {multi && (
              <label className="ct-periodo">
                <span className="q-label">Ejercicios</span>
                <select className="q-input ct-select" value={cantidad} onChange={(e) => setCantidad(Number(e.target.value))}>
                  {Array.from({ length: ANIOS_MAX - 4 }, (_, i) => i + 5).map((n) => <option key={n} value={n}>{n} años ({ejercicio - n + 1} a {ejercicio})</option>)}
                </select>
              </label>
            )}
            {!multi && !act.cerrado && <p className="bal-aviso" role="note">Falta el cierre para el ejercicio ({ejercicio}).</p>}
            {multi && <p className="ct-hint">Con datos: {conDatos.length ? conDatos.slice().reverse().join(', ') : 'ningún ejercicio'}.</p>}
            <div className="ct-toolbar__end inf-acciones">
              <button type="button" className="q-btn q-btn--line" onClick={() => window.print()}><Printer size={16} strokeWidth={1.8} /> Imprimir</button>
              <button type="button" className="q-btn q-btn--primary" onClick={excel}><Download size={16} strokeWidth={1.8} /> Excel</button>
            </div>
          </div>
          <TablaAnexo titulo="Anexo Nº 1 · Balance General" filas={balance} anios={anios} />
          <TablaAnexo titulo="Anexo Nº 2 · Estado de Resultados" filas={resultados} anios={anios} />
        </>
      )}
    </div>
  )
}

/* ── Anexo 5: notas a los estados contables ─────────────────── */

function VistaBloques({ bloques }) {
  return (
    <article className="bal-doc">
      {bloques.map((x, i) => {
        switch (x.t) {
          case 'h1': return <h2 key={i} className="bal-doc__h1">{x.text}</h2>
          case 'h2': return <h3 key={i} className="bal-doc__h2">{x.text}</h3>
          case 'h3': return <h4 key={i} className="bal-doc__h3">{x.text}</h4>
          case 'p': return <p key={i} className={`bal-doc__p is-${x.align || 'left'} ${x.bold ? 'is-negrita' : ''}`} style={x.size ? { fontSize: `${x.size + 3}px` } : undefined}>{x.text}</p>
          case 'espacio': return <div key={i} className="bal-doc__esp" />
          case 'salto': return <hr key={i} className="bal-doc__salto" />
          case 'kv': return (
            <table key={i} className="bal-doc__tabla bal-doc__kv"><tbody>
              {x.filas.map(([k, v]) => <tr key={k}><th scope="row">{k}</th><td>{v}</td></tr>)}
            </tbody></table>
          )
          case 'tabla': return (
            <table key={i} className="bal-doc__tabla">
              {x.cabecera && <thead><tr>{x.cabecera.map((c, k) => <th key={k} className={x.cols[k].der ? 'ct-der' : ''}>{c}</th>)}</tr></thead>}
              <tbody>{x.filas.map((f, k) => <tr key={k} className={f.negrita ? 'is-negrita' : ''}>{f.celdas.map((c, j) => <td key={j} className={x.cols[j].der ? 'ct-num' : ''}>{c}</td>)}</tr>)}</tbody>
            </table>
          )
          case 'firma': return <div key={i} className="bal-doc__firma">{x.lineas.map((l, k) => <p key={k} className={k === 0 ? 'is-negrita' : ''}>{l || ' '}</p>)}</div>
          default: return null
        }
      })}
    </article>
  )
}

export function Anexo5Notas() {
  const { ejercicio, contribuyente } = useContable()
  const anios = useMemo(() => [ejercicio, ejercicio - 1], [ejercicio])
  const L = useBalances(anios)
  const F = useFirmantes(contribuyente)
  const anexo = useMemo(() => bloquesAnexo5({ mapa: L.mapa, ejercicios: L.ejercicios, contribuyente, firmantes: F.firmantes }),
      [L.mapa, L.ejercicios, contribuyente, JSON.stringify(F.firmantes)])
  const act = L.ejercicios[0]

  return (
    <div className="q-sheet q-sheet--wide ct-sheet">
      <PageHead
        title="Anexo 5 · Notas a los estados contables"
        lede={`Notas a los estados financieros del ejercicio ${ejercicio} según la RG 49/14 y la RG DNIT 49/2026: datos de la entidad, políticas contables, composición comparativa de cada rubro, base fiscal del IRE y movimiento del patrimonio neto. Los importes salen de los libros.`}
        status={L.comprobantes.status} />
      <DatosFirma contribuyente={contribuyente} {...F} campos={CAMPOS_FIRMA.map(([k]) => k)} />
      {act.vacio ? (
        <Vacio titulo="Todavía no hay saldos">Cargá comprobantes o asientos del ejercicio {ejercicio} y las notas se completan solas.</Vacio>
      ) : (
        <>
          <div className="ct-toolbar">
            <p className="ct-hint">Documento {anexo.documento}</p>
            <div className="ct-toolbar__end inf-acciones">
              <button type="button" className="q-btn q-btn--line" onClick={() => descargarPdfAnexo5(anexo)}><FileText size={16} strokeWidth={1.8} /> PDF</button>
              <button type="button" className="q-btn q-btn--primary" onClick={() => descargarWordAnexo5(anexo)}><Download size={16} strokeWidth={1.8} /> Word</button>
            </div>
          </div>
          <div className="q-card ct-card bal-doc__marco">
            <VistaBloques bloques={anexo.bloques} />
          </div>
        </>
      )}
    </div>
  )
}
