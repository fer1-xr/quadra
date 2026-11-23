/**
 * Anexo 5 – Notas a los estados contables (RG 49/14 – DNIT), en el formato del
 * modelo del estudio. El texto es el del modelo; los importes, cuadros y
 * movimientos salen de los libros del contribuyente (ver services/balances.js).
 * Se descarga en Word (.docx armado acá mismo, sin dependencias) y en PDF (jsPDF).
 */
import jsPDF from 'jspdf'
import { gs, enLetras } from '../../services/contabilidad'
import { filasRG49, movimientoRubro, periodoDe, nivel49 } from '../../services/balances'

/* ── contenido ──────────────────────────────────────────────── */

// bloques: { t: 'p' | 'h1' | 'h2' | 'h3' | 'tabla' | 'kv' | 'espacio' | 'salto' | 'firma', ... }
const P = (text, extra = {}) => ({ t: 'p', text, ...extra })
const H1 = (text) => ({ t: 'h1', text })
const H2 = (text) => ({ t: 'h2', text })
const H3 = (text) => ({ t: 'h3', text })
const ESPACIO = { t: 'espacio' }

const capital = (s) => {
  const t = String(s || '').toLowerCase()
  return t.charAt(0).toUpperCase() + t.slice(1)
}
const num = (v) => gs(Math.round(Number(v) || 0))

/** RUC sin dígito verificador + NE + año (el número del documento del modelo) */
export const documentoAnexo5 = (ruc, anio) => `${String(ruc || '').split('-')[0].replace(/\D/g, '')}NE${anio}`

/** filas de composición (código, rubro, año, año anterior) de un subárbol del balance */
const composicion = (filas, desde, extra = []) => {
  const sub = filas.filter((f) => f.tipo === 'rubro' && (extra.includes(f.codigo) || f.codigo === desde || f.codigo.startsWith(`${desde}.`)))
  return sub.map((f) => ({ celdas: [f.codigo, f.nombre, num(f.valores[0]), num(f.valores[1])], negrita: f.negrita || nivel49(f.codigo) <= 3 }))
}

const tablaComposicion = (anios, filas) => ({
  t: 'tabla',
  cols: [{ w: 2.2 }, { w: 5.4 }, { w: 1.7, der: true }, { w: 1.7, der: true }],
  cabecera: ['', '', String(anios[0]), anios[1] ? String(anios[1]) : ''],
  filas
})

/**
 * Bloques del Anexo 5 para el ejercicio `ejercicios[0]` comparado con `ejercicios[1]`.
 * `firmantes`: { representante, contador, contadorRuc, tipoSociedad, domicilio, actividad }
 */
export const bloquesAnexo5 = ({ mapa, ejercicios, contribuyente, firmantes = {} }) => {
  const [act, ant] = ejercicios
  const anio = act.anio
  const anios = [anio, ant?.anio]
  const tot = (c, e = act) => (e?.tot.get(c) || 0)
  const per = periodoDe(anio, contribuyente)
  const razon = contribuyente.razonSocial || ''
  const ruc = contribuyente.ruc || ''
  const tipo = firmantes.tipoSociedad || ''
  const actividad = firmantes.actividad || contribuyente.actividadLabel || ''
  const contador = firmantes.contador ? `${firmantes.contador}${firmantes.contadorRuc ? ` – RUC: ${firmantes.contadorRuc}` : ''}` : ''
  const documento = documentoAnexo5(ruc, anio)
  const balance = filasRG49(mapa, ejercicios, 'balance')
  const resultados = filasRG49(mapa, ejercicios, 'resultados')
  const conValor = (c) => ejercicios.some((e) => Math.abs(e.tot.get(c) || 0) >= 0.5)

  const b = []
  // portada
  b.push(P('REPÚBLICA DEL PARAGUAY', { align: 'center', bold: true, color: '1F3864', size: 11, antes: 600 }))
  b.push(P('Dirección Nacional de Ingresos Tributarios – DNIT', { align: 'center' }))
  b.push(ESPACIO, ESPACIO)
  b.push(P(`RUC: ${ruc}`, { align: 'center' }))
  b.push(ESPACIO)
  b.push(P('NOTAS A LOS ESTADOS FINANCIEROS', { align: 'center', bold: true, color: '1F3864', size: 18 }))
  b.push(P('Anexo 5 – Resolución General N° 49/14 – DNIT', { align: 'center' }))
  b.push(ESPACIO)
  b.push(P(`Ejercicio Fiscal: ${anio} al ${per.hasta}`, { align: 'center' }))
  b.push(ESPACIO, ESPACIO)
  b.push({ t: 'kv', filas: [
    ['Razón Social:', razon], ['RUC:', ruc], ['Tipo de Sociedad:', tipo], ['Actividad Económica:', actividad],
    ['Período Fiscal:', `${per.desde} al ${per.hasta}`], ['Moneda:', 'GUARANIES'], ['Contadora/Contador:', contador], ['Documento:', documento]
  ] })
  b.push({ t: 'salto' })

  // nota 1
  b.push(H1('NOTA 1 – DATOS DE LA ENTIDAD'))
  b.push(P(`${razon} es una sociedad constituida y domiciliada en la República del Paraguay, inscripta conforme a las disposiciones del Código Civil (Ley N° 1183/85) y de la Ley N° 1034/83 (Ley del Comerciante).`, { align: 'both' }))
  b.push({ t: 'kv', filas: [
    ['Denominación social:', razon], ['RUC:', ruc], ['Naturaleza jurídica:', tipo], ['Actividad principal:', actividad],
    ['Domicilio fiscal:', firmantes.domicilio || ''], ['Moneda funcional:', 'GUARANIES'], ['Fecha de cierre:', '31/12 de cada año'], ['Contadora/Contador:', contador]
  ] })

  // nota 2
  b.push(H1('NOTA 2 – BASES DE PREPARACIÓN DE LOS ESTADOS FINANCIEROS'))
  b.push(H2('2.1. Marco normativo aplicable'))
  b.push(P('Los presentes Estados Financieros han sido preparados de conformidad con:'))
  b.push(P('a) La Resolución General N° 49/14 de la Dirección Nacional de Ingresos Tributarios (DNIT).'))
  b.push(P('b) Los principios de contabilidad generalmente aceptados en la República del Paraguay (PCGA-PY).'))
  b.push(P('c) Las normas de valuación y exposición aplicables a contribuyentes del IRE ordinario.'))
  b.push(H2('2.2. Criterios de medición'))
  b.push(P('Los presentes estados financieros han sido confeccionados de acuerdo con las normas, reglamentaciones e instrucciones contables establecidas y fueron preparados sobre la base de cifras históricas, las cuales se encuentran basadas en las Normas y en las leyes nacionales vigentes.', { align: 'both' }))
  b.push(H2('2.3. Moneda funcional y de presentación'))
  b.push(P('La moneda funcional y de presentación es el guaraníes, moneda de curso legal de la República del Paraguay.', { align: 'both' }))
  b.push(H2('2.4. Datos comparativos'))
  b.push(P(`De conformidad con el artículo 5° de la Resolución General N° 49/14, los estados financieros presentan información comparativa con el ejercicio fiscal cerrado el 31/12/${anio - 1}.`, { align: 'both' }))

  // nota 3
  b.push(H1('NOTA 3 – POLÍTICAS CONTABLES SIGNIFICATIVAS'))
  b.push(H2('3.1. Reconocimiento de ingresos'))
  b.push(P('La Sociedad aplica el principio de lo devengado para el reconocimiento de ingresos e imputación de egresos o costos incurridos.', { align: 'both' }))
  b.push(H2('3.2. Valuación de inventarios'))
  b.push(P(conValor('01.01.04')
    ? 'Los inventarios se valúan al costo de adquisición, conforme a la normativa fiscal vigente.'
    : 'La sociedad no cuenta con Inventario propio ya que no se dedica al rubro comercial.', { align: 'both' }))
  b.push(H2('3.3. Propiedad, Planta y Equipo – Depreciación'))
  b.push(P('Los bienes del activo fijo se contabilizan al costo de adquisición o construcción. La depreciación se calcula por el método de línea recta conforme a las tasas establecidas por la normativa fiscal.', { align: 'both' }))
  b.push(H2('3.4. Impuesto a la Renta Empresarial (IRE)'))
  b.push(P('El IRE se determina conforme a la Ley N° 6380/19 y el Decreto N° 3182/19, con alícuota del 10% sobre la renta neta imponible.', { align: 'both' }))
  b.push(H2('3.5. Diferencias de cambio'))
  b.push(P('Las diferencias de cambio que se produjeron entre el valor histórico de registración y los valores revaluados fueron reconocidas como ingresos y/o gastos en el período en que incurrieron.', { align: 'both' }))

  // nota 4: composición de las cuentas del balance
  b.push(H1('NOTA 4 – COMPOSICIÓN DE CUENTAS DEL BALANCE GENERAL (COMPARATIVO)'))
  let n4 = 0
  let primeroCorriente = true
  let primeroNoCorriente = true
  balance.filter((f) => f.tipo === 'rubro' && nivel49(f.codigo) === 3 && f.codigo.startsWith('01') && f.valores.some((v) => Math.abs(v) >= 0.5)).forEach((f) => {
    const extra = []
    if (f.codigo.startsWith('01.01') && primeroCorriente) { extra.push('01', '01.01'); primeroCorriente = false }
    if (f.codigo.startsWith('01.02') && primeroNoCorriente) { extra.push('01.02'); primeroNoCorriente = false }
    b.push(H2(`4.${++n4}. ${capital(f.nombre)}`))
    b.push(P('EN GUARANIES', { align: 'right', size: 8 }))
    b.push(tablaComposicion(anios, composicion(balance, f.codigo, extra)))
  })
  if (conValor('02')) {
    b.push(H2(`4.${++n4}. Pasivo`))
    b.push(P('EN GUARANIES', { align: 'right', size: 8 }))
    b.push(tablaComposicion(anios, composicion(balance, '02')))
  }
  b.push(H2(`4.${++n4}. Patrimonio Neto`))
  b.push(P('EN GUARANIES', { align: 'right', size: 8 }))
  b.push(tablaComposicion(anios, composicion(balance, '03')))

  // nota 5: composición de las cuentas de resultados
  b.push(H1('NOTA 5 – COMPOSICIÓN DE CUENTAS DE RESULTADOS (COMPARATIVO)'))
  let n5 = 0
  resultados.filter((f) => f.tipo === 'rubro' && f.nivel === 1 && !f.calculado && f.valores.some((v) => Math.abs(v) >= 0.5)).forEach((f) => {
    b.push(H2(`5.${++n5}. ${capital(f.nombre)}`))
    b.push(P('EN GUARANIES', { align: 'right', size: 8 }))
    b.push(tablaComposicion(anios, composicion(resultados, f.codigo)))
  })
  b.push(H2(`5.${++n5}. Resultado del ejercicio`))
  b.push(P('EN GUARANIES', { align: 'right', size: 8 }))
  b.push(tablaComposicion(anios, resultados.filter((f) => f.tipo === 'rubro' && f.calculado).map((f) => ({ celdas: [f.codigo, f.nombre, num(f.valores[0]), num(f.valores[1])], negrita: f.codigo === '20' }))))

  // notas 6 y 7
  b.push(H1('NOTA 6 – CONTINGENCIAS'))
  b.push(P('Entre la fecha de cierre de ejercicio y la fecha de emisión de estos estados financieros, no existen situaciones contingentes, ni reclamos que pudieran resultar en la generación de obligaciones para la Sociedad adicionales a las que se presentan en estos estados contables.', { align: 'both' }))
  b.push(H1('NOTA 7 – HECHOS POSTERIORES AL CIERRE'))
  b.push(P(`Entre la fecha de cierre de ejercicio y la fecha de emisión de estos estados financieros, no han ocurrido hechos significativos de carácter financiero o de otra índole que afecten la situación patrimonial o los resultados de la Empresa al 31 de diciembre de ${anio}.`, { align: 'both' }))

  // nota 8: base contable y base fiscal
  const antesIre = tot('18')
  const gnd = tot('15.03')
  const rni = antesIre + gnd
  b.push(H1('NOTA 8 – DIFERENCIAS ENTRE LA BASE CONTABLE Y LA BASE FISCAL (IRE)'))
  b.push(P('A continuación se expone la conciliación entre el resultado contable del ejercicio y la renta neta imponible determinada conforme a la Ley N° 6380/19 y el Decreto N° 3182/19:', { align: 'both' }))
  b.push(H2('8.1. Determinación de la Renta Neta Imponible'))
  b.push({ t: 'tabla', cols: [{ w: 7 }, { w: 2.6, der: true }], cabecera: ['Concepto', 'Importe Gs.'], filas: [
    { celdas: ['Resultado contable antes del Impuesto a la Renta', num(antesIre)] },
    { celdas: ['(+) Gastos no deducibles', num(gnd)] },
    { celdas: [rni >= 0 ? 'Renta neta imponible' : 'Pérdida fiscal del ejercicio', num(rni)], negrita: true },
    { celdas: ['Impuesto a la Renta Empresarial (10%)', num(Math.max(0, Math.round(rni * 0.1)))] },
    { celdas: ['Impuesto a la Renta registrado en el ejercicio', num(tot('19'))] }
  ] })

  // nota 9
  const cf = tot('01.01.03.05.03')
  const df = tot('02.01.03.01.02')
  b.push(H1('NOTA 9 – OTRAS NOTAS RELEVANTES'))
  b.push(H2('9.1. Impuesto al Valor Agregado (IVA)'))
  const iva = ['La empresa es contribuyente del IVA conforme a la Ley N° 6380/19.']
  if (Math.round(cf)) iva.push(`Al cierre del ejercicio se registra IVA Crédito Fiscal a favor Gs ${num(cf)} (${capital(enLetras(cf))}).`)
  if (Math.round(df)) iva.push(`Al cierre del ejercicio se registra IVA a pagar Gs ${num(df)} (${capital(enLetras(df))}).`)
  if (!Math.round(cf) && !Math.round(df)) iva.push('Al cierre del ejercicio no se registran saldos de IVA.')
  b.push(P(iva.join(' '), { align: 'both' }))

  const resEj = tot('20')
  const acum = movimientoRubro(mapa, act, '03.03.01')
  const reservaLegal = movimientoRubro(mapa, act, '03.02.01')
  const revaluo = movimientoRubro(mapa, act, '03.02.02')
  const otras = movimientoRubro(mapa, act, '03.02.03')
  const capitalMov = movimientoRubro(mapa, act, '03.01')
  const dividendos = movimientoRubro(mapa, act, '02.01.03.03').aumentos
  const distribuible = Math.max(0, resEj + acum.final)

  b.push(H3('9.2. INFORMACIÓN SOBRE UTILIDADES, RESERVAS Y RESULTADOS DISTRIBUIBLES'))
  b.push(P('Resolución General DNIT N° 49 del 24 de marzo de 2026'))
  b.push(H3('9.2.1. Marco normativo'))
  b.push(P(`En cumplimiento de la Resolución General DNIT N° 49, dictada con fecha 24 de marzo de 2026 y aplicable a los Estados Financieros cerrados a partir del 31 de diciembre de 2025, la empresa ${razon} expone en la presente nota la información exigida sobre la composición y destino de las utilidades, reservas y resultados acumulados, en el marco de la Obligación 948 ante la Dirección Nacional de Ingresos Tributarios (DNIT).`, { align: 'both' }))
  b.push(P('Dicha resolución fue dictada en virtud de las facultades conferidas a la DNIT por la Ley N° 7143/2023, con sustento en la Ley N° 125/1991, la Ley N° 6380/2019 y el Decreto N° 3110/2019. Su objeto es optimizar los mecanismos de control fiscal y permitir a la DNIT conciliar el patrimonio declarado con la realidad económica operativa del contribuyente.', { align: 'both' }))

  b.push(H3('9.2.2. Conciliación de utilidades acumuladas (Art. 2°, inciso 1)'))
  b.push(P('De conformidad con el artículo 2°, inciso 1° de la Resolución General DNIT N° 49/2026, se expone la conciliación de utilidades acumuladas:', { align: 'both' }))
  b.push({ t: 'tabla', cols: [{ w: 7 }, { w: 2.6, der: true }], cabecera: ['Concepto', 'Importe Gs.'], filas: [
    { celdas: [`a) Resultado del ejercicio ${anio}`, num(resEj)] },
    { celdas: ['b) Resultados acumulados de ejercicios anteriores', num(acum.inicial)] },
    { celdas: ['(+) Aumentos del ejercicio', num(acum.aumentos)] },
    { celdas: ['(-) Transferencia a Reserva Legal', num(reservaLegal.aumentos)] },
    { celdas: ['(-) Utilidades distribuidas (dividendos)', num(dividendos)] },
    { celdas: ['(-) Otras disminuciones del ejercicio', num(Math.max(0, acum.disminuciones - reservaLegal.aumentos - dividendos))] },
    { celdas: ['Saldo de resultados acumulados al cierre', num(acum.final)] },
    { celdas: ['SALDO TOTAL DE RESULTADOS (Cta. 03.03)', num(tot('03.03'))], negrita: true }
  ] })

  b.push(H3('9.2.3. Utilidades susceptibles de distribución (Art. 2°, inciso 2)'))
  b.push(P(`De conformidad con el artículo 2°, inciso 2° de la Resolución General DNIT N° 49/2026, se identifican las utilidades susceptibles de distribución al ${per.hasta}:`, { align: 'both' }))
  b.push({ t: 'tabla', cols: [{ w: 7 }, { w: 2.6, der: true }], cabecera: ['Concepto', 'Importe Gs.'], filas: [
    { celdas: [`a) Utilidades del ejercicio ${anio}`, num(resEj)] },
    { celdas: ['b) Utilidades acumuladas de ejercicios anteriores', num(acum.final)] },
    { celdas: ['TOTAL UTILIDADES SUSCEPTIBLES DE DISTRIBUCIÓN', num(distribuible)], negrita: true }
  ] })
  b.push(P('Las utilidades susceptibles de distribución corresponden al resultado operativo según el giro del negocio. La distribución de estas utilidades, en caso de resolverse por el órgano societario competente, generará el hecho imponible del Impuesto a los Dividendos y Utilidades (IDU) conforme al artículo 40 de la Ley N° 6380/2019.', { align: 'both' }))

  b.push(H3('9.2.4. Distribución o destino de utilidades del ejercicio (Art. 2°, inciso 3)'))
  b.push(P('De conformidad con el artículo 2°, inciso 3° de la Resolución General DNIT N° 49/2026, se informa el destino de las utilidades del ejercicio según los registros contables:', { align: 'both' }))
  const aReservas = reservaLegal.aumentos + revaluo.aumentos + otras.aumentos
  const destinado = dividendos + capitalMov.aumentos + aReservas
  b.push({ t: 'tabla', cols: [{ w: 7 }, { w: 2.6, der: true }], cabecera: ['Concepto', 'Importe Gs.'], filas: [
    { celdas: ['a) Dividendos o utilidades a distribuir a socios', num(dividendos)] },
    { celdas: ['b) Utilidades capitalizadas', num(capitalMov.aumentos)] },
    { celdas: ['c) Utilidades destinadas a reservas', num(aReservas)] },
    { celdas: ['d) Utilidades pendientes de distribución', num(Math.max(0, resEj - destinado))] },
    { celdas: ['TOTAL', num(destinado + Math.max(0, resEj - destinado))], negrita: true }
  ] })

  b.push(H3('9.2.5. Composición y movimiento de reservas (Arts. 3° y 4°)'))
  b.push(P('De conformidad con los artículos 3° y 4° de la Resolución General DNIT N° 49/2026, se detalla la composición de las reservas, su movimiento durante el ejercicio, el objeto de cada una, su origen y la posibilidad de distribución futura:', { align: 'both' }))
  const movReserva = (m) => ({ t: 'tabla', cols: [{ w: 5 }, { w: 2.6, der: true }, { w: 2 }], cabecera: ['Movimiento', 'Gs.', 'Referencia'], filas: [
    { celdas: [`Saldo inicial (${per.desde})`, num(m.inicial), '-'] },
    { celdas: ['(+) Incrementos del ejercicio', num(m.aumentos), '-'] },
    { celdas: ['(-) Disminuciones del ejercicio', num(m.disminuciones), '-'] },
    { celdas: [`Saldo final (${per.hasta})`, num(m.final), '-'], negrita: true }
  ] })
  b.push(H3('A. RESERVA LEGAL'))
  b.push(movReserva(reservaLegal))
  b.push({ t: 'kv', filas: [
    ['Objeto de la reserva:', 'Salvaguardar el capital social y absorber eventuales pérdidas acumuladas, de acuerdo con el Art. 91 de la Ley N° 1034/83.'],
    ['Origen de las utilidades:', 'Operaciones comerciales'], ['Ejercicio/s de generación:', `${anio} - ${anio - 1}`],
    ['Cuenta contable:', 'Reserva Legal'], ['Posibilidad de distribución futura:', '-']
  ] })
  b.push(H3('B. RESERVA DE REVALÚO FISCAL'))
  b.push(movReserva(revaluo))
  b.push({ t: 'kv', filas: [
    ['Objeto de la reserva:', 'Reflejar el valor actualizado de los bienes de uso (activos fijos) de la empresa'],
    ['Cuenta contable:', 'Reserva de Revalúo Fiscal'], ['Órgano que aprobó constitución:', 'Acta de Asamblea'], ['Posibilidad de distribución futura:', '-']
  ] })
  b.push(H3('C. OTRAS RESERVAS (si aplica)'))
  b.push(movReserva(otras))

  b.push(H3(`9.2.6. Resumen del Patrimonio Neto – clasificación bajo Resolución DNIT N° 49/2026`))
  const capitalSus = tot('03.01')
  const reservas = tot('03.02')
  b.push({ t: 'tabla', cols: [{ w: 5.6 }, { w: 2.4, der: true }, { w: 1.6 }], cabecera: ['Componente del Patrimonio Neto', per.hasta, 'Distribuible IDU'], filas: [
    { celdas: ['CAPITAL', '', ''], negrita: true },
    { celdas: ['Capital integrado', num(tot('03.01.01')), 'NO'] },
    { celdas: ['Subtotal Capital', num(capitalSus), ''], negrita: true },
    { celdas: ['RESERVAS', '', ''], negrita: true },
    { celdas: ['Reserva legal', num(tot('03.02.01')), 'NO'] },
    { celdas: ['Reserva de revalúo fiscal', num(tot('03.02.02.01')), 'NO (*)'] },
    { celdas: ['Reserva de revalúo técnico', num(tot('03.02.02.02')), 'NO'] },
    { celdas: ['Otras reservas', num(tot('03.02.03')), 'NO'] },
    { celdas: ['Subtotal Reservas', num(reservas), ''], negrita: true },
    { celdas: ['RESULTADOS', '', ''], negrita: true },
    { celdas: ['Resultado del ejercicio', num(tot('03.03.02')), resEj > 0 ? 'SÍ' : 'NO'] },
    { celdas: ['Resultados acumulados', num(tot('03.03.01')), acum.final > 0 ? 'SÍ' : 'NO'] },
    { celdas: ['TOTAL PATRIMONIO NETO', num(tot('03')), ''], negrita: true },
    { celdas: ['TOTAL SUSCEPTIBLE DE DISTRIBUCIÓN (IDU)', num(distribuible), distribuible > 0 ? 'SÍ' : 'NO'], negrita: true }
  ] })
  b.push(P('(*) La Reserva de Revalúo Fiscal no es distribuible en tanto mantenga su naturaleza de ajuste de valuación de activos.', { size: 8 }))

  b.push(H2('9.3. Declaración de cumplimiento normativo'))
  b.push(P('Los presentes estados financieros, incluyendo las presentes Notas (Anexo 5), han sido preparados en cumplimiento estricto de las disposiciones de la Resolución General N° 49/14 de la DNIT, la Resolución General DNIT N° 49 del 24 de marzo de 2026, la Ley N° 6380/19, el Decreto N° 3182/19 y demás normas contables y tributarias aplicables en la República del Paraguay.', { align: 'both' }))
  b.push(ESPACIO, ESPACIO, ESPACIO)
  b.push({ t: 'firma', lineas: [firmantes.representante || '', 'REPRESENTANTE LEGAL', razon] })

  return {
    bloques: b,
    encabezado: `${razon} | RUC: ${ruc}   Notas a los Estados Financieros – Ejercicio ${anio}`,
    pie: `Res. Gral. N° 49/14 – DNIT | Documento: ${documento}`,
    documento
  }
}

/* ── Word (.docx) ───────────────────────────────────────────── */

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

const CRC = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
const crc32 = (u8) => {
  let c = 0xFFFFFFFF
  for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xFF] ^ (c >>> 8)
  return (c ^ 0xFFFFFFFF) >>> 0
}

/** ZIP sin compresión (suficiente y válido para un .docx) */
export const zipSimple = (archivos, tipo) => {
  const enc = new TextEncoder()
  const partes = []
  const central = []
  let offset = 0
  archivos.forEach(({ nombre, datos }) => {
    const nom = enc.encode(nombre)
    const d = typeof datos === 'string' ? enc.encode(datos) : datos
    const crc = crc32(d)
    const loc = new DataView(new ArrayBuffer(30))
    loc.setUint32(0, 0x04034b50, true)
    loc.setUint16(4, 20, true)
    loc.setUint16(6, 0x0800, true)
    loc.setUint16(12, 0x21, true)
    loc.setUint32(14, crc, true)
    loc.setUint32(18, d.length, true)
    loc.setUint32(22, d.length, true)
    loc.setUint16(26, nom.length, true)
    partes.push(new Uint8Array(loc.buffer), nom, d)
    const cen = new DataView(new ArrayBuffer(46))
    cen.setUint32(0, 0x02014b50, true)
    cen.setUint16(4, 20, true)
    cen.setUint16(6, 20, true)
    cen.setUint16(8, 0x0800, true)
    cen.setUint16(14, 0x21, true)
    cen.setUint32(16, crc, true)
    cen.setUint32(20, d.length, true)
    cen.setUint32(24, d.length, true)
    cen.setUint16(28, nom.length, true)
    cen.setUint32(42, offset, true)
    central.push(new Uint8Array(cen.buffer), nom)
    offset += 30 + nom.length + d.length
  })
  const tam = central.reduce((s, p) => s + p.length, 0)
  const fin = new DataView(new ArrayBuffer(22))
  fin.setUint32(0, 0x06054b50, true)
  fin.setUint16(8, archivos.length, true)
  fin.setUint16(10, archivos.length, true)
  fin.setUint32(12, tam, true)
  fin.setUint32(16, offset, true)
  return new Blob([...partes, ...central, new Uint8Array(fin.buffer)], { type: tipo })
}

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const W_NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'
const ANCHO_UTIL = 9638 // A4 con márgenes de 2 cm, en twips

const run = (text, { bold, color, size } = {}) =>
  `<w:r><w:rPr>${bold ? '<w:b/><w:bCs/>' : ''}${color ? `<w:color w:val="${color}"/>` : ''}${size ? `<w:sz w:val="${size * 2}"/><w:szCs w:val="${size * 2}"/>` : ''}</w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r>`

const parrafo = (text, { align, bold, color, size, estilo, antes = 40, despues = 80 } = {}) =>
  `<w:p><w:pPr>${estilo ? `<w:pStyle w:val="${estilo}"/>` : `<w:spacing w:before="${antes}" w:after="${despues}"/>`}${align ? `<w:jc w:val="${align}"/>` : ''}</w:pPr>${text ? run(text, { bold, color, size }) : ''}</w:p>`

const BORDE_TABLA = '<w:top w:val="single" w:sz="4" w:space="0" w:color="AAAAAA"/><w:left w:val="single" w:sz="4" w:space="0" w:color="AAAAAA"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="AAAAAA"/><w:right w:val="single" w:sz="4" w:space="0" w:color="AAAAAA"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="AAAAAA"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="AAAAAA"/>'

const tablaXml = ({ cols, filas, cabecera }) => {
  const suma = cols.reduce((s, c) => s + c.w, 0)
  const anchos = cols.map((c) => Math.round((c.w / suma) * ANCHO_UTIL))
  const celda = (txt, i, { negrita, fondo } = {}) => `<w:tc><w:tcPr><w:tcW w:w="${anchos[i]}" w:type="dxa"/>${fondo ? `<w:shd w:val="clear" w:color="auto" w:fill="${fondo}"/>` : ''}<w:tcMar><w:top w:w="40" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar><w:vAlign w:val="center"/></w:tcPr>${parrafo(txt, { align: cols[i].der ? 'right' : undefined, bold: negrita, size: 9, antes: 0, despues: 0 })}</w:tc>`
  const fila = (celdas, estilo) => `<w:tr>${celdas.map((t, i) => celda(t, i, estilo)).join('')}</w:tr>`
  return `<w:tbl><w:tblPr><w:tblW w:w="${ANCHO_UTIL}" w:type="dxa"/><w:tblBorders>${BORDE_TABLA}</w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${anchos.map((a) => `<w:gridCol w:w="${a}"/>`).join('')}</w:tblGrid>${cabecera ? fila(cabecera, { negrita: true, fondo: 'F2F2F2' }) : ''}${filas.map((f) => fila(f.celdas, { negrita: f.negrita })).join('')}</w:tbl>${parrafo('', { antes: 0, despues: 60 })}`
}

const kvXml = ({ filas }) => {
  const anchos = [3000, ANCHO_UTIL - 3000]
  const celda = (txt, i) => `<w:tc><w:tcPr><w:tcW w:w="${anchos[i]}" w:type="dxa"/>${i === 0 ? '<w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>' : ''}<w:tcMar><w:top w:w="80" w:type="dxa"/><w:left w:w="140" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:right w:w="140" w:type="dxa"/></w:tcMar><w:vAlign w:val="center"/></w:tcPr>${parrafo(txt, { bold: i === 0, size: 9, antes: 40, despues: 40 })}</w:tc>`
  return `<w:tbl><w:tblPr><w:tblW w:w="${ANCHO_UTIL}" w:type="dxa"/><w:tblBorders>${BORDE_TABLA}</w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${anchos.map((a) => `<w:gridCol w:w="${a}"/>`).join('')}</w:tblGrid>${filas.map(([k, v]) => `<w:tr>${celda(k, 0)}${celda(v, 1)}</w:tr>`).join('')}</w:tbl>${parrafo('', { antes: 0, despues: 60 })}`
}

const bloqueXml = (x) => {
  switch (x.t) {
    case 'h1': return parrafo(x.text, { estilo: 'Titulo1' })
    case 'h2': return parrafo(x.text, { estilo: 'Titulo2' })
    case 'h3': return parrafo(x.text, { bold: true, antes: 160, despues: 80 })
    case 'p': return parrafo(x.text, { align: x.align, bold: x.bold, color: x.color, size: x.size, antes: x.antes })
    case 'espacio': return parrafo('')
    case 'salto': return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'
    case 'tabla': return tablaXml(x)
    case 'kv': return kvXml(x)
    case 'firma': return `<w:p><w:pPr><w:spacing w:before="600" w:after="0"/><w:jc w:val="center"/></w:pPr>${run('______________________________________')}</w:p>${x.lineas.map((l, i) => parrafo(l, { align: 'center', bold: i === 0, antes: 0, despues: 0 })).join('')}`
    default: return ''
  }
}

const ESTILOS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles ${W_NS}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:eastAsia="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:color w:val="1A1A1A"/><w:sz w:val="20"/><w:szCs w:val="20"/><w:lang w:val="es-PY"/></w:rPr></w:rPrDefault><w:pPrDefault/></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
<w:style w:type="paragraph" w:styleId="Titulo1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="320" w:after="160"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:bCs/><w:color w:val="1F3864"/><w:sz w:val="30"/><w:szCs w:val="30"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Titulo2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="220" w:after="100"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:bCs/><w:color w:val="2E5FAC"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:style>
</w:styles>`

const gris = (t) => `<w:r><w:rPr><w:color w:val="AAAAAA"/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr><w:t xml:space="preserve">${esc(t)}</w:t></w:r>`

const descargarBlob = (blob, nombre) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** arma el .docx del Anexo 5 (devuelve un Blob) */
export const docxAnexo5 = ({ bloques, encabezado, pie }) => {
  const cuerpo = bloques.map(bloqueXml).join('')
  const documento = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document ${W_NS}><w:body>${cuerpo}<w:sectPr><w:headerReference w:type="default" r:id="rIdHeader"/><w:footerReference w:type="default" r:id="rIdFooter"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`
  const header = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr ${W_NS}><w:p><w:pPr><w:jc w:val="right"/></w:pPr>${gris(encabezado)}</w:p></w:hdr>`
  const footer = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr ${W_NS}><w:p><w:pPr><w:jc w:val="center"/></w:pPr>${gris('Página ')}<w:r><w:rPr><w:color w:val="AAAAAA"/><w:sz w:val="16"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:rPr><w:color w:val="AAAAAA"/><w:sz w:val="16"/></w:rPr><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:rPr><w:color w:val="AAAAAA"/><w:sz w:val="16"/></w:rPr><w:fldChar w:fldCharType="separate"/></w:r>${gris('1')}<w:r><w:rPr><w:color w:val="AAAAAA"/><w:sz w:val="16"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r>${gris(`  |  ${pie}`)}</w:p></w:ftr>`
  return zipSimple([
    { nombre: '[Content_Types].xml', datos: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>' },
    { nombre: '_rels/.rels', datos: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>' },
    { nombre: 'word/_rels/document.xml.rels', datos: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdHeader" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/><Relationship Id="rIdFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>' },
    { nombre: 'word/document.xml', datos: documento },
    { nombre: 'word/styles.xml', datos: ESTILOS },
    { nombre: 'word/header1.xml', datos: header },
    { nombre: 'word/footer1.xml', datos: footer }
  ], DOCX_MIME)
}

export const descargarWordAnexo5 = (anexo) => descargarBlob(docxAnexo5(anexo), `${anexo.documento}.docx`)

/* ── PDF ────────────────────────────────────────────────────── */

const MM = { margen: 20, ancho: 210, alto: 297 }
const hex = (c) => `#${c || '1A1A1A'}`

/** arma el PDF del Anexo 5 (devuelve el jsPDF) con el mismo contenido que el Word */
export const pdfAnexo5 = ({ bloques, encabezado, pie }) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const util = MM.ancho - MM.margen * 2
  let y = MM.margen
  const nueva = () => { doc.addPage(); y = MM.margen }
  const asegurar = (h) => { if (y + h > MM.alto - 18) nueva() }
  const texto = (t, { size = 10, bold = false, color, align = 'left', antes = 1.2, despues = 2 } = {}) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    doc.setTextColor(hex(color))
    const lineas = doc.splitTextToSize(String(t || ''), util)
    const alto = size * 0.42
    y += antes
    lineas.forEach((l, i) => {
      asegurar(alto)
      if (align === 'both' && i < lineas.length - 1) doc.text(l, MM.margen, y + alto * 0.8, { maxWidth: util, align: 'justify' })
      else if (align === 'center') doc.text(l, MM.ancho / 2, y + alto * 0.8, { align: 'center' })
      else if (align === 'right') doc.text(l, MM.ancho - MM.margen, y + alto * 0.8, { align: 'right' })
      else doc.text(l, MM.margen, y + alto * 0.8)
      y += alto
    })
    y += despues
  }
  const tabla = ({ cols, filas, cabecera }, kv) => {
    const suma = cols.reduce((s, c) => s + c.w, 0)
    const ws = cols.map((c) => (c.w / suma) * util)
    const fila = (celdas, { negrita, fondo }) => {
      doc.setFontSize(8)
      const partes = celdas.map((t, i) => {
        doc.setFont('helvetica', negrita || (kv && i === 0) ? 'bold' : 'normal')
        return doc.splitTextToSize(String(t ?? ''), ws[i] - 3)
      })
      const h = Math.max(...partes.map((p) => p.length)) * 3.5 + 2.4
      asegurar(h)
      let x = MM.margen
      partes.forEach((p, i) => {
        if (fondo || (kv && i === 0)) { doc.setFillColor('#F2F2F2'); doc.rect(x, y, ws[i], h, 'F') }
        doc.setDrawColor('#AAAAAA')
        doc.setLineWidth(0.15)
        doc.rect(x, y, ws[i], h)
        doc.setFont('helvetica', negrita || (kv && i === 0) ? 'bold' : 'normal')
        doc.setTextColor('#1A1A1A')
        p.forEach((l, k) => {
          if (cols[i].der) doc.text(l, x + ws[i] - 1.5, y + 3.9 + k * 3.5, { align: 'right' })
          else doc.text(l, x + 1.5, y + 3.9 + k * 3.5)
        })
        x += ws[i]
      })
      y += h
    }
    if (cabecera) fila(cabecera, { negrita: true, fondo: true })
    filas.forEach((f) => fila(f.celdas || f, { negrita: f.negrita }))
    y += 3
  }
  bloques.forEach((x) => {
    switch (x.t) {
      case 'h1': asegurar(16); texto(x.text, { size: 14, bold: true, color: '1F3864', antes: 5, despues: 3 }); break
      case 'h2': asegurar(14); texto(x.text, { size: 11.5, bold: true, color: '2E5FAC', antes: 3.5, despues: 1.5 }); break
      case 'h3': asegurar(12); texto(x.text, { size: 10, bold: true, antes: 2.5, despues: 1.5 }); break
      case 'p': texto(x.text, { size: x.size || 10, bold: x.bold, color: x.color, align: x.align, antes: x.antes ? x.antes / 56.7 : 0.6 }); break
      case 'espacio': y += 4; break
      case 'salto': nueva(); break
      case 'tabla': tabla(x); break
      case 'kv': tabla({ cols: [{ w: 3 }, { w: 6.6 }], filas: x.filas }, true); break
      case 'firma':
        asegurar(30)
        y += 14
        doc.setDrawColor('#1A1A1A')
        doc.line(MM.ancho / 2 - 40, y, MM.ancho / 2 + 40, y)
        y += 2
        x.lineas.forEach((l, i) => texto(l, { size: 10, bold: i === 0, align: 'center', antes: 0, despues: 0.5 }))
        break
      default:
    }
  })
  const paginas = doc.getNumberOfPages()
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor('#AAAAAA')
    doc.text(encabezado, MM.ancho - MM.margen, 10, { align: 'right' })
    doc.text(`Página ${i}  |  ${pie}`, MM.ancho / 2, MM.alto - 9, { align: 'center' })
  }
  return doc
}

export const descargarPdfAnexo5 = (anexo) => pdfAnexo5(anexo).save(`${anexo.documento}.pdf`)
