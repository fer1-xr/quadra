# 🔧 Implementación Técnica - Calculadora de Venta de Activo Fijo

## Estructura General

### Archivos Creados

```
frontend/src/
├── components/
│   └── VentaActivoFijo.jsx       # Componente principal (1100+ líneas)
├── styles/
│   └── VentaActivoFijo.css       # Estilos (400+ líneas)
└── components/
    └── Dashboard.jsx             # Integración en Dashboard (modificado)
```

## Componente VentaActivoFijo.jsx

### Propósito
Proporciona una interfaz interactiva para determinar la modalidad de facturación según la normativa tributaria paraguaya.

### Estructura Interna

#### Estado (useState)
```javascript
const [formData, setFormData] = useState({
  tipoBien: 'inmueble',           // 'inmueble' | 'vehiculo'
  tipoContribuyente: 'no-contribuyente', // Régimen tributario
  esActivoEmpresa: 'no-aplica',   // 'no-aplica' | 'si' | 'no'
  estadoVehiculo: 'usado',         // 'nuevo' | 'usado'
  monto: 0                         // Monto en guaraníes
})

const [resultado, setResultado]     // Resultado del cálculo
const [error, setError]             // Mensajes de error
```

#### Base de Conocimiento (regulaciones)
Objeto `regulaciones` que contiene:
- Matriz de combinaciones: `inmueble/vehiculo` → `contribuyente` → `condición` → `resultado`
- Cada entrada contiene:
  - `debe_facturar`: boolean
  - `normas`: array de normas aplicables
  - `decreto`: normativa legal
  - `fuente`: link a documentación

**Estructura**:
```
regulaciones = {
  inmueble: {
    'prestador-servicios': {
      'no-aplica': { debe_facturar: true, normas: [...], ... },
      'si': { ... },
      'no': { ... }
    },
    'ire-simple': { ... },
    'ire-general': { ... },
    'no-contribuyente': { ... }
  },
  vehiculo: {
    'prestador-servicios': {
      'nuevo': {
        'no-aplica': { ... },
        'si': { ... },
        'no': { ... }
      },
      'usado': { ... }
    },
    ...
  }
}
```

### Funciones Principales

#### `handleChange(e)`
- Actualiza valores en formData cuando el usuario interactúa con selects
- Maneja input type="text" y type="select"

#### `handleMonto(e)`
- Caso especial para campo de monto
- Convierte string a número flotante
- Valida valores >= 0

#### `calcular()`
- Función principal de lógica
- Valida que monto > 0
- Accede a la matriz de regulaciones según combinación seleccionada
- Construye objeto `resultado` con toda la información
- Llamada por botón "Calcular"

#### `resetForm()`
- Limpia todos los campos
- Vuelve a vista de formulario desde resultado
- Reinicia estado a valores iniciales

#### `getModoFacturacion()`
- Función auxiliar para renderizar texto
- Devuelve: "✅ DEBE FACTURAR" o "❌ NO REQUIERE FACTURACIÓN"

### Flujo de Ejecución

1. **Inicialización**: Usuario ve formulario vacío
2. **Ingreso de datos**: Usuario completa campos
3. **Cálculo**: Click en botón "Calcular"
   - Validación de monto
   - Búsqueda en matriz de regulaciones
   - Construcción de resultado
4. **Visualización**: Se muestra:
   - Resumen de datos ingresados
   - Modalidad de facturación (SÍ/NO)
   - Normas aplicables
   - Marco legal con links
   - Advertencia legal

## Estilos (VentaActivoFijo.css)

### Paleta de Colores
- **Primario**: `#667eea` (Azul/Púrpura)
- **Éxito**: `#27ae60` (Verde)
- **Error**: `#e74c3c` (Rojo)
- **Advertencia**: `#f39c12` (Naranja)
- **Info**: `#3498db` (Azul claro)

### Clases Principales
- `.venta-activo-fijo-container`: Contenedor general
- `.card`: Tarjeta principal
- `.form-section`: Sección de formulario
- `.resultado-card`: Tarjeta de resultado con variantes
- `.resultado-section`: Contenedor de resultados
- `.modo-facturacion`: Resultado principal (debe/no facturar)
- `.normas-card`: Tarjeta de normas aplicables
- `.marco-legal-card`: Marco legal
- `.advertencia-card`: Advertencia legal

### Responsive Design
- Diseño adaptable para móviles (< 768px)
- Cambios en layout:
  - Botones en grid a stack vertical
  - Datos en row a column
  - Padding reducido

### Animaciones
- `slideIn`: Entrada de card principal
- `fadeIn`: Entrada de tarjetas de resultado
- `pulse`: Estado de carga

## Integración en Dashboard

### Cambios en Dashboard.jsx

1. **Import agregado**:
```javascript
import VentaActivoFijo from './VentaActivoFijo'
```

2. **Renderizado**:
```javascript
{view === 'activofijo' && (
  <VentaActivoFijo />
)}
```

3. **Acceso desde Sidebar**:
   - Menú item existente: "Activo Fijo" (🏢)
   - ID: 'activofijo'
   - Navega a vista correcta

## Matriz de Datos Completa

### Inmuebles

| Contribuyente | No Aplica | Sí | No |
|---|---|---|---|
| Prestador Servicios | Facturar | Facturar | Facturar |
| IRE SIMPLE | No | No | No |
| IRE GENERAL | Facturar | Facturar | Facturar |
| No Contribuyente | Facturar | Facturar | Facturar |

### Vehículos Nuevos

| Contribuyente | No Aplica | Sí | No |
|---|---|---|---|
| Prestador Servicios | Facturar + IVA 10% | Facturar + IVA 10% | Facturar + IVA 10% |
| IRE SIMPLE | No | No | No |
| IRE GENERAL | Facturar + IVA 10% | Facturar + IVA 10% | Facturar + IVA 10% |
| PLAYA VEHÍCULOS | - | Facturar + IVA 10% | - |
| No Contribuyente | Facturar (ret 1%) | Facturar (ret 1%) | Facturar (ret 1%) |

### Vehículos Usados

| Contribuyente | No Aplica | Sí | No |
|---|---|---|---|
| Prestador Servicios | Facturar (sin IVA) | Facturar (sin IVA) | Facturar (sin IVA) |
| IRE SIMPLE | No | No | No |
| IRE GENERAL | Facturar (sin IVA) | Facturar (sin IVA) | Facturar (sin IVA) |
| PLAYA VEHÍCULOS | - | Facturar (sin IVA) | - |
| No Contribuyente | Facturar (ret 1%, sin IVA) | Facturar (ret 1%, sin IVA) | Facturar (ret 1%, sin IVA) |

## Flujo de Datos

```
Usuario
   ↓
[Formulario] → handleChange/handleMonto
   ↓
[Estado] formData
   ↓
[Botón Calcular] → calcular()
   ↓
[Validación] (monto > 0)
   ↓
[Búsqueda] en regulaciones
   ↓
[Construcción] objeto resultado
   ↓
[Renderizado] Vista de resultados
   ↓
[Usuario] ve recomendación + marco legal
```

## Consideraciones de Seguridad

### Validaciones Implementadas
1. ✅ Validación de monto (> 0)
2. ✅ Manejo de casos no configurados (error message)
3. ✅ Sanitización de enlaces (target="_blank", rel="noopener noreferrer")

### Validaciones Recomendadas (Futuro)
1. Límites máximos de monto
2. Validación de formato de entrada
3. Rate limiting en cálculos
4. Logging de operaciones (para auditoría)

## Mantenibilidad

### Cómo Agregar Nuevos Casos
1. Editar objeto `regulaciones` en VentaActivoFijo.jsx
2. Seguir estructura: `tipo → contribuyente → condición → resultado`
3. Incluir siempre: `debe_facturar`, `normas[]`, `decreto`, `fuente`

### Ejemplo: Agregar nuevo contribuyente "MONOTRIBUTISTA"
```javascript
regulaciones: {
  inmueble: {
    'monotributista': {
      'no-aplica': {
        debe_facturar: true,
        normas: ['Norma 1', 'Norma 2'],
        decreto: 'Ley XXX',
        fuente: 'https://...'
      },
      // ... más condiciones
    }
  }
}
```

Luego agregar en formData select:
```javascript
<option value="monotributista">MONOTRIBUTISTA</option>
```

## Testing

### Casos de Prueba Recomendados
1. **Caso monto 0**: Debe mostrar error
2. **Caso monto negativo**: Debe mostrar error
3. **Caso combinación válida**: Debe mostrar resultado
4. **Caso reset**: Debe limpiar y volver a formulario
5. **Caso responsive**: Probar en móvil/tablet

### Modo Oscuro
Componente hereda variables CSS de Sidebar:
- `--bg-page`
- `--text-primary`
- `--card-bg`
- `--card-border`

Funciona automáticamente con tema de la aplicación.

## Performance

### Optimizaciones Aplicadas
1. ✅ Objeto `regulaciones` está fuera del render (no se recrea)
2. ✅ Funciones con `useCallback` no necesario (eventos simples)
3. ✅ No hay efectos secundarios (useEffect)

### Mejoras Futuras
1. Memoizar componentes sub-secciones
2. Lazy load de regulaciones si crece mucho
3. Cache de búsquedas

## Debugging

### Estado disponible en consola
```javascript
console.log('FormData:', formData)
console.log('Resultado:', resultado)
console.log('Error:', error)
```

## Documentación de Fuentes

### URLs Hard-coded en componente
- Venta de Vehículos: `https://consultoria.com.py/facturacion-venta-vehiculo-paraguay/`
- Venta de Inmuebles: `https://consultoria.com.py/caceres-schneider-asesoramiento-tributario-en-la-venta-de-inmuebles/`

Actualizar periódicamente si las fuentes cambian de URL.

---

## Stack Tecnológico
- **Framework**: React 18+
- **Lenguaje**: JavaScript/JSX
- **Estilos**: CSS3 (sin dependencias externas)
- **State Management**: useState de React
- **No tiene**: Redux, TypeScript, librerías externas

## Compatibilidad
- ✅ Chrome/Edge (últimas versiones)
- ✅ Firefox (últimas versiones)
- ✅ Safari (últimas versiones)
- ✅ Móvil (iOS/Android)

---

**Autor**: QUADRA Development Team  
**Fecha**: Octubre 2026  
**Versión**: 1.0
