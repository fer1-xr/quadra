import { supabase } from './supabaseClient'

export const authService = {
  // Registro de nuevo usuario
  signup: async (email, password, name) => {
    try {
      // Registrar con Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          },
        },
      })

      if (authError) {
        throw new Error(authError.message)
      }

      // Guardar información en localStorage
      if (authData.session) {
        localStorage.setItem('quaedra_token', authData.session.access_token)
        localStorage.setItem('quaedra_user', JSON.stringify({
          id: authData.user.id,
          email: authData.user.email,
          name: name,
        }))
      }

      return authData
    } catch (error) {
      throw new Error(error.message || 'Error al registrarse')
    }
  },

  // Login
  login: async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw new Error(error.message)
      }

      // Guardar sesión
      if (data.session) {
        localStorage.setItem('quaedra_token', data.session.access_token)
        localStorage.setItem('quaedra_user', JSON.stringify({
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name || email.split('@')[0],
        }))
      }

      return data
    } catch (error) {
      throw new Error(error.message || 'Error al iniciar sesión')
    }
  },

  // Solicitar recuperación de contraseña
  forgotPassword: async (email) => {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        throw new Error(error.message)
      }

      return data
    } catch (error) {
      throw new Error(error.message || 'Error al enviar el email de recuperación')
    }
  },

  // Restablecer contraseña con token
  resetPassword: async (token, newPassword) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) {
        throw new Error(error.message)
      }

      return data
    } catch (error) {
      throw new Error(error.message || 'Error al restablecer la contraseña')
    }
  },

  // Logout
  logout: async () => {
    try {
      await supabase.auth.signOut()
      localStorage.removeItem('quaedra_token')
      localStorage.removeItem('quaedra_user')
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    }
  },

  // Obtener token
  getToken: () => {
    return localStorage.getItem('quaedra_token')
  },

  // Obtener usuario
  getUser: () => {
    const user = localStorage.getItem('quaedra_user')
    return user ? JSON.parse(user) : null
  },

  // Verificar si está autenticado
  isAuthenticated: () => {
    return !!localStorage.getItem('quaedra_token')
  },

  // Obtener sesión actual
  getCurrentSession: async () => {
    try {
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error
      return data.session
    } catch (error) {
      console.error('Error al obtener sesión:', error)
      return null
    }
  },
}
