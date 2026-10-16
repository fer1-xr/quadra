import React, { useState, useEffect } from 'react'
import axios from 'axios'

const API_BASE_URL = 'http://localhost:3000'

function History({ onSelectSession }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('quaedra_token')
      const response = await axios.get(`${API_BASE_URL}/api/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
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
