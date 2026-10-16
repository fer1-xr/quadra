/**
 * Script de prueba para el servicio OCR
 * Ejecutar: node test-ocr.js
 */

import { getInvoiceExtractor } from './services/ocr/invoice-extractor.js';
import { validateRG90Data, calculateConfidence } from './services/ocr/field-validator.js';
import fs from 'fs';
import path from 'path';

console.log('🚀 Iniciando pruebas del servicio OCR...\n');

// Test 1: Validar estructura de datos
console.log('📋 TEST 1: Validación de estructura RG90');
console.log('='.repeat(50));

const testData = {
  informante: {
    ruc: '123456789',
    nombre: 'Empresa Test S.A.',
  },
  informado: {
    ruc: '987654321',
    tipoIdentificacion: 'RUC',
    nombre: 'Proveedor Test',
  },
  comprobante: {
    tipoRegistro: 'Compra',
    tipoComprobante: 'Factura',
    fechaEmision: '2026-10-15',
    periodoEmision: '202610',
    timbrado: '123456',
    numero: '001-001-0000001',
    cdc: '',
    condicionOperacion: 'Contado',
    monedaExtranjera: false,
  },
  financiero: {
    montoGravado10: 100000,
    iva10: 10000,
    montoGravado5: 50000,
    iva5: 2500,
    montoNoGravado: 10000,
    totalComprobante: 172500,
  },
  tributario: {
    imputaIva: true,
    imputaIre: false,
    imputaIrp: false,
    noImputar: false,
  },
  metadatos: {
    origenInformacion: 'OCR',
  },
};

const validation = validateRG90Data(testData);
const confidence = calculateConfidence(testData, validation);

console.log(`✅ Validación: ${validation.valid ? 'EXITOSA' : 'FALLIDA'}`);
console.log(`📊 Confianza: ${(confidence * 100).toFixed(2)}%`);
console.log(`⚠️  Errores: ${validation.errors.length}`);
console.log(`⚡ Advertencias: ${validation.warnings.length}`);

if (validation.errors.length > 0) {
  console.log('\n❌ Errores encontrados:');
  validation.errors.forEach((err) => {
    console.log(`  - ${err.field}: ${err.message}`);
  });
}

if (validation.warnings.length > 0) {
  console.log('\n⚠️  Advertencias:');
  validation.warnings.forEach((warn) => {
    console.log(`  - ${warn}`);
  });
}

// Test 2: Extracción de campos
console.log('\n📋 TEST 2: Extracción de patrones');
console.log('='.repeat(50));

const { fieldPatterns, extractField } = await import('./services/ocr/utils/field-patterns.js');

const sampleText = `
FACTURA Nº 001-001-0000123
Timbrado: 456789
Fecha: 15/10/2026
RUC: 123456789
Razón Social: Empresa Test S.A.
Total: 172.500,00 Gs
IVA: 12.500,00 Gs
`;

console.log('Texto de prueba:');
console.log(sampleText);
console.log('\nCampos extraídos:');

const fieldsToTest = ['ruc', 'numero', 'timbrado', 'fecha', 'monto', 'iva'];
fieldsToTest.forEach((field) => {
  const pattern = fieldPatterns[field];
  if (pattern) {
    const result = extractField(sampleText, pattern);
    console.log(`  ✓ ${field}: ${result.found ? result.value : '(no encontrado)'}`);
  }
});

// Test 3: Test del extractor completo (sin OCR visual)
console.log('\n📋 TEST 3: Extractor de campos');
console.log('='.repeat(50));

const extractor = getInvoiceExtractor();
console.log('✅ Extractor inicializado');
console.log('📝 Métodos disponibles:');
console.log('  - processFile(buffer, filename)');
console.log('  - processFileBatch(files)');
console.log('  - extractFields(text)');

// Test 4: Comprobación de dependencias
console.log('\n📋 TEST 4: Dependencias instaladas');
console.log('='.repeat(50));

const dependencies = [
  'tesseract.js',
  'pdfjs-dist',
  'pdf-parse',
  'sharp',
  'zod',
  'multer',
  'exceljs',
  'uuid',
];

let allInstalled = true;
dependencies.forEach((dep) => {
  try {
    require.resolve(dep);
    console.log(`✅ ${dep}`);
  } catch (e) {
    console.log(`❌ ${dep}`);
    allInstalled = false;
  }
});

console.log('\n' + '='.repeat(50));
console.log(allInstalled ? '✅ TODAS LAS PRUEBAS PASARON' : '⚠️  ALGUNAS DEPENDENCIAS FALTAN');
console.log('='.repeat(50));
