import React, { useState } from 'react'
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
          normas: [
            'Debe emitir factura de venta de inmuebles',
            'Aplica IVA según el caso (algunos inmuebles están exentos)',
            'Debe informar al SET la venta'
          ],
          decreto: 'Decreto 14.627/92 - Código Tributario de Paraguay',
          fuente: 'https://consultoria.com.py/caceres-schneider-asesoramiento-tributario-en-la-venta-de-inmuebles/'
        },
        'si': {
          debe_facturar: true,
          normas: [
            'Debe facturar como venta de activo fijo',
            'El activo debe ser registrado previamente en la contabilidad',
            'Aplica IVA según corresponda'
          ],
          decreto: 'Ley 1.682/2001 - Estatuto Tributario',
          fuente: 'https://consultoria.com.py/caceres-schneider-asesoramiento-tributario-en-la-venta-de-inmuebles/'
        },
        'no': {
          debe_facturar: true,
          normas: [
            'Como no es activo de la empresa, debe facturar la venta',
            'Aplica el régimen de personas físicas',
            'Debe cumplir obligaciones tributarias'
          ],
          decreto: 'Código Tributario - Art. 15',
          fuente: 'https://consultoria.com.py/caceres-schneider-asesoramiento-tributario-en-la-venta-de-inmuebles/'
        }
      },
      'ire-simple': {
        'no-aplica': {
          debe_facturar: false,
          normas: [
            'IRE SIMPLE está exento de facturación para actividades no comerciales',
            'No es obligatorio facturar inmuebles',
            'Debe declarar la renta en su declaración anual'
          ],
          decreto: 'Ley Nº 125/91 - Régimen de Impuesto a la Renta Simple',
          fuente: 'https://consultoria.com.py/caceres-schneider-asesoramiento-tributario-en-la-venta-de-inmuebles/'
        },
        'si': {
          debe_facturar: false,
          normas: [
            'Si es activo de la empresa bajo IRE SIMPLE, generalmente está exento',
            'No requiere facturación especial',
            'Declarar en formulario anual'
          ],
          decreto: 'Ley Nº 125/91 - Régimen de IRE Simple',
          fuente: 'https://consultoria.com.py/caceres-schneider-asesoramiento-tributario-en-la-venta-de-inmuebles/'
        },
        'no': {
          debe_facturar: false,
          normas: [
            'No aplicable para IRE SIMPLE sin actividad comercial',
            'No requiere factura',
            'Puede informar voluntariamente al SET'
          ],
          decreto: 'Ley Nº 125/91',
          fuente: 'https://consultoria.com.py/caceres-schneider-asesoramiento-tributario-en-la-venta-de-inmuebles/'
        }
      },
      'ire-general': {
        'no-aplica': {
          debe_facturar: true,
          normas: [
            'Debe emitir factura obligatoriamente',
            'IRE GENERAL exige facturación para todas las transacciones',
            'Aplica IVA según la naturaleza del bien'
          ],
          decreto: 'Ley Nº 125/91 - IRE General Art. 8',
          fuente: 'https://consultoria.com.py/caceres-schneider-asesoramiento-tributario-en-la-venta-de-inmuebles/'
        },
        'si': {
          debe_facturar: true,
          normas: [
            'Obligatorio facturar como venta de bien de activo fijo',
            'Debe coincidir con registros contables',
            'Puede aplicar depreciaciónes acumuladas'
          ],
          decreto: 'Ley Nº 125/91 y Decreto 14.627/92',
          fuente: 'https://consultoria.com.py/caceres-schneider-asesoramiento-tributario-en-la-venta-de-inmuebles/'
        },
        'no': {
          debe_facturar: true,
          normas: [
            'Bajo IRE GENERAL debe facturar obligatoriamente',
            'Aplican todas las retenciones e impuestos correspondientes'
          ],
          decreto: 'Código Tributario Art. 128',
          fuente: 'https://consultoria.com.py/caceres-schneider-asesoramiento-tributario-en-la-venta-de-inmuebles/'
        }
      },
      'no-contribuyente': {
        'no-aplica': {
          debe_facturar: true,
          normas: [
            'No contribuyente debe emitir factura de venta de inmueble',
            'Debe indicar su condición en el documento',
            'Aplica retención del 2% sobre el monto'
          ],
          decreto: 'Resolución SET relativa a No Contribuyentes',
          fuente: 'https://consultoria.com.py/caceres-schneider-asesoramiento-tributario-en-la-venta-de-inmuebles/'
        },
        'si': {
          debe_facturar: true,
          normas: [
            'Debe facturar como no contribuyente',
            'Indica la venta de activo de la empresa',
            'Aplica retención de 2%'
          ],
          decreto: 'Resolución SET',
          fuente: 'https://consultoria.com.py/caceres-schneider-asesoramiento-tributario-en-la-venta-de-inmuebles/'
        },
        'no': {
          debe_facturar: true,
          normas: [
            'Como persona sin condición de contribuyente debe facturar',
            'Informa que el bien no es activo de empresa',
            'Aplica normativa de persona física'
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
            normas: [
              'Debe facturar como vendedor de vehículo nuevo',
              'Requiere documentación especial del fabricante/distribuidor',
              'Aplica IVA del 10% sobre el monto',
              'Debe tramitar el cambio de titularidad ante Dirección General de Aduanas'
            ],
            decreto: 'Decreto Nº 4.295/13 y Ley de Aduanas',
            fuente: 'https://consultoria.com.py/facturacion-venta-vehiculo-paraguay/'
          },
          'si': {
            debe_facturar: true,
            normas: [
              'Factura como venta de vehículo nuevo que es activo de la empresa',
              'Debe haber sido registrado en activos fijos',
              'Aplica depreciación acumulada'
            ],
            decreto: 'Decreto Nº 4.295/13',
            fuente: 'https://consultoria.com.py/facturacion-venta-vehiculo-paraguay/'
          },
          'no': {
            debe_facturar: true,
            normas: [
              'Factura como vendedor aunque no es activo de empresa',
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
            normas: [
              'Venta de vehículo usado - Debe facturar',
              'No aplica IVA en venta de usado (exento)',
              'Requiere comprobante de transferencia ante DGA',
              'Debe constar el RUC y datos del comprador'
            ],
            decreto: 'Decreto Nº 4.295/13 y Exención IVA para vehículos usados',
            fuente: 'https://consultoria.com.py/facturacion-venta-vehiculo-paraguay/'
          },
          'si': {
            debe_facturar: true,
            normas: [
              'Venda de activo fijo - vehículo usado',
              'Exento de IVA',
              'Debe detallar depreciaciones acumuladas en contabilidad'
            ],
            decreto: 'Decreto Nº 4.295/13',
            fuente: 'https://consultoria.com.py/facturacion-venta-vehiculo-paraguay/'
          },
          'no': {
            debe_facturar: true,
            normas: [
              'Venta de vehículo usado - Factura obligatoria',
              'Sin IVA (exento)',
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
            normas: [
              'IRE SIMPLE - No obligatorio facturar venta de vehículo nuevo',
              'Debe declarar en formulario anual',
              'No está dentro del giro del negocio generalmente'
            ],
            decreto: 'Ley Nº 125/91 - IRE Simple',
            fuente: 'https://consultoria.com.py/facturacion-venta-vehiculo-paraguay/'
          },
          'si': {
            debe_facturar: false,
            normas: [
              'IRE SIMPLE - Activo de empresa',
              'No requiere factura especial',
              'Informar en declaración anual'
            ],
            decreto: 'Ley Nº 125/91',
            fuente: 'https://consultoria.com.py/facturacion-venta-vehiculo-paraguay/'
          },
          'no': {
            debe_facturar: false,
            normas: [
              'No es venta dentro del giro de IRE SIMPLE',
              'No requiere factura'
            ],
            decreto: 'Ley Nº 125/91',
            fuente: 'https://consultoria.com.py/facturacion-venta-vehiculo-paraguay/'
          }
        },
        'usado': {
          'no-aplica': {
            debe_facturar: false,
            normas: [
              'IRE SIMPLE - No obligatorio',
              'Venta de bien de uso personal',
              'Declarar voluntariamente'
            ],
            decreto: 'Ley Nº 125/91',
            fuente: 'https://consultoria.com.py/facturacion-venta-vehiculo-paraguay/'
          },
          'si': {
            debe_facturar: false,
            normas: [
              'IRE SIMPLE - Activo fijo de empresa',
              'Generalmente exento de facturación obligatoria',
              'Reportar en liquidación anual'
            ],
            decreto: 'Ley Nº 125/91',
            fuente: 'https://consultoria.com.py/facturacion-venta-vehiculo-paraguay/'
          },
          'no': {
            debe_facturar: false,
            normas: [
              'No requiere factura bajo IRE SIMPLE'
            ],
            decreto: 'Ley Nº 125/91',
            fuente: 'https://consultoria.com.py/facturacion-venta-vehiculo-paraguay/'
          }
        }
      },
      'ire-general': {
        'nuevo': {
          'no-aplica': {
            debe_facturar: true,
            normas: [
              'IRE GENERAL - Facturación obligatoria',
              'Venta de vehículo nuevo',
              'Aplica IVA del 10%',
              'Debe registrarse en contabilidad'
            ],
            decreto: 'Ley Nº 125/91 - IRE General',
            fuente: 'https://consultoria.com.py/facturacion-venta-vehiculo-paraguay/'
          },
          'si': {
            debe_facturar: true,
            normas: [
              'IRE GENERAL - Activo fijo de empresa',
              'Facturación obligatoria',
              'Aplica IVA',
              'Debe coincidir con depreciaciones contables'
            ],
            decreto: 'Ley Nº 125/91 y Decreto 14.627/92',
            fuente: 'https://consultoria.com.py/facturacion-venta-vehiculo-paraguay/'
          },
          'no': {
            debe_facturar: true,
            normas: [
              'IRE GENERAL - Facturación obligatoria',
              'Venta de vehículo nuevo sin ser activo de empresa',
              'Aplica IVA y retenciones'
            ],
            decreto: 'Código Tributario',
            fuente: 'https://consultoria.com.py/facturacion-venta-vehiculo-paraguay/'
          }
        },
        'usado': {
          'no-aplica': {
            debe_facturar: true,
            normas: [
              'IRE GENERAL - Factura obligatoria',
              'Vehículo usado - Exento de IVA',
              'Requiere comprobante de DGA',
              'Debe indicarse el estado del vehículo'
            ],
            decreto: 'Decreto Nº 4.295/13 - Exención IVA',
            fuente: 'https://consultoria.com.py/facturacion-venta-vehiculo-paraguay/'
          },
          'si': {
            debe_facturar: true,
            normas: [
              'IRE GENERAL - Venta de activo fijo usado',
              'Exento de IVA',
              'Requiere documentación de DGA',
              'Reportar depreciación acumulada'
            ],
            decreto: 'Decreto Nº 4.295/13',
            fuente: 'https://consultoria.com.py/facturacion-venta-vehiculo-paraguay/'
          },
          'no': {
            debe_facturar: true,
            normas: [
              'IRE GENERAL - Facturación obligatoria',
              'Exento de IVA',
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
            normas: [
              'PLAYA DE VEHICULOS - Facturación OBLIGATORIA',
              'Vehículo nuevo - Activo de la empresa',
              'Aplica IVA del 10%',
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
            normas: [
              'PLAYA DE VEHICULOS - Facturación OBLIGATORIA',
              'Vehículo usado - Activo de empresa',
              'Exento de IVA para usados',
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
            normas: [
              'NO CONTRIBUYENTE - Debe facturar venta de vehículo nuevo',
              'Indica su condición de no contribuyente en factura',
              'Aplica retención del 1% del monto',
              'Requiere identificarse ante el comprador'
            ],
            decreto: 'Resolución SET - Tratamiento de No Contribuyentes',
            fuente: 'https://consultoria.com.py/facturacion-venta-vehiculo-paraguay/'
          },
          'si': {
            debe_facturar: true,
            normas: [
              'NO CONTRIBUYENTE - Activo de empresa',
              'Debe facturar la venta',
              'Aplica retención de 1%',
              'Documentar adecuadamente'
            ],
            decreto: 'Resolución SET',
            fuente: 'https://consultoria.com.py/facturacion-venta-vehiculo-paraguay/'
          },
          'no': {
            debe_facturar: true,
            normas: [
              'NO CONTRIBUYENTE - Factura obligatoria',
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
            normas: [
              'NO CONTRIBUYENTE - Debe facturar vehículo usado',
              'Exento de IVA',
              'Aplica retención de 1%',
              'Documentar con comprobante de DGA'
            ],
            decreto: 'Resolución SET',
            fuente: 'https://consultoria.com.py/facturacion-venta-vehiculo-paraguay/'
          },
          'si': {
            debe_facturar: true,
            normas: [
              'NO CONTRIBUYENTE - Activo fijo usado',
              'Factura obligatoria',
              'Exento de IVA',
              'Aplica retención de 1%'
            ],
            decreto: 'Resolución SET',
            fuente: 'https://consultoria.com.py/facturacion-venta-vehiculo-paraguay/'
          },
          'no': {
            debe_facturar: true,
            normas: [
              'NO CONTRIBUYENTE - Facturación obligatoria',
              'Exento de IVA',
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
