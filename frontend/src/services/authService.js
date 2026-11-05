import { supabase } from './supabaseClient'

// Forma del usuario que se guarda en localStorage y recibe la app
const toLocalUser = (u) => ({
  id: u.id,
  email: u.email,
  name: u.user_metadata?.name || u.email.split('@')[0],
  avatar_url: u.user_metadata?.avatar_url || null,
  plan: u.user_metadata?.plan || 'basico',
  created_at: u.created_at,
})

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
        console.error('Supabase signup error:', authError)
        throw new Error(authError.message || 'Error al registrarse')
      }

      // Guardar información en localStorage
      if (authData.user) {
        localStorage.setItem('quaedra_token', authData.session?.access_token || '')
        localStorage.setItem('quaedra_user', JSON.stringify({
          id: authData.user.id,
          email: authData.user.email,
          name: name,
        }))
      }

      return authData
    } catch (error) {
      console.error('Signup error:', error)
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
        localStorage.setItem('quaedra_user', JSON.stringify(toLocalUser(data.user)))
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

  // Perfil: datos de la cuenta en Supabase (fecha de alta, nombre, foto, plan)
  getProfile: async () => {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data?.user) throw new Error(error?.message || 'No se pudo leer la cuenta')
    return toLocalUser(data.user)
  },

  // Actualiza nombre, foto o plan (user_metadata) y la copia local
  updateProfile: async (changes) => {
    const { data, error } = await supabase.auth.updateUser({ data: changes })
    if (error) throw new Error(error.message || 'No se pudieron guardar los cambios')
    const user = toLocalUser(data.user)
    localStorage.setItem('quaedra_user', JSON.stringify(user))
    return user
  },

  // Sube la foto de perfil al bucket "avatars" y devuelve su URL pública
  uploadAvatar: async (userId, blob) => {
    const path = `${userId}/avatar-${Date.now()}.jpg`
    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, blob, { contentType: 'image/jpeg', upsert: true })
    if (error) throw new Error(error.message || 'No se pudo subir la foto')
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    return data.publicUrl
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
