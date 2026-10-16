import fs from 'fs';
import { getInvoiceExtractor } from './services/ocr/invoice-extractor.js';

async function quickTest() {
  console.log('Test rapido con gemini-2.5-flash...\n');

  const extractor = getInvoiceExtractor();
  const imageBuffer = fs.readFileSync('../../factura.pdf');

  const sizeKb = (imageBuffer.length / 1024).toFixed(0);
  console.log(`Cargado: factura.pdf (${sizeKb} KB)`);
  console.log('Procesando...\n');

  const result = await extractor.processFile(imageBuffer, 'factura.pdf');

  if (result.success) {
    console.log('EXITO - Modelo funciona\n');
    console.log('Datos extraidos:');
    console.log(JSON.stringify(result.extractedData, null, 2));
  } else {
    console.log('Error:', result.error);
  }
}

quickTest();
