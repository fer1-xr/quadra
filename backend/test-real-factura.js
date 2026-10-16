import fs from 'fs';
import { getInvoiceExtractor } from './services/ocr/invoice-extractor.js';

async function testRealFactura() {
  console.log('✅ Test REAL con factura Armielo + Gemini Vision\n');

  const extractor = getInvoiceExtractor();
  const imageBuffer = fs.readFileSync('./factura-test.jpg');

  const sizeKb = (imageBuffer.length / 1024).toFixed(1);
  console.log(`📸 Imagen cargada: ${sizeKb} KB`);
  console.log('🔍 Enviando a Gemini Vision (gemini-3.8-flash)...\n');

  const result = await extractor.processFile(imageBuffer, 'factura-test.jpg');

  if (result.success) {
    console.log('✅ EXTRACCION EXITOSA\n');
    console.log('📊 DATOS EXTRAIDOS:');
    console.log('================\n');

    const data = result.extractedData;

    console.log('👤 INFORMANTE (Comprador):');
    console.log(`   RUC: ${data.informante?.ruc || '(no extraído)'}`);
    console.log(`   Nombre: ${data.informante?.nombre || '(no extraído)'}\n`);

    console.log('🏢 PROVEEDOR:');
    console.log(`   RUC: ${data.informado?.ruc || '(no extraído)'}`);
    console.log(`   Nombre: ${data.informado?.nombre || '(no extraído)'}\n`);

    console.log('📄 COMPROBANTE:');
    console.log(`   Número: ${data.comprobante?.numero || '(no extraído)'}`);
    console.log(`   Fecha: ${data.comprobante?.fechaEmision || '(no extraído)'}`);
    console.log(`   Timbrado: ${data.comprobante?.timbrado || '(no extraído)'}\n`);

    console.log('💰 MONTOS:');
    console.log(`   Total: ${data.financiero?.totalComprobante || '(no extraído)'}`);
    console.log(`   IVA 10%: ${data.financiero?.iva10 || '(no extraído)'}`);
    console.log(`   Monto Gravado: ${data.financiero?.montoGravado10 || '(no extraído)'}\n`);

    console.log(`📊 Confianza: ${result.confidence.overall}%`);
    console.log(`✓ Método: ${result.method}`);

    if (result.validation.valid) {
      console.log('\n✅ DATOS VALIDOS SEGUN RG90');
    } else {
      console.log('\n⚠️ Validación RG90:');
      result.validation.errors?.forEach(err => {
        console.log(`   - ${err.field}: ${err.message}`);
      });
    }
  } else {
    console.log('❌ Error:', result.error);
  }
}

testRealFactura();
