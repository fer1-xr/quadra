# Plan de Recuperación y Cambio de Contraseña

## 🔐 Opciones Disponibles (Seguridad vs Conveniencia)

### Opción 1: ❌ Enviar Nueva Contraseña por Email (NO RECOMENDADO)
```
Riesgos:
- La contraseña viaja por email en texto plano
- El usuario nunca vio la contraseña
- Si el email es interceptado, cuenta comprometida
- No sigue estándares de seguridad modernos
```

### Opción 2: ✅ RECOMENDADA - Token de Cambio (Reset Link)
```
Flujo Seguro:
1. Usuario hace click en "¿Olvidaste contraseña?"
2. Ingresa su email
3. Sistema genera un TOKEN único (JWT de corta duración - 15-30 min)
4. Envía email con enlace: https://quadra.com/reset-password?token=TOKEN
5. Usuario hace click en el enlace
6. Valida el token en backend
7. Usuario ingresa NUEVA contraseña (se valida fortaleza)
8. Se hashea y guarda en BD
9. Token se invalida (no reutilizable)

Ventajas:
✅ Token expira rápidamente (15-30 minutos)
✅ La nueva contraseña nunca viaja por email
✅ El usuario elige su propia contraseña
✅ Token es único y no reutilizable
✅ Estándar de seguridad moderno
✅ Compatible con OWASP y GDPR
```

### Opción 3: ✅ ALTERNATIVA - Cambio de Contraseña Autenticado
```
Para usuarios logueados que quieren cambiar su contraseña actual:
1. Usuario ingresa contraseña actual (verificación)
2. Ingresa nueva contraseña (validación de fortaleza)
3. Sistema valida y guarda
4. Sin necesidad de email
```

---

## 📋 Plan de Implementación Recomendado

### **FASE 1: "Olvidé mi contraseña" (Reset Password)**

#### Frontend:
```
1. Nueva pantalla: "Recuperar Contraseña"
   - Campo email (con validación)
   - Botón "Enviar Enlace de Recuperación"
   - Mensaje: "Revisa tu email con instrucciones"

2. Pantalla: "Establecer Nueva Contraseña" (al hacer click en email)
   - Campo contraseña nueva (con indicador de fortaleza)
   - Campo confirmar contraseña
   - Botón "Guardar Nueva Contraseña"
   - Validaciones de seguridad
```

#### Backend:
```
POST /api/auth/forgot-password
- Recibe: email
- Valida que el email existe
- Genera JWT token (exp: 15 min)
- Guarda token en tabla `password_resets` (opcional pero recomendado)
- Envía email con link: http://localhost:5173/reset-password?token=TOKEN

POST /api/auth/reset-password
- Recibe: token, newPassword
- Valida que token es válido y no expiró
- Valida fortaleza de nueva contraseña
- Guarda nueva contraseña hasheada
- Invalida el token (o borra el registro)
- Responde: "Contraseña actualizada. Ingresa con tu nuevo password"
```

#### BD (Supabase):
```sql
-- Nueva tabla (opcional pero recomendada)
CREATE TABLE password_resets (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  token VARCHAR UNIQUE,
  expires_at TIMESTAMP,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- O simplemente usar JWT sin guardar en BD
```

---

### **FASE 2: "Cambiar Contraseña" (Para usuarios logueados)**

#### Frontend:
```
Nueva sección en perfil/configuración:
- Campo "Contraseña Actual"
- Campo "Nueva Contraseña" (con indicador)
- Campo "Confirmar Nueva Contraseña"
- Botón "Cambiar Contraseña"
```

#### Backend:
```
POST /api/auth/change-password (REQUIERE TOKEN VALIDO)
- Recibe: currentPassword, newPassword
- Valida que el usuario esté autenticado
- Verifica que currentPassword coincide con la guardada
- Valida fortaleza de newPassword
- Hashea y guarda
- Responde: "Contraseña actualizada"
```

---

## 📧 Configuración de Email

### Proveedor de Email:
Opciones:
1. **SendGrid** (recomendado) - 100 emails/día gratis
2. **Mailgun** - 5,000 emails/mes gratis
3. **Resend** - Optimizado para React
4. **AWS SES** - Si ya usas AWS

### Contenido del Email:
```html
Asunto: Recupera tu contraseña en QUΔDRA

Hola [nombre],

Solicitaste recuperar tu contraseña.
Haz click en el siguiente enlace (válido por 15 minutos):

[BOTÓN] Cambiar Contraseña
https://quadra.app/reset-password?token=eyJ...

Si no solicitaste esto, ignora este email.

---
Equipo QUΔDRA
```

---

## 🔒 Consideraciones de Seguridad

```
✅ Token corta duración (15-30 min)
✅ Token único y no predecible (JWT con SECRET)
✅ Token solo para un propósito (reset-password)
✅ La nueva contraseña nunca en email
✅ El usuario elige su propia contraseña
✅ Hash bcrypt para almacenar
✅ HTTPS solo (nunca HTTP)
✅ Rate limiting en /forgot-password (máx 3 intentos/hora)
✅ Log de cambios de contraseña
✅ Validación de fortaleza robusta
```

---

## 📊 Flujo Completo Visualizado

```
Usuario olvida contraseña
        ↓
Click en "¿Olvidaste contraseña?"
        ↓
Ingresa email
        ↓
POST /api/auth/forgot-password
        ↓
Sistema valida email existe
        ↓
Genera TOKEN JWT (15 min)
        ↓
Envía email con link
        ↓
Usuario abre email
        ↓
Click en "Cambiar Contraseña"
        ↓
Usuario ingresa nueva contraseña
        ↓
Validación de fortaleza ✅
        ↓
POST /api/auth/reset-password {token, newPassword}
        ↓
Backend valida token válido y no expiró
        ↓
Hashea y guarda nueva contraseña
        ↓
Invalida token
        ↓
Respuesta: "Contraseña actualizada"
        ↓
Redirige a login
        ↓
Usuario ingresa con nuevo password ✅
```

---

## ⏱️ Timeline de Implementación

**FASE 1: Reset Password (Hoy)**
- [ ] Crear pantalla "Olvidé mi contraseña"
- [ ] Crear pantalla "Establecer nueva contraseña"
- [ ] API /forgot-password
- [ ] API /reset-password
- [ ] Configurar proveedor de email
- [ ] Testing

**FASE 2: Change Password (Después)**
- [ ] Crear sección en perfil
- [ ] API /change-password
- [ ] Testing

---

## 🎯 Resumen

**¿Cómo recupera el usuario su contraseña?**
1. Click "¿Olvidaste contraseña?"
2. Ingresa email
3. Recibe email con enlace seguro
4. Crea NUEVA contraseña
5. Inicia sesión ✅

**¿Por qué es seguro?**
- Contraseña NUNCA por email
- Token expira en 15 minutos
- El usuario elige su propia contraseña
- Sigue estándares OWASP

**¿Como SaaS qué haces?**
- Validar email
- Generar token JWT seguro
- Enviar email (mediante proveedor confiable)
- Validar token al reset
- Guardar nueva contraseña hasheada

---

**¿Empezamos a implementar?** 🚀
