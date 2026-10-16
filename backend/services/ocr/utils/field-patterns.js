// Patrones regex para extracción de campos de facturas paraguayas

export const fieldPatterns = {
  // RUC: formato 123456789 o 123.456.789
  ruc: {
    patterns: [
      /RUC[:\s]+([0-9]{4,9})/gi,
      /RUC[:\s]*([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})/gi,
      /(?:RUC|Ruc)[:\s]?([0-9\.\-]{5,15})/gi,
    ],
    cleanup: (text) => text.replace(/[\.\-\s]/g, '').substring(0, 9),
  },

  // Fecha: DD/MM/YYYY, DD-MM-YYYY, o YYYY-MM-DD
  fecha: {
    patterns: [
      /(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/,
      /Fecha[:\s]+(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/gi,
      /Emisión[:\s]+(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/gi,
    ],
    cleanup: (text) => {
      const match = text.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
      if (match) {
        const [, day, month, year] = match;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      return null;
    },
  },

  // Número de comprobante: 001-001-0000001
  numeroComprobante: {
    patterns: [
      /(?:Comprobante|Factura|Nº)[:\s]*([0-9]{3,4}[\-\s]?[0-9]{3,4}[\-\s]?[0-9]{6,8})/gi,
      /([0-9]{3})[\s\-]?([0-9]{3})[\s\-]?([0-9]{6,8})/g,
    ],
    cleanup: (text) => text.replace(/[\s]/g, '-'),
  },

  // Timbrado: número de 3-8 dígitos
  timbrado: {
    patterns: [
      /Timbrado[:\s]*([0-9]{3,8})/gi,
      /(?:T|Timb\.?)[:\s]*([0-9]{3,8})/gi,
    ],
    cleanup: (text) => text.replace(/[\D]/g, '').substring(0, 8),
  },

  // Montos: números con o sin separadores
  monto: {
    patterns: [
      /[\$Gs]?\s?([0-9]{1,20}(?:[.,][0-9]{2})?)/,
      /(?:Total|Subtotal|Monto|Importe)[:\s]*[\$Gs]?\s?([0-9]{1,20}(?:[.,][0-9]{2})?)/gi,
    ],
    cleanup: (text) => {
      const cleaned = text.replace(/[\$Gs\s]/g, '').replace(/[.,]/, '.');
      return parseFloat(cleaned).toString();
    },
  },

  // IVA: porcentaje o monto
  iva: {
    patterns: [
      /IVA[:\s]*[\$Gs]?\s?([0-9]{1,20}(?:[.,][0-9]{2})?)/gi,
      /I\.V\.A[:\s]*[\$Gs]?\s?([0-9]{1,20}(?:[.,][0-9]{2})?)/gi,
    ],
    cleanup: (text) => {
      const cleaned = text.replace(/[\$Gs\s]/g, '').replace(/[.,]/, '.');
      return parseFloat(cleaned).toString();
    },
  },

  // Razón social / Nombre: línea de texto
  nombre: {
    patterns: [
      /(?:Razón Social|Empresa|Vendedor|Proveedor)[:\s]*([^\n]{5,100})/gi,
      /^([^\n]{5,100})$/m, // línea con texto
    ],
    cleanup: (text) => text.trim().substring(0, 100),
  },

  // Periodo YYYYMM
  periodo: {
    patterns: [
      /(?:Período|Mes|Período del Informe)[:\s]*([0-9]{6})/gi,
      /(?:Período|Mes)[:\s]*([0-9]{2})[\/-]([0-9]{4})/gi,
    ],
    cleanup: (text) => {
      const match = text.match(/([0-9]{2})[\/-]([0-9]{4})/);
      if (match) {
        return `${match[2]}${match[1]}`;
      }
      return text.replace(/[\D]/g, '').substring(0, 6);
    },
  },

  // Tipo de comprobante
  tipoComprobante: {
    patterns: [
      /(?:Tipo|Comprobante)[:\s]*(Factura|Recibo|Nota de Crédito|Nota de Débito|Tiquete|NC|ND)/gi,
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
    const match = text.match(pattern);
    if (match) {
      try {
        const extracted = match[1] || match[0];
        const cleaned = fieldPattern.cleanup ? fieldPattern.cleanup(extracted) : extracted;
        return {
          value: cleaned,
          confidence: 0.85,
          found: true,
          raw: extracted,
        };
      } catch (e) {
        console.error(`Error al procesar patrón: ${e.message}`);
      }
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
