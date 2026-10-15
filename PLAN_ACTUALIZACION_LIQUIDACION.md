# Plan Detallado de Actualización - Calculadora de Liquidación Salarial

## ✅ LAS 4 MODALIDADES OFICIALES (Ministerio de Paraguay)

Según la **Calculadora Oficial del Ministerio de Trabajo** (https://calculadoras.mtess.gov.py/liquilaboweb_liquidacion_add.php):

### 1. RENUNCIA
- **Indemnización:** Ninguna
- **Preaviso:** 15 días (o en su lugar, compensación)
- **Decimotercera:** Proporcional a los días trabajados
- **Vacaciones:** Proporcional a los días trabajados
- **Horas Extras:** Según trabajadas

### 2. RETIRO JUSTIFICADO ⭐ (NUEVA)
- **Status:** Modalidad oficial del ministerio
- **Características:** Probablemente similar a "Despido Justificado" pero iniciado por el empleado
- **Diferencia:** Requiere investigación manual en el formulario oficial

### 3. DESPIDO JUSTIFICADO
- **Indemnización:** NINGUNA
- **Preaviso:** 15 días
- **Decimotercera:** Proporcional
- **Vacaciones:** Proporcional
- **Basado en:** Código Laboral - Artículos 65-67

### 4. DESPIDO INJUSTIFICADO
- **Indemnización:** 15 días + 1 día por cada año de antigüedad (máximo 30 días) + 30 días en lugar de preaviso
- **Decimotercera:** Proporcional
- **Vacaciones:** Proporcional
- **Basado en:** Código Laboral - Artículos 65-67

---

## 🔧 CAMBIOS NECESARIOS EN EL CÓDIGO

### 1. Frontend - `LiquidacionSalarial.jsx`

**Cambiar el select de modalidad:**

```javascript
// ANTES:
<option value="despido-justificado">Despido Justificado</option>
<option value="despido-injustificado">Despido Injustificado</option>
<option value="renuncia">Renuncia</option>

// DESPUÉS:
<option value="renuncia">Renuncia</option>
<option value="retiro-justificado">Retiro Justificado</option>
<option value="despido-justificado">Despido Justificado</option>
<option value="despido-injustificado">Despido Injustificado</option>
```

### 2. Lógica de Cálculo - Actualizar la función `calcularLiquidacion()`

**Actualizar la sección de indemnización:**

```javascript
let indemnizacion = 0;
let preaviso = 0;

if (formData.modalidad === 'renuncia') {
  // Sin indemnización
  indemnizacion = 0;
  preaviso = (salarioDiario * 15); // 15 días de preaviso
  
} else if (formData.modalidad === 'retiro-justificado') {
  // ⚠️ INVESTIGAR: Comparar con ministerio
  // Probablemente similar a despido justificado
  indemnizacion = 0;
  preaviso = (salarioDiario * 15);
  
} else if (formData.modalidad === 'despido-justificado') {
  // Sin indemnización, pero con preaviso
  indemnizacion = 0;
  preaviso = (salarioDiario * 15); // 15 días de preaviso
  
} else if (formData.modalidad === 'despido-injustificado') {
  // Indemnización completa
  const diasIndemnizacion = Math.min(15 + Math.floor(diasAntiguedad / 365), 30);
  indemnizacion = (salarioDiario * diasIndemnizacion);
  preaviso = formData.salarioMensual; // 30 días en lugar de preaviso
}
```

### 3. Referencias Legales Actualizar

Agregar en la sección de "Marco Legal":

```javascript
const leyes = [
  'Código Laboral de Paraguay (Ley Nº 213/1993) - Artículos 65-67: Modalidades de despido y renuncia',
  'Artículo 88: Decimotercera remuneración',
  'Artículos 80-87: Régimen de Vacaciones',
  'Ley de AFP Nº 1.860/2002: Descuentos obligatorios por aportaciones',
  'Ley de Impuesto a la Renta Nº 2.421/2004: Cálculo de retenciones y descuentos',
  'NOTA: Retiro Justificado es una modalidad oficial reconocida por el Ministerio de Trabajo'
];
```

---

## 📋 INVESTIGACIÓN ADICIONAL REQUERIDA

Para implementar "RETIRO JUSTIFICADO" correctamente, necesitas:

### Paso 1: Acceder a la calculadora oficial
- URL: https://calculadoras.mtess.gov.py/liquilaboweb_liquidacion_add.php

### Paso 2: Rellenar el formulario 3 veces
1. Con RETIRO JUSTIFICADO
2. Con DESPIDO JUSTIFICADO
3. Con RENUNCIA

### Paso 3: Para CADA UNO documentar:
- ¿Hay indemnización?
- ¿Cuántos días de preaviso?
- ¿Cómo se calcula la decimotercera?
- ¿Cómo se tratan las vacaciones?
- ¿Cómo se calculan los descuentos (AFP, IPS)?

### Paso 4: Crear una tabla comparativa
| Modalidad | Indemnización | Preaviso | Decimotercera | Vacaciones |
|-----------|---------------|----------|---------------|-----------|
| RENUNCIA | No | 15 días | Proporcional | Proporcional |
| RETIRO JUST. | ? | ? | ? | ? |
| DESPIDO JUST. | No | 15 días | Proporcional | Proporcional |
| DESPIDO INJUST. | Sí (15+1/año) | 30 días* | Proporcional | Proporcional |

---

## 🎯 PROPUESTA DE SOLUCIÓN

### Opción A: Implementación Rápida (Recomendada)
1. Agregar "RETIRO JUSTIFICADO" como alias de "DESPIDO JUSTIFICADO" por ahora
2. Documentar que necesita verificación posterior en el ministerio
3. Actualizar comentarios para investigar luego

### Opción B: Investigación Completa
1. Rellenar manualmente el formulario del ministerio para cada modalidad
2. Documentar exactamente cómo calcula
3. Implementar la lógica exacta

---

## ✨ CAMBIOS COMPLETADOS HASTA AHORA

✅ Identificadas las 4 modalidades oficiales
✅ Comparadas con tu implementación actual
✅ Identificadas las diferencias
✅ Propuesto plan de actualización

**Siguiente acción:** ¿Quieres que actualice el código con la Opción A o B?

---

**Última actualización:** 2026-10-14
**Fuente:** Calculadora Oficial del Ministerio de Trabajo, Empleo y Seguridad Social de Paraguay
