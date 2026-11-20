import React, { useState } from 'react'
import PageHead from './PageHead'
import { Home, Car, CheckCircle2, Info, AlertTriangle, Receipt, RotateCcw, ExternalLink } from 'lucide-react'
import { MoneyInput, fmtGs } from './MathInputs'
import GuardarEnNube from './GuardarEnNube'
import '../styles/VentaActivoFijo.css'

const INICIAL = {
  tipoBien: 'inmueble',
  tipoContribuyente: 'no-contribuyente',
  esActivoEmpresa: 'no-aplica',
  estadoVehiculo: 'usado',
  monto: 0,
  ivaIncluido: true,
}

/**
 * Calculadora de venta de activo fijo: según el bien, el régimen del vendedor y
 * si el bien es activo de la empresa, dice si hay que facturar, qué parte va
 * gravada y exenta, y cuánto IVA lleva. Todo se recalcula en vivo.
 */
const VentaActivoFijo = ({ restaurar = null }) => {
  const [formData, setFormData] = useState(() => (restaurar
    ? Object.fromEntries(Object.keys(INICIAL).map((k) => [k, restaurar[k] ?? INICIAL[k]]))
    : INICIAL))

  // Base de conocimiento: Regulaciones tributarias para venta de activos fijos en Paraguay
  const regulaciones = {
    inmueble: {
      'prestador-servicios': {
        'no-aplica': {
          debe_facturar: true,
          modo_calculo: 'Factura Exenta (Sin IVA) + IRP 2.4%',
          tasa_iva: 'N/A - Exento',
          porcentaje_gravado: 0,
          porcentaje_exento: 100,
          normas: [
            'Persona física no contribuyente',
            'Factura de venta de inmuebles exenta (opcional emitir)',
            'IRP (Impuesto de Renta sobre la Ganancia): 2.4% retenido por escribano público',
            'Escritura y comprobante de retención constituyen documentación completa',
            'Base para IRP: diferencia entre precio de venta y costo de adquisición'
          ],
          decreto: 'Ley 6380/19 - Arts. 19, 30, 82 y 85. Decreto 3.184/19',
          fuente: 'https://consultoria.com.py/caceres-schneider-asesoramiento-tributario-en-la-venta-de-inmuebles/'
        },
        'si': {
          debe_facturar: true,
          modo_calculo: '30% Gravado (IVA 5%) + 70% Exento + IRP',
          tasa_iva: '5% (sobre 30%)',
          porcentaje_gravado: 30,
          porcentaje_exento: 70,
          normas: [
            'Empresa unipersonal con IRE General (inmueble como activo de empresa)',
            'Facturación: 30% gravado por IVA 5% + 70% exento',
            'Dos opciones de cálculo de renta:',
            '  • Renta presunta: 30% del valor de venta (tasa IRE 10%)',
            '  • Renta real: ingreso menos valor de adquisición (tasa IRE 10%)',
            'No hay retención IRP adicional'
          ],
          decreto: 'Ley 6380/19 - Arts. 19, 30, 82 y 85. Decreto 3.184/19',
          fuente: 'https://consultoria.com.py/caceres-schneider-asesoramiento-tributario-en-la-venta-de-inmuebles/'
        },
        'no': {
          debe_facturar: true,
          modo_calculo: 'Factura Exenta (Sin IVA) + IRP 2.4%',
          tasa_iva: 'N/A - Exento',
          porcentaje_gravado: 0,
          porcentaje_exento: 100,
          normas: [
            'Empresa unipersonal IRE General (inmueble FUERA de activo)',
            'Factura exenta, sin IVA',
            'IRP del 2.4% retenido por escribano público',
            'Base para IRP: ganancia por venta (precio venta menos costo adquisición)',
            'Tasa IRE General: 10% sobre la ganancia neta'
          ],
          decreto: 'Ley 6380/19 - Arts. 19, 30, 82 y 85. Decreto 3.184/19',
          fuente: 'https://consultoria.com.py/caceres-schneider-asesoramiento-tributario-en-la-venta-de-inmuebles/'
        }
      },
      'ire-simple': {
        'no-aplica': {
          debe_facturar: true,
          modo_calculo: 'Factura Exenta (Sin IVA) + IRP 2.4%',
          tasa_iva: 'N/A - Exento',
          porcentaje_gravado: 0,
          porcentaje_exento: 100,
          normas: [
            'IRE SIMPLE - Factura exenta, sin IVA',
            'IRP del 2.4% retenido por escribano público',
            'Escritura y comprobante de retención bastan como documentación',
            'No requiere facturación virtual/electrónica especial',
            'Impuesto a la renta SIMPLE aplica sobre la ganancia: 10% + 0.5% Fondo Educativo'
          ],
          decreto: 'Ley 6380/19 - Arts. 19, 30, 82 y 85. Decreto 3.184/19',
          fuente: 'https://consultoria.com.py/caceres-schneider-asesoramiento-tributario-en-la-venta-de-inmuebles/'
        },
        'si': {
          debe_facturar: true,
          modo_calculo: 'Factura Exenta (Sin IVA) + IRP 2.4%',
          tasa_iva: 'N/A - Exento',
          porcentaje_gravado: 0,
          porcentaje_exento: 100,
          normas: [
            'IRE SIMPLE - Activo de empresa',
            'Factura exenta, sin IVA',
            'IRP del 2.4% retenido por escribano público',
            'Reportar en declaración anual de IRE Simple',
            'Ganancia: precio venta menos valor en libros del activo'
          ],
          decreto: 'Ley 6380/19 - Arts. 19, 30, 82 y 85. Decreto 3.184/19',
          fuente: 'https://consultoria.com.py/caceres-schneider-asesoramiento-tributario-en-la-venta-de-inmuebles/'
        },
        'no': {
          debe_facturar: true,
          modo_calculo: 'Factura Exenta (Sin IVA) + IRP 2.4%',
          tasa_iva: 'N/A - Exento',
          porcentaje_gravado: 0,
          porcentaje_exento: 100,
          normas: [
            'IRE SIMPLE - Persona física o microempresa',
            'Factura exenta, sin IVA',
            'IRP del 2.4% retenido por escribano público',
            'Bien de uso personal (fuera de actividad comercial)',
            'Ganancia gravada: precio venta menos costo de adquisición'
          ],
          decreto: 'Ley 6380/19 - Arts. 19, 30, 82 y 85. Decreto 3.184/19',
          fuente: 'https://consultoria.com.py/caceres-schneider-asesoramiento-tributario-en-la-venta-de-inmuebles/'
        }
      },
      'ire-general': {
        'no-aplica': {
          debe_facturar: true,
          modo_calculo: 'Factura Exenta (Sin IVA) + IRP 2.4%',
          tasa_iva: 'N/A - Exento',
          porcentaje_gravado: 0,
          porcentaje_exento: 100,
          normas: [
            'IRE GENERAL - Factura exenta, sin IVA',
            'IRP del 2.4% retenido por escribano público',
            'Impuesto a la Renta General: 10% sobre la ganancia neta',
            'Ganancia: precio venta menos valor de adquisición',
            'Debe inscribirse ante SET como contribuyente de IRE General'
          ],
          decreto: 'Ley 6380/19 - Arts. 19, 30, 82 y 85. Decreto 3.184/19',
          fuente: 'https://consultoria.com.py/caceres-schneider-asesoramiento-tributario-en-la-venta-de-inmuebles/'
        },
        'si': {
          debe_facturar: true,
          modo_calculo: '30% Gravado (IVA 5%) + 70% Exento',
          tasa_iva: '5%',
          porcentaje_gravado: 30,
          porcentaje_exento: 70,
          normas: [
            'IRE GENERAL - Empresa unipersonal con inmueble como ACTIVO FIJO',
            'Factura: 30% gravado por IVA 5% + 70% exento',
            'Dos opciones de cálculo de renta:',
            '  • Renta presunta: 30% del valor de venta (tasa IRE General 10%)',
            '  • Renta real: (ingreso menos valor de adquisición) x tasa 10%',
            'Debe coincidir con registros contables y depreciaciones'
          ],
          decreto: 'Ley 6380/19 - Arts. 19, 30, 82 y 85. Decreto 3.184/19',
          fuente: 'https://consultoria.com.py/caceres-schneider-asesoramiento-tributario-en-la-venta-de-inmuebles/'
        },
        'no': {
          debe_facturar: true,
          modo_calculo: 'Factura Exenta (Sin IVA) + IRP 2.4%',
          tasa_iva: 'N/A - Exento',
          porcentaje_gravado: 0,
          porcentaje_exento: 100,
          normas: [
            'IRE GENERAL - Bien FUERA del activo de empresa',
            'Factura exenta, sin IVA',
            'IRP del 2.4% retenido por escribano público',
            'Impuesto a la Renta General: 10% sobre la ganancia',
            'Documentación: escritura y comprobante de retención IRP'
          ],
          decreto: 'Ley 6380/19 - Arts. 19, 30, 82 y 85. Decreto 3.184/19',
          fuente: 'https://consultoria.com.py/caceres-schneider-asesoramiento-tributario-en-la-venta-de-inmuebles/'
        }
      },
      'no-contribuyente': {
        'no-aplica': {
          debe_facturar: true,
          modo_calculo: 'Factura Exenta (Sin IVA) + IRP 2.4%',
          tasa_iva: 'N/A - Exento',
          porcentaje_gravado: 0,
          porcentaje_exento: 100,
          normas: [
            'Persona física no registrada ante SET (no contribuyente)',
            'Factura de venta de inmuebles exenta (opcional)',
            'IRP (Impuesto sobre Ganancia): 2.4% retenido por escribano público',
            'Escritura y comprobante de retención constituyen documentación completa',
            'Base para IRP: diferencia entre precio de venta y costo de adquisición'
          ],
          decreto: 'Ley 6380/19 - Arts. 19, 30, 82 y 85. Decreto 3.184/19',
          fuente: 'https://consultoria.com.py/caceres-schneider-asesoramiento-tributario-en-la-venta-de-inmuebles/'
        },
        'si': {
          debe_facturar: true,
          modo_calculo: 'Factura Exenta (Sin IVA) + IRP 2.4%',
          tasa_iva: 'N/A - Exento',
          porcentaje_gravado: 0,
          porcentaje_exento: 100,
          normas: [
            'No contribuyente - Bien registrado como activo de empresa',
            'Factura exenta, sin IVA',
            'IRP del 2.4% retenido por escribano público',
            'Ganancia = precio venta menos valor en libros del activo',
            'Se recomienda registrarse ante SET antes de la venta'
          ],
          decreto: 'Ley 6380/19 - Arts. 19, 30, 82 y 85. Decreto 3.184/19',
          fuente: 'https://consultoria.com.py/caceres-schneider-asesoramiento-tributario-en-la-venta-de-inmuebles/'
        },
        'no': {
          debe_facturar: true,
          modo_calculo: 'Factura Exenta (Sin IVA) + IRP 2.4%',
          tasa_iva: 'N/A - Exento',
          porcentaje_gravado: 0,
          porcentaje_exento: 100,
          normas: [
            'Persona física no registrada (no contribuyente)',
            'Bien de uso personal, no relacionado con actividad comercial',
            'Factura exenta, sin IVA',
            'IRP del 2.4% retenido por escribano público',
            'Base para IRP: ganancia por venta'
          ],
          decreto: 'Código Tributario',
          fuente: 'https://consultoria.com.py/caceres-schneider-asesoramiento-tributario-en-la-venta-de-inmuebles/'
        }
      }
    },
    vehiculo: {
      'prestador-servicios': {
        'nuevo': {
          'no-aplica': {
            debe_facturar: true,
            modo_calculo: '100% Gravado (IVA 10%)',
            tasa_iva: '10%',
            porcentaje_gravado: 100,
            porcentaje_exento: 0,
            normas: [
              'Debe facturar como vendedor de vehículo nuevo',
              'Base gravada: 100% del monto con IVA 10%',
              'Requiere documentación especial del fabricante/distribuidor',
              'Debe tramitar el cambio de titularidad ante Dirección General de Aduanas'
            ],
            decreto: 'Decreto Nº 4.295/13 y Ley de Aduanas',
            fuente: 'https://consultoria.com.py/facturacion-venta-vehiculo-paraguay/'
          },
          'si': {
            debe_facturar: true,
            modo_calculo: '100% Gravado (IVA 10%)',
            tasa_iva: '10%',
            porcentaje_gravado: 100,
            porcentaje_exento: 0,
            normas: [
              'Factura como venta de vehículo nuevo que es activo de la empresa',
              'Base gravada: 100% con IVA 10%',
              'Debe haber sido registrado en activos fijos',
              'Aplica depreciación acumulada'
            ],
            decreto: 'Decreto Nº 4.295/13',
            fuente: 'https://consultoria.com.py/facturacion-venta-vehiculo-paraguay/'
          },
          'no': {
            debe_facturar: true,
            modo_calculo: '100% Gravado (IVA 10%)',
            tasa_iva: '10%',
            porcentaje_gravado: 100,
            porcentaje_exento: 0,
            normas: [
              'Factura como vendedor aunque no es activo de empresa',
              'Base gravada: 100% con IVA 10%',
              'Aplica régimen de persona física o prestador de servicios',
              'Debe cumplir requisitos aduanales'
            ],
            decreto: 'Código Tributario',
            fuente: 'https://consultoria.com.py/facturacion-venta-vehiculo-paraguay/'
          }
        },
        'usado': {
          'no-aplica': {
            debe_facturar: true,
            modo_calculo: '30% Gravado (IVA 10%) + 70% Exento',
            tasa_iva: '10%',
            porcentaje_gravado: 30,
            porcentaje_exento: 70,
            normas: [
              'Venta de vehículo usado - Debe facturar',
              'Base gravada: 30% con IVA 10%',
              'Base exenta: 70% (Decreto Nº 4.295/13)',
              'Requiere comprobante de transferencia ante DGA',
              'Debe constar el RUC y datos del comprador'
            ],
            decreto: 'Decreto Nº 4.295/13 - Régimen especial para vehículos usados',
            fuente: 'https://consultoria.com.py/facturacion-venta-vehiculo-paraguay/'
          },
          'si': {
            debe_facturar: true,
            modo_calculo: '30% Gravado (IVA 10%) + 70% Exento',
            tasa_iva: '10%',
            porcentaje_gravado: 30,
            porcentaje_exento: 70,
            normas: [
              'Venta de activo fijo - vehículo usado',
              'Base gravada: 30% con IVA 10%',
              'Base exenta: 70%',
              'Debe detallar depreciaciones acumuladas en contabilidad'
            ],
            decreto: 'Decreto Nº 4.295/13',
            fuente: 'https://consultoria.com.py/facturacion-venta-vehiculo-paraguay/'
          },
          'no': {
            debe_facturar: true,
            modo_calculo: '30% Gravado (IVA 10%) + 70% Exento',
            tasa_iva: '10%',
            porcentaje_gravado: 30,
            porcentaje_exento: 70,
            normas: [
              'Venta de vehículo usado - Factura obligatoria',
              'Base gravada: 30% con IVA 10%',
              'Base exenta: 70%',
              'Persona física como vendedor'
            ],
            decreto: 'Código Tributario',
            fuente: 'https://consultoria.com.py/facturacion-venta-vehiculo-paraguay/'
          }
        }
      },
      'ire-simple': {
        'nuevo': {
          'no-aplica': {
            debe_facturar: false,
            modo_calculo: 'No aplica - Sin facturación obligatoria',
            tasa_iva: 'N/A',
            porcentaje_gravado: 0,
            porcentaje_exento: 0,
            normas: [
              'IRE SIMPLE - No obligatorio facturar venta de vehículo nuevo',
              'Debe declarar en formulario anual',
              'No está dentro del giro del negocio generalmente'
            ],
            decreto: 'Ley Nº 125/91 - IRE Simple',
            fuente: 'https://www.bacn.gov.py/leyes-paraguayas/2345/ley-n-125-establece-el-nuevo-regimen-tributario'
          },
          'si': {
            debe_facturar: false,
            modo_calculo: 'No aplica - Sin facturación obligatoria',
            tasa_iva: 'N/A',
            porcentaje_gravado: 0,
            porcentaje_exento: 0,
            normas: [
              'IRE SIMPLE - Activo de empresa',
              'No requiere factura especial',
              'Informar en declaración anual'
            ],
            decreto: 'Ley Nº 125/91',
            fuente: 'https://www.bacn.gov.py/leyes-paraguayas/2345/ley-n-125-establece-el-nuevo-regimen-tributario'
          },
          'no': {
            debe_facturar: false,
            modo_calculo: 'No aplica - Sin facturación obligatoria',
            tasa_iva: 'N/A',
            porcentaje_gravado: 0,
            porcentaje_exento: 0,
            normas: [
              'No es venta dentro del giro de IRE SIMPLE',
              'No requiere factura'
            ],
            decreto: 'Ley Nº 125/91',
            fuente: 'https://www.bacn.gov.py/leyes-paraguayas/2345/ley-n-125-establece-el-nuevo-regimen-tributario'
          }
        },
        'usado': {
          'no-aplica': {
            debe_facturar: false,
            modo_calculo: 'No aplica - Sin facturación obligatoria',
            tasa_iva: 'N/A',
            porcentaje_gravado: 0,
            porcentaje_exento: 0,
            normas: [
              'IRE SIMPLE - No obligatorio',
              'Venta de bien de uso personal',
              'Puede declarar voluntariamente'
            ],
            decreto: 'Ley Nº 125/91',
            fuente: 'https://www.bacn.gov.py/leyes-paraguayas/2345/ley-n-125-establece-el-nuevo-regimen-tributario'
          },
          'si': {
            debe_facturar: false,
            modo_calculo: 'No aplica - Sin facturación obligatoria',
            tasa_iva: 'N/A',
            porcentaje_gravado: 0,
            porcentaje_exento: 0,
            normas: [
              'IRE SIMPLE - Activo fijo de empresa',
              'Generalmente exento de facturación obligatoria',
              'Reportar en liquidación anual'
            ],
            decreto: 'Ley Nº 125/91',
            fuente: 'https://www.bacn.gov.py/leyes-paraguayas/2345/ley-n-125-establece-el-nuevo-regimen-tributario'
          },
          'no': {
            debe_facturar: false,
            modo_calculo: 'No aplica - Sin facturación obligatoria',
            tasa_iva: 'N/A',
            porcentaje_gravado: 0,
            porcentaje_exento: 0,
            normas: [
              'No requiere factura bajo IRE SIMPLE'
            ],
            decreto: 'Ley Nº 125/91',
            fuente: 'https://www.bacn.gov.py/leyes-paraguayas/2345/ley-n-125-establece-el-nuevo-regimen-tributario'
          }
        }
      },
      'ire-general': {
        'nuevo': {
          'no-aplica': {
            debe_facturar: true,
            modo_calculo: '100% Gravado (IVA 10%)',
            tasa_iva: '10%',
            porcentaje_gravado: 100,
            porcentaje_exento: 0,
            normas: [
              'IRE GENERAL - Facturación obligatoria',
              'Base gravada: 100% con IVA 10%',
              'Venta de vehículo nuevo',
              'Debe registrarse en contabilidad'
            ],
            decreto: 'Ley Nº 125/91 - IRE General',
            fuente: 'https://consultoria.com.py/facturacion-venta-vehiculo-paraguay/'
          },
          'si': {
            debe_facturar: true,
            modo_calculo: '100% Gravado (IVA 10%)',
            tasa_iva: '10%',
            porcentaje_gravado: 100,
            porcentaje_exento: 0,
            normas: [
              'IRE GENERAL - Activo fijo de empresa',
              'Base gravada: 100% con IVA 10%',
              'Facturación obligatoria',
              'Debe coincidir con depreciaciones contables'
            ],
            decreto: 'Ley Nº 125/91 y Decreto 14.627/92',
            fuente: 'https://consultoria.com.py/facturacion-venta-vehiculo-paraguay/'
          },
          'no': {
            debe_facturar: true,
            modo_calculo: '100% Gravado (IVA 10%)',
            tasa_iva: '10%',
            porcentaje_gravado: 100,
            porcentaje_exento: 0,
            normas: [
              'IRE GENERAL - Facturación obligatoria',
              'Base gravada: 100% con IVA 10%',
              'Venta de vehículo nuevo sin ser activo de empresa',
              'Aplica retenciones'
            ],
            decreto: 'Código Tributario',
            fuente: 'https://consultoria.com.py/facturacion-venta-vehiculo-paraguay/'
          }
        },
        'usado': {
          'no-aplica': {
            debe_facturar: true,
            modo_calculo: '30% Gravado (IVA 10%) + 70% Exento',
            tasa_iva: '10%',
            porcentaje_gravado: 30,
            porcentaje_exento: 70,
            normas: [
              'IRE GENERAL - Factura obligatoria',
              'Base gravada: 30% con IVA 10%',
              'Base exenta: 70% (Decreto Nº 4.295/13)',
              'Requiere comprobante de DGA',
              'Debe indicarse el estado del vehículo'
            ],
            decreto: 'Decreto Nº 4.295/13 - Exención IVA',
            fuente: 'https://consultoria.com.py/facturacion-venta-vehiculo-paraguay/'
          },
          'si': {
            debe_facturar: true,
            modo_calculo: '30% Gravado (IVA 10%) + 70% Exento',
            tasa_iva: '10%',
            porcentaje_gravado: 30,
            porcentaje_exento: 70,
            normas: [
              'IRE GENERAL - Venta de activo fijo usado',
              'Base gravada: 30% con IVA 10%',
              'Base exenta: 70%',
              'Requiere documentación de DGA',
              'Reportar depreciación acumulada'
            ],
            decreto: 'Decreto Nº 4.295/13',
            fuente: 'https://consultoria.com.py/facturacion-venta-vehiculo-paraguay/'
          },
          'no': {
            debe_facturar: true,
            modo_calculo: '30% Gravado (IVA 10%) + 70% Exento',
            tasa_iva: '10%',
            porcentaje_gravado: 30,
            porcentaje_exento: 70,
            normas: [
              'IRE GENERAL - Facturación obligatoria',
              'Base gravada: 30% con IVA 10%',
              'Base exenta: 70%',
              'Vehículo usado sin ser activo de empresa'
            ],
            decreto: 'Código Tributario',
            fuente: 'https://consultoria.com.py/facturacion-venta-vehiculo-paraguay/'
          }
        }
      },
      'playa-vehiculos': {
        'nuevo': {
          'si': {
            debe_facturar: true,
            modo_calculo: '100% Gravado (IVA 10%)',
            tasa_iva: '10%',
            porcentaje_gravado: 100,
            porcentaje_exento: 0,
            normas: [
              'PLAYA DE VEHICULOS - Facturación OBLIGATORIA',
              'Base gravada: 100% con IVA 10%',
              'Vehículo nuevo - Activo de la empresa',
              'Requiere documentación de fabricante/distribuidor',
              'Debe registrar en sistema de inventarios'
            ],
            decreto: 'Decreto Nº 4.295/13 - Régimen especial para Playas de Vehículos',
            fuente: 'https://consultoria.com.py/facturacion-venta-vehiculo-paraguay/'
          }
        },
        'usado': {
          'si': {
            debe_facturar: true,
            modo_calculo: '30% Gravado (IVA 10%) + 70% Exento',
            tasa_iva: '10%',
            porcentaje_gravado: 30,
            porcentaje_exento: 70,
            normas: [
              'PLAYA DE VEHICULOS - Facturación OBLIGATORIA',
              'Base gravada: 30% con IVA 10%',
              'Base exenta: 70% (Decreto Nº 4.295/13)',
              'Vehículo usado - Activo de empresa',
              'Control mediante DGA',
              'Registro en inventario de existencias'
            ],
            decreto: 'Decreto Nº 4.295/13',
            fuente: 'https://consultoria.com.py/facturacion-venta-vehiculo-paraguay/'
          }
        }
      },
      'no-contribuyente': {
        'nuevo': {
          'no-aplica': {
            debe_facturar: true,
            modo_calculo: '100% Gravado (IVA 10%)',
            tasa_iva: '10%',
            porcentaje_gravado: 100,
            porcentaje_exento: 0,
            normas: [
              'NO CONTRIBUYENTE - Debe facturar venta de vehículo nuevo',
              'Base gravada: 100% con IVA 10%',
              'Indica su condición de no contribuyente en factura',
              'Aplica retención del 1% del monto',
              'Requiere identificarse ante el comprador'
            ],
            decreto: 'Resolución SET - Tratamiento de No Contribuyentes',
            fuente: 'https://consultoria.com.py/facturacion-venta-vehiculo-paraguay/'
          },
          'si': {
            debe_facturar: true,
            modo_calculo: '100% Gravado (IVA 10%)',
            tasa_iva: '10%',
            porcentaje_gravado: 100,
            porcentaje_exento: 0,
            normas: [
              'NO CONTRIBUYENTE - Activo de empresa',
              'Base gravada: 100% con IVA 10%',
              'Debe facturar la venta',
              'Aplica retención de 1%',
              'Documentar adecuadamente'
            ],
            decreto: 'Resolución SET',
            fuente: 'https://consultoria.com.py/facturacion-venta-vehiculo-paraguay/'
          },
          'no': {
            debe_facturar: true,
            modo_calculo: '100% Gravado (IVA 10%)',
            tasa_iva: '10%',
            porcentaje_gravado: 100,
            porcentaje_exento: 0,
            normas: [
              'NO CONTRIBUYENTE - Factura obligatoria',
              'Base gravada: 100% con IVA 10%',
              'Venta de vehículo nuevo',
              'Aplica retención de 1%'
            ],
            decreto: 'Código Tributario',
            fuente: 'https://consultoria.com.py/facturacion-venta-vehiculo-paraguay/'
          }
        },
        'usado': {
          'no-aplica': {
            debe_facturar: true,
            modo_calculo: '30% Gravado (IVA 10%) + 70% Exento',
            tasa_iva: '10%',
            porcentaje_gravado: 30,
            porcentaje_exento: 70,
            normas: [
              'NO CONTRIBUYENTE - Debe facturar vehículo usado',
              'Base gravada: 30% con IVA 10%',
              'Base exenta: 70% (Decreto Nº 4.295/13)',
              'Aplica retención de 1%',
              'Documentar con comprobante de DGA'
            ],
            decreto: 'Resolución SET',
            fuente: 'https://consultoria.com.py/facturacion-venta-vehiculo-paraguay/'
          },
          'si': {
            debe_facturar: true,
            modo_calculo: '30% Gravado (IVA 10%) + 70% Exento',
            tasa_iva: '10%',
            porcentaje_gravado: 30,
            porcentaje_exento: 70,
            normas: [
              'NO CONTRIBUYENTE - Activo fijo usado',
              'Base gravada: 30% con IVA 10%',
              'Base exenta: 70%',
              'Factura obligatoria',
              'Aplica retención de 1%'
            ],
            decreto: 'Resolución SET',
            fuente: 'https://consultoria.com.py/facturacion-venta-vehiculo-paraguay/'
          },
          'no': {
            debe_facturar: true,
            modo_calculo: '30% Gravado (IVA 10%) + 70% Exento',
            tasa_iva: '10%',
            porcentaje_gravado: 30,
            porcentaje_exento: 70,
            normas: [
              'NO CONTRIBUYENTE - Facturación obligatoria',
              'Base gravada: 30% con IVA 10%',
              'Base exenta: 70%',
              'Aplica retención de 1%'
            ],
            decreto: 'Código Tributario',
            fuente: 'https://consultoria.com.py/facturacion-venta-vehiculo-paraguay/'
          }
        }
      }
    }
  }

  const set = (name) => (value) => setFormData((prev) => ({ ...prev, [name]: value }))

  const resolver = (fd) => {
    if (fd.tipoBien === 'inmueble') {
      return regulaciones.inmueble[fd.tipoContribuyente]?.[fd.esActivoEmpresa] || null
    }
    if (fd.tipoContribuyente === 'playa-vehiculos') {
      return regulaciones.vehiculo['playa-vehiculos']?.[fd.estadoVehiculo]?.['si'] || null
    }
    return regulaciones.vehiculo[fd.tipoContribuyente]?.[fd.estadoVehiculo]?.[fd.esActivoEmpresa] || null
  }

  // la playa de vehículos solo vende vehículos
  const elegirBien = (tipoBien) => setFormData((prev) => ({
    ...prev,
    tipoBien,
    tipoContribuyente: tipoBien === 'inmueble' && prev.tipoContribuyente === 'playa-vehiculos' ? 'no-contribuyente' : prev.tipoContribuyente,
  }))

  const regla = resolver(formData)
  const monto = Number(formData.monto) || 0
  const tasa = regla && regla.porcentaje_gravado > 0 ? (parseInt(regla.tasa_iva, 10) || 0) : 0
  // con IVA incluido, el precio es el total de la factura y el IVA sale de adentro (10 % → ÷ 11; 5 % → ÷ 21)
  const incluido = formData.ivaIncluido !== false
  const gravada = regla ? Math.round((monto * regla.porcentaje_gravado) / 100) : 0
  const exenta = regla ? monto - gravada : 0
  const iva = !tasa ? 0 : incluido ? Math.round(gravada / (100 / tasa + 1)) : Math.round((gravada * tasa) / 100)
  const totalFactura = incluido ? monto : monto + iva
  const columnaGravada = incluido ? gravada : gravada + iva
  const sinFactura = regla && !regla.debe_facturar
  const listo = Boolean(regla && monto > 0)

  const nuevaConsulta = () => setFormData(INICIAL)
  const nombreBien = formData.tipoBien === 'inmueble' ? 'inmueble' : `vehículo ${formData.estadoVehiculo}`
  const regimen = REGIMENES.find((r) => r.value === formData.tipoContribuyente)

  return (
    <div className="venta-activo-fijo-container">
      <PageHead
        title="Venta de Activo Fijo"
        lede="Respondé cuatro preguntas y cargá el precio: la calculadora te dice si hay que facturar, cuánto va gravado y exento, y cuánto IVA lleva la factura."
      />

      <div className="afc">
        <section className="afc-preguntas" aria-label="Datos de la venta">
          <Pregunta n={1} titulo="¿Qué se vende?">
            <div className="afc-tiles">
              {BIENES.map(({ value, label, hint, Icon }) => (
                <button key={value} type="button" className={`afc-tile ${formData.tipoBien === value ? 'is-on' : ''}`} aria-pressed={formData.tipoBien === value} onClick={() => elegirBien(value)}>
                  <Icon size={22} strokeWidth={1.6} aria-hidden="true" />
                  <span className="afc-tile__label">{label}</span>
                  <small>{hint}</small>
                </button>
              ))}
            </div>
            {formData.tipoBien === 'vehiculo' && (
              <Opciones label="Estado del vehículo" value={formData.estadoVehiculo} onChange={set('estadoVehiculo')} opciones={[
                { value: 'usado', label: 'Usado' },
                { value: 'nuevo', label: '0 km' }
              ]} />
            )}
          </Pregunta>

          <Pregunta n={2} titulo="¿Quién vende?" ayuda="El régimen con el que el vendedor está inscripto en la DNIT.">
            <Opciones label="Régimen del vendedor" value={formData.tipoContribuyente} onChange={set('tipoContribuyente')}
              opciones={REGIMENES.filter((r) => r.value !== 'playa-vehiculos' || formData.tipoBien === 'vehiculo')} />
          </Pregunta>

          {formData.tipoContribuyente !== 'playa-vehiculos' && (
            <Pregunta n={3} titulo="¿El bien es parte de la empresa?" ayuda="Si está registrado como activo fijo en la contabilidad del vendedor.">
              <Opciones label="Condición del bien" value={formData.esActivoEmpresa} onChange={set('esActivoEmpresa')} opciones={[
                { value: 'si', label: 'Sí, es activo de la empresa' },
                { value: 'no', label: 'No, es de uso personal' },
                { value: 'no-aplica', label: 'No sé / no aplica' }
              ]} />
            </Pregunta>
          )}

          <Pregunta n={formData.tipoContribuyente === 'playa-vehiculos' ? 3 : 4} titulo="¿En cuánto se vende?">
            <label className="afc-monto">
              <span className="afc-monto__moneda" aria-hidden="true">₲</span>
              <MoneyInput id="af-monto" value={formData.monto} onChange={set('monto')} placeholder="0" aria-label="Precio de venta en guaraníes" />
            </label>
            {tasa > 0 && (
              <Opciones label="¿El precio incluye IVA?" value={incluido ? 'si' : 'no'} onChange={(v) => set('ivaIncluido')(v === 'si')} opciones={[
                { value: 'si', label: 'El precio ya incluye IVA' },
                { value: 'no', label: 'Hay que sumarle el IVA' }
              ]} />
            )}
          </Pregunta>
        </section>

        <aside className="afc-calc" aria-label="Resultado" aria-live="polite">
          <div className="afc-pantalla">
            <span className="afc-pantalla__rotulo">{sinFactura ? 'Precio de venta' : 'Total de la factura'}</span>
            <output className="afc-pantalla__total" htmlFor="af-monto">₲ {fmtGs(sinFactura ? monto : totalFactura)}</output>
            <span className="afc-pantalla__sub">Venta de {nombreBien} · {regimen?.label}</span>
          </div>

          {!regla ? (
            <p className="afc-veredicto is-err"><AlertTriangle size={18} strokeWidth={1.8} aria-hidden="true" /> No hay una regla cargada para esta combinación. Revisá las respuestas.</p>
          ) : (
            <>
              <p className={`afc-veredicto ${sinFactura ? 'is-info' : 'is-ok'}`}>
                {sinFactura
                  ? <><Info size={18} strokeWidth={1.8} aria-hidden="true" /> No es obligatorio emitir factura</>
                  : <><CheckCircle2 size={18} strokeWidth={1.8} aria-hidden="true" /> Debe emitir factura</>}
              </p>
              <p className="afc-modo">{regla.modo_calculo}</p>

              {!sinFactura && (
                <dl className="afc-filas">
                  <div><dt>Parte gravada <small>{regla.porcentaje_gravado} %</small></dt><dd>₲ {fmtGs(gravada)}</dd></div>
                  <div><dt>Parte exenta <small>{regla.porcentaje_exento} %</small></dt><dd>₲ {fmtGs(exenta)}</dd></div>
                  <div className="is-iva"><dt>IVA {tasa ? `${tasa} %` : ''} <small>{tasa ? (incluido ? 'incluido en el precio' : 'se suma al precio') : 'exento'}</small></dt><dd>₲ {fmtGs(iva)}</dd></div>
                </dl>
              )}

              {!sinFactura && listo && (
                <div className="afc-factura">
                  <span className="afc-factura__titulo"><Receipt size={15} strokeWidth={1.8} aria-hidden="true" /> Cómo completar la factura</span>
                  <div className="afc-factura__cols">
                    <div><small>Exentas</small><b>{fmtGs(exenta)}</b></div>
                    <div><small>5 %</small><b>{tasa === 5 ? fmtGs(columnaGravada) : '—'}</b></div>
                    <div><small>10 %</small><b>{tasa === 10 ? fmtGs(columnaGravada) : '—'}</b></div>
                  </div>
                  {tasa > 0 && <p>Liquidación del IVA ({tasa} %): <b>₲ {fmtGs(iva)}</b></p>}
                </div>
              )}
              {!listo && <p className="afc-hint">Cargá el precio de venta para ver los montos.</p>}
            </>
          )}

          <div className="afc-acciones">
            {listo && (
              <GuardarEnNube
                modulo="activofijo"
                titulo={`Venta de ${nombreBien} · ₲ ${fmtGs(monto)}`}
                resumen={{ Monto: monto, Factura: regla.debe_facturar ? 'Sí' : 'No', IVA: iva ? `₲ ${fmtGs(iva)}` : 'Exento' }}
                datos={{ ...formData, ...regla, gravada, exenta, iva, totalFactura }}
              />
            )}
            <button type="button" className="btn btn-secondary" onClick={nuevaConsulta}><RotateCcw size={15} strokeWidth={1.8} aria-hidden="true" /> Nueva consulta</button>
          </div>
        </aside>
      </div>

      {regla && (
        <details className="afc-normas">
          <summary>Normas, requisitos y marco legal</summary>
          <ul>{regla.normas.map((n, i) => <li key={i}>{n.replace(/^\s*•\s*/, '')}</li>)}</ul>
          <p><strong>Base legal:</strong> {regla.decreto}</p>
          <p><a href={regla.fuente} target="_blank" rel="noopener noreferrer">Ver fuente <ExternalLink size={12} strokeWidth={1.8} aria-hidden="true" /></a></p>
          <p className="afc-aviso">Información orientativa según la normativa paraguaya vigente. Antes de la operación, confirmala con un asesor tributario: cada caso puede tener particularidades.</p>
        </details>
      )}
    </div>
  )
}

/* ── piezas de la calculadora ───────────────────────────────── */

const BIENES = [
  { value: 'inmueble', label: 'Inmueble', hint: 'casa, terreno, departamento', Icon: Home },
  { value: 'vehiculo', label: 'Vehículo', hint: 'auto, camioneta, moto', Icon: Car }
]

const REGIMENES = [
  { value: 'no-contribuyente', label: 'No contribuyente' },
  { value: 'prestador-servicios', label: 'Prestador de servicios' },
  { value: 'ire-simple', label: 'IRE Simple' },
  { value: 'ire-general', label: 'IRE General' },
  { value: 'playa-vehiculos', label: 'Playa de vehículos' }
]

function Pregunta({ n, titulo, ayuda, children }) {
  return (
    <fieldset className="afc-pregunta">
      <legend><span className="afc-pregunta__n" aria-hidden="true">{n}</span> {titulo}</legend>
      {ayuda && <p className="afc-pregunta__ayuda">{ayuda}</p>}
      {children}
    </fieldset>
  )
}

function Opciones({ label, value, onChange, opciones }) {
  return (
    <div className="afc-opciones" role="radiogroup" aria-label={label}>
      {opciones.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value}
          className={`afc-opcion ${value === o.value ? 'is-on' : ''}`} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export default VentaActivoFijo
