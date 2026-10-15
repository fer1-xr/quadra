# Configuración de SendGrid para Recuperación de Contraseña

## El Problema
Cuando intentas usar la función "¿Olvidaste tu contraseña?" en Quadra, recibes un error: **"Servicio de email no configurado. Contacta al administrador."**

Esto ocurre porque **SendGrid no está configurado** en las variables de entorno.

---

## Solución: Configurar SendGrid

### Paso 1: Crear una Cuenta en SendGrid (Gratis)

1. Ve a [https://sendgrid.com/](https://sendgrid.com/)
2. Haz clic en **"Sign Up"** (Registrarse)
3. Completa el formulario con:
   - **Email**: Tu email
   - **Password**: Una contraseña fuerte
   - **Nombre**: Tu nombre
   - **Empresa**: Quadra (o tu empresa)

4. Verifica tu email
5. Completa el onboarding básico

---

### Paso 2: Obtener la API Key

1. Accede a tu cuenta de SendGrid
2. En el menú lateral, busca **"Settings"** → **"API Keys"**
3. Haz clic en **"Create API Key"**
4. Dale un nombre descriptivo: `Quadra Password Recovery`
5. Selecciona **"Full Access"** o al menos permisos para "Mail Send"
6. Haz clic en **"Create & View"**
7. **COPIA LA API KEY** (no podrás verla de nuevo)

---

### Paso 3: Configurar Variables de Entorno

1. Abre el archivo `backend/.env`:
   ```
   SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   SENDGRID_FROM_EMAIL=noreply@quadra.com
   FRONTEND_URL=http://localhost:5173
   ```

2. Reemplaza `SG.xxxx...` con tu API key de SendGrid

3. **Importante**: El `SENDGRID_FROM_EMAIL` puede ser:
   - Un email genérico: `noreply@quadra.com`
   - Tu email personal (si está verificado en SendGrid)
   - Un dominio personalizado (si lo añadiste a SendGrid)

---

### Paso 4: Verificar Correo de Envío (Importante)

Para que SendGrid pueda enviar correos, necesitas verificar el email o dominio:

#### Opción A: Verificar un Email Específico (Rápido)
1. Ve a SendGrid → **"Sender Authentication"** → **"Verify a Single Sender"**
2. Ingresa el email que usarás (`noreply@quadra.com` o tu email)
3. SendGrid te enviará un email de confirmación
4. Abre el email y haz clic en el enlace de verificación
5. ¡Listo! Ya puedes enviar desde ese email

#### Opción B: Verificar un Dominio (Recomendado para producción)
Si tienes un dominio personalizado (ej: `quadra.com`):
1. Ve a SendGrid → **"Sender Authentication"** → **"Authenticate Your Domain"**
2. Sigue las instrucciones para añadir registros DNS
3. Espera a que se valide (puede tomar hasta 24 horas)

---

### Paso 5: Reinicia el Servidor

Después de actualizar el `.env`, reinicia el backend:

```bash
cd backend
npm start
```

---

## Prueba del Flujo Completo

### 1. Intenta recuperar tu contraseña:
- En login, haz clic en **"¿Olvidaste tu contraseña?"**
- Ingresa tu email registrado
- Haz clic en **"Enviar enlace de recuperación"**

### 2. Verifica que recibas el email:
- Revisa tu bandeja de entrada (y spam)
- Deberías ver un email de "noreply@quadra.com" con el asunto: **"Recupera tu contraseña de QUΔDRA"**

### 3. Haz clic en el enlace:
- El enlace te llevará a la página de "Establecer Nueva Contraseña"
- Ingresa una contraseña fuerte
- ¡Tu contraseña debería actualizarse!

### 4. Inicia sesión con tu nueva contraseña:
- Usa tu email y nueva contraseña para entrar

---

## Solucionar Problemas

### ❌ "El email no llega"

**Verifica:**
1. ✅ ¿Está configurada la `SENDGRID_API_KEY` en `.env`?
2. ✅ ¿El email está verificado en SendGrid?
3. ✅ ¿Miras en la carpeta de spam?
4. ✅ ¿Reiniciaste el servidor backend?

**Cómo verificar el log:**
```bash
cd backend
npm start
# Verifica la consola, debería haber un mensaje como:
# ✅ Email de recuperación enviado a usuario@email.com
```

### ❌ "Error: API key inválida"

1. Vuelve a copiar la API key de SendGrid
2. Asegúrate de que sea exacta (sin espacios extras)
3. Verifica que el archivo `.env` esté en `backend/.env`

### ❌ "El email de SendGrid fue rechazado"

Posibles causas:
- El email no está verificado en SendGrid
- El dominio no está autenticado
- Se alcanzó el límite de emails gratis (100/día en plan gratis)

**Solución:**
- Verifica el email o dominio en SendGrid
- En plan gratis tienes 100 emails/día

---

## Límites de SendGrid (Plan Gratis)

| Recurso | Límite |
|---------|--------|
| Emails/mes | 100 por día (3,000/mes) |
| API Requests | Ilimitados |
| Remitentes | 10 |
| Listas de contactos | Sí, limitadas |

**Para producción**: Considera pagar por un plan de SendGrid ($20/mes para 100k emails)

---

## Alternativas a SendGrid

Si SendGrid no te funciona, puedes usar:

| Servicio | Gratis | Ventajas |
|----------|--------|----------|
| **SendGrid** | 100/día | Sencillo, confiable |
| **Mailgun** | 5,000/mes | Generoso, bueno para desarrollo |
| **Resend** | Gratis | Optimizado para JavaScript/React |
| **AWS SES** | 62k/mes (1er año) | Si usas AWS |

---

## Contacto y Ayuda

Si necesitas ayuda:
1. Verifica los logs del servidor: `npm start` en `backend/`
2. Consulta la documentación de SendGrid: https://docs.sendgrid.com/
3. Abre un issue en el repositorio

---

**¡Con esto tu recuperación de contraseña debería funcionar! 🎉**
