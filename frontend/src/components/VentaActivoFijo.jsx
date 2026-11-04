import React, { useState } from 'react'
import PageHead, { Figures } from './PageHead'
import { Card, CardBody, CardHeader, Button, Input, Select, SelectItem, Spinner } from '@heroui/react'
import { Download } from 'lucide-react'
import { Var, MoneyInput, SetChoice, Step, F, fmtGs } from './MathInputs'
import '../styles/VentaActivoFijo.css'

const VentaActivoFijo = () => {
  const [formData, setFormData] = useState({
    tipoBien: 'inmueble',
    tipoContribuyente: 'no-contribuyente',
    esActivoEmpresa: 'no-aplica',
    estadoVehiculo: 'usado',
    monto: 0,
  })

  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState('')

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

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleMonto = (e) => {
    const valor = parseFloat(e.target.value) || 0
    setFormData(prev => ({
      ...prev,
      monto: valor
    }))
  }

  const resolver = (fd) => {
    if (fd.tipoBien === 'inmueble') {
      return regulaciones.inmueble[fd.tipoContribuyente]?.[fd.esActivoEmpresa] || null
    }
    if (fd.tipoContribuyente === 'playa-vehiculos') {
      return regulaciones.vehiculo['playa-vehiculos']?.[fd.estadoVehiculo]?.['si'] || null
    }
    return regulaciones.vehiculo[fd.tipoContribuyente]?.[fd.estadoVehiculo]?.[fd.esActivoEmpresa] || null
  }

  const setAf = (name) => (value) => setFormData((prev) => ({ ...prev, [name]: value }))
  const previa = resolver(formData)
  const baseG = previa ? (formData.monto * previa.porcentaje_gravado) / 100 : 0
  const baseE = previa ? (formData.monto * previa.porcentaje_exento) / 100 : 0
  const tasaIva = previa && previa.porcentaje_gravado > 0 ? (parseInt(previa.tasa_iva, 10) || 0) : 0
  const iva = baseG * (tasaIva / 100)
  const regimenCorto = {
    'prestador-servicios': 'servicios',
    'ire-simple': 'IRE Simple',
    'ire-general': 'IRE General',
    'playa-vehiculos': 'playa',
    'no-contribuyente': 'no contrib.'
  }[formData.tipoContribuyente]

  const calcular = () => {
    setError('')

    if (formData.monto <= 0) {
      setError('Por favor ingrese un monto válido mayor a 0')
      return
    }

    const config = resolver(formData)

    if (!config) {
      setError('Configuración no encontrada para esta combinación')
      return
    }

    const resultado = {
      ...formData,
      ...config,
      montoFormateado: formData.monto.toLocaleString('es-PY', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    }

    setResultado(resultado)
  }

  const resetForm = () => {
    setResultado(null)
    setFormData({
      tipoBien: 'inmueble',
      tipoContribuyente: 'no-contribuyente',
      esActivoEmpresa: 'no-aplica',
      estadoVehiculo: 'usado',
      monto: 0,
    })
    setError('')
  }

  const getModoFacturacion = () => {
    if (!resultado) return ''
    return resultado.debe_facturar ?
      'DEBE FACTURAR LA VENTA' :
      'NO REQUIERE FACTURACIÓN OBLIGATORIA'
  }

  return (
    <div className="venta-activo-fijo-container">
      <PageHead
        title="Venta de Activo Fijo"
        lede="Determina la modalidad de facturación según la normativa tributaria paraguaya."
        equation={[{ v: 'f' }, { op: '(' }, { v: 'bien' }, { op: ',' }, { v: 'régimen' }, { op: ')' }, { op: '→' }, { v: 'Factura' }]}
        caption="modalidad de facturación"
      />
      <div className="card">

        {error && <div className="error-message">{error}</div>}

        {!resultado ? (
          <form className="qm" onSubmit={(e) => { e.preventDefault(); calcular() }}>
            <div className="qm-vars">
              <section className="qm-block">
                <h3 className="qm-legend">Argumentos</h3>
                <Var sym="bien" label="Tipo de bien" op="∈" wide>
                  <SetChoice name="af-bien" label="Tipo de bien" value={formData.tipoBien} onChange={setAf('tipoBien')} options={[
                    { value: 'inmueble', label: 'Inmueble' },
                    { value: 'vehiculo', label: 'Vehículo' }
                  ]} />
                </Var>
                <Var sym="r" label="Régimen del vendedor" op="∈" wide>
                  <SetChoice name="af-reg" label="Régimen tributario" value={formData.tipoContribuyente} onChange={setAf('tipoContribuyente')} options={[
                    { value: 'prestador-servicios', label: 'Prestador de servicios' },
                    { value: 'ire-simple', label: 'IRE Simple' },
                    { value: 'ire-general', label: 'IRE General' },
                    { value: 'playa-vehiculos', label: 'Playa de vehículos' },
                    { value: 'no-contribuyente', label: 'No contribuyente' }
                  ]} />
                </Var>
                {formData.tipoContribuyente !== 'playa-vehiculos' && (
                  <Var sym="a" label="¿Activo de la empresa?" op="∈" wide>
                    <SetChoice name="af-act" label="Condición del bien" value={formData.esActivoEmpresa} onChange={setAf('esActivoEmpresa')} options={[
                      { value: 'no-aplica', label: 'No aplica' },
                      { value: 'si', label: 'Sí, activo de la empresa' },
                      { value: 'no', label: 'No, uso personal' }
                    ]} />
                  </Var>
                )}
                {formData.tipoBien === 'vehiculo' && (
                  <Var sym="e" label="Estado del vehículo" op="∈" wide>
                    <SetChoice name="af-est" label="Estado del vehículo" value={formData.estadoVehiculo} onChange={setAf('estadoVehiculo')} options={[
                      { value: 'nuevo', label: 'Nuevo' },
                      { value: 'usado', label: 'Usado' }
                    ]} />
                  </Var>
                )}
              </section>

              <section className="qm-block">
                <h3 className="qm-legend">Monto</h3>
                <Var sym="M" label="Precio de venta" htmlFor="af-M" unit="₲">
                  <MoneyInput id="af-M" value={formData.monto} onChange={setAf('monto')} />
                </Var>
              </section>
            </div>

            <aside className="qm-deriv" aria-label="Vista previa">
              <h3 className="qm-legend">Resultado</h3>
              <div className="qm-fx">
                <F t={[{ v: 'f' }, { op: '(' }, { w: formData.tipoBien === 'inmueble' ? 'inmueble' : 'vehículo' }, { op: ',' }, { w: regimenCorto }, { op: ')' }]} />
                <span className="qm-fx__arrow">→</span>
                <strong className={previa ? (previa.debe_facturar ? 'tone-ok' : '') : 'tone-err'}>
                  {previa ? (previa.debe_facturar ? 'Debe facturar' : 'Sin factura obligatoria') : 'Sin regla para esta combinación'}
                </strong>
              </div>
              {previa && <p className="qm-fx__mode">{previa.modo_calculo}</p>}
              {previa && (
                <>
                  <Step value={fmtGs(baseG)}><F t={[{ v: 'G' }, { op: '=' }, { v: 'M' }, { op: '×' }, { n: `${previa.porcentaje_gravado} %` }]} /></Step>
                  <Step value={fmtGs(baseE)}><F t={[{ v: 'E' }, { op: '=' }, { v: 'M' }, { op: '×' }, { n: `${previa.porcentaje_exento} %` }]} /></Step>
                  <Step kind="sum" value={fmtGs(formData.monto)}><F t={[{ v: 'G' }, { op: '+' }, { v: 'E' }, { op: '=' }, { v: 'M' }]} /></Step>
                  <Step kind="total" value={<>{fmtGs(iva)} <small>₲</small></>}>
                    <F t={tasaIva ? [{ w: 'IVA' }, { op: '=' }, { v: 'G' }, { op: '×' }, { n: `${tasaIva} %` }] : [{ w: 'IVA' }, { op: '=' }, { n: '0' }, { w: '(exento)' }]} />
                  </Step>
                </>
              )}
              <p className="qm-deriv__note">{formData.monto ? 'Vista previa en vivo. Calcula para ver normas, requisitos y marco legal.' : 'Ingresa el precio de venta para ver las bases.'}</p>
              <button type="submit" className="btn btn-primary qm-deriv__go">Calcular</button>
            </aside>
          </form>
        ) : (
          <div className="resultado-section">
            <div className="resultado-header">
              <h3>Resultado de Análisis</h3>
            </div>

            {/* Resumen de Datos */}
            <div className="resultado-card datos-card">
              <h4>Datos de la Consulta</h4>
              <div className="dato-row">
                <span>Tipo de Bien:</span>
                <strong>{resultado.tipoBien === 'inmueble' ? 'Inmueble' : 'Vehículo'}</strong>
              </div>
              <div className="dato-row">
                <span>Régimen Tributario:</span>
                <strong>{resultado.tipoContribuyente.toUpperCase().replace(/-/g, ' ')}</strong>
              </div>
              {resultado.tipoBien === 'vehiculo' && (
                <div className="dato-row">
                  <span>Estado del Vehículo:</span>
                  <strong>{resultado.estadoVehiculo === 'nuevo' ? 'NUEVO' : 'USADO'}</strong>
                </div>
              )}
              <div className="dato-row">
                <span>Monto de Venta:</span>
                <strong>₲ {resultado.montoFormateado}</strong>
              </div>
            </div>

            {/* Modo de Facturación Principal */}
            <div className={`resultado-card modo-facturacion ${resultado.debe_facturar ? 'debe-facturar' : 'no-facturar'}`}>
              <h4>Modalidad de Facturación</h4>
              <div className="modo-principal">
                {getModoFacturacion()}
              </div>
            </div>

            {/* Modo de Cálculo */}
            {resultado.debe_facturar && (
              <div className="resultado-card modo-calculo-card">
                <h4>Modo de Cálculo</h4>
                <div className="modo-calculo-content">
                  <p className="modo-calculo-titulo">{resultado.modo_calculo}</p>
                  <p className="modo-calculo-tasa">Tasa de IVA: <strong>{resultado.tasa_iva}</strong></p>

                  <div className="calculo-desglose">
                    <div className="desglose-item gravado">
                      <span className="desglose-label">Base Gravada:</span>
                      <span className="desglose-porcentaje">{resultado.porcentaje_gravado}%</span>
                      <span className="desglose-monto">₲ {((resultado.monto * resultado.porcentaje_gravado) / 100).toLocaleString('es-PY', {minimumFractionDigits: 2})}</span>
                    </div>
                    <div className="desglose-item exento">
                      <span className="desglose-label">Base Exenta:</span>
                      <span className="desglose-porcentaje">{resultado.porcentaje_exento}%</span>
                      <span className="desglose-monto">₲ {((resultado.monto * resultado.porcentaje_exento) / 100).toLocaleString('es-PY', {minimumFractionDigits: 2})}</span>
                    </div>
                  </div>

                  {resultado.porcentaje_gravado > 0 && (
                    <div className="calculo-iva">
                      <p><strong>IVA a pagar:</strong></p>
                      <p className="iva-monto">₲ {(((resultado.monto * resultado.porcentaje_gravado) / 100) * (parseInt(resultado.tasa_iva) / 100)).toLocaleString('es-PY', {minimumFractionDigits: 2})}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Normativas y Requisitos */}
            <div className="resultado-card normas-card">
              <h4>Normas y Requisitos Aplicables</h4>
              <ul className="normas-list">
                {resultado.normas && resultado.normas.map((norma, idx) => (
                  <li key={idx}>{norma}</li>
                ))}
              </ul>
            </div>

            {/* Marco Legal */}
            <div className="resultado-card marco-legal-card">
              <h4>Marco Legal</h4>
              <p><strong>Decreto/Ley:</strong></p>
              <p className="decreto">{resultado.decreto}</p>
              <p><strong>Fuente:</strong></p>
              <a href={resultado.fuente} target="_blank" rel="noopener noreferrer" className="fuente-link">
                {resultado.fuente}
              </a>
            </div>

            {/* Advertencia */}
            <div className="resultado-card advertencia-card">
              <p>
                <strong>ADVERTENCIA LEGAL:</strong> Esta calculadora proporciona información orientativa basada en la normativa tributaria paraguaya vigente.
                Se recomienda consultar con un asesor tributario profesional antes de realizar la operación,
                ya que cada caso puede tener particularidades que afecten el tratamiento fiscal aplicable.
              </p>
            </div>

            {/* Botones de Acción */}
            <div className="button-group">
              <button
                className="btn btn-secondary"
                onClick={resetForm}
              >
                Nueva Consulta
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default VentaActivoFijo
