import React, { useMemo, useState } from 'react'
import { useContable } from './ContableContext'
import Reporte, { RangoFechas, Selector, Buscador, enRango, rangoEjercicio } from './Reporte'
import { useCloudCollection } from '../../services/useCloudCollection'
import {
  TIPOS, TIPOS_FISCALES, TIPOS_TIMBRADO, CATEGORIAS_ACTIVO, totalesDe, cuadroActivo, analizarRuc, gs, fechaCorta, hoyISO, n0
} from '../../services/contabilidad'
import { TIPOS_IMPUESTO, impuestoLabel, impuestosDe, sucursalesDe } from '../GestionClientes'

/* ── utilidades ─────────────────────────────────────────────── */

const contiene = (txt, q) => !q || String(txt || '').toLowerCase().includes(q.trim().toLowerCase())
const cabecera = (c, extra) => [`${c.razonSocial} · RUC ${c.ruc}`, ...(extra ? [extra] : [])]
const periodoTxt = (desde, hasta) => `Del ${fechaCorta(desde)} al ${fechaCorta(hasta)}`
const sumar = (filas, k) => filas.reduce((s, f) => s + (Number(f[k]) || 0), 0)
const diasHasta = (iso) => Math.round((new Date(`${iso}T12:00:00`) - new Date(`${hoyISO()}T12:00:00`)) / 86400000)

/** estado de rango de fechas compartido por los reportes con período */
const usePeriodo = (ejercicio) => {
  const [r, setR] = useState(() => {
    const e = rangoEjercicio(ejercicio)
    const hoy = hoyISO()
    return { desde: e.desde, hasta: hoy.startsWith(String(ejercicio)) ? hoy : e.hasta }
  })
  return [r, setR, !r.desde || !r.hasta || r.desde > r.hasta]
}

/* ── Contribuyentes ─────────────────────────────────────────── */

export function InfContribuyentes() {
  const [clientes, , status] = useCloudCollection('cliente', 'quadra_clientes')
  const [busca, setBusca] = useState('')
  const [impuesto, setImpuesto] = useState('')
  const [pago, setPago] = useState('')

  const filas = useMemo(() => clientes
    .filter((c) => contiene(`${c.ruc} ${c.razonSocial}`, busca))
    .filter((c) => !impuesto || impuestosDe(c).includes(impuesto))
    .filter((c) => !pago || (pago === 'aldia' ? c.pagoAlDia : !c.pagoAlDia))
    .sort((a, b) => (a.razonSocial || '').localeCompare(b.razonSocial || '', 'es'))
    .map((c) => {
      const r = analizarRuc(c.ruc)
      return {
        id: c.id,
        razon: c.razonSocial,
        ruc: c.ruc,
        dv: !c.ruc ? '' : r.formato ? (r.valido ? 'Correcto' : `Debería ser ${r.esperado}`) : 'Sin DV',
        impuestos: impuestosDe(c).map(impuestoLabel).join(', '),
        sucursales: sucursalesDe(c).length,
        honorarios: n0(c.honorarios),
        pago: c.pagoAlDia ? 'Al día' : 'Pendiente',
        facturado: c.facturado ? 'Sí' : 'No',
        _tono: c.pagoAlDia ? undefined : '#b42318'
      }
    }), [clientes, busca, impuesto, pago])

  return (
    <Reporte
      titulo="Contribuyentes"
      lede="Tu cartera de clientes con su RUC, los impuestos que liquidan, sucursales y el estado de honorarios. Útil para revisar la cartera o mandarla a quien te ayuda."
      equation={[{ v: 'Cartera' }, { op: '=' }, { v: 'Σ', sub: 'clientes' }]}
      caption="clientes cargados en Gestión de Clientes"
      status={status}
      filtros={<>
        <Buscador label="Contribuyente" value={busca} onChange={setBusca} />
        <Selector label="Impuesto" value={impuesto} onChange={setImpuesto} opciones={[['', 'Todos'], ...TIPOS_IMPUESTO.map((t) => [t.id, t.label])]} />
        <Selector label="Honorarios" value={pago} onChange={setPago} opciones={[['', 'Todos'], ['aldia', 'Al día'], ['pendiente', 'Pendientes']]} />
      </>}
      figuras={[
        { label: 'Contribuyentes', value: filas.length },
        { label: 'Con IVA', value: filas.filter((f) => /IVA/.test(f.impuestos)).length },
        { label: 'Honorarios del mes', value: gs(sumar(filas, 'honorarios')) },
        { label: 'Honorarios pendientes', value: filas.filter((f) => f.pago === 'Pendiente').length, tone: filas.some((f) => f.pago === 'Pendiente') ? 'err' : 'ok' }
      ]}
      cols={[
        { k: 'razon', t: 'Razón social', w: 3, ancho: true },
        { k: 'ruc', t: 'RUC', w: 1.2, mono: true },
        { k: 'dv', t: 'Dígito verif.', w: 1.1 },
        { k: 'impuestos', t: 'Impuestos', w: 2.6 },
        { k: 'sucursales', t: 'Suc.', w: 0.6, der: true },
        { k: 'honorarios', t: 'Honorarios', w: 1.2, monto: true },
        { k: 'pago', t: 'Pago', w: 0.9 },
        { k: 'facturado', t: 'Facturado', w: 0.9 }
      ]}
      filas={filas}
      total={filas.length ? { razon: `${filas.length} contribuyentes`, honorarios: sumar(filas, 'honorarios') } : null}
      lineas={['Cartera de clientes', `Situación al ${fechaCorta(hoyISO())}`]}
      nombreArchivo={`Contribuyentes ${hoyISO()}`}
      vacio={{ titulo: 'Sin contribuyentes', texto: 'Cargá clientes en Gestión de Clientes o probá con otros filtros.' }}
    />
  )
}

/* ── Retenciones ────────────────────────────────────────────── */

export function InfRetenciones() {
  const { comprobantes, contribuyente, ejercicio } = useContable()
  const [r, setR, mal] = usePeriodo(ejercicio)
  const [tipo, setTipo] = useState('')
  const [busca, setBusca] = useState('')
  const [anuladas, setAnuladas] = useState('no')

  const docs = useMemo(() => comprobantes.items
    .filter((d) => (d.tipo === 'ret-emitida' || d.tipo === 'ret-recibida') && (!tipo || d.tipo === tipo))
    .filter((d) => enRango(d.fecha, r.desde, r.hasta) && contiene(`${d.personaRuc} ${d.personaNombre}`, busca))
    .filter((d) => anuladas === 'si' || !d.anulado)
    .sort((a, b) => a.tipo.localeCompare(b.tipo) || (a.fecha || '').localeCompare(b.fecha || '')), [comprobantes.items, tipo, r, busca, anuladas])

  const fila = (d) => ({
    id: d.id,
    fecha: fechaCorta(d.fecha),
    numero: d.numero,
    ruc: d.personaRuc,
    nombre: d.personaNombre + (d.anulado ? ' (anulada)' : ''),
    facturas: (d.aplicaciones || []).map((a) => a.numero).join(', '),
    base: n0(d.grav10) + n0(d.grav5),
    monto: d.anulado ? 0 : n0(d.monto),
    _tono: d.anulado ? '#6b7a90' : undefined
  })
  const filas = []
  ;['ret-emitida', 'ret-recibida'].forEach((t) => {
    const grupo = docs.filter((d) => d.tipo === t)
    if (!grupo.length) return
    filas.push({ _tipo: 'grupo', _rotulo: t === 'ret-emitida' ? 'Retenciones emitidas (a proveedores)' : 'Retenciones recibidas (de clientes)' })
    const fs = grupo.map(fila)
    filas.push(...fs, { _tipo: 'subtotal', nombre: `Subtotal · ${fs.length}`, base: sumar(fs, 'base'), monto: sumar(fs, 'monto') })
  })
  const todas = filas.filter((f) => !f._tipo)
  const emitidas = docs.filter((d) => d.tipo === 'ret-emitida' && !d.anulado).reduce((s, d) => s + n0(d.monto), 0)
  const recibidas = docs.filter((d) => d.tipo === 'ret-recibida' && !d.anulado).reduce((s, d) => s + n0(d.monto), 0)

  return (
    <Reporte
      titulo="Retenciones de IVA"
      lede="Comprobantes de retención emitidos a tus proveedores y recibidos de tus clientes en el período, con las facturas que alcanzan. Las recibidas se descuentan en el Formulario 120."
      equation={[{ v: 'Ret' }, { op: '=' }, { v: 'IVA' }, { op: '×' }, { v: '%' }]}
      caption="retención de IVA"
      status={comprobantes.status}
      aviso={mal ? 'La fecha desde tiene que ser anterior a la fecha hasta.' : ''}
      filtros={<>
        <RangoFechas desde={r.desde} hasta={r.hasta} onChange={setR} ejercicio={ejercicio} />
        <Selector label="Tipo" value={tipo} onChange={setTipo} opciones={[['', 'Emitidas y recibidas'], ['ret-emitida', 'Emitidas'], ['ret-recibida', 'Recibidas']]} />
        <Buscador label="Proveedor o cliente" value={busca} onChange={setBusca} />
        <Selector label="Anuladas" value={anuladas} onChange={setAnuladas} opciones={[['no', 'Sin anuladas'], ['si', 'Incluir anuladas']]} />
      </>}
      figuras={[
        { label: 'Emitidas', value: gs(emitidas) },
        { label: 'Recibidas', value: gs(recibidas) },
        { label: 'Comprobantes', value: todas.length },
        { label: 'Anuladas', value: docs.filter((d) => d.anulado).length }
      ]}
      cols={[
        { k: 'fecha', t: 'Fecha', w: 0.9, mono: true },
        { k: 'numero', t: 'Número', w: 1.4, mono: true },
        { k: 'ruc', t: 'RUC', w: 1.1, mono: true },
        { k: 'nombre', t: 'Razón social', w: 2.6, ancho: true },
        { k: 'facturas', t: 'Facturas', w: 2.2 },
        { k: 'base', t: 'Gravado', w: 1.2, monto: true },
        { k: 'monto', t: 'Retenido', w: 1.2, monto: true }
      ]}
      filas={filas}
      total={todas.length ? { nombre: 'Total', base: sumar(todas, 'base'), monto: sumar(todas, 'monto') } : null}
      lineas={cabecera(contribuyente, periodoTxt(r.desde, r.hasta))}
      nombreArchivo={`Retenciones ${contribuyente.ruc} ${r.desde} a ${r.hasta}`}
      vacio={{ titulo: 'Sin retenciones en el período', texto: 'Se cargan en Movimientos › Retenciones I.V.A.' }}
    />
  )
}

/* ── Resumen de ingresos y egresos por cuenta ──────────────── */

export function InfIngresosEgresos() {
  const { comprobantes, contribuyente, ejercicio, nombreCuenta } = useContable()
  const [r, setR, mal] = usePeriodo(ejercicio)

  const { filas, ing, egr, porMes } = useMemo(() => {
    const cuentas = new Map()
    const meses = new Map()
    comprobantes.items.forEach((d) => {
      if (!TIPOS_FISCALES.includes(d.tipo) || d.anulado || !enRango(d.fecha, r.desde, r.hasta)) return
      const t = TIPOS[d.tipo]
      const x = totalesDe(d)
      const neto = x.base10 + x.base5 + x.ex
      const iva = x.iva10 + x.iva5
      const partes = d.imputaciones?.length ? d.imputaciones.map((i) => ({ cuenta: i.cuenta, peso: neto ? n0(i.monto) / neto : 0 })) : [{ cuenta: d.cuenta || t.cuenta, peso: 1 }]
      partes.forEach((p) => {
        const k = `${t.lado}|${p.cuenta}`
        const c = cuentas.get(k) || { lado: t.lado, cuenta: p.cuenta, n: 0, neto: 0, iva: 0, total: 0 }
        c.n += 1
        c.neto += Math.round(t.signo * neto * p.peso)
        c.iva += Math.round(t.signo * iva * p.peso)
        c.total += Math.round(t.signo * x.total * p.peso)
        cuentas.set(k, c)
      })
      const m = String(d.fecha).slice(0, 7)
      const fm = meses.get(m) || { mes: m, ingresos: 0, egresos: 0 }
      if (t.lado === 'venta') fm.ingresos += t.signo * neto; else fm.egresos += t.signo * neto
      meses.set(m, fm)
    })
    const lista = [...cuentas.values()]
    const out = []
    const totales = {}
    ;[['venta', 'Ingresos'], ['compra', 'Egresos']].forEach(([lado, rot]) => {
      const g = lista.filter((c) => c.lado === lado).sort((a, b) => b.neto - a.neto)
      const tot = g.reduce((s, c) => s + c.neto, 0)
      totales[lado] = tot
      if (!g.length) return
      out.push({ _tipo: 'grupo', _rotulo: rot })
      g.forEach((c) => out.push({ id: `${lado}${c.cuenta}`, cuenta: c.cuenta, nombre: nombreCuenta(c.cuenta), n: c.n, neto: c.neto, iva: c.iva, total: c.total, pct: tot ? `${Math.round((c.neto / tot) * 100)} %` : '' }))
      out.push({ _tipo: 'subtotal', nombre: `Total ${rot.toLowerCase()}`, n: g.reduce((s, c) => s + c.n, 0), neto: tot, iva: g.reduce((s, c) => s + c.iva, 0), total: g.reduce((s, c) => s + c.total, 0), pct: '100 %' })
    })
    return { filas: out, ing: totales.venta || 0, egr: totales.compra || 0, porMes: [...meses.values()].sort((a, b) => a.mes.localeCompare(b.mes)) }
  }, [comprobantes.items, r, nombreCuenta])
  const res = ing - egr

  return (
    <Reporte
      titulo="Resumen de ingresos y egresos"
      lede="De dónde vino la plata y en qué se fue: ingresos y egresos del período agrupados por cuenta del plan, sin IVA, con su peso en el total. El Excel trae además el detalle mes a mes."
      equation={[{ v: 'R' }, { op: '=' }, { v: 'Ingresos' }, { op: '−' }, { v: 'Egresos' }]}
      caption="netos de IVA"
      status={comprobantes.status}
      aviso={mal ? 'La fecha desde tiene que ser anterior a la fecha hasta.' : ''}
      filtros={<RangoFechas desde={r.desde} hasta={r.hasta} onChange={setR} ejercicio={ejercicio} />}
      figuras={[
        { label: 'Ingresos netos', value: gs(ing) },
        { label: 'Egresos netos', value: gs(egr) },
        { label: res >= 0 ? 'Resultado · ganancia' : 'Resultado · pérdida', value: gs(res), tone: res >= 0 ? 'ok' : 'err' },
        { label: 'Margen', value: ing ? `${((res / ing) * 100).toLocaleString('es-PY', { maximumFractionDigits: 1 })} %` : '—' }
      ]}
      cols={[
        { k: 'cuenta', t: 'Cuenta', w: 1, mono: true },
        { k: 'nombre', t: 'Denominación', w: 3, ancho: true },
        { k: 'n', t: 'Comp.', w: 0.6, der: true },
        { k: 'neto', t: 'Neto', w: 1.3, monto: true },
        { k: 'iva', t: 'IVA', w: 1.1, monto: true },
        { k: 'total', t: 'Total', w: 1.3, monto: true },
        { k: 'pct', t: '% del grupo', w: 0.9, der: true }
      ]}
      filas={filas}
      total={filas.length ? { nombre: res >= 0 ? 'Resultado (ganancia)' : 'Resultado (pérdida)', neto: res } : null}
      lineas={cabecera(contribuyente, periodoTxt(r.desde, r.hasta))}
      nombreArchivo={`Ingresos y egresos ${contribuyente.ruc} ${r.desde} a ${r.hasta}`}
      orientacion="portrait"
      hojasExtra={[{ hoja: 'Por mes', filas: [['Mes', 'Ingresos netos', 'Egresos netos', 'Diferencia'], ...porMes.map((m) => [m.mes, m.ingresos, m.egresos, m.ingresos - m.egresos])] }]}
      vacio={{ titulo: 'Sin movimientos en el período', texto: 'Cargá compras y ventas en Movimientos.' }}
    />
  )
}

/* ── Bienes del activo fijo ─────────────────────────────────── */

export function InfActivos() {
  const { activos, contribuyente, ejercicio } = useContable()
  const [categoria, setCategoria] = useState('')
  const [bajas, setBajas] = useState('no')

  const { filas, tot } = useMemo(() => {
    const out = []
    const tot = { origen: 0, revaluado: 0, dep: 0, cuota: 0, neto: 0 }
    CATEGORIAS_ACTIVO.filter((c) => !categoria || c.id === categoria).forEach((cat) => {
      const bienes = activos.items
        .filter((a) => a.categoria === cat.id && (bajas === 'si' || !a.fechaBaja))
        .map((a) => ({ a, f: cuadroActivo(a, ejercicio) }))
        .filter((x) => x.f)
      if (!bienes.length) return
      out.push({ _tipo: 'grupo', _rotulo: cat.label })
      const fs = bienes.map(({ a, f }) => ({
        id: a.id,
        descripcion: a.descripcion + (a.fechaBaja ? ` (baja ${fechaCorta(a.fechaBaja)})` : ''),
        alta: fechaCorta(a.fechaAlta),
        vida: a.vidaUtil ? `${a.vidaUtil} años` : '—',
        origen: n0(a.valorOrigen),
        revaluado: f.valorRevaluado,
        dep: f.depCierre,
        cuota: f.cuota,
        neto: f.neto
      }))
      out.push(...fs)
      const st = { _tipo: 'subtotal', descripcion: `Subtotal ${cat.label}` }
      ;['origen', 'revaluado', 'dep', 'cuota', 'neto'].forEach((k) => { st[k] = sumar(fs, k); tot[k] += st[k] })
      out.push(st)
    })
    return { filas: out, tot }
  }, [activos.items, categoria, bajas, ejercicio])

  return (
    <Reporte
      titulo="Bienes del activo fijo"
      lede={`Cada bien de uso con su valor de origen, revalúo, depreciación acumulada y valor neto al cierre del ejercicio ${ejercicio}, agrupado por categoría.`}
      equation={[{ v: 'VN' }, { op: '=' }, { v: 'V', sub: 'rev' }, { op: '−' }, { v: 'Dep', sub: 'acum' }]}
      caption={`valores al 31/12/${ejercicio}`}
      status={activos.status}
      filtros={<>
        <Selector label="Categoría" value={categoria} onChange={setCategoria} opciones={[['', 'Todas'], ...CATEGORIAS_ACTIVO.map((c) => [c.id, c.label])]} />
        <Selector label="Bajas" value={bajas} onChange={setBajas} opciones={[['no', 'Solo bienes en uso'], ['si', 'Incluir dados de baja']]} />
      </>}
      figuras={[
        { label: 'Valor de origen', value: gs(tot.origen) },
        { label: 'Valor revaluado', value: gs(tot.revaluado) },
        { label: `Depreciación ${ejercicio}`, value: gs(tot.cuota) },
        { label: 'Valor neto', value: gs(tot.neto) }
      ]}
      cols={[
        { k: 'descripcion', t: 'Bien', w: 3, ancho: true },
        { k: 'alta', t: 'Alta', w: 0.9, mono: true },
        { k: 'vida', t: 'Vida útil', w: 0.8 },
        { k: 'origen', t: 'Valor origen', w: 1.2, monto: true },
        { k: 'revaluado', t: 'Revaluado', w: 1.2, monto: true },
        { k: 'cuota', t: 'Dep. ejercicio', w: 1.2, monto: true },
        { k: 'dep', t: 'Dep. acumulada', w: 1.2, monto: true },
        { k: 'neto', t: 'Valor neto', w: 1.2, monto: true }
      ]}
      filas={filas}
      total={filas.length ? { descripcion: 'Total', ...tot } : null}
      lineas={cabecera(contribuyente, `Ejercicio ${ejercicio}`)}
      nombreArchivo={`Activo fijo ${contribuyente.ruc} ${ejercicio}`}
      vacio={{ titulo: 'Sin bienes', texto: 'Se cargan en Catastros › Revalúo & Depreciación › Bienes del activo fijo.' }}
    />
  )
}

/* ── Recibos ────────────────────────────────────────────────── */

export function InfRecibos({ tipo }) {
  const { comprobantes, contribuyente, ejercicio, nombreCuenta } = useContable()
  const cobro = tipo === 'recibo-cobro'
  const [r, setR, mal] = usePeriodo(ejercicio)
  const [busca, setBusca] = useState('')
  const [anulados, setAnulados] = useState('no')
  const [agrupar, setAgrupar] = useState('')

  const docs = useMemo(() => comprobantes.items
    .filter((d) => d.tipo === tipo && enRango(d.fecha, r.desde, r.hasta) && contiene(`${d.personaRuc} ${d.personaNombre}`, busca))
    .filter((d) => anulados === 'si' || !d.anulado)
    .sort((a, b) => (agrupar ? (a.personaNombre || '').localeCompare(b.personaNombre || '', 'es') : 0) || (a.fecha || '').localeCompare(b.fecha || '') || (a.numero || '').localeCompare(b.numero || '')), [comprobantes.items, tipo, r, busca, anulados, agrupar])

  const fila = (d) => ({
    id: d.id,
    fecha: fechaCorta(d.fecha),
    numero: d.numero || 's/n',
    ruc: d.personaRuc,
    nombre: d.personaNombre + (d.anulado ? ' (anulado)' : ''),
    medio: d.cuentaPago ? nombreCuenta(d.cuentaPago) : '',
    facturas: (d.aplicaciones || []).map((a) => a.numero).join(', ') || d.facturaRef || '',
    moneda: d.moneda && d.moneda !== 'PYG' ? `${d.moneda} ${Number(d.montoMoneda || 0).toLocaleString('es-PY')}` : '',
    monto: d.anulado ? 0 : n0(d.monto),
    _tono: d.anulado ? '#6b7a90' : undefined
  })
  let filas
  if (agrupar) {
    filas = []
    const personas = [...new Set(docs.map((d) => d.personaRuc || d.personaNombre))]
    personas.forEach((p) => {
      const g = docs.filter((d) => (d.personaRuc || d.personaNombre) === p).map(fila)
      filas.push({ _tipo: 'grupo', _rotulo: `${g[0].nombre.replace(/ \(anulado\)$/, '')} · RUC ${g[0].ruc}` }, ...g, { _tipo: 'subtotal', nombre: `Subtotal · ${g.length} recibos`, monto: sumar(g, 'monto') })
    })
  } else filas = docs.map(fila)
  const datos = filas.filter((f) => !f._tipo)
  const titulo = cobro ? 'Recibos de cobro' : 'Recibos de pago'

  return (
    <Reporte
      titulo={titulo}
      lede={cobro ? 'Cobros a clientes del período con el medio en que entró la plata y las facturas que cancela cada recibo.' : 'Pagos a proveedores del período con la cuenta de la que salió la plata y las facturas que cancela cada recibo.'}
      equation={[{ v: cobro ? 'Cobros' : 'Pagos' }, { op: '=' }, { v: 'Σ', sub: 'recibos' }]}
      caption={periodoTxt(r.desde, r.hasta).toLowerCase()}
      status={comprobantes.status}
      aviso={mal ? 'La fecha desde tiene que ser anterior a la fecha hasta.' : ''}
      filtros={<>
        <RangoFechas desde={r.desde} hasta={r.hasta} onChange={setR} ejercicio={ejercicio} />
        <Buscador label={cobro ? 'Cliente' : 'Proveedor'} value={busca} onChange={setBusca} />
        <Selector label="Agrupar" value={agrupar} onChange={setAgrupar} opciones={[['', 'Por fecha'], ['persona', cobro ? 'Por cliente' : 'Por proveedor']]} />
        <Selector label="Anulados" value={anulados} onChange={setAnulados} opciones={[['no', 'Sin anulados'], ['si', 'Incluir anulados']]} />
      </>}
      figuras={[
        { label: cobro ? 'Total cobrado' : 'Total pagado', value: gs(sumar(datos, 'monto')) },
        { label: 'Recibos', value: datos.length },
        { label: cobro ? 'Clientes' : 'Proveedores', value: new Set(docs.map((d) => d.personaRuc)).size },
        { label: 'Anulados', value: docs.filter((d) => d.anulado).length }
      ]}
      cols={[
        { k: 'fecha', t: 'Fecha', w: 0.9, mono: true },
        { k: 'numero', t: 'Número', w: 1.4, mono: true },
        { k: 'ruc', t: 'RUC', w: 1.1, mono: true },
        { k: 'nombre', t: cobro ? 'Cliente' : 'Proveedor', w: 2.4, ancho: true },
        { k: 'medio', t: cobro ? 'Cobrado en' : 'Pagado desde', w: 1.6 },
        { k: 'facturas', t: 'Facturas', w: 2.2 },
        { k: 'moneda', t: 'Moneda origen', w: 1.1 },
        { k: 'monto', t: 'Importe', w: 1.2, monto: true }
      ]}
      filas={filas}
      total={datos.length ? { nombre: 'Total', monto: sumar(datos, 'monto') } : null}
      lineas={cabecera(contribuyente, periodoTxt(r.desde, r.hasta))}
      nombreArchivo={`${titulo} ${contribuyente.ruc} ${r.desde} a ${r.hasta}`}
      vacio={{ titulo: 'Sin recibos en el período', texto: `Se cargan en Movimientos › Recibos › ${cobro ? 'De cobro' : 'De pago'}.` }}
    />
  )
}

/* ── Timbrados: vigencia y uso ──────────────────────────────── */

const tipoTimbradoLabel = (id) => TIPOS_TIMBRADO.find((t) => t.id === id)?.label || id
const tiposDeTimbrado = (id) => Object.entries(TIPOS).filter(([, t]) => t.timbradoTipo === id).map(([k]) => k)
const nroDe = (numero) => Number(String(numero || '').split('-')[2]) || 0

export function InfTimbrados() {
  const { timbrados, comprobantes, contribuyente } = useContable()
  const [estado, setEstado] = useState('')

  const filas = useMemo(() => timbrados.items.map((t) => {
    const tipos = tiposDeTimbrado(t.tipo)
    const usados = comprobantes.items.filter((d) => tipos.includes(d.tipo) && String(d.timbrado) === String(t.numero) && String(d.numero || '').startsWith(`${t.establecimiento}-${t.punto}-`))
    const ultimo = usados.reduce((m, d) => Math.max(m, nroDe(d.numero)), 0)
    const dias = t.fin ? diasHasta(t.fin) : null
    const est = dias == null ? 'Sin fin' : dias < 0 ? 'Vencido' : dias <= 30 ? `Vence en ${dias} días` : 'Vigente'
    return {
      id: t.id,
      numero: t.numero,
      documento: tipoTimbradoLabel(t.tipo),
      punto: `${t.establecimiento}-${t.punto}`,
      vigencia: `${fechaCorta(t.inicio)} a ${fechaCorta(t.fin)}`,
      estado: est,
      rango: `${t.desde || 1} a ${t.hasta || '∞'}`,
      usados: usados.length,
      ultimo: ultimo ? String(ultimo).padStart(7, '0') : '—',
      disponibles: t.hasta ? Math.max(Number(t.hasta) - Math.max(ultimo, Number(t.desde || 1) - 1), 0) : '',
      _clave: dias == null ? 'vigente' : dias < 0 ? 'vencido' : dias <= 30 ? 'porvencer' : 'vigente',
      _tono: dias != null && dias < 0 ? '#6b7a90' : dias != null && dias <= 30 ? '#b45309' : undefined
    }
  }).filter((f) => !estado || f._clave === estado).sort((a, b) => a.documento.localeCompare(b.documento) || a.punto.localeCompare(b.punto)), [timbrados.items, comprobantes.items, estado])

  return (
    <Reporte
      titulo="Timbrados · vigencia y uso"
      lede="Cada timbrado con su vigencia, el último número usado y cuántos quedan en el rango autorizado. Los que vencen en 30 días aparecen marcados para renovarlos a tiempo."
      equation={[{ v: 'Disp' }, { op: '=' }, { v: 'Hasta' }, { op: '−' }, { v: 'Último' }]}
      caption="numeración disponible"
      status={timbrados.status}
      filtros={<Selector label="Estado" value={estado} onChange={setEstado} opciones={[['', 'Todos'], ['vigente', 'Vigentes'], ['porvencer', 'Por vencer (30 días)'], ['vencido', 'Vencidos']]} />}
      figuras={[
        { label: 'Timbrados', value: filas.length },
        { label: 'Vigentes', value: filas.filter((f) => f._clave === 'vigente').length },
        { label: 'Por vencer', value: filas.filter((f) => f._clave === 'porvencer').length, tone: filas.some((f) => f._clave === 'porvencer') ? 'err' : 'ok' },
        { label: 'Vencidos', value: filas.filter((f) => f._clave === 'vencido').length }
      ]}
      cols={[
        { k: 'numero', t: 'Timbrado', w: 1, mono: true },
        { k: 'documento', t: 'Documento', w: 1.6 },
        { k: 'punto', t: 'Est.-Pto.', w: 0.8, mono: true },
        { k: 'vigencia', t: 'Vigencia', w: 1.8 },
        { k: 'estado', t: 'Estado', w: 1.3 },
        { k: 'rango', t: 'Rango autorizado', w: 1.3 },
        { k: 'usados', t: 'Usados', w: 0.7, der: true },
        { k: 'ultimo', t: 'Último Nº', w: 0.9, mono: true },
        { k: 'disponibles', t: 'Disponibles', w: 0.9, der: true }
      ]}
      filas={filas}
      total={null}
      lineas={cabecera(contribuyente, `Situación al ${fechaCorta(hoyISO())}`)}
      nombreArchivo={`Timbrados ${contribuyente.ruc} ${hoyISO()}`}
      vacio={{ titulo: 'Sin timbrados', texto: 'Se cargan en Catastros › Timbrados.' }}
    />
  )
}

/* ── Timbrados: control de numeración ───────────────────────── */

/** números faltantes como rangos legibles: 5, 8 a 10 */
const rangosDe = (nums) => {
  const out = []
  let i = 0
  while (i < nums.length) {
    let j = i
    while (j + 1 < nums.length && nums[j + 1] === nums[j] + 1) j++
    out.push(i === j ? String(nums[i]) : `${nums[i]} a ${nums[j]}`)
    i = j + 1
  }
  return out.join(', ')
}

export function InfNumeracion() {
  const { comprobantes, contribuyente, ejercicio } = useContable()
  const [r, setR, mal] = usePeriodo(ejercicio)
  const [solo, setSolo] = useState('')

  const filas = useMemo(() => {
    const series = new Map()
    comprobantes.items.forEach((d) => {
      const t = TIPOS[d.tipo]
      if (!t?.emitido || !d.numero || !enRango(d.fecha, r.desde, r.hasta)) return
      const [est, pto] = String(d.numero).split('-')
      const k = `${d.tipo}|${d.timbrado || ''}|${est}-${pto}`
      const s = series.get(k) || { tipo: d.tipo, timbrado: d.timbrado || '—', punto: `${est}-${pto}`, nums: [] }
      s.nums.push(nroDe(d.numero))
      series.set(k, s)
    })
    return [...series.values()].map((s) => {
      const nums = s.nums.filter(Boolean).sort((a, b) => a - b)
      const unicos = [...new Set(nums)]
      const repetidos = [...new Set(nums.filter((n, i) => nums.indexOf(n) !== i))]
      const faltan = []
      for (let i = 1; i < unicos.length && faltan.length < 500; i++) for (let n = unicos[i - 1] + 1; n < unicos[i] && faltan.length < 500; n++) faltan.push(n)
      return {
        id: `${s.tipo}${s.timbrado}${s.punto}`,
        documento: TIPOS[s.tipo].label,
        timbrado: s.timbrado,
        punto: s.punto,
        primero: unicos[0] || '',
        ultimo: unicos[unicos.length - 1] || '',
        emitidos: nums.length,
        faltantes: faltan.length,
        detalleF: rangosDe(faltan),
        repetidos: repetidos.join(', '),
        _ok: !faltan.length && !repetidos.length,
        _tono: !faltan.length && !repetidos.length ? undefined : '#b42318'
      }
    }).filter((f) => !solo || !f._ok).sort((a, b) => a.documento.localeCompare(b.documento) || a.punto.localeCompare(b.punto))
  }, [comprobantes.items, r, solo])

  return (
    <Reporte
      titulo="Timbrados · control de numeración"
      lede="Revisa la correlatividad de lo que emitiste: por cada timbrado y punto de expedición muestra el primer y el último número del período, los números que faltan (anulados sin cargar o saltos) y los repetidos."
      equation={[{ v: 'Faltan' }, { op: '=' }, { v: 'Rango' }, { op: '−' }, { v: 'Emitidos' }]}
      caption="correlatividad de la numeración"
      status={comprobantes.status}
      aviso={mal ? 'La fecha desde tiene que ser anterior a la fecha hasta.' : ''}
      filtros={<>
        <RangoFechas desde={r.desde} hasta={r.hasta} onChange={setR} ejercicio={ejercicio} />
        <Selector label="Mostrar" value={solo} onChange={setSolo} opciones={[['', 'Todas las series'], ['problemas', 'Solo con faltantes o repetidos']]} />
      </>}
      figuras={[
        { label: 'Series', value: filas.length },
        { label: 'Comprobantes emitidos', value: sumar(filas, 'emitidos') },
        { label: 'Números faltantes', value: sumar(filas, 'faltantes'), tone: sumar(filas, 'faltantes') ? 'err' : 'ok' },
        { label: 'Series con repetidos', value: filas.filter((f) => f.repetidos).length, tone: filas.some((f) => f.repetidos) ? 'err' : 'ok' }
      ]}
      cols={[
        { k: 'documento', t: 'Documento', w: 1.8 },
        { k: 'timbrado', t: 'Timbrado', w: 1, mono: true },
        { k: 'punto', t: 'Est.-Pto.', w: 0.8, mono: true },
        { k: 'primero', t: 'Primero', w: 0.8, der: true },
        { k: 'ultimo', t: 'Último', w: 0.8, der: true },
        { k: 'emitidos', t: 'Emitidos', w: 0.8, der: true },
        { k: 'detalleF', t: 'Números faltantes', w: 2.6 },
        { k: 'repetidos', t: 'Repetidos', w: 1.4 }
      ]}
      filas={filas}
      total={null}
      lineas={cabecera(contribuyente, periodoTxt(r.desde, r.hasta))}
      nombreArchivo={`Control de numeración ${contribuyente.ruc} ${r.desde} a ${r.hasta}`}
      vacio={{ titulo: 'Sin documentos emitidos en el período', texto: 'Acá se controlan facturas, notas, recibos y retenciones que emitiste.' }}
    />
  )
}

/* ── Movimientos por usuarios ───────────────────────────────── */

const ACCIONES = { alta: 'Alta', modificacion: 'Modificación', baja: 'Baja' }
const COLECCIONES = { comprobante: 'Comprobante', cuenta: 'Cuenta', activo: 'Activo fijo', timbrado: 'Timbrado', persona: 'Persona' }
const fechaHora = (iso) => (iso ? `${fechaCorta(iso.slice(0, 10))} ${new Date(iso).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })}` : '')
const NOTA_AUDITORIA = 'Quadra registra los movimientos desde esta versión; lo cargado antes no tiene usuario ni historial.'

export function InfUsuarios() {
  const { auditoria, contribuyente, ejercicio } = useContable()
  const [r, setR, mal] = usePeriodo(ejercicio)

  const { filas, porDia } = useMemo(() => {
    const ent = auditoria.items.filter((e) => enRango(e.fecha, r.desde, r.hasta))
    const u = new Map()
    const dias = new Map()
    ent.forEach((e) => {
      const x = u.get(e.usuario) || { usuario: e.usuario, alta: 0, modificacion: 0, baja: 0, total: 0, primero: e.fecha, ultimo: e.fecha, comp: 0 }
      x[e.accion] += 1
      x.total += 1
      if (e.coleccion === 'comprobante') x.comp += 1
      if (e.fecha < x.primero) x.primero = e.fecha
      if (e.fecha > x.ultimo) x.ultimo = e.fecha
      u.set(e.usuario, x)
      const k = `${e.usuario}|${e.fecha.slice(0, 10)}`
      const d = dias.get(k) || { usuario: e.usuario, dia: e.fecha.slice(0, 10), alta: 0, modificacion: 0, baja: 0 }
      d[e.accion] += 1
      dias.set(k, d)
    })
    return {
      filas: [...u.values()].sort((a, b) => b.total - a.total).map((x) => ({ ...x, id: x.usuario, primero: fechaHora(x.primero), ultimo: fechaHora(x.ultimo) })),
      porDia: [...dias.values()].sort((a, b) => a.dia.localeCompare(b.dia))
    }
  }, [auditoria.items, r])

  return (
    <Reporte
      titulo="Movimientos por usuarios"
      lede={`Cuánto cargó, modificó y borró cada usuario en el período, sobre los datos de ${contribuyente.razonSocial}. ${NOTA_AUDITORIA}`}
      equation={[{ v: 'Mov' }, { op: '=' }, { v: 'Altas' }, { op: '+' }, { v: 'Modif' }, { op: '+' }, { v: 'Bajas' }]}
      caption="actividad por usuario"
      status={auditoria.status}
      aviso={mal ? 'La fecha desde tiene que ser anterior a la fecha hasta.' : ''}
      filtros={<RangoFechas desde={r.desde} hasta={r.hasta} onChange={setR} ejercicio={ejercicio} />}
      figuras={[
        { label: 'Usuarios', value: filas.length },
        { label: 'Altas', value: sumar(filas, 'alta') },
        { label: 'Modificaciones', value: sumar(filas, 'modificacion') },
        { label: 'Bajas', value: sumar(filas, 'baja') }
      ]}
      cols={[
        { k: 'usuario', t: 'Usuario', w: 2.4, ancho: true },
        { k: 'alta', t: 'Altas', w: 0.8, der: true },
        { k: 'modificacion', t: 'Modificaciones', w: 1, der: true },
        { k: 'baja', t: 'Bajas', w: 0.8, der: true },
        { k: 'total', t: 'Total', w: 0.8, der: true },
        { k: 'comp', t: 'En comprobantes', w: 1.1, der: true },
        { k: 'primero', t: 'Primer movimiento', w: 1.4 },
        { k: 'ultimo', t: 'Último movimiento', w: 1.4 }
      ]}
      filas={filas}
      total={filas.length > 1 ? { usuario: 'Total', alta: sumar(filas, 'alta'), modificacion: sumar(filas, 'modificacion'), baja: sumar(filas, 'baja'), total: sumar(filas, 'total'), comp: sumar(filas, 'comp') } : null}
      lineas={cabecera(contribuyente, periodoTxt(r.desde, r.hasta))}
      nombreArchivo={`Movimientos por usuarios ${contribuyente.ruc} ${r.desde} a ${r.hasta}`}
      orientacion="portrait"
      hojasExtra={[{ hoja: 'Por día', filas: [['Usuario', 'Día', 'Altas', 'Modificaciones', 'Bajas'], ...porDia.map((d) => [d.usuario, fechaCorta(d.dia), d.alta, d.modificacion, d.baja])] }]}
      vacio={{ titulo: 'Sin movimientos registrados en el período', texto: NOTA_AUDITORIA }}
    />
  )
}

/* ── Auditoría de movimientos ───────────────────────────────── */

export function InfAuditoria() {
  const { auditoria, contribuyente, ejercicio } = useContable()
  const [r, setR, mal] = usePeriodo(ejercicio)
  const [usuario, setUsuario] = useState('')
  const [accion, setAccion] = useState('')
  const [coleccion, setColeccion] = useState('')
  const [busca, setBusca] = useState('')
  const usuarios = useMemo(() => [...new Set(auditoria.items.map((e) => e.usuario))].sort(), [auditoria.items])

  const filas = useMemo(() => auditoria.items
    .filter((e) => enRango(e.fecha, r.desde, r.hasta))
    .filter((e) => (!usuario || e.usuario === usuario) && (!accion || e.accion === accion) && (!coleccion || e.coleccion === coleccion))
    .filter((e) => contiene(`${e.ref} ${(e.cambios || []).map((c) => `${c.campo} ${c.antes} ${c.despues}`).join(' ')}`, busca))
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .map((e) => ({
      id: e.id,
      cuando: fechaHora(e.fecha),
      usuario: e.usuario,
      accion: ACCIONES[e.accion] || e.accion,
      registro: COLECCIONES[e.coleccion] || e.coleccion,
      ref: e.ref,
      cambios: e.accion === 'modificacion' ? (e.cambios || []).map((c) => `${c.campo}: ${c.antes || '∅'} → ${c.despues || '∅'}`).join(' · ') : '',
      _tono: e.accion === 'baja' ? '#b42318' : undefined
    })), [auditoria.items, r, usuario, accion, coleccion, busca])

  return (
    <Reporte
      titulo="Auditoría de movimientos"
      lede={`Historial de cada alta, modificación y baja: quién, cuándo, qué registro y qué campos cambió, con el valor anterior y el nuevo. ${NOTA_AUDITORIA}`}
      equation={[{ v: 'Quién' }, { op: '·' }, { v: 'Cuándo' }, { op: '·' }, { v: 'Qué' }]}
      caption="rastro de cambios"
      status={auditoria.status}
      aviso={mal ? 'La fecha desde tiene que ser anterior a la fecha hasta.' : ''}
      filtros={<>
        <RangoFechas desde={r.desde} hasta={r.hasta} onChange={setR} ejercicio={ejercicio} />
        <Selector label="Usuario" value={usuario} onChange={setUsuario} opciones={[['', 'Todos'], ...usuarios.map((u) => [u, u])]} />
        <Selector label="Acción" value={accion} onChange={setAccion} opciones={[['', 'Todas'], ...Object.entries(ACCIONES)]} />
        <Selector label="Registro" value={coleccion} onChange={setColeccion} opciones={[['', 'Todos'], ...Object.entries(COLECCIONES)]} />
        <Buscador label="Buscar" value={busca} onChange={setBusca} placeholder="Número, nombre, campo…" />
      </>}
      figuras={[
        { label: 'Movimientos', value: filas.length },
        { label: 'Altas', value: filas.filter((f) => f.accion === 'Alta').length },
        { label: 'Modificaciones', value: filas.filter((f) => f.accion === 'Modificación').length },
        { label: 'Bajas', value: filas.filter((f) => f.accion === 'Baja').length, tone: filas.some((f) => f.accion === 'Baja') ? 'err' : 'ok' }
      ]}
      cols={[
        { k: 'cuando', t: 'Fecha y hora', w: 1.2, mono: true },
        { k: 'usuario', t: 'Usuario', w: 1.8 },
        { k: 'accion', t: 'Acción', w: 1 },
        { k: 'registro', t: 'Registro', w: 1 },
        { k: 'ref', t: 'Descripción', w: 2.6, ancho: true },
        { k: 'cambios', t: 'Cambios', w: 3.4, ancho: true }
      ]}
      filas={filas}
      total={null}
      lineas={cabecera(contribuyente, periodoTxt(r.desde, r.hasta))}
      nombreArchivo={`Auditoría ${contribuyente.ruc} ${r.desde} a ${r.hasta}`}
      vacio={{ titulo: 'Sin movimientos registrados', texto: NOTA_AUDITORIA }}
    />
  )
}

/* ── Informe RG 55/2020 ─────────────────────────────────────── */

export function InfRG55({ lado }) {
  const { comprobantes, contribuyente, ejercicio } = useContable()
  const ventas = lado === 'venta'
  const [r, setR, mal] = usePeriodo(ejercicio)

  const filas = useMemo(() => comprobantes.items
    .filter((d) => TIPOS_FISCALES.includes(d.tipo) && TIPOS[d.tipo].lado === lado && !d.anulado && enRango(d.fecha, r.desde, r.hasta))
    .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '') || (a.numero || '').localeCompare(b.numero || ''))
    .map((d, i) => {
      const t = TIPOS[d.tipo]
      const x = totalesDe(d)
      const s = t.signo
      const [base, dv] = String(d.personaRuc || '').split('-')
      return {
        id: d.id,
        n: i + 1,
        fecha: fechaCorta(d.fecha),
        tipo: t.label,
        timbrado: d.timbrado || '',
        numero: d.numero,
        ruc: base || '',
        dv: dv || '',
        nombre: d.personaNombre,
        g10: s * x.g10,
        g5: s * x.g5,
        ex: s * x.ex,
        total: s * x.total,
        cond: d.condicion === 'credito' ? 'Crédito' : 'Contado'
      }
    }), [comprobantes.items, lado, r])
  const titulo = ventas ? 'RG 55/2020 · Libro Ventas e Ingresos' : 'RG 55/2020 · Libro Compras y Egresos'

  return (
    <Reporte
      titulo={titulo}
      lede={`Registro de ${ventas ? 'ventas e ingresos' : 'compras y egresos'} para el Impuesto a la Renta en forma electrónica, sin rubricar, como prevé la RG 55/2020 (modelo referencial publicado por la SET, hoy DNIT). Bajalo en Excel para cargarlo o en PDF para archivarlo. Revisá el modelo vigente de la DNIT antes de presentar.`}
      equation={[{ v: 'Total' }, { op: '=' }, { v: 'G', sub: '10' }, { op: '+' }, { v: 'G', sub: '5' }, { op: '+' }, { v: 'Ex' }]}
      caption="importes con IVA incluido"
      status={comprobantes.status}
      aviso={mal ? 'La fecha desde tiene que ser anterior a la fecha hasta.' : ''}
      filtros={<RangoFechas desde={r.desde} hasta={r.hasta} onChange={setR} ejercicio={ejercicio} />}
      figuras={[
        { label: 'Comprobantes', value: filas.length },
        { label: 'Gravado 10%', value: gs(sumar(filas, 'g10')) },
        { label: 'Gravado 5%', value: gs(sumar(filas, 'g5')) },
        { label: 'Total', value: gs(sumar(filas, 'total')) }
      ]}
      cols={[
        { k: 'n', t: 'Nº', w: 0.4, der: true },
        { k: 'fecha', t: 'Fecha', w: 0.9, mono: true },
        { k: 'tipo', t: 'Tipo de comprobante', w: 1.6 },
        { k: 'timbrado', t: 'Timbrado', w: 0.9, mono: true },
        { k: 'numero', t: 'Número', w: 1.3, mono: true },
        { k: 'ruc', t: 'RUC', w: 0.9, mono: true },
        { k: 'dv', t: 'DV', w: 0.3, mono: true },
        { k: 'nombre', t: ventas ? 'Cliente' : 'Proveedor', w: 2.2, ancho: true },
        { k: 'g10', t: 'Gravado 10%', w: 1.1, monto: true },
        { k: 'g5', t: 'Gravado 5%', w: 1.1, monto: true },
        { k: 'ex', t: 'Exento', w: 1, monto: true },
        { k: 'total', t: 'Total', w: 1.1, monto: true },
        { k: 'cond', t: 'Condición', w: 0.8 }
      ]}
      filas={filas}
      total={filas.length ? { nombre: 'Totales', g10: sumar(filas, 'g10'), g5: sumar(filas, 'g5'), ex: sumar(filas, 'ex'), total: sumar(filas, 'total') } : null}
      lineas={cabecera(contribuyente, periodoTxt(r.desde, r.hasta))}
      nombreArchivo={`${ventas ? 'RG55 Ventas e Ingresos' : 'RG55 Compras y Egresos'} ${contribuyente.ruc} ${r.desde} a ${r.hasta}`}
      vacio={{ titulo: 'Sin comprobantes en el período', texto: `Se cargan en Movimientos › ${ventas ? 'Ventas' : 'Compras'}.` }}
    />
  )
}
