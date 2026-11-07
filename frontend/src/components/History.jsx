import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { API_BASE_URL, authHeaders } from '../services/api'

function History({ onSelectSession }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const auth = await authHeaders()
      const response = await axios.get(`${API_BASE_URL}/api/sessions`, {
        headers: { ...auth }
      })
      setHistory(response.data || [])
    } catch (err) {
      console.error('Error fetching history:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>Cargando historial...</div>
  }

  return (
    <div className="history-list">
      {history.length === 0 ? (
        <p>No hay historial disponible</p>
      ) : (
        history.map((session, idx) => (
          <div key={idx} className="history-item">
            <div className="history-info">
              <div className="history-date">{new Date(session.createdAt).toLocaleDateString('es-PY')}</div>
              <div className="history-stats">
                <span className="stat-success">✓ {session.data?.discrepancies?.filter(d => d.status === 'success').length || 0}</span>
                <span className="stat-error">✗ {session.data?.discrepancies?.filter(d => d.status === 'error').length || 0}</span>
              </div>
            </div>
            <button className="btn btn-secondary" onClick={() => onSelectSession(session)}>
              Ver detalles
            </button>
          </div>
        ))
      )}
    </div>
  )
}

export default History
