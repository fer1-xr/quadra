# Análisis de la Calculadora Oficial del Ministerio de Trabajo - Paraguay

## 📋 Hallazgos Principales

Después de navegar la **Calculadora Oficial del Ministerio de Trabajo de Paraguay** (https://calculadoras.mtess.gov.py/), se identificaron **LAS 4 MODALIDADES OFICIALES DE LIQUIDACIÓN**:

### Modalidades Disponibles:
1. **RENUNCIA**
2. **RETIRO JUSTIFICADO** ⚠️ *Nueva modalidad - no implementada en tu código*
3. **DESPIDO JUSTIFICADO**
4. **DESPIDO INJUSTIFICADO**

---

## 🔴 Diferencias con tu Implementación Actual

Tu código solo tiene:
- Despido Justificado
- Despido Injustificado
- Renuncia

**FALTA:** Agregar la modalidad "RETIRO JUSTIFICADO"

---

## 📊 Estructura del Formulario Oficial

El formulario del ministerio tiene esta estructura:

### Tab 1: DATOS PERSONALES
- Cédula
- Nombre
- Apellido
- Sexo
- Nacionalidad
- Fecha de Nacimiento
- Edad (calculada automáticamente)
- Departamento
- Ciudad
- Dirección

### Tab 2: 1° DATOS LABORALES
- **Nombre de la Empresa/Empleador** ← Campo importante
- Tipo Solicitante: TRABAJADOR/A
- Tipo de Trabajador: JORNAL (hay más opciones)
- **SUPUESTO MOTIVO DE SALIDA** ← AQUÍ ESTÁN LAS 4 MODALIDADES
  - RENUNCIA
  - RETIRO JUSTIFICADO
  - DESPIDO JUSTIFICADO
  - DESPIDO INJUSTIFICADO
- Fecha de Entrada
- Fecha de Salida
- Antigüedad en Años
- Antigüedad en Meses
- **Antigüedad en Días** ← Campo adicional

### Tab 3: 2° DATOS LABORALES
(Información de días de vacaciones, otros datos)

### Tab 4: CALCULO GENERAL
(Donde se ingresa el salario y se muestran los resultados)

---

## 💡 Recomendaciones para Actualizar tu Código

### 1. **Actualizar el componente React**
Cambiar el dropdown de modalidad para incluir las 4 opciones:

```javascript
<select name="modalidad" value={formData.modalidad} onChange={handleChange}>
  <option value="renuncia">Renuncia</option>
  <option value="retiro-justificado">Retiro Justificado</option>
  <option value="despido-justificado">Despido Justificado</option>
  <option value="despido-injustificado">Despido Injustificado</option>
</select>
```

### 2. **Investigar la Lógica de Cálculo del Ministerio**

Necesitas determinar:

**RENUNCIA:**
- ¿Hay indemnización?
- ¿Hay preaviso?
- ¿Qué cobertura de decimotercera?
- ¿Qué con vacaciones?

**RETIRO JUSTIFICADO:** ← *DESCONOCIDO*
- ¿Cómo se diferencia de DESPIDO JUSTIFICADO?
- ¿Hay indemnización?
- ¿Cuál es el preaviso?

**DESPIDO JUSTIFICADO:**
- Sin indemnización
- 15 días de preaviso
- Cobertura completa de decimotercera y vacaciones

**DESPIDO INJUSTIFICADO:**
- Indemnización: 15 días + 1 día por año de antigüedad (máximo 30 días) + 30 días de preaviso en su lugar
- Cobertura completa

---

## 🎯 Siguiente Paso Recomendado

Para completar la implementación, necesitas:

1. **Completar manualmente el formulario del ministerio** con datos de prueba para cada modalidad
2. **Documentar los cálculos resultantes** de cada una
3. **Identificar las fórmulas exactas** que usa el ministerio
4. **Actualizar tu código** para que coincida exactamente

---

## 📌 Notas Importantes

- El ministerio utiliza "Antigüedad en Años", "Meses" y "Días" por separado (no días totales)
- El campo "Nombre de la Empresa/Empleador" es importante en el formulario oficial
- Hay un campo "Tipo de Trabajador" que puede afectar los cálculos (JORNAL, MENSUALIZADO, etc.)

---

**Estado:** Necesitas completar la investigación manual del formulario oficial para ver exactamente cómo calcula para cada modalidad.
