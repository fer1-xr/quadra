import React, { useState } from 'react'
import { Card, CardBody, CardHeader, Button, Input, Select, SelectItem, Spinner } from '@heroui/react'
import { Download } from 'lucide-react'
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

  const calcular = () => {
    setError('')

    if (formData.monto <= 0) {
      setError('Por favor ingrese un monto válido mayor a 0')
      return
    }

    let config = null

    if (formData.tipoBien === 'inmueble') {
      config = regulaciones.inmueble[formData.tipoContribuyente]?.[formData.esActivoEmpresa]
    } else if (formData.tipoBien === 'vehiculo') {
      if (formData.tipoContribuyente === 'playa-vehiculos') {
        config = regulaciones.vehiculo['playa-vehiculos']?.[formData.estadoVehiculo]?.['si']
      } else {
        config = regulaciones.vehiculo[formData.tipoContribuyente]?.[formData.estadoVehiculo]?.[formData.esActivoEmpresa]
      }
    }

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
      '✅ DEBE FACTURAR LA VENTA' :
      '❌ NO REQUIERE FACTURACIÓN OBLIGATORIA'
  }

  return (
    <div className="venta-activo-fijo-container">
      <div className="card">
        <h2>🏢 Calculadora de Venta de Activo Fijo</h2>
        <p className="subtitle">Determina la modalidad de facturación según normativa tributaria paraguaya</p>

        {error && <div className="error-message">{error}</div>}

        {!resultado ? (
          <form className="venta-form">
            {/* Tipo de Bien */}
            <section className="form-section">
              <h3>📦 Tipo de Bien</h3>
              <div className="form-group">
                <label>Seleccionar tipo de bien *</label>
                <select
                  name="tipoBien"
                  value={formData.tipoBien}
                  onChange={handleChange}
                  className="select-input"
                >
                  <option value="inmueble">Inmueble (Terreno, Casa, Edificio, etc.)</option>
                  <option value="vehiculo">Vehículo (Automóvil, Camión, etc.)</option>
                </select>
              </div>
            </section>

            {/* Tipo de Contribuyente */}
            <section className="form-section">
              <h3>👤 Tipo de Contribuyente / Vendedor</h3>
              <div className="form-group">
                <label>Seleccionar régimen tributario *</label>
                <select
                  name="tipoContribuyente"
                  value={formData.tipoContribuyente}
                  onChange={handleChange}
                  className="select-input"
                >
                  <option value="prestador-servicios">Prestador de Servicios</option>
                  <option value="ire-simple">IRE SIMPLE</option>
                  <option value="ire-general">IRE GENERAL</option>
                  <option value="playa-vehiculos">PLAYA DE VEHÍCULOS</option>
                  <option value="no-contribuyente">NO CONTRIBUYENTE</option>
                </select>
              </div>
            </section>

            {/* ¿Es Activo de la Empresa? */}
            {formData.tipoContribuyente !== 'playa-vehiculos' && (
              <section className="form-section">
                <h3>🏭 ¿Es Activo de la Empresa?</h3>
                <div className="form-group">
                  <label>Condición del bien *</label>
                  <select
                    name="esActivoEmpresa"
                    value={formData.esActivoEmpresa}
                    onChange={handleChange}
                    className="select-input"
                  >
                    <option value="no-aplica">No Aplica (Persona Física o No Empresa)</option>
                    <option value="si">Sí, es activo de la empresa</option>
                    <option value="no">No, es bien de uso personal</option>
                  </select>
                </div>
              </section>
            )}

            {/* Estado del Vehículo */}
            {formData.tipoBien === 'vehiculo' && (
              <section className="form-section">
                <h3>🚗 Estado del Vehículo</h3>
                <div className="form-group">
                  <label>Condición del vehículo *</label>
                  <select
                    name="estadoVehiculo"
                    value={formData.estadoVehiculo}
                    onChange={handleChange}
                    className="select-input"
                  >
                    <option value="nuevo">Nuevo</option>
                    <option value="usado">Usado</option>
                  </select>
                </div>
              </section>
            )}

            {/* Monto */}
            <section className="form-section">
              <h3>💰 Monto de la Venta</h3>
              <div className="form-group">
                <label>Monto en Guaraníes (₲) *</label>
                <input
                  type="number"
                  name="monto"
                  value={formData.monto}
                  onChange={handleMonto}
                  placeholder="0.00"
                  className="input-number"
                  min="0"
                  step="1000"
                  required
                />
              </div>
            </section>

            <button
              type="button"
              className="btn btn-primary"
              onClick={calcular}
            >
              🧮 Calcular
            </button>
          </form>
        ) : (
          <div className="resultado-section">
            <div className="resultado-header">
              <h3>Resultado de Análisis</h3>
            </div>

            {/* Resumen de Datos */}
            <div className="resultado-card datos-card">
              <h4>📋 Datos de la Consulta</h4>
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
              <h4>📄 Modalidad de Facturación</h4>
              <div className="modo-principal">
                {getModoFacturacion()}
              </div>
            </div>

            {/* Modo de Cálculo */}
            {resultado.debe_facturar && (
              <div className="resultado-card modo-calculo-card">
                <h4>🧮 Modo de Cálculo</h4>
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
              <h4>⚖️ Normas y Requisitos Aplicables</h4>
              <ul className="normas-list">
                {resultado.normas && resultado.normas.map((norma, idx) => (
                  <li key={idx}>{norma}</li>
                ))}
              </ul>
            </div>

            {/* Marco Legal */}
            <div className="resultado-card marco-legal-card">
              <h4>📜 Marco Legal</h4>
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
                <strong>⚠️ ADVERTENCIA LEGAL:</strong> Esta calculadora proporciona información orientativa basada en la normativa tributaria paraguaya vigente.
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
                🔄 Nueva Consulta
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default VentaActivoFijo
