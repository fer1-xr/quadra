import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const app = express()
const JWT_SECRET = 'quaedra-secret-key-2024-paraguay'
const PORT = 3000

// Datos simulados en memoria
const users = new Map()

app.use(cors())
app.use(express.json())

// Validaciones
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

const validatePassword = (password) => {
  if (password.length < 8) return false
  if (!/[A-Z]/.test(password)) return false
  if (!/[a-z]/.test(password)) return false
  if (!/\d/.test(password)) return false
  if (!/[@$!%*?&]/.test(password)) return false
  return true
}

// Signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, contraseña y nombre son requeridos' })
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Email inválido' })
    }

    if (!validatePassword(password)) {
      return res.status(400).json({ error: 'Contraseña débil. Debe tener mínimo 8 caracteres, mayúsculas, minúsculas, números y símbolos especiales' })
    }

    if (name.trim().length < 2) {
      return res.status(400).json({ error: 'El nombre debe tener al menos 2 caracteres' })
    }

    // Verificar si el email ya existe
    if (users.has(email)) {
      return res.status(400).json({ error: 'Este email ya está registrado' })
    }

    // Hashear contraseña
    const password_hash = await bcrypt.hash(password, 10)

    // Crear usuario
    const userId = 'user-' + Math.random().toString(36).substr(2, 9)
    const userData = {
      id: userId,
      email,
      name: name.trim(),
      password_hash,
      created_at: new Date()
    }

    users.set(email, userData)

    // Generar token
    const token = jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '30d' })

    res.json({
      token,
      user: { id: userId, email, name: name.trim() }
    })
  } catch (e) {
    console.error('Error en signup:', e)
    res.status(500).json({ error: 'Error en el servidor' })
  }
})

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son requeridos' })
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Email inválido' })
    }

    const userData = users.get(email)
    if (!userData) {
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }

    const valid = await bcrypt.compare(password, userData.password_hash)
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }

    const token = jwt.sign({ id: userData.id, email }, JWT_SECRET, { expiresIn: '30d' })

    res.json({
      token,
      user: { id: userData.id, email, name: userData.name }
    })
  } catch (e) {
    console.error('Error en login:', e)
    res.status(500).json({ error: 'Error en el servidor' })
  }
})

// Forgot Password (simulado)
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ error: 'El email es requerido' })
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Email inválido' })
    }

    // Simular envío de email
    const userData = users.get(email)
    if (userData) {
      // Generar token temporal
      const resetToken = jwt.sign(
        { id: userData.id, email, type: 'password-reset' },
        JWT_SECRET,
        { expiresIn: '15m' }
      )
      console.log(`\n📧 EMAIL SIMULADO - Enlace de recuperación para ${email}:`)
      console.log(`🔗 http://localhost:5173/?token=${resetToken}\n`)
    }

    // Por seguridad, siempre responder igual
    res.json({ message: 'Si el email existe, recibirás un enlace de recuperación' })
  } catch (e) {
    console.error('Error en forgot-password:', e)
    res.status(500).json({ error: 'Error en el servidor' })
  }
})

// Reset Password
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token y contraseña son requeridos' })
    }

    // Verificar token
    let decoded
    try {
      decoded = jwt.verify(token, JWT_SECRET)
    } catch (err) {
      return res.status(400).json({ error: 'El enlace de recuperación ha expirado' })
    }

    if (decoded.type !== 'password-reset') {
      return res.status(400).json({ error: 'Token inválido' })
    }

    // Validar nueva contraseña
    if (!validatePassword(newPassword)) {
      return res.status(400).json({ error: 'Contraseña débil. Debe tener mínimo 8 caracteres, mayúsculas, minúsculas, números y símbolos especiales' })
    }

    // Actualizar contraseña
    const userData = users.get(decoded.email)
    if (userData) {
      userData.password_hash = await bcrypt.hash(newPassword, 10)
      users.set(decoded.email, userData)
    }

    res.json({ message: 'Contraseña actualizada. Por favor inicia sesión con tu nueva contraseña' })
  } catch (e) {
    console.error('Error en reset-password:', e)
    res.status(500).json({ error: 'Error en el servidor' })
  }
})

app.listen(PORT, () => {
  console.log(`✅ QUΔDRA Mock Backend - Servidor corriendo en puerto ${PORT}`)
  console.log(`📝 Base de datos simulada (en memoria)`)
})
