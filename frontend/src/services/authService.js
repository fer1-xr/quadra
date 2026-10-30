// Usa URLs relativas para que el proxy de Vite funcione en desarrollo
const API_URL = '/api';

export const authService = {
  // Registro de nuevo usuario
  signup: async (email, password, name) => {
    try {
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error en el registro');
      }

      // Guardar token y usuario
      localStorage.setItem('quaedra_token', data.token);
      localStorage.setItem('quaedra_user', JSON.stringify(data.user));

      return data;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Error en la respuesta del servidor');
      }
      throw new Error(error.message || 'Error al registrarse');
    }
  },

  // Login
  login: async (email, password) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error en el inicio de sesión');
      }

      // Guardar token y usuario
      localStorage.setItem('quaedra_token', data.token);
      localStorage.setItem('quaedra_user', JSON.stringify(data.user));

      return data;
    } catch (error) {
      throw new Error(error.message || 'Error al iniciar sesión');
    }
  },

  // Solicitar recuperación de contraseña
  forgotPassword: async (email) => {
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar el email');
      }

      return data;
    } catch (error) {
      throw new Error(error.message || 'Error al enviar el email de recuperación');
    }
  },

  // Restablecer contraseña con token
  resetPassword: async (token, newPassword) => {
    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al restablecer contraseña');
      }

      return data;
    } catch (error) {
      throw new Error(error.message || 'Error al restablecer la contraseña');
    }
  },

  // Logout
  logout: () => {
    localStorage.removeItem('quaedra_token');
    localStorage.removeItem('quaedra_user');
  },

  // Obtener token
  getToken: () => {
    return localStorage.getItem('quaedra_token');
  },

  // Obtener usuario
  getUser: () => {
    const user = localStorage.getItem('quaedra_user');
    return user ? JSON.parse(user) : null;
  },

  // Verificar si está autenticado
  isAuthenticated: () => {
    return !!localStorage.getItem('quaedra_token');
  },
};
