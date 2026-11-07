import { supabase } from './supabaseClient'

// URL del backend (Render). En desarrollo apunta al servidor local;
// en producción usa VITE_API_URL si está definida en Vercel.
export const API_BASE_URL = import.meta.env.DEV
  ? 'http://localhost:3000'
  : (import.meta.env.VITE_API_URL || 'https://quadra-45d6.onrender.com').replace(/\/$/, '')

// Encabezado Authorization con un token vigente.
// getSession() renueva el token si venció, así las llamadas no fallan tras una hora.
export const authHeaders = async () => {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token || localStorage.getItem('quaedra_token')
  if (data.session?.access_token) localStorage.setItem('quaedra_token', data.session.access_token)
  return token ? { Authorization: `Bearer ${token}` } : {}
}
