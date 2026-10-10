import React, { useState, useEffect } from 'react'
import axios from 'axios'

function History({ onSelectSession }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const token = localStorage.getItem('quaedra_token')
        const response = await axios.get('/api/sessions', {
          headers: { Authorization: `Bearer ${token}` }
        })
        setSessions(response.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchSessions()
  }, [])

  const formatDate = (d) => new Date(d).toLocaleDateString('es-PY', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  })

  if (loading) return <div className="card"><p>Cargando historial...</p></div>
  if (sessions.length === 0) return <div className="card"><p>No hay conciliaciones realizadas aún.</p></div>

  return (
    <div className="card">
      <h2>📋 Historial de Conciliaciones</h2>
      <div className="history-list">
        {sessions.map(session => {
          const errors = session.data.discrepancies.filter(d => d.status === 'error').length
          const success = session.data.discrepancies.filter(d => d.status === 'success').length
          return (
            <div key={session.id} className="history-item">
              <div className="history-info">
                <div className="history-date">📅 {formatDate(session.created_at)}</div>
                <div className="history-stats">
                  <span className="stat-success">✓ {success} coincidencias</span>
                  <span className="stat-error">✗ {errors} discrepancias</span>
                </div>
              </div>
              <button className="btn-secondary" onClick={() => onSelectSession(session)}>Ver →</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default History
