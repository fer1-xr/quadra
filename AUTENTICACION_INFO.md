# QUΔDRA - Información de Autenticación

## 🗄️ Base de Datos

### Dónde se guardan los usuarios
**Supabase**: https://knlzuwimaocubmpfquin.supabase.co

**Tabla**: `users`

**Campos**:
- `id` (UUID) - Identificador único
- `email` (VARCHAR) - Email del usuario
- `password_hash` (VARCHAR) - Contraseña hasheada con bcrypt
- `name` (VARCHAR) - Nombre del usuario
- `created_at` (TIMESTAMP) - Fecha de creación

### Cómo ver los usuarios

1. **Opción 1: Dashboard Supabase (Interfaz Web)**
   - Ir a: https://knlzuwimaocubmpfquin.supabase.co
   - Login con credenciales de Supabase
   - SQL Editor → Ejecutar query
   - Ver tabla `users` en Table Editor

2. **Opción 2: Consulta SQL directa**
   ```sql
   SELECT id, email, name, created_at FROM users;
   ```

3. **Opción 3: Por API (desde backend)**
   ```bash
   curl -H "Authorization: Bearer [SUPABASE_KEY]" \
     "https://knlzuwimaocubmpfquin.supabase.co/rest/v1/users"
   ```

---

## 📝 Flujo Actual de Autenticación

### Registro (Signup)
```
Frontend (Login.jsx)
  ↓
POST /api/auth/signup { email, password, name }
  ↓
Backend (server.js)
  ↓ Hashea contraseña con bcrypt
  ↓ Inserta en tabla users de Supabase
  ↓
Devuelve token JWT y datos del usuario
```

### Login
```
Frontend (Login.jsx)
  ↓
POST /api/auth/login { email, password }
  ↓
Backend (server.js)
  ↓ Busca usuario por email en Supabase
  ↓ Verifica contraseña con bcrypt.compare()
  ↓
Devuelve token JWT si es válido
```

---

## 🔐 Validaciones Actuales

### Frontend (Login.jsx)
- ✅ `type="email"` en HTML5 (validación básica del navegador)
- ✅ `required` en campos
- ❌ **Sin validación de fortaleza de contraseña**
- ❌ **Sin sugerencias de contraseñas**

### Backend (server.js)
- ✅ Hasheo de contraseña con bcrypt (10 rounds)
- ✅ Verificación de credenciales
- ❌ **Sin validación de email format**
- ❌ **Sin requisitos de contraseña fuerte**
- ❌ **Sin validación de campos vacíos**

---

## 🛠️ Mejoras Recomendadas

### Frontend (Login.jsx)
1. ✅ Validación de email (regex o librería)
2. ✅ Indicador de fortaleza de contraseña
3. ✅ Sugerencias de contraseñas fuertes
4. ✅ Validación en tiempo real
5. ✅ Mensajes de error más específicos

### Backend (server.js)
1. ✅ Validación de formato de email
2. ✅ Requisitos mínimos de contraseña
3. ✅ Prevención de registros duplicados
4. ✅ Rate limiting para login
5. ✅ Validación de entrada

---

## 📊 Tabla users en Supabase

```
┌────────────────────┬──────────────────────┬──────────┬────────────┐
│        id          │        email         │   name   │ password_  │
│                    │                      │          │    hash    │
├────────────────────┼──────────────────────┼──────────┼────────────┤
│ uuid-123-abc       │ user@example.com     │ Juan     │ $2b$10$... │
│ uuid-456-def       │ admin@example.com    │ Admin    │ $2b$10$... │
└────────────────────┴──────────────────────┴──────────┴────────────┘
```

---

## 🔑 JWT Token

- **Estructura**: `Header.Payload.Signature`
- **Secret**: `quaedra-secret-key-2024-paraguay` (definido en .env)
- **Expiración**: 30 días
- **Datos incluidos**: `id` y `email` del usuario

