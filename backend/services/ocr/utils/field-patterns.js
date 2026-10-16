// Patrones regex para extracción de campos de facturas paraguayas

export const fieldPatterns = {
  // RUC: formato 123456789 o 123.456.789-D
  ruc: {
    patterns: [
      /(\d{1,9})[\.\s\-]?(\d)?(?:\s|$|[^\d])/,
      /RUC[:\s]*([0-9\.\-]{5,15})/gi,
      /([0-9]{4,9})(?:\s|$|-\d|\.)/,
    ],
    cleanup: (text) => text.replace(/[\.\-\s]/g, '').replace(/[^\d]/g, '').substring(0, 9),
  },

  // Fecha: múltiples formatos
  fecha: {
    patterns: [
      /([0-9]{1,2})\s+(?:de\s+)?(?:Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Setiembre|Septiembre|Octubre|Noviembre|Diciembre|ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SET|SEP|OCT|NOV|DIC)/gi,
      /(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/,
      /(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/,
    ],
    cleanup: (text) => {
      // Intentar DD/MM/YYYY o similar
      let match = text.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
      if (match) {
        let [, day, month, year] = match;
        if (year.length === 2) year = '20' + year;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      // Intentar YYYY/MM/DD
      match = text.match(/(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
      if (match) {
        const [, year, month, day] = match;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      // Extraer números y asumir DD/MM
      const nums = text.match(/\d+/g);
      if (nums && nums.length >= 2) {
        const day = nums[0].padStart(2, '0');
        const month = nums[1].padStart(2, '0');
        const year = new Date().getFullYear();
        return `${year}-${month}-${day}`;
      }
      return null;
    },
  },

  // Número de comprobante: 001-001 o 001-001-0000001
  numeroComprobante: {
    patterns: [
      /(\d{3})[\s\-](\d{3})[\s\-]?(\d{6,8})?/,
      /(\d{3}[\s\-]\d{3})/,
      /[Nn]º[\s]*(\d{3}[\s\-]\d{3})/,
    ],
    cleanup: (text) => {
      const parts = text.replace(/[\s]/g, '-').split('-');
      if (parts.length >= 2) {
        return parts.slice(0, 3).join('-');
      }
      return text.replace(/[\s]/g, '-');
    },
  },

  // Timbrado: número de 3-8 dígitos
  timbrado: {
    patterns: [
      /(?:Timbrado|Timb|T)[:\s]*([0-9]{3,10})/gi,
      /(?:Timbrado:?)\s+([0-9]{6,10})/gi,
      /([0-9]{6,10})(?:\s|$)/,
    ],
    cleanup: (text) => text.replace(/[\D]/g, '').substring(0, 10),
  },

  // Montos: números con o sin separadores
  monto: {
    patterns: [
      /(?:TOTAL|Total|MONTO|Monto)[:\s]*[\$Gs]*\s*([0-9]{1,20}(?:[.,][0-9]{2})?)/gi,
      /[\$Gs]\s*([0-9]{1,20}(?:[.,][0-9]{2})?)/,
      /([0-9]{3,20}(?:[.,][0-9]{2})?)/,
    ],
    cleanup: (text) => {
      const cleaned = text.replace(/[\$Gs\s,.]/g, '').replace(/[.,]/, '.');
      const num = parseFloat(cleaned);
      return isNaN(num) ? '0' : num.toString();
    },
  },

  // IVA: porcentaje o monto
  iva: {
    patterns: [
      /IVA\s*(?:10%?|5%?)?[:\s]*[\$Gs]*\s*([0-9]{1,20}(?:[.,][0-9]{2})?)/gi,
      /([0-9]{1,20}(?:[.,][0-9]{2})?)\s*(?:Gs|Guaraní)/i,
    ],
    cleanup: (text) => {
      const cleaned = text.replace(/[\$Gs\s,.%]/g, '').replace(/[.,]/, '.');
      const num = parseFloat(cleaned);
      return isNaN(num) ? '0' : num.toString();
    },
  },

  // Razón social / Nombre
  nombre: {
    patterns: [
      /(?:EMPRESA|RAZÓN SOCIAL|Empresa|Proveedor)[:\s]*([A-Z][^\n]{3,100})/gi,
      /([A-Z][A-Z\s\-\&]{5,100})/,
    ],
    cleanup: (text) => text.trim().substring(0, 100).toUpperCase(),
  },

  // Periodo YYYYMM
  periodo: {
    patterns: [
      /([0-9]{6})/,
      /([0-9]{2})[\/-]([0-9]{4})/,
    ],
    cleanup: (text) => {
      let match = text.match(/([0-9]{6})/);
      if (match && /^20[0-9]{4}$/.test(match[1])) {
        return match[1];
      }
      match = text.match(/([0-9]{2})[\/-]([0-9]{4})/);
      if (match) {
        return `${match[2]}${match[1]}`;
      }
      return text.replace(/[\D]/g, '').substring(0, 6);
    },
  },

  // Tipo de comprobante
  tipoComprobante: {
    patterns: [
      /(?:FACTURA|Factura|RECIBO|Recibo)/gi,
      /(Factura|NC|ND|Tiquete)/gi,
    ],
    cleanup: (text) => {
      const types = {
        'factura': 'Factura',
        'nc': 'NC',
        'nd': 'ND',
        'tiquete': 'Tiquete',
        'recibo': 'Factura',
      };
      const key = text.toLowerCase().trim();
      return types[key] || 'Factura';
    },
  },
};

/**
 * Extrae un campo usando patrones
 * @param {string} text - Texto donde buscar
 * @param {object} fieldPattern - Objeto con patterns y cleanup
 * @returns {object} { value, confidence, found }
 */
export function extractField(text, fieldPattern) {
  if (!text || !fieldPattern) {
    return { value: null, confidence: 0, found: false };
  }

  for (const pattern of fieldPattern.patterns) {
    try {
      const match = text.match(pattern);
      if (match && match.length > 0) {
        // Obtener el mejor grupo capturado (preferir el primero no vacío)
        let extracted = null;
        for (let i = 1; i < match.length; i++) {
          if (match[i] && match[i].trim()) {
            extracted = match[i];
            break;
          }
        }

        // Si no hay grupos capturados, usar el match completo
        if (!extracted) {
          extracted = match[0];
        }

        // Aplicar limpieza
        const cleaned = fieldPattern.cleanup
          ? fieldPattern.cleanup(extracted)
          : extracted;

        // Validar que el resultado no esté vacío
        if (cleaned && cleaned.toString().trim()) {
          return {
            value: cleaned,
            confidence: 0.85,
            found: true,
            raw: extracted,
          };
        }
      }
    } catch (e) {
      console.error(`Error al procesar patrón: ${e.message}`);
    }
  }

  return { value: null, confidence: 0, found: false };
}

/**
 * Valida un número como RUC paraguayo
 */
export function isValidRuc(ruc) {
  if (!ruc) return false;
  const clean = ruc.toString().replace(/[\D]/g, '');
  return clean.length >= 4 && clean.length <= 9 && /^[0-9]+$/.test(clean);
}

/**
 * Valida una fecha
 */
export function isValidDate(dateStr) {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date);
}

/**
 * Valida un monto (número positivo)
 */
export function isValidMonto(monto) {
  if (monto === null || monto === undefined) return false;
  const num = parseFloat(monto);
  return num >= 0 && !isNaN(num);
}

/**
 * Normaliza montos y calcula checksums
 */
export function validateFinancialData(financiero) {
  const {
    montoGravado10 = 0,
    iva10 = 0,
    montoGravado5 = 0,
    iva5 = 0,
    montoNoGravado = 0,
    totalComprobante = 0,
  } = financiero;

  const calculatedTotal =
    parseFloat(montoGravado10 || 0) +
    parseFloat(iva10 || 0) +
    parseFloat(montoGravado5 || 0) +
    parseFloat(iva5 || 0) +
    parseFloat(montoNoGravado || 0);

  const difference = Math.abs(calculatedTotal - parseFloat(totalComprobante || 0));

  return {
    isValid: difference < 1, // Tolerancia de 1 Gs
    calculatedTotal,
    difference,
    warnings: difference > 0 ? [`Diferencia en total: ${difference} Gs`] : [],
  };
}
