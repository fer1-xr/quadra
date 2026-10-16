# 🧪 Guía de Testing Local - Servicio OCR

## ✅ Estado Actual

**Completado:**
- ✅ Estructura de carpetas creada
- ✅ Todas las dependencias instaladas (tesseract.js, pdf-parse, sharp, zod, etc.)
- ✅ Servicios OCR implementados
- ✅ Rutas API creadas
- ✅ Middleware de upload configurado
- ✅ Servidor configurado para montar rutas OCR
- ✅ Tests básicos validados

**Archivos creados:**
```
backend/
├── services/ocr/
│   ├── invoice-extractor.js       ✅ Motor OCR principal
│   ├── field-validator.js         ✅ Validación RG90
│   ├── rg90-exporter.js           ✅ Exportación a Excel/JSON/CSV
│   ├── templates/
│   │   └── rg90-template.json     ✅ Estructura RG90
│   └── utils/
│       ├── field-patterns.js      ✅ Patrones regex
│       └── formatters.js          ✅ Funciones de formato
├── routes/
│   └── ocr.js                     ✅ Endpoints API
├── middleware/
│   └── upload-handler.js          ✅ Manejo de uploads
└── server.js                      ✅ Actualizado con rutas OCR
```

---

## 🚀 Cómo Probar Localmente

### Paso 1: Instalar Dependencias (Ya Hecho ✅)
```bash
npm install tesseract.js pdfjs-dist pdf-parse sharp zod pino uuid --save
```

### Paso 2: Iniciar el Servidor
```bash
npm start
# O ejecutar directamente:
node server.js
```

**Espera:** El servidor tardará 20-30 segundos en iniciar por primera vez (Tesseract inicializa el modelo)

**Cuando esté listo verás:**
```
✅ QUΔDRA - Servidor corriendo en puerto 3000
```

### Paso 3: Probar Endpoints

#### A. Health Check
```bash
curl http://localhost:3000/api/ocr/health
```

**Respuesta esperada:**
```json
{
  "status": "ok",
  "service": "OCR Invoice Extractor",
  "version": "1.0.0",
  "capabilities": ["jpeg", "png", "pdf"]
}
```

#### B. Upload y OCR (Sin archivo real)
```bash
# Crear archivo de prueba
echo "RUC: 123456789" > test.txt

# Subir (probará que el endpoint funciona)
curl -X POST -F "file=@test.txt" http://localhost:3000/api/ocr/upload
```

#### C. Validar Datos
```bash
curl -X POST http://localhost:3000/api/ocr/validate \
  -H "Content-Type: application/json" \
  -d '{
    "informante": {"ruc": "123456789", "nombre": "Empresa Test"},
    "informado": {"ruc": "987654321", "tipoIdentificacion": "RUC", "nombre": "Proveedor"},
    "comprobante": {
      "tipoRegistro": "Compra",
      "tipoComprobante": "Factura",
      "fechaEmision": "2026-10-15",
      "periodoEmision": "202610",
      "timbrado": "123456",
      "numero": "001-001-0000001",
      "condicionOperacion": "Contado",
      "monedaExtranjera": false
    },
    "financiero": {
      "montoGravado10": 100000,
      "iva10": 10000,
      "montoGravado5": 50000,
      "iva5": 2500,
      "montoNoGravado": 10000,
      "totalComprobante": 172500
    },
    "tributario": {"imputaIva": true}
  }'
```

**Respuesta esperada:**
```json
{
  "valid": true,
  "errors": [],
  "warnings": [],
  "confidence": 100,
  "cleanedData": { ... }
}
```

#### D. Exportar a Excel
```bash
curl -X POST http://localhost:3000/api/ocr/export \
  -H "Content-Type: application/json" \
  -d '{
    "invoices": [{
      "informante": {...},
      "informado": {...},
      "comprobante": {...},
      "financiero": {...},
      "tributario": {...}
    }],
    "format": "excel"
  }' \
  --output "RG90_export.xlsx"
```

---

## 🧪 Testing con Imágenes Reales

### Obtener imagen de prueba
1. Toma una foto de una factura con tu teléfono
2. Guárdala como `factura_test.jpg`
3. Sube al servidor:

```bash
curl -X POST -F "file=@factura_test.jpg" \
  http://localhost:3000/api/ocr/upload
```

**Primera ejecución:** Tardará 30-60 segundos (Tesseract procesa la imagen)
**Siguientes:** 5-10 segundos

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "informante": { "ruc": "...", "nombre": "..." },
    "informado": { "ruc": "...", ... },
    ...
  },
  "validation": {
    "valid": boolean,
    "errors": [],
    "warnings": []
  },
  "confidence": {
    "overall": 85.5,
    "fields": { ... }
  },
  "missingFields": ["..."],
  "ocrStats": {
    "ocrConfidence": 92.3,
    "textLength": 1250
  }
}
```

---

## 📊 Métricas Esperadas

| Métrica | Valor |
|---------|-------|
| Precisión OCR | 85-95% |
| Tiempo 1er OCR | 30-60s |
| Tiempo siguientes | 5-10s |
| Validación RG90 | <100ms |
| Export Excel | <500ms |

---

## ⚠️ Problemas Comunes y Soluciones

### "Cannot find module"
```bash
# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
npm install tesseract.js pdfjs-dist pdf-parse sharp zod pino uuid --save
```

### Servidor lento al iniciar
```
✓ Es normal. Tesseract inicializa modelos de IA.
✓ Primera ejecución: 30-60 segundos
✓ Siguientes: >5 segundos
```

### Error al subir PDF
```
✓ PDFs con imágenes escaneadas funcionan mejor
✓ PDFs con texto nativo se procesan diferente
✓ Ver logs del servidor para detalles
```

### Baja precisión en OCR
```
✓ Preprocesamiendo de imagen activado (sharp)
✓ Mejora si:
  - Imagen está bien enfocada
  - Contraste adecuado
  - Sin reflector/sombras
```

---

## ✅ Checklist de Testing

Cuando hayas completado las pruebas locales, confirma:

- [ ] Servidor inicia correctamente
- [ ] Health check retorna "ok"
- [ ] Validación RG90 funciona
- [ ] Upload de imagen funciona
- [ ] OCR extrae datos básicos
- [ ] Export a Excel genera archivo
- [ ] Precisión >85% en facturas claras

---

## 📝 Próximo Paso

Una vez que confirmes ✅ todas las pruebas:

1. Crearemos el componente React para la UI ("Importar Documentos")
2. Integraremos con el dashboard
3. Guardaremos datos en Supabase
4. Haremos push a GitHub

**¿Listo? Inicia el servidor y reporta los resultados!**

```bash
npm start
```

Luego responde en chat cuando hayas probado todo localmente. 🚀
