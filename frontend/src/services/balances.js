/**
 * QUADRA · Balances en el formato de la RG 49/2014 (DNIT)
 *
 * Toma el Diario de cada ejercicio (compras, ventas, recibos, retenciones,
 * asientos manuales, depreciaciones…) y ubica cada cuenta del plan de Quadra
 * debajo del rubro de la RG 49/14 que le corresponde. De ahí salen:
 *  - el Balance de Sumas y Saldos (modelo «Balance Impositivo»),
 *  - el Balance General y Estado de Resultados comparativos (Anexos 1 y 2),
 *  - los mismos estados a 5 años o más,
 *  - los números de las Notas a los estados contables (Anexo 5).
 * No se carga ningún importe a mano: todo sale de los libros.
 */
import { CATALOGO_RG49 } from './catalogoRG49'
import { armarDiario, armarMayor, compararCodigos, lineasDe } from './contabilidad'

/* ── catálogo ───────────────────────────────────────────────── */

const RUBROS = new Map(CATALOGO_RG49.map(([codigo, nombre, negrita]) => [codigo, { codigo, nombre, negrita: !!negrita, generado: false }]))
export const nivel49 = (codigo) => String(codigo).split('.').length
export const padre49 = (codigo) => String(codigo).split('.').slice(0, -1).join('.')
const prefijos = (codigo) => String(codigo).split('.').map((_, i, p) => p.slice(0, i + 1).join('.'))

/** rubros del Estado de Resultados que son subtotales (no llevan cuentas), en orden de cálculo */
const ORDEN_SUBTOTALES = [
  ['06', [['+', '04'], ['-', '05']]],
  ['09', [['+', '06'], ['+', '07'], ['+', '08']]],
  ['12', [['+', '09'], ['-', '10'], ['-', '11']]],
  ['16', [['+', '12'], ['-', '13'], ['-', '14'], ['-', '15']]],
  ['18', [['+', '16'], ['+', '17']]],
  ['20', [['+', '18'], ['-', '19']]]
]
export const SUBTOTALES = Object.fromEntries(ORDEN_SUBTOTALES)
const RAICES_BALANCE = ['01', '02', '03']
export const RAICES_RESULTADOS = ['04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20']

/** naturaleza del rubro: deudora (activo, costos y gastos) o acreedora (pasivo, patrimonio, ingresos) */
export const deudora49 = (codigo) => !['02', '03', '04', '07', '08', '17'].includes(String(codigo).slice(0, 2))

/* ── de la cuenta de Quadra al rubro de la RG 49/14 ─────────── */

// cuenta base de Quadra → rubro. Con 'h' la cuenta va con su propio nombre
// debajo del rubro (como CAJA GUARANÍES debajo de CAJA en el modelo).
const MAPA = {
  '1.1.01.01': ['01.01.01.02', 'h'],
  '1.1.01.02': ['01.01.01.03'],
  '1.1.01.03': ['01.01.01.04', 'h'],
  '1.1.01.04': ['01.01.01.04', 'h'],
  '1.1.02.01': ['01.01.02.01'],
  '1.1.03.01': ['01.01.03.01'],
  '1.1.03.02': ['01.01.03.01'],
  '1.1.03.03': ['01.01.03.99'],
  '1.1.04.01': ['01.01.03.05.03.01'],
  '1.1.04.02': ['01.01.03.05.03.02'],
  '1.1.04.03': ['01.01.03.05.02'],
  '1.1.04.04': ['01.01.03.05.01'],
  '1.1.04.05': ['01.01.03.06.01'],
  '1.1.04.06': ['01.01.03.03'],
  '1.1.05.01': ['01.01.04.01'],
  '1.1.05.02': ['01.01.04.05'],
  '1.1.05.03': ['01.01.04.11'],
  '1.1.06.01': ['01.01.05.02'],
  '1.1.06.02': ['01.01.05.01'],
  '1.2.01.01': ['01.02.01.01'],
  '1.2.02.01': ['01.02.03.01'],
  '1.2.03.01': ['01.02.04.01', 'h'],
  '1.2.03.02': ['01.02.04.01', 'h'],
  '1.2.03.03': ['01.02.04.02'],
  '1.2.03.04': ['01.02.04.04'],
  '1.2.03.05': ['01.02.04.03'],
  '1.2.03.06': ['01.02.04.05'],
  '1.2.03.07': ['01.02.04.06'],
  '1.2.03.08': ['01.02.04.99'],
  '1.2.04.01': ['01.02.07.01'],
  '1.2.04.02': ['01.02.07.01'],
  '1.2.04.03': ['01.02.07.99'],
  '2.1.01.01': ['02.01.01.01'],
  '2.1.01.02': ['02.01.01.02'],
  '2.1.01.03': ['02.01.01.04'],
  '2.1.02.01': ['02.01.02.01'],
  '2.1.02.02': ['02.01.02.04'],
  '2.1.02.03': ['02.01.02.05'],
  '2.1.03.01': ['02.01.03.01.02.01'],
  '2.1.03.02': ['02.01.03.01.02.02'],
  '2.1.03.03': ['02.01.03.01.02'],
  '2.1.03.04': ['02.01.03.01.03'],
  '2.1.03.05': ['02.01.03.01.01'],
  '2.1.03.06': ['02.01.03.06'],
  '2.1.03.07': ['02.01.03.02'],
  '2.1.03.08': ['02.01.05.01'],
  '2.1.04.01': ['02.01.03.05'],
  '2.1.04.02': ['02.01.04.03'],
  '2.2.01.01': ['02.02.02.01'],
  '3.1.01.01': ['03.01.01.01'],
  '3.1.01.02': ['03.01.01.03'],
  '3.2.01.01': ['03.02.01'],
  '3.2.01.02': ['03.02.02.01'],
  '3.2.01.03': ['03.02.03'],
  '3.3.01.01': ['03.03.01'],
  '3.3.01.02': ['03.03.02'],
  '4.1.01.01': ['04.01.01.01'],
  '4.1.01.02': ['04.01.01.02'],
  '4.1.01.03': ['04.01.02'],
  '4.1.01.04': ['04.09'],
  '4.1.01.05': ['04.99'],
  '4.2.01.01': ['08.01'],
  '4.2.01.02': ['08.05'],
  '4.2.01.03': ['17.01'],
  '4.2.01.04': ['08', 'h'],
  '5.1.01.01': ['05.01'],
  '5.1.01.02': ['05.01'],
  '5.1.01.03': ['05.01'],
  '5.2.01.01': ['10.04'],
  '5.2.01.02': ['10.02'],
  '5.2.01.03': ['10.05'],
  '5.3.01.01': ['11.01.01'],
  '5.3.01.02': ['11.01.02'],
  '5.3.01.03': ['11.01.05'],
  '5.3.01.04': ['11.04'],
  '5.3.01.05': ['11.05'],
  '5.3.01.06': ['11.06'],
  '5.3.01.07': ['11.11'],
  '5.3.01.08': ['11.08'],
  '5.3.01.09': ['11.09'],
  '5.3.01.10': ['11.10'],
  '5.3.01.11': ['15.01'],
  '5.3.01.12': ['11.17'],
  '5.3.01.13': ['11', 'h'],
  '5.4.01.01': ['13.01'],
  '5.4.01.02': ['13.03'],
  '5.4.01.03': ['13.04'],
  '5.5.01.01': ['19']
}

// cuentas propias del contribuyente: van debajo del rubro de su grupo
const RUBRO_DE_GRUPO = {
  '1.1.01': '01.01.01', '1.1.02': '01.01.02', '1.1.03': '01.01.03', '1.1.04': '01.01.03', '1.1.05': '01.01.04', '1.1.06': '01.01.05', '1.1': '01.01.06',
  '1.2.01': '01.02.01', '1.2.02': '01.02.03', '1.2.03': '01.02.04', '1.2.04': '01.02.07', '1.2': '01.02.05', 1: '01.01.06',
  '2.1.01': '02.01.01', '2.1.02': '02.01.02', '2.1.03': '02.01.03', '2.1.04': '02.01.04', '2.1': '02.01.03', '2.2.01': '02.02.02', '2.2': '02.02.03', 2: '02.01.03',
  '3.1': '03.01.01', '3.2': '03.02', '3.3': '03.03', 3: '03.02',
  '4.1': '04', '4.2': '08', 4: '08',
  '5.1': '05', '5.2': '10', '5.3': '11', '5.4': '13', '5.5': '19', 5: '11'
}

const normalizar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** rubro de una cuenta propia, por su grupo y, si ayuda, por su nombre */
const rubroPropio = (codigo, nombre) => {
  const n = normalizar(nombre)
  if (codigo.startsWith('5.') && /\(gnd\)|no deducible/.test(n)) return '15.03'
  if (codigo.startsWith('1.1.01.')) {
    if (/banco/.test(n)) return '01.01.01.04'
    if (/caja/.test(n)) return '01.01.01.02'
  }
  if (codigo.startsWith('1.2.03.') && /deprec/.test(n)) return '01.02.04'
  if (codigo.startsWith('3.2.')) {
    if (/legal/.test(n)) return '03.02.01'
    if (/revalu/.test(n)) return '03.02.02'
  }
  if (codigo.startsWith('3.3.') && /acumulad/.test(n)) return '03.03.01'
  if (codigo.startsWith('4.1.') && /servicio/.test(n)) return '04.09'
  const grupo = prefijos(codigo).reverse().find((p) => RUBRO_DE_GRUPO[p])
  return RUBRO_DE_GRUPO[grupo] || (codigo.startsWith('1') ? '01.01.06' : '11')
}

/**
 * Ubica cada cuenta imputable del plan en la RG 49/14.
 * Devuelve { destino: Map(cuenta Quadra → código RG 49), nodos: Map(código → rubro) }.
 * Los códigos de las cuentas que van con nombre propio se numeran a continuación
 * de los del rubro y no cambian de un ejercicio a otro.
 */
export const mapaRG49 = (plan, otras = []) => {
  const nodos = new Map(RUBROS)
  const destino = new Map()
  const nombres = new Map(plan.map((c) => [c.codigo, c.nombre]))
  const usados = new Map() // rubro → último número asignado
  const siguiente = (rubro) => {
    if (!usados.has(rubro)) {
      const nums = [...nodos.keys()].filter((c) => padre49(c) === rubro).map((c) => Number(c.split('.').pop())).filter((x) => x < 90)
      usados.set(rubro, nums.length ? Math.max(...nums) : 0)
    }
    const n = usados.get(rubro) + 1
    usados.set(rubro, n)
    return `${rubro}.${String(n).padStart(2, '0')}`
  }
  const cuentas = [...new Set([...plan.filter((c) => c.imputable).map((c) => c.codigo), ...otras])].sort(compararCodigos)
  cuentas.forEach((cod) => {
    const nombre = nombres.get(cod) || `Cuenta ${cod}`
    const base = MAPA[cod]
    const [rubro, modo] = base || [rubroPropio(cod, nombre), 'h']
    if (modo !== 'h') { destino.set(cod, rubro); return }
    const codigo = siguiente(rubro)
    nodos.set(codigo, { codigo, nombre: nombre.toUpperCase(), negrita: false, generado: true, cuenta: cod })
    destino.set(cod, codigo)
  })
  return { destino, nodos }
}

/* ── un ejercicio ───────────────────────────────────────────── */

const esCierre = (d) => d.tipo === 'asiento' && d.clase === 'cierre'

/**
 * Saldos de un ejercicio en la RG 49/14. El asiento de cierre no se toma
 * (el Estado de Resultados se arma con las cuentas antes de cerrarlas).
 * Devuelve { anio, mayor, diario, tot: Map(código → saldo), directo, cerrado, vacio }.
 */
export const ejercicioRG49 = (docs, mapa, anio) => {
  const delAnio = docs.filter((d) => String(d.fecha || '').startsWith(String(anio)))
  const diario = armarDiario(delAnio.filter((d) => !esCierre(d)), anio)
  const mayor = armarMayor(diario)
  const directo = new Map()
  const tot = new Map()
  const sumar = (m, c, v) => m.set(c, (m.get(c) || 0) + v)
  mayor.forEach((c) => {
    const cod = mapa.destino.get(c.cuenta)
    if (!cod) return
    sumar(directo, cod, c.saldo)
    prefijos(cod).forEach((p) => sumar(tot, p, c.saldo))
  })
  ORDEN_SUBTOTALES.forEach(([cod, partes]) => {
    tot.set(cod, partes.reduce((s, [signo, c]) => s + (signo === '+' ? 1 : -1) * (tot.get(c) || 0), 0))
  })
  // el resultado del ejercicio pasa al patrimonio neto
  const res = tot.get('20') || 0
  ;['03', '03.03', '03.03.02'].forEach((c) => sumar(tot, c, res))
  return {
    anio: Number(anio),
    diario,
    mayor,
    directo,
    tot,
    resultado: res,
    cerrado: delAnio.some(esCierre),
    vacio: !diario.length
  }
}

/** varios ejercicios con el mismo mapa (las cuentas conservan su código en todos) */
export const ejerciciosRG49 = (docs, plan, anios) => {
  // cuentas usadas que ya no están en el plan (p. ej. una cuenta propia borrada)
  const enPlan = new Set(plan.map((c) => c.codigo))
  const otras = new Set()
  docs.forEach((d) => lineasDe(d).forEach((l) => l.cuenta && !enPlan.has(l.cuenta) && otras.add(l.cuenta)))
  const mapa = mapaRG49(plan, [...otras])
  return { mapa, ejercicios: anios.map((a) => ejercicioRG49(docs, mapa, a)) }
}

/* ── filas de los anexos ────────────────────────────────────── */

const SIEMPRE = new Set(['01', '02', '03', '03.01', '03.02', '03.02.01', '03.02.03', '03.03', '03.03.01', '03.03.02', ...RAICES_RESULTADOS])
const ANTES_RESULTADOS = {
  '05': ['', 'MENOS:'], '06': [''], '07': ['', 'MÁS:'], '09': [''], '10': ['', 'MENOS:'], '11': ['', 'MENOS:'],
  '12': [''], '13': ['', 'MENOS:'], '14': [''], '15': ['', 'MENOS:'], '16': ['']
}
const sangria = (nivel) => (nivel <= 1 ? '' : ' '.repeat(2 + 3 * (nivel - 2)))
const hay = (v) => Math.abs(v || 0) >= 0.5

/**
 * Filas del Balance General ('balance') o del Estado de Resultados ('resultados')
 * para uno o más ejercicios, como en el modelo: rubros con saldo en algún
 * ejercicio, renglón en blanco antes de cada grupo y «MENOS:» / «MÁS:» en resultados.
 * Cada fila: { tipo: 'rubro' | 'blanco' | 'texto', codigo, nombre, texto, nivel,
 *              negrita, valores[], hijos[], calculado }.
 */
export const filasRG49 = (mapa, ejercicios, estado) => {
  const raices = estado === 'balance' ? RAICES_BALANCE : RAICES_RESULTADOS
  const codigos = [...mapa.nodos.keys()].filter((c) => raices.includes(c.slice(0, 2))).sort(compararCodigos)
  const valor = (c) => ejercicios.map((e) => e.tot.get(c) || 0)
  const visible = new Set()
  codigos.slice().reverse().forEach((c) => {
    if (SIEMPRE.has(c) || valor(c).some(hay) || codigos.some((h) => padre49(h) === c && visible.has(h))) visible.add(c)
  })
  const filas = []
  let previo = null
  codigos.filter((c) => visible.has(c)).forEach((c) => {
    const nodo = mapa.nodos.get(c)
    const nivel = nivel49(c)
    if (estado === 'balance') {
      const corte = c.startsWith('03') ? 2 : 3
      if (previo && nodo.negrita && nivel <= corte && padre49(c) !== previo) filas.push({ tipo: 'blanco' })
    } else if (nivel === 1) {
      ;(ANTES_RESULTADOS[c] || []).forEach((t) => filas.push(t ? { tipo: 'texto', texto: t } : { tipo: 'blanco' }))
    }
    filas.push({
      tipo: 'rubro',
      codigo: c,
      nombre: nodo.nombre,
      sangria: sangria(nivel),
      nivel,
      negrita: nodo.negrita,
      valores: valor(c),
      hijos: codigos.filter((h) => padre49(h) === c && visible.has(h)),
      calculado: !!SUBTOTALES[c]
    })
    previo = c
  })
  return filas
}

/* ── balance de sumas y saldos ──────────────────────────────── */

/**
 * Balance de Sumas y Saldos («Balance Impositivo»): una fila por rubro con
 * movimiento, sumas del Debe y del Haber, saldo según la naturaleza del rubro
 * y su pase a Inventario (activo / pasivo) o a Resultados (pérdidas / ganancias).
 * La última fila lleva el resultado del ejercicio que iguala las columnas.
 */
export const sumasYSaldos = (mapa, ej) => {
  const acum = new Map()
  ej.mayor.forEach((c) => {
    const cod = mapa.destino.get(c.cuenta)
    if (!cod) return
    const x = acum.get(cod) || { debe: 0, haber: 0 }
    x.debe += c.debe
    x.haber += c.haber
    acum.set(cod, x)
  })
  const filas = [...acum.entries()]
    .sort((a, b) => compararCodigos(a[0], b[0]))
    .map(([codigo, { debe, haber }]) => {
      const deu = deudora49(codigo)
      const saldo = deu ? debe - haber : haber - debe
      const grupo = codigo.slice(0, 2)
      const f = { codigo, nombre: mapa.nodos.get(codigo)?.nombre || codigo, debe, haber, sDebe: deu ? saldo : 0, sHaber: deu ? 0 : saldo, activo: 0, pasivo: 0, perdidas: 0, ganancias: 0 }
      if (grupo === '01') f.activo = saldo
      else if (grupo === '02' || grupo === '03') f.pasivo = saldo
      else if (deu) f.perdidas = saldo
      else f.ganancias = saldo
      return f
    })
  const res = filas.reduce((s, f) => s + f.ganancias - f.perdidas, 0)
  const cierre = { codigo: '03.03.02', nombre: 'RESULTADO DEL EJERCICIO', debe: 0, haber: 0, sDebe: 0, sHaber: 0, activo: 0, pasivo: 0, perdidas: 0, ganancias: 0, resultado: true }
  if (res >= 0) { cierre.pasivo = res; cierre.perdidas = res } else { cierre.activo = -res; cierre.ganancias = -res }
  filas.push(cierre)
  const total = ['debe', 'haber', 'sDebe', 'sHaber', 'activo', 'pasivo', 'perdidas', 'ganancias']
    .reduce((t, k) => ({ ...t, [k]: filas.reduce((s, f) => s + f[k], 0) }), {})
  return { filas, total, resultado: res }
}

/* ── movimientos del patrimonio neto (Anexo 5) ──────────────── */

/**
 * Saldo inicial (asientos de apertura), aumentos y disminuciones del ejercicio
 * y saldo final de un rubro del patrimonio neto, desde el Diario.
 */
export const movimientoRubro = (mapa, ej, rubro) => {
  const out = { inicial: 0, aumentos: 0, disminuciones: 0, final: 0 }
  ej.diario.forEach((a) => a.lineas.forEach((l) => {
    const cod = mapa.destino.get(l.cuenta)
    if (!cod || !(cod === rubro || cod.startsWith(`${rubro}.`))) return
    const neto = l.haber - l.debe // patrimonio: naturaleza acreedora
    if (a.doc.tipo === 'asiento' && a.doc.clase === 'apertura') out.inicial += neto
    else if (neto >= 0) out.aumentos += neto
    else out.disminuciones -= neto
  }))
  out.final = out.inicial + out.aumentos - out.disminuciones
  return out
}

/** fechas del ejercicio en formato dd/mm/aaaa */
export const periodoDe = (anio, contribuyente) => {
  const iso = (s) => (s ? s.split('-').reverse().join('/') : '')
  const propio = contribuyente && Number(contribuyente.ejercicio) === Number(anio)
  return {
    desde: iso(propio && contribuyente.apertura ? contribuyente.apertura : `${anio}-01-01`),
    hasta: iso(propio && contribuyente.cierre ? contribuyente.cierre : `${anio}-12-31`)
  }
}
