import { z } from 'zod';
import { isValidRuc, isValidDate, isValidMonto, validateFinancialData } from './utils/field-patterns.js';

// Schemas de validación usando Zod
const RucSchema = z
  .string()
  .transform((v) => v.replace(/[\D]/g, ''))
  .refine((v) => isValidRuc(v), { message: 'RUC inválido. Debe tener 4-9 dígitos' });

const FechaSchema = z
  .string()
  .refine((v) => isValidDate(v), { message: 'Fecha inválida. Formato: YYYY-MM-DD' });

const MontoSchema = z
  .number()
  .min(0, 'El monto debe ser positivo')
  .refine((v) => isValidMonto(v), { message: 'Monto inválido' });

const InformanteSchema = z.object({
  ruc: RucSchema,
  nombre: z
    .string()
    .min(2, 'Nombre demasiado corto')
    .max(100, 'Nombre demasiado largo'),
});

const InformadoSchema = z.object({
  ruc: RucSchema,
  tipoIdentificacion: z.enum(['RUC', 'Cédula', 'Pasaporte', 'Otro']),
  nombre: z
    .string()
    .min(2, 'Nombre demasiado corto')
    .max(100, 'Nombre demasiado largo'),
});

const ComprobanteSchema = z.object({
  tipoRegistro: z.enum(['Compra', 'Venta']),
  tipoComprobante: z.enum(['Factura', 'NC', 'ND', 'Tiquete']),
  fechaEmision: FechaSchema,
  periodoEmision: z
    .string()
    .regex(/^[0-9]{6}$/, 'Período debe tener formato YYYYMM'),
  timbrado: z
    .string()
    .regex(/^[0-9]{3,8}$/, 'Timbrado debe tener 3-8 dígitos'),
  numero: z
    .string()
    .regex(/^[0-9\-]{1,20}$/, 'Número de comprobante inválido'),
  cdc: z.string().optional(),
  condicionOperacion: z.enum(['Contado', 'Crédito', 'Mixto']),
  monedaExtranjera: z.boolean(),
});

const FinancieroSchema = z.object({
  montoGravado10: MontoSchema,
  iva10: MontoSchema,
  montoGravado5: MontoSchema,
  iva5: MontoSchema,
  montoNoGravado: MontoSchema,
  totalComprobante: MontoSchema,
});

const TributarioSchema = z.object({
  imputaIva: z.boolean(),
  imputaIre: z.boolean().optional(),
  imputaIrp: z.boolean().optional(),
  noImputar: z.boolean().optional(),
});

const RG90Schema = z.object({
  informante: InformanteSchema,
  informado: InformadoSchema,
  comprobante: ComprobanteSchema,
  financiero: FinancieroSchema,
  tributario: TributarioSchema,
  metadatos: z
    .object({
      fechaRegistro: z.string().optional(),
      origenInformacion: z.enum(['Manual', 'OCR', 'API', 'Importación']),
    })
    .optional(),
});

/**
 * Valida datos extraídos contra el schema RG90
 * @param {object} data - Datos a validar
 * @returns {object} { valid: boolean, errors: [], warnings: [], data }
 */
export function validateRG90Data(data) {
  const errors = [];
  const warnings = [];
  let cleanedData = { ...data };

  try {
    // Validar financiero
    if (data.financiero) {
      const finValidation = validateFinancialData(data.financiero);
      if (!finValidation.isValid) {
        warnings.push(...finValidation.warnings);
      }
    }

    // Validar schema principal
    const result = RG90Schema.safeParse(cleanedData);

    if (!result.success) {
      if (result.error && result.error.errors) {
        result.error.errors.forEach((err) => {
          errors.push({
            field: err.path.join('.') || 'general',
            message: err.message,
            code: err.code,
          });
        });
      }
    } else {
      cleanedData = result.data;
    }

    // Validaciones adicionales de negocio
    const businessErrors = validateBusinessRules(cleanedData);
    errors.push(...businessErrors);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      data: errors.length === 0 ? cleanedData : null,
    };
  } catch (err) {
    return {
      valid: false,
      errors: [{ field: 'general', message: err.message }],
      warnings,
      data: null,
    };
  }
}

/**
 * Validaciones de reglas de negocio
 */
function validateBusinessRules(data) {
  const errors = [];

  // Regla 1: Si hay monto gravado, debe haber IVA
  const totalGravado =
    (parseFloat(data.financiero?.montoGravado10) || 0) +
    (parseFloat(data.financiero?.montoGravado5) || 0);
  const totalIva =
    (parseFloat(data.financiero?.iva10) || 0) +
    (parseFloat(data.financiero?.iva5) || 0);

  if (totalGravado > 0 && totalIva === 0) {
    errors.push({
      field: 'financiero.iva',
      message: 'Si hay monto gravado debe especificar IVA',
    });
  }

  // Regla 2: Validar timbrado no sea 0
  if (data.comprobante?.timbrado === '0') {
    errors.push({
      field: 'comprobante.timbrado',
      message: 'Timbrado no puede ser 0',
    });
  }

  // Regla 3: Comprobante no puede ser del futuro
  const fechaEmision = new Date(data.comprobante?.fechaEmision);
  if (fechaEmision > new Date()) {
    errors.push({
      field: 'comprobante.fechaEmision',
      message: 'La fecha de emisión no puede ser en el futuro',
    });
  }

  // Regla 4: Periodo debe coincidir con fecha de emisión
  if (data.comprobante?.periodoEmision && data.comprobante?.fechaEmision) {
    const [year, month] = data.comprobante.fechaEmision.split('-');
    const expectedPeriodo = `${year}${month}`;
    if (data.comprobante.periodoEmision !== expectedPeriodo) {
      errors.push({
        field: 'comprobante.periodoEmision',
        message: `Período debe ser ${expectedPeriodo}`,
      });
    }
  }

  return errors;
}

/**
 * Detecta campos faltantes críticos
 */
export function detectMissingFields(data) {
  const missing = [];
  const critical = [
    'informante.ruc',
    'informante.nombre',
    'informado.ruc',
    'informado.nombre',
    'comprobante.numero',
    'comprobante.fechaEmision',
    'financiero.totalComprobante',
  ];

  critical.forEach((field) => {
    const value = getNestedValue(data, field);
    if (value === null || value === undefined || value === '') {
      missing.push(field);
    }
  });

  return missing;
}

/**
 * Obtiene valor anidado
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, prop) => current?.[prop], obj);
}

/**
 * Calcula nivel de confianza general
 */
export function calculateConfidence(extractedData, validationResult) {
  if (!validationResult) return 0;

  const errorPenalty = validationResult.errors.length * 0.15;
  const warningPenalty = validationResult.warnings.length * 0.05;
  let confidence = 1.0 - errorPenalty - warningPenalty;

  // Penalizar por campos faltantes
  const missing = detectMissingFields(extractedData);
  confidence -= missing.length * 0.1;

  // Mínimo 0, máximo 1
  return Math.max(0, Math.min(1, confidence));
}

export default {
  validateRG90Data,
  detectMissingFields,
  calculateConfidence,
};
