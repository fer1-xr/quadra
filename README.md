# TaxMatch - SaaS de Conciliación RG90

Sistema online para conciliar reportes RG90 contra libro de compras interno. Stack moderno, completamente gratis para empezar.

## 📋 Requisitos

- Node.js 16+ (descargar de https://nodejs.org)
- Cuenta en Supabase (gratis)
- Render account (gratis)
- Vercel account (gratis, opcional)

## 🚀 Setup Rápido (5 minutos)

### 1️⃣ Configurar Base de Datos (Supabase)

Ya hiciste esto. Tenés:
- **SUPABASE_URL**: https://knlzuwimaocubmpfquin.supabase.co
- **SUPABASE_KEY**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Ahora crea las tablas en Supabase:

1. Abrí Supabase Dashboard
2. Click en **"SQL Editor"** (izquierda)
3. Click en **"New Query"**
4. Copiá y pegá esto:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE reconciliation_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  status TEXT DEFAULT 'pending',
  total_discrepancies INT DEFAULT 0,
  data JSONB,
  created_at TIMESTAMP DEFAULT now()
);
```

5. Click en **"Run"** ✓

### 2️⃣ Backend Local

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

El backend corre en **http://localhost:3000**

### 3️⃣ Frontend Local

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

La app corre en **http://localhost:5173**

### ✅ Probá:
1. Abrí http://localhost:5173
2. Registrate (cualquier email/password)
3. Cargá tus CSVs
4. Clickeá "Ejecutar Conciliación"
5. Descargá el Excel

## 📦 Deploy a Producción

### Backend en Render (gratis)

1. Pushea todo a GitHub (crea un repo nuevo)
2. Abrí https://render.com
3. Click **"New +"** → **"Web Service"**
4. Conecta tu repo GitHub
5. Configurá:
   - **Name**: `taxmatch-backend`
   - **Start Command**: `npm install && npm start`
   - **Environment Variables** (agregá):
     ```
     SUPABASE_URL=https://knlzuwimaocubmpfquin.supabase.co
     SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
     JWT_SECRET=tu-jwt-secret-super-seguro-aqui
     NODE_ENV=production
     ```

6. Click **"Create Web Service"** ✓

### Frontend en Vercel (gratis)

1. Abrí https://vercel.com
2. Click **"Add New"** → **"Project"**
3. Importa tu repo GitHub
4. Configurá:
   - **Framework**: Vite
   - **Root Directory**: `frontend`
5. En **Environment Variables**, agregá:
   ```
   VITE_API_URL=https://tu-backend.onrender.com
   ```
6. Click **"Deploy"** ✓

Una vez deployed, actualiza en frontend el `axios` para apuntar a la URL de producción.

## 🔑 Credenciales Supabase

Guardá esto en un lugar seguro:

```
SUPABASE_URL: https://knlzuwimaocubmpfquin.supabase.co
SUPABASE_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtubHp1d2ltYW9jdWJtcGZxdWluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4MTc2MTIsImV4cCI6MjEwNTM5MzYxMn0.XjtaktQkIPqZoOMOCKHzHDf-u4nN0ZpAkv_zzaqkKqA
```

## 🎨 Customización

### Cambiar colores (Pacioli → Otra marca)

Edit `frontend/src/App.css`:

```css
:root {
  --primary: #1B2A4A;    /* Navy */
  --accent: #D4AF37;     /* Gold */
  /* Cambiar estos valores */
}
```

### Agregar features

- **Panel admin**: Crear `/api/admin/*` en backend
- **Pagos**: Integrar MercadoPago en `/api/payments`
- **Historial**: Querys en Supabase para `reconciliation_sessions`
- **Clientes**: Nueva tabla `clients` con relación a `users`

## 📞 Soporte

Si algo falla:

1. Backend: `npm run dev` en terminal de backend — mirá los logs
2. Frontend: Abrí DevTools (F12) — Network tab
3. Supabase: Abrí Dashboard → SQL Editor → mirá los logs de queries

## 📄 Licencia

TaxMatch © 2026 - Fernando Paez Zacarias
