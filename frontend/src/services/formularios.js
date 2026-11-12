/**
 * QUADRA · Formularios de declaración jurada de la DNIT
 * Estructura de cada formulario oficial (rubros, incisos y casillas) y el
 * cálculo de las casillas a partir de los comprobantes y del Diario:
 *  - 120 IVA, versión 4 (mensual)
 *  - 515 IRP Rentas derivadas de la prestación de servicios personales, versión 1 (anual)
 *  - 516 IRP Rentas y ganancias del capital, versión 2 (anual)
 *  - 500 IRE Régimen General, versión 2 (anual)
 *  - 501 IRE Simple, versión 2 (anual)
 * Las casillas que no surgen de los datos de Quadra quedan en blanco.
 */
import { totalesDe, n0 } from './contabilidad.js'
import { impuestosActivos, saldosAl, saldosJerarquicos } from './informes.js'

/* ── catálogo ───────────────────────────────────────────────── */

export const FORMULARIOS = [
  { id: 'ct-form-120', numero: '120', nombre: 'IVA', periodo: 'mensual', para: ['iva'] },
  { id: 'ct-form-515', numero: '515', nombre: 'IRP-RSP', periodo: 'anual', para: ['irp_rsp', 'irp'] },
  { id: 'ct-form-516', numero: '516', nombre: 'IRP-RGC', periodo: 'anual', para: ['irp_rgc', 'irp'] },
  { id: 'ct-form-500', numero: '500', nombre: 'IRE General', periodo: 'anual', para: ['ire_general'] },
  { id: 'ct-form-501', numero: '501', nombre: 'IRE Simple', periodo: 'anual', para: ['ire_simple'] }
]

export const formularioDe = (id) => FORMULARIOS.find((f) => f.id === id)

/** formularios de los impuestos configurados (o de la actividad elegida); sin impuestos, todos */
export const formulariosPara = (contribuyente) => {
  const imps = impuestosActivos(contribuyente)
  if (!imps.length) return FORMULARIOS
  return FORMULARIOS.filter((f) => f.para.some((id) => imps.includes(id)))
}

/* ── estructura oficial de cada formulario ──────────────────── */
// rubro: { titulo, cols: [{ t, s }], grupo?: { t, desde, hasta }, sinInc?, filas }
// fila:  { inc, txt, c: [casilla | null por columna], total? } · { enc: 'COSTOS' } repite los títulos de columna
const I = (t, s) => ({ t, s })
const IMPORTE = [I('IMPORTE')]
const CONTRIB_FISCO = { cols: [I('CONTRIBUYENTE', '-I-'), I('FISCO', '-II-')], grupo: { t: 'MONTO A FAVOR DEL', desde: 0, hasta: 1 } }

const ESTRUCTURAS = {
  'ct-form-120': {
    titulo: ['IMPUESTO AL', 'VALOR', 'AGREGADO'], version: 'VERSIÓN 4', color: '#5b9bc7', periodo: 'mensual',
    aviso: 'PARA CONTRIBUYENTES QUE REALICEN OPERACIONES GRAVADAS Y EXONERADAS (INCLUIDAS LAS EXPORTACIONES)',
    rubros: [
      {
        titulo: 'RUBRO 1 - ENAJENACIÓN DE BIENES Y/O PRESTACIÓN DE SERVICIOS DEL PERIODO',
        cols: [I('MONTO IMPONIBLE', '-I-'), I('AL 5%', '-II-'), I('AL 10%', '-III-')], grupo: { t: 'IVA DÉBITO', desde: 1, hasta: 2 },
        filas: [
          { inc: 'a', txt: 'Enajenación de bienes y/o prestación de servicios gravados con tasa del 10%', c: [10, null, 22] },
          { inc: 'b', txt: 'Enajenación de productos agrícolas en estado natural y sus derivados del primer proceso de elaboración o industrialización gravados con tasa del 5%', c: [150, 156, null] },
          { inc: 'c', txt: 'Enajenación de otros bienes y/o prestación de servicios gravados con tasa del 5%', c: [151, 157, null] },
          { inc: 'd', txt: 'Enajenación de bienes, prestación de servicios o ingresos exonerados o no alcanzados por el Impuesto', c: [12, null, null] },
          { inc: 'e', txt: 'Exportación de productos agrícolas en estado natural y sus derivados del primer proceso de elaboración o industrialización', c: [152, null, null] },
          { inc: 'f', txt: 'Prestación de Servicios de Flete Internacional para la exportación de bienes', c: [153, null, null] },
          { inc: 'g', txt: 'Exportación de otros bienes', c: [14, null, null] },
          { inc: 'h', txt: 'Ajustes de precios, devoluciones realizadas, descuentos obtenidos y recupero de Impuestos por operaciones incobrables, declaradas a la tasa del 10%', c: [15, null, 23] },
          { inc: 'i', txt: 'Ajustes de precios, devoluciones realizadas, descuentos obtenidos y recupero de Impuestos por operaciones incobrables, declaradas a la tasa del 5%, correspondientes a la adquisición de productos agrícolas en estado natural y sus derivados del primer proceso de elaboración o industrialización', c: [154, 158, null] },
          { inc: 'j', txt: 'Ajustes de precios, devoluciones realizadas, descuentos obtenidos y recupero de Impuestos por operaciones incobrables, declaradas a la tasa del 5%, correspondientes a la adquisición de otros bienes y servicios', c: [155, 159, null] },
          { inc: 'k', txt: 'Ajustes de precios, devoluciones realizadas, descuentos obtenidos y recupero por operaciones incobrables, exonerados o no alcanzados por el Impuesto', c: [17, null, null] },
          { inc: 'l', txt: 'TOTAL (Col. I: Inc. a+b+c+d+e+f+g+h+i+j+k); (Col. II: b+c+i+j); (Col. III: Inc. a+h)', c: [18, 21, 24], total: true }
        ]
      },
      {
        titulo: 'RUBRO 2 - ENAJENACIÓN DE BIENES Y/O PRESTACIÓN DE SERVICIOS DE LOS ÚLTIMOS SEIS (6) MESES (INCLUIDO EL PERIODO QUE SE DECLARA)',
        cols: [I('MONTO ACUMULADO')],
        filas: [
          { inc: 'a', txt: 'Enajenación de bienes y/o prestación de servicios gravados en el mercado interno, con excepción de los productos agrícolas en estado natural', c: [160] },
          { inc: 'b', txt: 'Enajenación de productos agrícolas en estado natural y sus derivados del primer proceso de elaboración o industrialización en el mercado interno', c: [161] },
          { inc: 'c', txt: 'Enajenación de bienes y/o prestación de servicios exonerados o no alcanzados', c: [26] },
          { inc: 'd', txt: 'TOTAL DE OPERACIONES EN EL MERCADO INTERNO (Inc. a+b+c)', c: [27], total: true },
          { inc: 'e', txt: 'Exportación de productos agrícolas en estado natural y sus derivados del primer proceso de elaboración o industrialización', c: [162] },
          { inc: 'f', txt: 'Servicios de flete internacional prestados por empresas transportadoras para la exportación de bienes', c: [163] },
          { inc: 'g', txt: 'Exportación de otros bienes', c: [29] },
          { inc: 'h', txt: 'TOTAL DE OPERACIONES DE EXPORTACIÓN (Inc. e+f+g)', c: [30], total: true },
          { inc: 'i', txt: 'TOTAL DE OPERACIONES ACUMULADAS (Inc. d+h)', c: [31], total: true }
        ]
      },
      {
        titulo: 'RUBRO 3 - COMPRAS LOCALES E IMPORTACIONES DEL PERIODO',
        cols: [I('AL 5%', '-I-'), I('AL 10%', '-II-'), I('IVA CRÉDITO', '-III-')], grupo: { t: 'MONTO IMPONIBLE', desde: 0, hasta: 1 },
        filas: [
          { inc: 'a', txt: 'IVA Crédito atribuido directamente a operaciones gravadas en el mercado interno', c: [32, 35, 38] },
          { inc: 'b', txt: 'IVA Crédito atribuido indistintamente a operaciones gravadas, exoneradas o no alcanzadas', c: [33, 36, 39] },
          { inc: 'c', txt: 'IVA Crédito atribuido proporcionalmente a operaciones gravadas en el mercado interno. Rubro 3, Col. III: Inc. b x (Rubro 2 Inc. a+b / Inc. d)', c: [null, null, 164] },
          { inc: 'd', txt: 'IVA Crédito atribuido proporcionalmente a operaciones gravadas en el mercado interno y a exportación (Proviene de la casilla 216 de la hoja de cálculo)', c: [null, null, 165] },
          { inc: 'e', txt: 'IVA Crédito por ajustes de precios, devoluciones y descuentos otorgados, por ventas ya declaradas y operaciones declaradas incobrables', c: [34, 37, 42] },
          { inc: 'f', txt: 'TOTAL DE IVA CRÉDITO PARA OPERACIONES EN EL MERCADO INTERNO (Col. III: Inc. a+c+d+e)', c: [null, null, 43], total: true }
        ]
      },
      {
        titulo: 'RUBRO 4 - DETERMINACIÓN DEL IMPUESTO O DEL SALDO TÉCNICO', cols: [I('MONTO')],
        filas: [
          { inc: 'a', txt: 'IVA Débito (Proviene del Rubro 1, Col. II y III: Inc. l)', c: [44] },
          { inc: 'b', txt: 'IVA Crédito (Proviene del Rubro 3, Inc. f)', c: [45] },
          { inc: 'c', txt: 'Saldo a favor del contribuyente del período anterior por operaciones en el mercado interno (Proviene del Rubro 4, Inc. f; de la declaración jurada del periodo anterior)', c: [46] },
          { inc: 'd', txt: 'SALDO A FAVOR DEL CONTRIBUYENTE cuando el Inc. a sea menor que Inc. b+Inc. c', c: [166], total: true },
          { inc: 'e', txt: 'Saldo a favor del contribuyente a remitir en beneficio del Fisco (Art. 91 de la Ley). Hasta el monto del Inc. d', c: [167] },
          { inc: 'f', txt: 'SALDO A FAVOR DEL CONTRIBUYENTE (Monto a trasladar en el Inc. c del presente Rubro, en el siguiente periodo fiscal), Inc. d - Inc. e', c: [47], total: true },
          { inc: 'g', txt: 'Saldo a favor del fisco, cuando Inc. a sea mayor que Inc. b+Inc. c', c: [48] },
          { inc: 'h', txt: 'Monto del IVA Crédito utilizado en el periodo que se liquida para operaciones gravadas (Proviene de la casilla 148 del Anexo Exportador)', c: [49] },
          { inc: 'i', txt: 'Deducción conforme al Art. 7° y 8° de la Ley N° 4.962/2013 por incorporación de personas con discapacidad y en concepto de gastos y costos por adecuación del entorno físico, tecnológica, etc. y contratación de facilitadores laborales (No trasladable)', c: [168] },
          { inc: 'j', txt: 'IMPUESTO DETERMINADO (Inc. g - Inc. h - Inc. i)', c: [50], total: true }
        ]
      },
      {
        titulo: 'RUBRO 5 - IMPUESTO DETERMINADO Y/O SALDO FINANCIERO A FAVOR DEL CONTRIBUYENTE', ...CONTRIB_FISCO,
        filas: [
          { inc: 'a', txt: 'Impuesto determinado para operaciones gravadas (Proviene del Rubro 4, Inc. j)', c: [null, 55] },
          { inc: 'b', txt: 'Saldo a favor del contribuyente del período anterior (Proviene del Rubro 5, Col. I: Inc. g, de la declaración jurada del periodo anterior)', c: [51, null] },
          { inc: 'c', txt: 'Retenciones computables por operaciones gravadas', c: [52, null] },
          { inc: 'd', txt: 'Percepciones computables por operaciones gravadas', c: [169, null] },
          { inc: 'e', txt: 'Multa por presentar la Declaración Jurada con posterioridad al vencimiento', c: [null, 56] },
          { inc: 'f', txt: 'SUBTOTALES: (Col. I: Inc. b+c+d); (Col. II: Inc. a+e)', c: [53, 57], total: true },
          { inc: 'g', txt: 'SALDO A FAVOR DEL CONTRIBUYENTE (Monto a trasladar al siguiente periodo fiscal en el Inc. b del presente Rubro). Diferencia entre Col. I y II: Inc. f, cuando Col. I sea mayor que Col. II. No trasladable al Rubro 4', c: [54, null], total: true },
          { inc: 'h', txt: 'SALDO A PAGAR A FAVOR DEL FISCO (Diferencia entre Col. I y II: Inc. f, cuando Col. II sea mayor que Col. I)', c: [null, 58], total: true }
        ]
      },
      {
        titulo: 'RUBRO 6 - INFORMACIÓN DE LAS COMPRAS DEL PERIODO, VINCULADAS A OPERACIONES EXONERADAS O NO ALCANZADAS POR EL IMPUESTO',
        cols: [I('MONTO', '-I-'), I('IVA', '-II-')],
        filas: [
          { inc: 'a', txt: 'Compras con IVA Crédito del 10% relacionadas directamente a operaciones exoneradas o no alcanzadas por el Impuesto', c: [59, 65] },
          { inc: 'b', txt: 'Compras con IVA Crédito del 5% relacionadas directamente a operaciones exoneradas o no alcanzadas por el Impuesto', c: [60, 66] },
          { inc: 'c', txt: 'Compras exentas relacionadas a operaciones exoneradas, no alcanzadas y a exportaciones', c: [61, null] },
          { inc: 'd', txt: 'Compras exentas relacionadas a operaciones exoneradas o no alcanzadas por el Impuesto', c: [62, null] },
          { inc: 'e', txt: 'Ajustes de precios, descuentos otorgados y/o devoluciones recibidas, por enajenación de bienes o prestación de servicios exonerados o no alcanzados por el Impuesto', c: [63, null] },
          { inc: 'f', txt: 'Impuesto al Valor Agregado - Costo o Gasto deducible en el IRE o IRP', c: [64, null] },
          { inc: 'g', txt: 'Impuesto al Valor Agregado - Costo o Gasto por remisión del saldo IVA Crédito al fisco, no deducible en el IRE o IRP', c: [170, null] }
        ]
      }
    ]
  },

  'ct-form-515': {
    titulo: ['IMPUESTO A LA', 'RENTA PERSONAL', '', 'RENTAS DERIVADAS', 'DE LA PRESTACIÓN', 'DE SERVICIOS', 'PERSONALES'], version: 'VERSIÓN 1', color: '#d4ae2c', periodo: 'anual',
    rubros: [
      {
        titulo: 'RUBRO 1 - INGRESOS OBTENIDOS POR LA PRESTACIÓN DE SERVICIOS PERSONALES', cols: [I('EXONERADOS', '-I-'), I('GRAVADOS', '-II-')],
        filas: [
          { inc: 'a', txt: 'Ingresos del ejercicio fiscal por la prestación de servicios personales, conforme a lo señalado en el Art. 62 de la Ley N° 6.380/2019', c: [10, 12] },
          { inc: 'b', txt: 'Ingresos del ejercicio fiscal en carácter de padres, tutores o curadores por las rentas que obtengan los hijos bajo su patria potestad o las personas bajo su tutela o curatela, conforme al Art. 4° del Anexo del Decreto N° 3.184/2019', c: [11, 13] },
          { inc: 'c', txt: 'TOTAL INGRESOS BRUTOS GRAVADOS PERCIBIDOS EN EL EJERCICIO FISCAL', c: [null, 14], total: true }
        ]
      },
      {
        titulo: 'RUBRO 2 - EGRESOS DEDUCIBLES DEL EJERCICIO FISCAL', cols: IMPORTE,
        filas: [
          { inc: 'a', txt: 'Egresos directamente relacionados con la actividad gravada', c: [15] },
          { inc: 'b', txt: 'Egresos personales y a favor de familiares a cargo realizados en el país (con excepción de los egresos señalados en los incisos "d" e "i" del presente rubro)', c: [16] },
          { inc: 'c', txt: 'Egresos personales y a favor de familiares a cargo realizados en el exterior destinados exclusivamente a la salud y a la educación', c: [17] },
          { inc: 'd', txt: 'Egreso personal por la adquisición de un autovehículo cada 3 (tres) años', c: [18] },
          { inc: 'e', txt: 'Aporte patronal a favor del trabajador realizado al Sistema de Seguridad Social creado o admitido por Ley o Decreto-Ley', c: [19] },
          { inc: 'f', txt: 'Aporte a un Sistema privado de seguridad social realizado por el prestador de servicio personal independiente', c: [20] },
          { inc: 'g', txt: 'Cuotas, aportes, diezmos y donaciones realizadas a favor del Estado y demás asociaciones (Solo se podrá consignar hasta el 5% de la renta bruta gravada del ejercicio fiscal que se liquida)', c: [21] },
          { inc: 'h', txt: 'EGRESOS DEDUCIDOS EN EL EJERCICIO FISCAL (Los resultados negativos derivados de estos egresos no pueden ser objeto de compensación ni arrastre en los siguientes ejercicios fiscales). Sumatoria de las casillas 15 al 21', c: [22], total: true },
          { inc: 'i', txt: 'EGRESO PERSONAL POR LA ADQUISICIÓN AL CONTADO DE UN INMUEBLE PARA LA VIVIENDA CADA 5 (CINCO) AÑOS (Los resultados negativos derivados de estos egresos pueden ser objeto de compensación o arrastre en los siguientes ejercicios fiscales)', c: [23], total: true },
          { inc: 'j', txt: 'TOTAL DE EGRESOS DEDUCIBLES EN EL EJERCICIO FISCAL (Suma de las casillas 22 y 23)', c: [24], total: true }
        ]
      },
      {
        titulo: 'RUBRO 3 - RESULTADO OBTENIDO LUEGO DE APLICAR LAS DEDUCCIONES ADMITIDAS PARA LA LIQUIDACIÓN DEL IMPUESTO', cols: IMPORTE,
        filas: [
          { inc: 'a', txt: 'Ingresos brutos gravados del ejercicio fiscal (El Sistema trasladará automáticamente el monto de la casilla 14 del Rubro 1)', c: [25] },
          { inc: 'b', txt: 'Menos: Egresos deducidos del ejercicio fiscal (El Sistema trasladará automáticamente el monto de la casilla 22, limitado hasta el monto de los ingresos gravados registrados en la casilla 25, conforme a lo establecido en la Ley)', c: [26] },
          { inc: 'c', txt: 'Resultado después de descontar los Egresos Deducibles (El Sistema calculará automáticamente la diferencia entre los montos de las casillas 25 y 26)', c: [27] },
          { inc: 'd', txt: 'Menos: Egreso personal por la adquisición al contado de un inmueble para la vivienda cada 5 (cinco) años. (Proviene de la casilla 23, aunque solamente hasta el monto registrado en la casilla 27)', c: [28] },
          { inc: 'e', txt: 'SUBTOTAL RENTA NETA IMPONIBLE ANTES DE CONSIDERAR EL SALDO ARRASTRABLE DE PÉRDIDAS DE EJERCICIOS ANTERIORES, SI EXISTIERE (El Sistema calculará automáticamente la diferencia entre los montos consignados en las casillas 27 y 28)', c: [29], total: true },
          { inc: 'f', txt: 'Monto total o porción de los préstamos/financiaciones obtenidos y utilizados en el ejercicio o el remanente de los ingresos gravados de los 5 (cinco) últimos ejercicios fiscales anteriores (El Sistema trasladará automáticamente el monto registrado en la casilla 102 del Anexo, solamente cuando el Total de los egresos por la adquisición al contado de un inmueble para la vivienda supera el valor registrado en la casilla 27)', c: [30] },
          { inc: 'g', txt: 'Saldo de egresos por la adquisición de un inmueble para la vivienda no arrastrable (Pérdida fiscal no arrastrable) por no reunir las condiciones señaladas en el Art. 66 de la Ley', c: [31] },
          { inc: 'h', txt: 'Pérdida Fiscal por adquisición de un inmueble, arrastrable al siguiente ejercicio fiscal', c: [32] }
        ]
      },
      {
        titulo: 'RUBRO 4 - PÉRDIDA FISCAL ARRASTRABLE POR LA ADQUISICIÓN DE UN INMUEBLE PARA LA VIVIENDA', cols: IMPORTE,
        filas: [
          { inc: 'a', txt: 'Pérdida Fiscal arrastrable por la adquisición de un inmueble para vivienda, producida en el ejercicio fiscal que se liquida (Se trasladará automáticamente el monto de la casilla 32)', c: [33] },
          { inc: 'b', txt: 'Más: Pérdida Fiscal arrastrable por la adquisición de un inmueble para la vivienda, proveniente del ejercicio fiscal anterior', c: [34] },
          { inc: 'c', txt: 'Acumulado de Pérdida Fiscal por la adquisición de inmueble (Sumatoria de los montos consignados en las casillas 33 y 34)', c: [35] },
          { inc: 'd', txt: 'Menos: Porción de Pérdida Fiscal arrastrable, que debe excluirse en el ejercicio que se liquida por haber superado los 5 (cinco) años de arrastre permitidos por la Ley', c: [36] },
          { inc: 'e', txt: 'Saldo de Pérdida Fiscal arrastrable susceptible de ser compensado en la liquidación del impuesto (Diferencia entre las casillas 35 y 36)', c: [37] },
          { inc: 'f', txt: 'Menos: Porción de Pérdida Fiscal proveniente de ejercicios fiscales anteriores, que se compensa con la renta neta del presente ejercicio consignada en la casilla 29, la cual estará limitada al 20% de dicha renta neta', c: [38] },
          { inc: 'g', txt: 'Saldo de Pérdida Fiscal arrastrable, susceptible de ser trasladado al ejercicio siguiente (Diferencia entre las casillas 37 y 38) (Monto a trasladar en el siguiente ejercicio fiscal, en la casilla 34)', c: [39], total: true }
        ]
      },
      {
        titulo: 'RUBRO 5 - DETERMINACIÓN DEL IMPUESTO Y LIQUIDACIÓN FINAL', cols: [I('CONTRIBUYENTE', '-I-'), I('FISCO', '-II-')],
        filas: [
          { inc: 'a', txt: 'RENTA NETA IMPONIBLE (Diferencia entre las casillas 29 y 38)', c: [null, 45], total: true },
          { inc: 'b', txt: 'IMPUESTO DETERMINADO A LA TASA DEL 8%. Por la porción de la Renta Neta hasta ₲ 50.000.000', c: [null, 46] },
          { inc: 'c', txt: 'IMPUESTO DETERMINADO A LA TASA DEL 9%. Por la porción de la Renta Neta desde ₲ 50.000.001 hasta ₲ 150.000.000', c: [null, 47] },
          { inc: 'd', txt: 'IMPUESTO DETERMINADO A LA TASA DEL 10%. Por la porción de la Renta Neta mayor a ₲ 150.000.000', c: [null, 48] },
          { inc: 'e', txt: 'Saldo a favor del contribuyente del ejercicio fiscal anterior (Proviene de la casilla 44 del presente Rubro de la Declaración Jurada del ejercicio fiscal anterior)', c: [40, null] },
          { inc: 'f', txt: 'RETENCIONES: Monto de las retenciones computables a favor del contribuyente', c: [41, null] },
          { inc: 'g', txt: 'PERCEPCIONES: Monto de las percepciones computables a favor del contribuyente', c: [42, null] },
          { inc: 'h', txt: 'Multa por presentar la Declaración Jurada con posterioridad al vencimiento', c: [null, 49] },
          { inc: 'i', txt: 'SUBTOTAL (Columna I: Sumatoria de las casillas 40 al 42); (Columna II: Sumatoria de las casillas 46 al 49)', c: [43, 50], total: true },
          { inc: 'j', txt: 'SALDO A FAVOR DEL CONTRIBUYENTE (Diferencia entre los montos consignados en las casillas 43 y 50, cuando la casilla 43 sea mayor)', c: [44, null], total: true },
          { inc: 'k', txt: 'SALDO A INGRESAR A FAVOR DEL FISCO (Diferencia entre los montos consignados en las casillas 50 y 43, cuando la casilla 50 sea mayor)', c: [null, 51], total: true }
        ]
      }
    ]
  },

  'ct-form-516': {
    titulo: ['IMPUESTO A LA', 'RENTA PERSONAL', '', 'RENTAS Y', 'GANANCIAS DEL', 'CAPITAL'], version: 'VERSIÓN 2', color: '#d4ae2c', periodo: 'anual',
    rubros: [
      {
        titulo: 'RUBRO 1 - ENAJENACIÓN DE BIENES MUEBLES, INMUEBLES, DE ACCIONES O DE CUOTAS DE CAPITAL, CESIÓN DE DERECHOS Y SIMILARES',
        cols: [I('PRECIO DE VENTA CONSIGNADO EN EL DOCUMENTO QUE RESPALDA LA OPERACIÓN (EXCLUIDO EL IVA)', '-I-'), I('PRECIO DE COMPRA MÁS LOS GASTOS DE VENTA O DEL APORTE DE CAPITAL REALIZADO', '-II-'), I('RENTA NETA REAL (Col. I - II)', '-III-'), I('RENTA NETA PRESUNTA (Col. I * 30%)', '-IV-'), I('RENTA NETA IMPONIBLE (El menor valor entre la Col. III y Col. IV)', '-V-')],
        filas: [
          { inc: 'a', txt: 'Bienes muebles (Por Renta Neta Presunta)', c: [10, 24, 38, 50, 62] },
          { inc: 'b', txt: 'Bienes muebles (Por Renta Neta Real cuando el Precio de Venta sea mayor que el Precio de Compra)', c: [11, 25, 39, 51, 63] },
          { inc: 'c', txt: 'Bienes muebles (Por Renta Neta Real cuando el Precio de Venta sea menor o igual que el Precio de Compra)', c: [12, 26, 40, 52, 64] },
          { inc: 'd', txt: 'Bienes inmuebles a plazo, cuando el cobro de las cuotas sea realizado con anterioridad a la transferencia del inmueble, siempre que la venta haya sido realizada por el propio contribuyente que no fue sujeto a retención. (Por Renta Neta Presunta)', c: [133, 136, 139, 142, 145] },
          { inc: 'e', txt: 'Bienes inmuebles a plazo, cuando el cobro de las cuotas sea realizado con anterioridad a la transferencia del inmueble, siempre que la venta haya sido realizada por el propio contribuyente que no fue sujeto a retención. (Por Renta Neta Real cuando el Precio de Venta sea mayor que el Precio de Compra)', c: [134, 137, 140, 143, 146] },
          { inc: 'f', txt: 'Bienes inmuebles a plazo, cuando el cobro de las cuotas sea realizado con anterioridad a la transferencia del inmueble, siempre que la venta haya sido realizada por el propio contribuyente que no fue sujeto a retención. (Por Renta Neta Real cuando el Precio de Venta sea menor o igual que el Precio de Compra)', c: [135, 138, 141, 144, 147] },
          { inc: 'g', txt: 'Acciones (Por Renta Neta Presunta)', c: [15, 29, 41, 53, 67] },
          { inc: 'h', txt: 'Acciones (Por Renta Neta Real cuando el Precio de Venta sea mayor que el Precio de Compra o del Aporte de capital)', c: [16, 30, 42, 54, 68] },
          { inc: 'i', txt: 'Acciones (Por Renta Neta Real cuando el Precio de Venta sea menor o igual que el Precio de Compra o del Aporte de capital)', c: [17, 31, 43, 55, 69] },
          { inc: 'j', txt: 'Cuotas de capital (Por Renta Neta Presunta)', c: [18, 32, 44, 56, 70] },
          { inc: 'k', txt: 'Cuotas de capital (Por Renta Neta Real cuando el Precio de Venta sea mayor que el Precio de Compra o del Aporte de capital)', c: [19, 33, 45, 57, 71] },
          { inc: 'l', txt: 'Cuotas de capital (Por Renta Neta Real cuando el Precio de Venta sea menor o igual al Precio de Compra o del Aporte de capital)', c: [20, 34, 46, 58, 72] },
          { inc: 'm', txt: 'Cesión de derechos y similares (Por Renta Neta Presunta)', c: [21, 35, 47, 59, 73] },
          { inc: 'n', txt: 'Cesión de derechos y similares (Por Renta Neta Real cuando el Precio de Venta sea mayor que el Precio de Compra)', c: [22, 36, 48, 60, 74] },
          { inc: 'o', txt: 'Cesión de derechos y similares (Por Renta Neta Real cuando el Precio de Venta sea menor o igual al Precio de Compra)', c: [23, 37, 49, 61, 75] },
          { inc: 'p', txt: 'TOTAL RENTA NETA IMPONIBLE: Suma de las casillas 62 al 75 más 145 al 147', c: [null, null, null, null, 76], total: true }
        ]
      },
      {
        titulo: 'RUBRO 2 - ARRENDAMIENTO Y SUBARRENDAMIENTO DE INMUEBLES',
        cols: [I('PRECIO DEL ARRENDAMIENTO (EXCLUIDO EL IVA)', '-I-'), I('GASTOS DIRECTAMENTE RELACIONADOS A LA GENERACIÓN DE LA RENTA', '-II-'), I('RENTA NETA REAL (Col. I - II)', '-III-'), I('RENTA NETA PRESUNTA (Col. I * 50%)', '-IV-'), I('RENTA NETA IMPONIBLE (El menor valor entre la Col. III y Col. IV)', '-V-')],
        filas: [
          { inc: 'a', txt: 'Arrendamiento de inmueble (Por Renta Neta Presunta)', c: [77, 83, 89, 95, 101] },
          { inc: 'b', txt: 'Arrendamiento de inmueble (Por Renta Neta Real cuando el Precio del Arrendamiento sea mayor que los Gastos)', c: [78, 84, 90, 96, 102] },
          { inc: 'c', txt: 'Arrendamiento de inmueble (Por Renta Neta Real cuando el Precio del Arrendamiento sea menor o igual que los Gastos)', c: [79, 85, 91, 97, 103] },
          { inc: 'd', txt: 'Subarrendamiento de inmueble (Por Renta Neta Presunta)', c: [80, 86, 92, 98, 104] },
          { inc: 'e', txt: 'Subarrendamiento de inmueble (Por Renta Neta Real cuando el Precio del Subarrendamiento sea mayor que los Gastos)', c: [81, 87, 93, 99, 105] },
          { inc: 'f', txt: 'Subarrendamiento de inmueble (Por Renta Neta Real cuando el Precio del Subarrendamiento sea menor o igual que los Gastos)', c: [82, 88, 94, 100, 106] },
          { inc: 'g', txt: 'TOTAL RENTA NETA IMPONIBLE: Suma de las casillas 101 al 106', c: [null, null, null, null, 107], total: true }
        ]
      },
      {
        titulo: 'RUBRO 3 - RESCATE TOTAL O PARCIAL DE ACCIONES O CUOTAS PARTES DE ENTIDADES RESIDENTES O CONSTITUIDAS EN EL PAÍS, QUE NO SE ENCUENTRE ALCANZADO POR EL IDU',
        cols: [I('IMPORTE DEL RESCATE', '-I-'), I('COSTO DE LAS ACCIONES O CUOTAS', '-II-'), I('RENTA NETA IMPONIBLE (Col. I - II)', '-III-')],
        filas: [
          { inc: 'a', txt: 'Rescate total o parcial de acciones (Cuando el Importe del rescate sea mayor que el Costo de las acciones)', c: [108, 112, 116] },
          { inc: 'b', txt: 'Rescate total o parcial de acciones (Cuando el Importe del rescate sea menor o igual que el Costo de las acciones)', c: [109, 113, 117] },
          { inc: 'c', txt: 'Rescate total o parcial de cuotas partes (Cuando el Importe del rescate sea mayor que el Costo de las cuotas)', c: [110, 114, 118] },
          { inc: 'd', txt: 'Rescate total o parcial de cuotas partes (Cuando el Importe del rescate sea menor o igual que el Costo de las cuotas)', c: [111, 115, 119] },
          { inc: 'e', txt: 'TOTAL RENTA NETA IMPONIBLE: Suma de las casillas 116 al 119', c: [null, null, 120], total: true }
        ]
      },
      {
        titulo: 'RUBRO 4 - OTRAS RENTAS Y GANANCIAS DEL CAPITAL DEL EJERCICIO FISCAL, QUE NO FUERON OBJETO DE RETENCIÓN', cols: [I('RENTA NETA IMPONIBLE', '-I-')],
        filas: [
          { inc: 'a', txt: 'Regalías, cuando exista aprovechamiento parcial en el país y en el exterior (Consignar el 70% del monto percibido en concepto de regalía)', c: [122] },
          { inc: 'b', txt: 'Incorporación de dinero sin contraprestación', c: [124] },
          { inc: 'c', txt: 'Indemnizaciones en dinero, provenientes de contratos de seguro de vida, prestaciones vitalicias y temporarias', c: [126] },
          { inc: 'd', txt: 'Otros conceptos no señalados en los incisos anteriores', c: [127] },
          { inc: 'e', txt: 'TOTAL RENTA NETA IMPONIBLE: Suma de las casillas 122 + 124 + 126 + 127', c: [128], total: true }
        ]
      },
      {
        titulo: 'RUBRO 5 - DETERMINACIÓN DEL IMPUESTO Y LIQUIDACIÓN FINAL', cols: IMPORTE,
        filas: [
          { inc: 'a', txt: 'Total Renta Neta Imponible del ejercicio fiscal (Suma de las casillas 76, 107, 120 y 128)', c: [129] },
          { inc: 'b', txt: 'Impuesto liquidado sobre el Total Renta Neta Imponible del Ejercicio. (Se aplica la tasa del impuesto del 8% sobre el monto de la casilla 129, de acuerdo a lo establecido en la Ley)', c: [130] },
          { inc: 'c', txt: 'Multa por presentar la Declaración Jurada con posterioridad al vencimiento', c: [131] },
          { inc: 'd', txt: 'SALDO A INGRESAR A FAVOR DEL FISCO: Suma de las casillas 130 y 131', c: [132], total: true }
        ]
      }
    ]
  },

  'ct-form-500': {
    titulo: ['IMPUESTO A LA', 'RENTA', 'EMPRESARIAL', 'GENERAL'], version: 'VERSIÓN 2', color: '#2a9d9a', periodo: 'anual',
    aviso: 'RÉGIMEN GENERAL PARA EMPRESAS O ENTIDADES QUE REALICEN OPERACIONES GRAVADAS Y/O EXONERADAS POR EL IMPUESTO A LA RENTA EMPRESARIAL (IRE)',
    rubros: [
      {
        titulo: 'RUBRO 1 - ESTADO DE RESULTADOS', sinInc: true, cols: [I('IMPORTE', '-I-'), I('TOTAL', '-II-')],
        filas: [
          { enc: 'INGRESOS POR' },
          { txt: 'Enajenación de bienes provenientes de la actividad comercial (compra-venta)', c: [10, null] },
          { txt: 'Prestación de servicios, incluido el arrendamiento, uso o cesión de uso de bienes, derechos en general, incluidos los de imagen o similares', c: [11, null] },
          { txt: 'Enajenación de bienes provenientes de la producción industrial (fabricación propia, incluido el ensamblaje de bienes)', c: [12, null] },
          { txt: 'Enajenación de bienes provenientes de la producción agrícola, frutícola y hortícola', c: [13, null] },
          { txt: 'Enajenación de bienes provenientes de la producción animal (lana, cuero, leche cruda, entre otros) o pecuaria (vacuna, equina, porcina, ovina, caprina, bufalina, entre otros)', c: [14, null] },
          { txt: 'Enajenación de bienes provenientes de la actividad forestal, minera, pesquera y otras de naturaleza extractiva', c: [15, null] },
          { txt: 'Intereses, comisiones, rendimientos o ganancias de capital provenientes de títulos y de valores mobiliarios; así como los provenientes de financiaciones o préstamos efectuados a personas o entidades residentes o constituidas en el país', c: [16, null] },
          { txt: 'Operaciones con instrumentos financieros derivados en el país', c: [17, null] },
          { txt: 'Otros Ingresos en el país no comprendidos en los incisos anteriores', c: [18, null] },
          { txt: 'Intereses, comisiones, rendimientos o ganancias de capital depositados en entidades bancarias o financieras públicas o privadas en el exterior; así como los provenientes de financiaciones o préstamos realizados a favor de personas o entidades del exterior', c: [19, null] },
          { txt: 'Colocación de capitales (dividendos, utilidades o rendimientos que se obtengan en carácter de dueño de la sucursal en el exterior, socio o accionista de sociedades del exterior)', c: [20, null] },
          { txt: 'Operaciones con instrumentos financieros derivados del exterior', c: [21, null] },
          { txt: 'Otros Ingresos del exterior no comprendidos en los incisos anteriores', c: [22, null] },
          { txt: 'Diferencia de cambio', c: [23, null] },
          { txt: 'TOTAL DE INGRESOS BRUTOS (Sumatoria de las casillas 10 al 23)', c: [null, 77], total: true },
          { txt: 'Menos: Devoluciones, bonificaciones, descuentos otorgados u otros conceptos similares', c: [24, null] },
          { txt: 'A- TOTAL DE INGRESOS NETOS (Diferencia entre las casillas 77 y 24)', c: [null, 78], total: true },
          { txt: 'Menos: Ingresos por operaciones de exportación a terceros países realizadas por usuarios de Zonas Francas', c: [25, null] },
          { txt: 'Menos: Ingresos por operaciones de exportación a terceros países por el Régimen de Maquila', c: [26, null] },
          { txt: 'Menos: Ingresos de fuente extranjera no gravados', c: [27, null] },
          { txt: 'Menos: Ingresos obtenidos en operaciones internacionales alcanzadas por el Régimen Presunto', c: [28, null] },
          { txt: 'Menos: Ingresos obtenidos de actividades de forestación y enajenación de inmuebles urbanos y rurales alcanzados por el Régimen Presunto', c: [29, null] },
          { txt: 'Menos: Ingresos obtenidos de actividades de comercialización de productos establecidos en el Régimen Especial', c: [30, null] },
          { txt: 'Menos: Ingresos no gravados por el IRE, exentos y exonerados', c: [31, null] },
          { txt: 'B- TOTAL DE INGRESOS NETOS GRAVADOS (Diferencia entre la casilla 78 y el resultado de la sumatoria de las casillas 25 al 31)', c: [null, 79], total: true },
          { enc: 'COSTOS' },
          { txt: 'C- TOTAL DE COSTOS', c: [null, 80], total: true },
          { txt: 'Menos: Costos relacionados a los ingresos por operaciones realizadas por usuarios de Zonas Francas', c: [32, null] },
          { txt: 'Menos: Costos relacionados a los ingresos por operaciones realizadas en el Régimen de Maquila', c: [33, null] },
          { txt: 'Menos: Costos relacionados a ingresos de fuente extranjera no gravados', c: [34, null] },
          { txt: 'Menos: Costos relacionados a ingresos gravados obtenidos en operaciones internacionales alcanzadas por el Régimen Presunto', c: [35, null] },
          { txt: 'Menos: Costos relacionados a ingresos gravados obtenidos de actividades de forestación o enajenación de inmuebles urbanos y rurales alcanzados por el Régimen Presunto', c: [36, null] },
          { txt: 'Menos: Costos relacionados a ingresos gravados obtenidos de actividades de comercialización de productos establecidos en el Régimen Especial', c: [37, null] },
          { txt: 'Menos: Costos relacionados a ingresos no gravados por el IRE, exentos y exonerados', c: [38, null] },
          { txt: 'Menos: Otros costos no deducibles del IRE', c: [39, null] },
          { txt: 'D- TOTAL DE COSTOS DEDUCIBLES (Diferencia entre la casilla 80 y el resultado de la sumatoria de las casillas 32 al 39)', c: [null, 81], total: true },
          { txt: 'E- RENTA BRUTA (Diferencia entre las casillas 79 y 81)', c: [null, 82], total: true },
          { enc: 'GASTOS' },
          { txt: 'Remuneraciones o contribuciones pagadas al personal, por servicios prestados en relación de dependencia', c: [40, null] },
          { txt: 'Aguinaldos', c: [41, null] },
          { txt: 'Cargas sociales - Aporte patronal', c: [42, null] },
          { txt: 'Beneficios otorgados a los trabajadores en relación de dependencia, conforme al art. 93 de la Constitución Nacional', c: [43, null] },
          { txt: 'Remuneraciones por servicios personales cuando no sean prestados en relación de dependencia, incluidas las remuneraciones del dueño de una empresa unipersonal, socio o accionista', c: [44, null] },
          { txt: 'Remuneraciones porcentuales de las utilidades líquidas por servicios de carácter personal, que no se encuentran en relación de dependencia y pagadas en dinero', c: [45, null] },
          { txt: 'Arrendamiento, cesión de uso de bienes y derechos', c: [46, null] },
          { txt: 'Fletes y gastos de comercialización', c: [47, null] },
          { txt: 'Gastos de movilidad y viático', c: [48, null] },
          { txt: 'Intereses financieros', c: [49, null] },
          { txt: 'Erogaciones incurridas por la explotación de un establecimiento agropecuario, en fincas colindantes o cercanas al mismo', c: [50, null] },
          { txt: 'Donaciones', c: [51, null] },
          { txt: 'Depreciaciones por desgaste, obsolescencia y agotamiento', c: [52, null] },
          { txt: 'Amortización de bienes intangibles', c: [53, null] },
          { txt: 'Pérdida de inventario por mortandad del ganado', c: [54, null] },
          { txt: 'Pérdidas extraordinarias y las originadas por hechos punibles cometidos por terceros', c: [55, null] },
          { txt: 'Castigo sobre malos créditos', c: [56, null] },
          { txt: 'Pérdidas por diferencia de cambio', c: [57, null] },
          { txt: 'Gastos de constitución y organización, incluidos los preoperativos y de reorganización', c: [58, null] },
          { txt: 'Reservas matemáticas y similares. Previsiones sobre malos créditos para entidades bancarias y financieras regidas por la Ley N° 861/1996', c: [59, null] },
          { txt: 'Gastos generales del negocio no señalados en los incisos anteriores', c: [60, null] },
          { txt: 'IVA Gasto/Costo', c: [61, null] },
          { txt: 'Impuesto a la Renta Empresarial', c: [62, null] },
          { txt: 'Gastos y erogaciones en el exterior relacionados a Instrumentos Financieros Derivados', c: [63, null] },
          { txt: 'Otros gastos y erogaciones en el exterior', c: [64, null] },
          { txt: 'Otros gastos (No señalados expresamente en los ítems anteriores)', c: [65, null] },
          { txt: 'F- TOTAL DE GASTOS (antes de considerar los gastos señalados en el numeral 23 del Art. 15 de la Ley)', c: [null, 83], total: true },
          { txt: 'Menos: Gastos relacionados a los ingresos por operaciones realizadas por usuarios de Zonas Francas', c: [66, null] },
          { txt: 'Menos: Gastos relacionados a los ingresos por operaciones realizadas en el Régimen de Maquila', c: [67, null] },
          { txt: 'Menos: Gastos relacionados a ingresos de fuente extranjera no gravados', c: [68, null] },
          { txt: 'Menos: Gastos relacionados a ingresos gravados obtenidos en operaciones internacionales alcanzadas por el Régimen Presunto', c: [69, null] },
          { txt: 'Menos: Gastos relacionados a ingresos gravados obtenidos de actividades de forestación o enajenación de inmuebles urbanos y rurales alcanzados por el Régimen Presunto', c: [70, null] },
          { txt: 'Menos: Gastos relacionados a ingresos gravados obtenidos de actividades de comercialización de productos establecidos en el Régimen Especial', c: [71, null] },
          { txt: 'Menos: Impuesto a la Renta Empresarial', c: [72, null] },
          { txt: 'Menos: Gastos relacionados a ingresos no gravados por el IRE, exentos y exonerados', c: [73, null] },
          { txt: 'Menos: Otros gastos no deducibles', c: [74, null] },
          { txt: 'G- TOTAL DE GASTOS DEDUCIBLES (Diferencia entre la casilla 83 y el resultado de la sumatoria de las casillas 66 al 74)', c: [null, 84], total: true },
          { txt: 'H- RENTA NETA ANTES DE LA DEDUCCIÓN DE LOS INTERESES SEÑALADOS EN EL NUMERAL 23 DEL ART. 15 DE LA LEY (Diferencia entre la casilla 82 y 84)', c: [null, 85], total: true },
          { txt: 'Total de Intereses por préstamos, regalías y asistencia técnica cuando lo realicen el socio o accionista de la empresa, la casa matriz u otras sucursales o agencias del exterior, o entre empresas vinculadas', c: [75, null] },
          { txt: 'Porción deducible del monto declarado en la casilla 75, correspondiente a Intereses por préstamos, regalías y asistencia técnica cuando lo realicen el socio o accionista de la empresa, la casa matriz u otras sucursales o agencias del exterior, o entre empresas vinculadas (No podrá superar el 30% del valor de la casilla 85)', c: [76, null] },
          { txt: 'I- RENTA NETA DESPUÉS DE LA DEDUCCIÓN DE LOS INTERESES SEÑALADOS EN EL NUMERAL 23 DEL ART. 15 DE LA LEY (Diferencia entre la casilla 85 y 76)', c: [null, 86], total: true }
        ]
      },
      {
        titulo: 'RUBRO 2 - TRANSFORMACIÓN Y VALUACIÓN DE ACTIVOS', cols: IMPORTE,
        filas: [
          { inc: 'a', txt: 'Aumento por transformación biológica de animales vivos y de plantas, incluido el procreo y la explotación forestal, así como por la valuación de Activos Biológicos', c: [87] },
          { inc: 'b', txt: 'Disminución por transformación y valuación de Activos Biológicos', c: [88] },
          { inc: 'c', txt: 'Aumento patrimonial por revaluaciones del valor de acciones, revaluaciones técnicas o extraordinarias de los bienes del activo fijo e intangibles', c: [89] },
          { inc: 'd', txt: 'Disminución patrimonial del valor de acciones y de los bienes del activo fijo e intangibles', c: [90] }
        ]
      },
      {
        titulo: 'RUBRO 3 - AJUSTES POR PRECIOS DE TRANSFERENCIA', cols: IMPORTE,
        filas: [
          { inc: 'a', txt: 'Renta Neta equivalente al monto total de ajuste por precios de transferencia determinados (Numerales 1 al 6 del Artículo 38 de la Ley N° 6380/2019)', c: [262] },
          { inc: 'b', txt: 'Renta Neta equivalente al monto total de ajuste por precios de transferencia determinados (Numeral 7 del Artículo 38 de la Ley N° 6380/2019)', c: [263] }
        ]
      },
      {
        titulo: 'RUBRO 4 - RESULTADO DEL EJERCICIO', cols: [I('PÉRDIDA', '-I-'), I('UTILIDAD', '-II-')], grupo: { t: 'IMPORTE', desde: 0, hasta: 1 },
        filas: [
          { inc: 'a', txt: 'Resultado contable del ejercicio', c: [91, 93] },
          { inc: 'b', txt: 'Resultado fiscal del ejercicio', c: [92, 94] }
        ]
      },
      {
        titulo: 'RUBRO 5 - DETERMINACIÓN DE LA RENTA NETA Y PÉRDIDA ARRASTRABLE', cols: [I('CONTRIBUYENTE', '-I-'), I('FISCO', '-II-')], grupo: { t: 'IMPORTE', desde: 0, hasta: 1 },
        filas: [
          { inc: 'a', txt: 'Resultado Fiscal del Ejercicio/Utilidad (Proviene del Rubro 4, casilla 94)', c: [null, 102] },
          { inc: 'b', txt: 'Resultado Fiscal del Ejercicio/Pérdida (Proviene del Rubro 4, casilla 92)', c: [95, null] },
          { inc: 'c', txt: 'PÉRDIDA DE EJERCICIOS ANTERIORES (El contribuyente deberá tener en cuenta que la pérdida declarada en el presente Inciso, esté dentro del plazo legal previsto en la Ley)', c: [96, null] },
          { inc: 'd', txt: 'PÉRDIDA TOTAL ACUMULADA (Sumatoria de las casillas 95 y 96)', c: [97, null] },
          { inc: 'e', txt: 'Menos: Pérdida que al cierre del presente ejercicio quedó por fuera de los 5 (cinco) años', c: [98, null] },
          { inc: 'f', txt: 'SALDO DE PÉRDIDAS COMPENSABLES AL CIERRE DEL PRESENTE EJERCICIO (Diferencia entre las casillas 97 y 98).', c: [99, null] },
          { inc: 'g', txt: 'Menos: Pérdida que se compensa en el presente ejercicio fiscal (No podrá exceder el 20 % de la Renta Neta: casilla 102)', c: [100, null] },
          { inc: 'h', txt: 'SALDO DE PÉRDIDA AL CIERRE DEL PRESENTE EJERCICIO (Diferencia entre las casillas 99 y 100). Monto a trasladar en la casilla 96 del presente rubro de la Declaración Jurada del siguiente ejercicio fiscal', c: [101, null] },
          { inc: 'i', txt: 'RENTA NETA DEL EJERCICIO (Diferencia entre las casillas 102 y 100, cuando la casilla 102 sea mayor)', c: [null, 103], total: true }
        ]
      },
      {
        titulo: 'RUBRO 6 - DETERMINACIÓN DE LA RENTA NETA PARA QUIENES CUENTEN CON RENTAS ALCANZADAS POR BENEFICIOS ESPECIALES', cols: [I('DEDUCCIONES', '-I-'), I('FISCO', '-II-')], grupo: { t: 'IMPORTE', desde: 0, hasta: 1 },
        filas: [
          { inc: 'a', txt: 'Renta Neta del Ejercicio (Proviene de la casilla 103 del Rubro 5)', c: [null, 105] },
          { inc: 'b', txt: 'Renta Neta alcanzada por beneficios especiales vigentes', c: [104, null] },
          { inc: 'c', txt: 'RENTA NETA IMPONIBLE (Diferencia entre las casillas 105 y 104, cuando la casilla 105 sea mayor)', c: [null, 106], total: true }
        ]
      },
      {
        titulo: 'RUBRO 7 - DETERMINACIÓN DE LA RENTA PRESUNTA PARA CONTRIBUYENTES QUE OPTEN LIQUIDAR EL IMPUESTO CONFORME AL ARTÍCULO 19 DE LA LEY', cols: IMPORTE,
        filas: [
          { inc: 'a', txt: 'Ingresos gravados obtenidos de actividades de forestación o enajenación de inmuebles urbanos y rurales que formen parte del activo fijo', c: [107] },
          { inc: 'b', txt: 'RENTA NETA PRESUNTA (30% de la casilla 107)', c: [108], total: true }
        ]
      },
      {
        titulo: 'RUBRO 8 - DETERMINACIÓN DEL IMPUESTO Y LIQUIDACIÓN FINAL', cols: [I('CONTRIBUYENTE', '-I-'), I('FISCO', '-II-')], grupo: { t: 'IMPORTE', desde: 0, hasta: 1 },
        filas: [
          { inc: 'a', txt: 'Impuesto determinado sobre la Renta Neta Imponible y la Renta Neta Presunta (10% sobre la sumatoria de las casillas 106 y 108)', c: [null, 116] },
          { inc: 'b', txt: 'Impuesto determinado aplicable sobre la renta neta alcanzadas por beneficios especiales (.........% sobre el monto de la casilla 104 del Rubro 6)', c: [null, 117] },
          { inc: 'c', txt: 'SUBTOTAL (Sumatoria de las casillas 116 y 117)', c: [null, 118], total: true },
          { inc: 'd', txt: 'Impuesto a la Renta pagado en el exterior aplicado al IRE, para evitar la doble imposición', c: [109, null] },
          { inc: 'e', txt: 'TOTAL IMPUESTO DETERMINADO (Casillas 118 - 109)', c: [null, 120], total: true },
          { inc: 'f', txt: 'Saldo a favor del contribuyente del ejercicio anterior (Proviene de la casilla 115 del presente Rubro de la Declaración Jurada del ejercicio fiscal anterior)', c: [110, null] },
          { inc: 'g', txt: 'Retenciones computables a favor del Contribuyente', c: [111, null] },
          { inc: 'h', txt: 'Percepciones computables a favor del Contribuyente', c: [112, null] },
          { inc: 'i', txt: 'Anticipos ingresados', c: [113, null] },
          { inc: 'j', txt: 'Multa por presentar la Declaración Jurada con posterioridad al vencimiento', c: [null, 121] },
          { inc: 'k', txt: 'SUBTOTAL (Columna I: Sumatoria de las casillas 110 al 113); (Columna II: Sumatoria de las casillas 120 y 121)', c: [114, 122], total: true },
          { inc: 'l', txt: 'SALDO A FAVOR DEL CONTRIBUYENTE (Monto a trasladar al siguiente ejercicio fiscal en la casilla 110 del presente Rubro). Diferencia entre las casillas 114 y 122, cuando la casilla 114 sea mayor', c: [115, null], total: true },
          { inc: 'm', txt: 'SALDO A INGRESAR A FAVOR DEL FISCO (Diferencia entre las casillas 122 y 114, cuando la casilla 122 sea mayor)', c: [null, 123], total: true }
        ]
      },
      {
        titulo: 'RUBRO 9 - DETERMINACIÓN DE ANTICIPOS PARA EL SIGUIENTE EJERCICIO FISCAL', cols: IMPORTE,
        filas: [
          { inc: 'a', txt: 'Impuesto liquidado del ejercicio (Proviene de la casilla 120 del Rubro 8)', c: [124] },
          { inc: 'b', txt: 'Retenciones y Percepciones computables (Proviene de la sumatoria de las casillas 111 y 112)', c: [125] },
          { inc: 'c', txt: 'Anticipos a ingresar para el siguiente ejercicio (Diferencia entre las casillas 124 y 125, cuando el monto de la casilla 124 sea mayor)', c: [126] },
          { inc: 'd', txt: 'Saldo a favor del contribuyente del ejercicio que se liquida (Proviene de la casilla 115. Consignar hasta el monto de la casilla 126)', c: [127] },
          { inc: 'e', txt: 'Cuotas de anticipos a ingresar. (Casilla 126 - casilla 127) x 25%', c: [128], total: true }
        ]
      },
      {
        titulo: 'RUBRO 10 - INFORMACIÓN COMPLEMENTARIA', cols: [I('')],
        filas: [
          { inc: 'a', txt: 'RUC o Cédula de Identidad Civil del Contador, sin incluir el dígito verificador', c: [129] },
          { inc: 'b', txt: 'RUC del Auditor o de la Empresa Auditora, sin incluir el dígito verificador', c: [130] },
          { inc: 'c', txt: 'Cantidad total de personal ocupado en relación de dependencia al cierre del ejercicio', c: [131] },
          { inc: 'd', txt: 'Número de la disposición legal que respalda el beneficio fiscal declarado en el Rubro 6, casilla 104', c: [132] },
          { inc: 'e', txt: 'Año de la disposición legal que se referencia en la casilla 132.', c: [133] }
        ]
      }
    ]
  },

  'ct-form-501': {
    titulo: ['IMPUESTO A LA', 'RENTA', 'EMPRESARIAL', 'SIMPLE'], version: 'VERSIÓN 2', color: '#2a9d9a', periodo: 'anual',
    aviso: 'RÉGIMEN SIMPLIFICADO PARA MEDIANAS EMPRESAS, UNIDADES PRODUCTIVAS CONJUNTAS (UPC) O ENTIDADES ENUNCIADAS EN LOS NUMERALES 1 Y 8 DEL ARTÍCULO 2° DE LA LEY N° 6.380/2019 CUANDO REALICEN OPERACIONES GRAVADAS Y/O EXONERADAS POR EL IMPUESTO A LA RENTA EMPRESARIAL (IRE). NO APLICABLE A IMPORTADORES Y EXPORTADORES.',
    rubros: [
      {
        titulo: 'RUBRO 1 - DETERMINACIÓN DE LA RENTA NETA REAL DEL EJERCICIO FISCAL', cols: IMPORTE,
        filas: [
          { inc: 'a', txt: 'TOTAL DE INGRESOS DEL EJERCICIO: Suma de los ingresos devengados durante el ejercicio fiscal, excluido el IVA, provenientes de las actividades comerciales, industriales, agropecuarias o de servicios, gravadas por el IRE', c: [10] },
          { inc: 'b', txt: 'TOTAL DE EGRESOS DEL EJERCICIO: Suma de los egresos del ejercicio fiscal, excluido el IVA, relacionados directamente a la actividad gravada, incluyendo la porción de los egresos indistintos atribuida proporcionalmente a actividades gravadas', c: [11] },
          { inc: 'c', txt: 'RENTA NETA REAL: Diferencia entre las casillas 10 y 11, cuando la casilla 10 sea mayor. Caso contrario, el Sistema consignará automáticamente el valor 0 (cero)', c: [12], total: true }
        ]
      },
      {
        titulo: 'RUBRO 2 - DETERMINACIÓN DE LA RENTA NETA PRESUNTA DEL EJERCICIO FISCAL', cols: IMPORTE,
        filas: [
          { inc: 'a', txt: 'FACTURACIÓN BRUTA ANUAL DEL EJERCICIO: Suma de los importes devengados durante el ejercicio, excluido el IVA, por la venta de bienes o prestación de servicios', c: [13] },
          { inc: 'b', txt: 'RENTA NETA PRESUNTA: 30% (treinta por ciento) de la casilla 13', c: [14], total: true }
        ]
      },
      {
        titulo: 'RUBRO 3 - DETERMINACIÓN DEL IMPUESTO Y LIQUIDACIÓN FINAL', ...CONTRIB_FISCO,
        filas: [
          { inc: 'a', txt: 'BASE IMPONIBLE: El Sistema trasladará automáticamente el monto que sea menor entre las casillas 12 y 14', c: [null, 21] },
          { inc: 'b', txt: 'IMPUESTO DETERMINADO: Se aplica la tasa del impuesto sobre el monto de la casilla 21', c: [null, 22] },
          { inc: 'c', txt: 'SALDO A FAVOR DEL CONTRIBUYENTE DEL EJERCICIO ANTERIOR: Saldo a favor del contribuyente del ejercicio anterior. El Sistema trasladará automáticamente el monto de la casilla 20 de la Declaración Jurada del ejercicio fiscal anterior', c: [15, null] },
          { inc: 'd', txt: 'RETENCIONES: Monto de las retenciones computables a favor del contribuyente por operaciones gravadas', c: [16, null] },
          { inc: 'e', txt: 'PERCEPCIONES: Monto de las percepciones computables a favor del contribuyente', c: [17, null] },
          { inc: 'f', txt: 'ANTICIPOS INGRESADOS: Monto de los anticipos ingresados', c: [18, null] },
          { inc: 'g', txt: 'MULTA: Por presentar la Declaración Jurada con posterioridad al vencimiento', c: [null, 23] },
          { inc: 'h', txt: 'SUBTOTALES: El Sistema consignará automáticamente en la casilla 19 de la Columna I, la suma de las casillas 15 al 18 y en la casilla 24 de la Columna II, la suma de las casillas 22 y 23', c: [19, 24], total: true },
          { inc: 'i', txt: 'SALDO A FAVOR DEL CONTRIBUYENTE: Diferencia entre las casillas 19 y 24, cuando el monto de la casilla 19 sea mayor', c: [20, null], total: true },
          { inc: 'j', txt: 'SALDO A INGRESAR A FAVOR DEL FISCO: Diferencia entre las casillas 24 y 19, cuando el monto de la casilla 24 sea mayor', c: [null, 25], total: true }
        ]
      },
      {
        titulo: 'RUBRO 4 - DETERMINACIÓN DE LOS ANTICIPOS PARA EL SIGUIENTE EJERCICIO FISCAL', cols: IMPORTE,
        filas: [
          { inc: 'a', txt: 'Impuesto liquidado en el presente ejercicio (Proviene de la casilla 22 del Rubro 3)', c: [26] },
          { inc: 'b', txt: 'Impuesto liquidado en el ejercicio anterior (Proviene de la casilla 22 del Rubro 3 de la Declaración Jurada del ejercicio fiscal anterior)', c: [74] },
          { inc: 'c', txt: 'Impuesto liquidado en el ejercicio anterior al señalado en el inciso "b" del presente rubro (Proviene de la casilla 22 del Rubro 3 de la Declaración Jurada del ejercicio fiscal anterior al señalado en el inciso "b" del presente rubro)', c: [75] },
          { inc: 'd', txt: 'Promedio del Impuesto a la Renta liquidado en los últimos tres ejercicios fiscales o impuesto liquidado en el presente ejercicio, en caso que no haya aún transcurrido tres ejercicios fiscales para el contribuyente', c: [76] },
          { inc: 'e', txt: 'Retenciones y Percepciones computables (Proviene de la sumatoria de las casillas 16 y 17)', c: [27] },
          { inc: 'f', txt: 'Anticipos a ingresar para el siguiente ejercicio (Diferencia entre las casillas 76 y 27, cuando el monto de la casilla 76 sea mayor)', c: [28] },
          { inc: 'g', txt: 'Saldo a favor del contribuyente del ejercicio que se liquida (Proviene de la casilla 20, hasta el monto de la casilla 28)', c: [29] },
          { inc: 'h', txt: 'Cuotas de anticipos a ingresar (Casilla 28 - casilla 29) x 25%', c: [30], total: true }
        ]
      },
      {
        titulo: 'RUBRO 5 - OTROS INGRESOS Y EGRESOS', cols: IMPORTE,
        filas: [
          { inc: 'a', txt: 'Total de ingresos no gravados, exentos o exonerados', c: [31] },
          { inc: 'b', txt: 'Total de egresos directamente relacionados a operaciones no gravadas, exentas y exoneradas', c: [32] },
          { inc: 'c', txt: 'Porción de egresos indistintos atribuida proporcionalmente a operaciones no gravadas, exentas o exoneradas. Para contribuyentes que realicen conjuntamente actividades gravadas, no gravadas, exentas y exoneradas', c: [33] }
        ]
      },
      {
        titulo: 'RUBRO 6 - INFORMACIÓN COMPLEMENTARIA', cols: IMPORTE,
        filas: [
          { inc: 'a', txt: 'RUC o Cédula de Identidad Civil del contador, sin incluir el dígito verificador', c: [34] },
          { inc: 'b', txt: 'Cantidad total de personal en relación de dependencia al cierre del ejercicio fiscal', c: [35] }
        ]
      }
    ]
  }
}

export const estructuraDe = (id) => ESTRUCTURAS[id]

/* ── sumas de comprobantes ──────────────────────────────────── */

const vacio = () => ({ base10: 0, iva10: 0, base5: 0, iva5: 0, ex: 0, g10: 0, g5: 0, n: 0 })

/** totales de comprobantes fiscales de los tipos `tipos` con fecha en [desde, hasta] (AAAA-MM-DD) */
const sumar = (docs, tipos, desde, hasta) => {
  const s = vacio()
  docs.forEach((d) => {
    if (!tipos.includes(d.tipo) || d.anulado) return
    const f = String(d.fecha || '')
    if (f < desde || f > hasta) return
    const x = totalesDe(d)
    s.base10 += x.base10; s.iva10 += x.iva10
    s.base5 += x.base5; s.iva5 += x.iva5
    s.ex += x.ex; s.g10 += x.g10; s.g5 += x.g5
    s.n++
  })
  return s
}

const VENTAS = ['venta', 'nd-venta']
const COMPRAS = ['compra', 'nd-compra']
const anio = (y) => [`${y}-01-01`, `${y}-12-31`]
const finDeMes = (y, m) => `${y}-${String(m).padStart(2, '0')}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`
const inicioDeMes = (y, m) => `${y}-${String(m).padStart(2, '0')}-01`

/** importe del año sin IVA si el contribuyente lo liquida; con IVA si no (para él es costo) */
const neto = (s, conIva) => (conIva ? s.base10 + s.base5 + s.ex : s.g10 + s.g5 + s.ex)

const sumaC = (v, nums) => nums.reduce((t, k) => t + n0(v[k]), 0)

/* ── 120 IVA ────────────────────────────────────────────────── */

/** casillas del 120 de un mes, sin arrastre de saldos */
const iva120Mes = (docs, y, m) => {
  const desde = inicioDeMes(y, m)
  const hasta = finDeMes(y, m)
  const v = sumar(docs, VENTAS, desde, hasta)
  const ncRec = sumar(docs, ['nc-compra'], desde, hasta)
  const c = sumar(docs, COMPRAS, desde, hasta)
  const ncEmi = sumar(docs, ['nc-venta'], desde, hasta)
  const ret = docs.filter((d) => d.tipo === 'ret-recibida' && !d.anulado && String(d.fecha || '') >= desde && String(d.fecha || '') <= hasta)
    .reduce((t, d) => t + n0(d.monto), 0)
  const x = {
    10: v.base10, 22: v.iva10, 151: v.base5, 157: v.iva5, 12: v.ex,
    // notas de crédito recibidas: devoluciones realizadas y descuentos obtenidos (reintegran débito)
    15: ncRec.base10, 23: ncRec.iva10, 155: ncRec.base5, 159: ncRec.iva5, 17: ncRec.ex,
    // compras, todas atribuidas directamente a operaciones gravadas
    32: c.base5, 35: c.base10, 38: c.iva5 + c.iva10,
    // notas de crédito emitidas: ajustes y descuentos otorgados por ventas ya declaradas
    34: ncEmi.base5, 37: ncEmi.base10, 42: ncEmi.iva5 + ncEmi.iva10,
    52: ret
  }
  x[18] = sumaC(x, [10, 150, 151, 12, 152, 153, 14, 15, 154, 155, 17])
  x[21] = sumaC(x, [156, 157, 158, 159])
  x[24] = sumaC(x, [22, 23])
  x[43] = sumaC(x, [38, 164, 165, 42])
  x[44] = x[21] + x[24]
  x[45] = x[43]
  return x
}

function form120({ docs, ejercicio, mes, saldoInicialIva }) {
  const mesN = Number(mes)
  let tecnico = n0(saldoInicialIva) // saldo técnico de diciembre del año anterior
  let financiero = 0
  let x
  for (let m = 1; m <= mesN; m++) {
    x = iva120Mes(docs, ejercicio, m)
    x[46] = tecnico
    x[166] = Math.max(x[45] + x[46] - x[44], 0)
    x[167] = 0
    x[47] = x[166] - x[167]
    x[48] = Math.max(x[44] - x[45] - x[46], 0)
    x[50] = x[48]
    x[55] = x[50]
    x[51] = financiero
    x[53] = x[51] + x[52]
    x[57] = x[55]
    x[54] = Math.max(x[53] - x[57], 0)
    x[58] = Math.max(x[57] - x[53], 0)
    tecnico = x[47]
    financiero = x[54]
  }
  // rubro 2: los seis meses hasta el que se declara
  let y0 = ejercicio
  let m0 = mesN - 5
  if (m0 < 1) { m0 += 12; y0 -= 1 }
  const v6 = sumar(docs, VENTAS, inicioDeMes(y0, m0), finDeMes(ejercicio, mesN))
  x[160] = v6.base10 + v6.base5
  x[26] = v6.ex
  x[27] = x[160] + x[26]
  x[30] = 0
  x[31] = x[27] + x[30]
  // en blanco lo que Quadra no distingue (exportaciones, productos agrícolas, prorrata…)
  return x
}

/* ── 515 IRP servicios personales ───────────────────────────── */

export const TRAMOS_IRP = [
  { casilla: 46, hasta: 50000000, tasa: 0.08 },
  { casilla: 47, hasta: 150000000, tasa: 0.09 },
  { casilla: 48, hasta: Infinity, tasa: 0.10 }
]

function form515({ docs, ejercicio, conIva }) {
  const [d, h] = anio(ejercicio)
  const ing = neto(sumar(docs, VENTAS, d, h), conIva) - neto(sumar(docs, ['nc-venta'], d, h), conIva)
  const egr = neto(sumar(docs, COMPRAS, d, h), conIva) - neto(sumar(docs, ['nc-compra'], d, h), conIva)
  const x = { 12: Math.max(ing, 0), 15: Math.max(egr, 0) }
  x[14] = x[12]
  x[22] = sumaC(x, [15, 16, 17, 18, 19, 20, 21])
  x[24] = x[22]
  x[25] = x[14]
  x[26] = Math.min(x[22], x[25])
  x[27] = x[25] - x[26]
  x[28] = 0
  x[29] = x[27] - x[28]
  x[45] = x[29]
  let desde = 0
  TRAMOS_IRP.forEach((t) => {
    const base = Math.max(Math.min(x[45], t.hasta) - desde, 0)
    x[t.casilla] = Math.round(base * t.tasa)
    desde = t.hasta
  })
  x[43] = 0
  x[50] = sumaC(x, [46, 47, 48, 49])
  x[44] = Math.max(x[43] - x[50], 0)
  x[51] = Math.max(x[50] - x[43], 0)
  return x
}

/* ── 516 IRP rentas y ganancias del capital ─────────────────── */

function form516({ docs, ejercicio, conIva }) {
  const [d, h] = anio(ejercicio)
  const venta = Math.max(neto(sumar(docs, VENTAS, d, h), conIva) - neto(sumar(docs, ['nc-venta'], d, h), conIva), 0)
  const compra = Math.max(neto(sumar(docs, COMPRAS, d, h), conIva) - neto(sumar(docs, ['nc-compra'], d, h), conIva), 0)
  const x = {}
  // enajenaciones registradas en Quadra: bienes muebles por renta neta real
  if (venta || compra) {
    const [c1, c2, c3, c4, c5] = venta > compra ? [11, 25, 39, 51, 63] : [12, 26, 40, 52, 64]
    x[c1] = venta
    x[c2] = compra
    x[c3] = Math.max(venta - compra, 0)
    x[c4] = Math.round(venta * 0.3)
    x[c5] = Math.min(x[c3], x[c4])
  }
  x[76] = sumaC(x, [62, 63, 64, 67, 68, 69, 70, 71, 72, 73, 74, 75, 145, 146, 147])
  x[107] = 0
  x[120] = 0
  x[128] = 0
  x[129] = x[76] + x[107] + x[120] + x[128]
  x[130] = Math.round(x[129] * 0.08)
  x[132] = x[130]
  return x
}

/* ── 500 IRE General ────────────────────────────────────────── */

const saldo = (tot, cod) => tot.get(cod) || 0

function form500({ docs, ejercicio }) {
  const { mayor } = saldosAl(docs, ejercicio)
  const tot = saldosJerarquicos(mayor)
  const x = {}
  // ingresos (cuentas 4, saldo acreedor positivo)
  x[10] = saldo(tot, '4.1.01.01') + saldo(tot, '4.1.01.02') + saldo(tot, '4.1.01.03')
  x[11] = saldo(tot, '4.1.01.04')
  x[16] = saldo(tot, '4.2.01.01')
  x[23] = saldo(tot, '4.2.01.02')
  const devVentas = -saldo(tot, '4.1.01.05')
  x[18] = saldo(tot, '4') + devVentas - x[10] - x[11] - x[16] - x[23]
  x[77] = sumaC(x, [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23])
  x[24] = devVentas
  x[78] = x[77] - x[24]
  x[79] = x[78] - sumaC(x, [25, 26, 27, 28, 29, 30, 31])
  // costos
  x[80] = saldo(tot, '5.1')
  x[81] = x[80] - sumaC(x, [32, 33, 34, 35, 36, 37, 38, 39])
  x[82] = x[79] - x[81]
  // gastos
  x[40] = saldo(tot, '5.3.01.01')
  x[41] = saldo(tot, '5.3.01.03')
  x[42] = saldo(tot, '5.3.01.02')
  x[44] = saldo(tot, '5.3.01.04')
  x[46] = saldo(tot, '5.3.01.05')
  x[47] = saldo(tot, '5.2')
  x[49] = saldo(tot, '5.4.01.01')
  x[52] = saldo(tot, '5.3.01.11')
  x[57] = saldo(tot, '5.4.01.03')
  x[62] = saldo(tot, '5.5')
  const gastos = saldo(tot, '5') - x[80]
  x[60] = gastos - sumaC(x, [40, 41, 42, 44, 46, 47, 49, 52, 57, 62])
  x[83] = gastos
  x[72] = x[62]
  x[84] = x[83] - sumaC(x, [66, 67, 68, 69, 70, 71, 72, 73, 74])
  x[85] = x[82] - x[84]
  x[86] = x[85]
  // resultado
  const contable = saldo(tot, '4') - saldo(tot, '5')
  if (contable < 0) x[91] = -contable; else x[93] = contable
  if (x[86] < 0) x[92] = -x[86]; else x[94] = x[86]
  x[102] = n0(x[94])
  x[95] = n0(x[92])
  x[97] = x[95]
  x[99] = x[97]
  x[100] = Math.min(x[99], Math.round(x[102] * 0.2))
  x[101] = x[99] - x[100]
  x[103] = Math.max(x[102] - x[100], 0)
  x[105] = x[103]
  x[106] = x[105]
  x[116] = Math.round((x[106] + n0(x[108])) * 0.1)
  x[118] = x[116]
  x[120] = x[118]
  x[114] = 0
  x[122] = x[120]
  x[115] = Math.max(x[114] - x[122], 0)
  x[123] = Math.max(x[122] - x[114], 0)
  x[124] = x[120]
  x[125] = 0
  x[126] = Math.max(x[124] - x[125], 0)
  x[127] = Math.min(x[115], x[126])
  x[128] = Math.round((x[126] - x[127]) * 0.25)
  // no se informan en cero los incisos sin dato
  Object.keys(x).forEach((k) => { if (x[k] === 0 && ![77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 103, 105, 106, 116, 118, 120, 122, 123, 124, 126, 128].includes(Number(k))) delete x[k] })
  return x
}

/* ── 501 IRE Simple ─────────────────────────────────────────── */

const impuesto501 = (docs, y, conIva) => {
  const [d, h] = anio(y)
  const v = sumar(docs, VENTAS, d, h)
  const ing = Math.max(neto(v, conIva) - neto(sumar(docs, ['nc-venta'], d, h), conIva), 0)
  const egr = Math.max(neto(sumar(docs, COMPRAS, d, h), conIva) - neto(sumar(docs, ['nc-compra'], d, h), conIva), 0)
  const x = { 10: ing, 11: egr }
  x[12] = Math.max(x[10] - x[11], 0)
  x[13] = x[10]
  x[14] = Math.round(x[13] * 0.3)
  x[21] = Math.min(x[12], x[14])
  x[22] = Math.round(x[21] * 0.1)
  return { x, conDatos: v.n > 0 }
}

function form501({ docs, ejercicio, conIva }) {
  const { x } = impuesto501(docs, ejercicio, conIva)
  x[19] = 0
  x[24] = x[22]
  x[20] = Math.max(x[19] - x[24], 0)
  x[25] = Math.max(x[24] - x[19], 0)
  x[26] = x[22]
  const a1 = impuesto501(docs, ejercicio - 1, conIva)
  const a2 = impuesto501(docs, ejercicio - 2, conIva)
  if (a1.conDatos) x[74] = a1.x[22]
  if (a2.conDatos) x[75] = a2.x[22]
  x[76] = a1.conDatos && a2.conDatos ? Math.round((x[22] + x[74] + x[75]) / 3) : x[22]
  x[27] = 0
  x[28] = Math.max(x[76] - x[27], 0)
  x[29] = Math.min(x[20], x[28])
  x[30] = Math.round((x[28] - x[29]) * 0.25)
  return x
}

/**
 * Casillas del formulario `id`: { [casilla]: importe }. Las que no surgen de
 * los datos no figuran (quedan en blanco).
 * datos: { docs, ejercicio, mes ('01'…'12', solo 120), conIva, saldoInicialIva }
 */
export const calcularFormulario = (id, datos) => {
  switch (id) {
    case 'ct-form-120': return form120(datos)
    case 'ct-form-515': return form515(datos)
    case 'ct-form-516': return form516(datos)
    case 'ct-form-500': return form500(datos)
    case 'ct-form-501': return form501(datos)
    default: return {}
  }
}

/** separa «APELLIDO1 APELLIDO2, NOMBRES» de una persona física; las empresas van enteras en Razón Social */
export const nombreDeclarante = (razon) => {
  const t = String(razon || '').trim()
  const coma = t.indexOf(',')
  if (coma < 0) return { primero: t, segundo: '', nombres: '' }
  const apellidos = t.slice(0, coma).trim().split(/\s+/)
  return { primero: apellidos[0] || '', segundo: apellidos.slice(1).join(' '), nombres: t.slice(coma + 1).trim() }
}

