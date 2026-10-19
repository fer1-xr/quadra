# 📚 Lección del Día - Módulo Educativo

## Descripción General

El módulo "Lección del Día" proporciona capacitación diaria automática a los usuarios sobre temas de contabilidad, normativas fiscales y estándares NIIF. Las lecciones se muestran automáticamente cada día de lunes a viernes a las **07:00 AM**.

## Características Principales

### 1. **Lecciones Rotativas**
- **Lunes**: Ley 6380 - Decreto Reglamentario de Sociedades Mercantiles
- **Martes**: NIIF 1 - Adopción por Primera Vez de las NIIF
- **Miércoles**: NIIF 8 - Segmentos de Operación
- **Jueves**: Ley 6380 - Derechos y Deberes de Accionistas
- **Viernes**: NIIF 15 - Ingresos de Actividades Ordinarias

**Fin de semana**: Muestra la lección del viernes

### 2. **Diseño Tipo Blog**
```
┌─────────────────────────────────┐
│  Imagen de Fondo                │
│        Encabezado               │
│     Título de la Lección        │
├─────────────────────────────────┤
│  Metadatos: Día, Autor, Tiempo  │
├─────────────────────────────────┤
│                                 │
│  Contenido HTML Formateado      │
│  - Títulos                      │
│  - Párrafos                     │
│  - Listas numeradas             │
│  - Énfasis en textos clave      │
│                                 │
├─────────────────────────────────┤
│  Resumen + Acciones             │
│  [Guardar] [Compartir]          │
└─────────────────────────────────┘
```

### 3. **Notificaciones Automáticas**
- **Horario**: Todos los días a las 07:00 AM (lunes a viernes)
- **Tipo**: Notificación del navegador
- **Frecuencia**: Una vez por día (evita duplicados)
- **Interacción**: No requiere acción inmediata

### 4. **Responsivo**
- Desktop (1024px+)
- Tablet (768px - 1023px)
- Mobile (< 768px)

## Arquitectura Técnica

### Componentes

#### `LeccionDelDia.jsx`
```javascript
// Componente principal que muestra la lección
- Obtiene la lección según el día actual
- Renderiza el contenido HTML
- Proporciona acciones (guardar, compartir)
- Soporta dark/light mode
```

**Ubicación**: `frontend/src/components/LeccionDelDia.jsx`

#### `leccionScheduler.js`
```javascript
// Servicio de programación
- Verifica cada minuto si es hora de notificar (07:00 AM)
- Valida que sea día laboral (lunes-viernes)
- Evita notificaciones duplicadas
- Dispara eventos personalizados
```

**Ubicación**: `frontend/src/services/leccionScheduler.js`

#### `LeccionDelDia.css`
- Estilos del componente
- Animaciones
- Temas claro/oscuro
- Media queries responsivas

**Ubicación**: `frontend/src/styles/LeccionDelDia.css`

### Flujo de Ejecución

```
1. App.jsx inicia
   ↓
2. leccionScheduler.start() se ejecuta
   ↓
3. Cada minuto, scheduler verifica:
   - Hora actual = 07:00?
   - Día laboral (1-5)?
   - ¿Ya notificó hoy?
   ↓
4. Si pasa todas las verificaciones:
   - Mostrar notificación del navegador
   - Disparar evento personalizado
   - Guardar fecha en localStorage
   ↓
5. Usuario hace click en la pestaña "Leccion del Dia"
   ↓
6. Dashboard renderiza LeccionDelDia
   ↓
7. Componente obtiene lección según día de semana
```

## Integración en la Interfaz

### Sidebar
La nueva pestaña aparece en la barra lateral izquierda:
```
🏠 INICIO
📚 Leccion del Dia    ← Nueva
🔍 Buscar
📊 Conciliación RG90
...
```

### Dashboard
Cuando el usuario hace click, se muestra en el área principal.

## Variables de Configuración

### Lecciones (LeccionDelDia.jsx)
```javascript
const lecciones = [
  {
    dia: 'Lunes',
    diaNumero: 1,
    titulo: '...',
    imagen: 'URL de imagen',
    contenido: 'HTML formateado'
  },
  // ... más lecciones
]
```

### Horario (leccionScheduler.js)
```javascript
if (hora === 7 && diaSemana >= 1 && diaSemana <= 5) {
  // Notificar a las 07:00 AM, lunes a viernes
}
```

## Personalización

### Agregar una Nueva Lección

1. Editar `LeccionDelDia.jsx`
2. Agregar objeto en array `lecciones`:
```javascript
{
  dia: 'Día',
  diaNumero: 6, // 0=Dom, 1=Lun, ..., 6=Sab
  titulo: 'Título de la Lección',
  imagen: 'https://ejemplo.com/imagen.jpg',
  contenido: `
    <h2>Sección Principal</h2>
    <p>Contenido...</p>
    <ul>
      <li>Punto 1</li>
    </ul>
  `
}
```

### Cambiar Horario de Notificación

1. Editar `leccionScheduler.js`
2. Modificar la línea de condición:
```javascript
if (hora === 7) { // Cambiar "7" al horario deseado (0-23)
```

### Cambiar Colores del Tema

En `LeccionDelDia.css`:
```css
.leccion-dia {
  background: rgba(212, 175, 55, 0.9); /* Color dorado */
  color: #1b2a4a; /* Azul marino */
}
```

## Permisos Requeridos

### Notificaciones del Navegador
La aplicación solicita permiso para mostrar notificaciones:
- Primera ejecución: Pide consentimiento
- Usuario puede denegar/permitir en configuración del navegador

### LocalStorage
- Guarda si ya notificó hoy
- Clave: `leccion-notificacion-fecha`

## Testing

### Probar Notificación Manual
1. Abrir consola del navegador
2. Ejecutar:
```javascript
import leccionScheduler from './services/leccionScheduler'
leccionScheduler.mostrarNotificacion()
```

### Probar en Diferentes Días
1. Cambiar fecha del sistema
2. O editar `LeccionDelDia.jsx` para simular diferentes días:
```javascript
const ahora = new Date('2024-10-21') // Lunes
```

## Mejoras Futuras

- [ ] Guardar lecciones como favoritos
- [ ] Historial de lecciones vistas
- [ ] Quiz o evaluaciones después de cada lección
- [ ] Integración con backend para lecciones dinámicas
- [ ] Comentarios o preguntas sobre las lecciones
- [ ] Diferentes temas de contenido (Contabilidad, Fiscalidad, RRHH)
- [ ] Exportar lecciones a PDF

## Troubleshooting

### Las notificaciones no aparecen
- Verificar permisos de notificación en el navegador
- Asegurarse de que la hora del sistema es 07:00 AM
- Verificar que sea un día laboral (lunes-viernes)
- Revisar localStorage:
```javascript
localStorage.getItem('leccion-notificacion-fecha')
```

### Las lecciones no muestran contenido
- Verificar que las imágenes URL sean accesibles
- Revisar la consola para errores de JavaScript
- Asegurarse de que el contenido HTML sea válido

### El componente no aparece en la interfaz
- Verificar que `LeccionDelDia.jsx` se importó en `Dashboard.jsx`
- Verificar que el case `'leccion'` esté en `handleNavigate`
- Revisar que el Sidebar tenga el botón con `id: 'leccion'`

## Archivos Modificados

```
frontend/
  src/
    App.jsx (actualizado: importar scheduler)
    components/
      Dashboard.jsx (actualizado: agregar vista y import)
      Sidebar.jsx (actualizado: agregar opción menú)
      LeccionDelDia.jsx (nuevo)
    services/
      leccionScheduler.js (nuevo)
    styles/
      LeccionDelDia.css (nuevo)
```

## Commit Git

```
Commit: b5e4079
Mensaje: Feature: Add daily lesson module (Leccion del Dia) with automatic 07:00 AM notifications
Archivos: 6 cambios, 648 insertiones
```

---

**Versión**: 1.0  
**Fecha**: 2024-10-19  
**Autor**: Claude Haiku 4.5
