import React, { useState } from 'react'
import axios from 'axios'
import '../styles/Cotizacion.css'

const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3000'
  : 'https://quadra-45d6.onrender.com'

const MONEDAS = [
  { code: 'USD', name: 'Dólar Estadounidense' },
  { code: 'ARS', name: 'Peso Argentino' },
  { code: 'BRL', name: 'Real Brasileño' },
  { code: 'CLP', name: 'Peso Chileno' },
  { code: 'EUR', name: 'Euro' },
  { code: 'CHF', name: 'Franco Suizo' },
  { code: 'JPY', name: 'Yen Japonés' },
  { code: 'GBP', name: 'Libra Esterlina' },
]

function Cotizacion() {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [moneda, setMoneda] = useState('USD')
  const [cotizacion, setCotizacion] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [historico, setHistorico] = useState([])

  const handleConsultar = async () => {
    if (!fecha || !moneda) {
      setError('Por favor selecciona fecha y moneda')
      return
    }

    setLoading(true)
    setError('')
    setCotizacion(null)

    try {
      const token = localStorage.getItem('quaedra_token')
      const response = await axios.post(
        `${API_BASE_URL}/api/cotizacion`,
        { fecha, moneda },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (response.data.success) {
        setCotizacion(response.data.data)
        setHistorico(prev => [response.data.data, ...prev.slice(0, 9)])
      } else {
        setError(response.data.message || 'Error al obtener cotización')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al consultar cotización')
    } finally {
      setLoading(false)
    }
  }

  const handleLimpiar = () => {
    setFecha(new Date().toISOString().split('T')[0])
    setMoneda('USD')
    setCotizacion(null)
    setError('')
    setHistorico([])
  }

  const monedaSeleccionada = MONEDAS.find(m => m.code === moneda)

  return (
    <div className="cotizacion-container">
      <div className="card cotizacion-card">
        <div className="cotizacion-header">
          <h2>💱 Cotización DNIT</h2>
          <p>Consulta tipos de cambio del DNIT por fecha, moneda y cálculo de comprador/vendedor</p>
        </div>

        <div className="cotizacion-form">
          <div className="form-group">
            <label htmlFor="fecha">Fecha</label>
            <input
              type="date"
              id="fecha"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              disabled={loading}
            />
            <small>Selecciona la fecha para consultar el tipo de cambio</small>
          </div>

          <div className="form-group">
            <label htmlFor="moneda">Moneda</label>
            <select
              id="moneda"
              value={moneda}
              onChange={(e) => setMoneda(e.target.value)}
              disabled={loading}
            >
              {MONEDAS.map(m => (
                <option key={m.code} value={m.code}>
                  {m.code} - {m.name}
                </option>
              ))}
            </select>
            <small>Selecciona la moneda a consultar</small>
          </div>

          <div className="form-group">
            <label>&nbsp;</label>
            <div className="button-group">
              <button
                className="btn btn-primary"
                onClick={handleConsultar}
                disabled={loading}
              >
                {loading ? '⏳ Consultando...' : '🔍 Consultar Cotización'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleLimpiar}
                disabled={loading}
              >
                🔄 Limpiar
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        {cotizacion && (
          <div className="cotizacion-resultado">
            <h3>Cotización para {monedaSeleccionada?.name} ({moneda})</h3>
            <p className="fecha-resultado">Fecha: {new Date(cotizacion.fecha).toLocaleDateString('es-PY')}</p>

            <div className="cotizacion-grid">
              <div className="cotizacion-item">
                <span className="label">Comprador</span>
                <span className="valor">₲ {parseFloat(cotizacion.comprador).toLocaleString('es-PY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="cotizacion-item">
                <span className="label">Vendedor</span>
                <span className="valor">₲ {parseFloat(cotizacion.vendedor).toLocaleString('es-PY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="cotizacion-item">
                <span className="label">Diferencia</span>
                <span className="valor diferencia">₲ {(parseFloat(cotizacion.vendedor) - parseFloat(cotizacion.comprador)).toLocaleString('es-PY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="cotizacion-info">
              <p><strong>1 {moneda}</strong> = <strong>₲ {parseFloat(cotizacion.comprador).toFixed(2)}</strong> (Comprador)</p>
              <p><strong>1 {moneda}</strong> = <strong>₲ {parseFloat(cotizacion.vendedor).toFixed(2)}</strong> (Vendedor)</p>
            </div>
          </div>
        )}

        {historico.length > 0 && (
          <div className="historico-section">
            <h3>Últimas Consultas</h3>
            <div className="table-wrapper">
              <table className="historico-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Moneda</th>
                    <th>Comprador</th>
                    <th>Vendedor</th>
                    <th>Diferencia</th>
                  </tr>
                </thead>
                <tbody>
                  {historico.map((item, idx) => (
                    <tr key={idx}>
                      <td>{new Date(item.fecha).toLocaleDateString('es-PY')}</td>
                      <td>{item.moneda}</td>
                      <td className="valor-comprador">₲ {parseFloat(item.comprador).toFixed(2)}</td>
                      <td className="valor-vendedor">₲ {parseFloat(item.vendedor).toFixed(2)}</td>
                      <td className="valor-diferencia">₲ {(parseFloat(item.vendedor) - parseFloat(item.comprador)).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Cotizacion
