import fs from 'fs';
import { getInvoiceExtractor } from './services/ocr/invoice-extractor.js';

async function test() {
  console.log('🚀 Probando extracción con Google Gemini Vision (GRATIS)...\n');

  const extractor = getInvoiceExtractor();

  // Ruta a la imagen de prueba (la que el usuario subió)
  const testImagePath = '../AGROPECUARIA Armielo factura.jpg';

  if (!fs.existsSync(testImagePath)) {
    console.error(`❌ No se encontró imagen en: ${testImagePath}`);
    console.log('Por favor, proporciona una ruta válida a la imagen de factura.');
    process.exit(1);
  }

  try {
    console.log(`📂 Leyendo imagen: ${testImagePath}`);
    const imageBuffer = fs.readFileSync(testImagePath);
    console.log(`✓ Imagen cargada: ${(imageBuffer.length / 1024).toFixed(2)} KB\n`);

    console.log(`🔍 Procesando con Gemini Vision...`);
    const result = await extractor.processFile(imageBuffer, 'factura.jpg');

    if (result.success) {
      console.log('\n✅ EXTRACCIÓN EXITOSA\n');
      console.log('📋 DATOS EXTRAÍDOS:');
      console.log('===================\n');

      if (result.extractedData) {
        console.log('👤 Informante:');
        console.log(`  RUC: ${result.extractedData.informante?.ruc || '(no extraído)'}`);
        console.log(`  Nombre: ${result.extractedData.informante?.nombre || '(no extraído)'}\n`);

        console.log('🏢 Proveedor:');
        console.log(`  RUC: ${result.extractedData.informado?.ruc || '(no extraído)'}`);
        console.log(`  Nombre: ${result.extractedData.informado?.nombre || '(no extraído)'}\n`);

        console.log('📄 Comprobante:');
        console.log(`  Número: ${result.extractedData.comprobante?.numero || '(no extraído)'}`);
        console.log(`  Fecha: ${result.extractedData.comprobante?.fechaEmision || '(no extraído)'}`);
        console.log(`  Timbrado: ${result.extractedData.comprobante?.timbrado || '(no extraído)'}\n`);

        console.log('💰 Montos:');
        console.log(`  Total: ${result.extractedData.financiero?.totalComprobante || '(no extraído)'}`);
        console.log(`  IVA 10%: ${result.extractedData.financiero?.iva10 || '(no extraído)'}`);
        console.log(`  IVA 5%: ${result.extractedData.financiero?.iva5 || '(no extraído)'}\n`);

        console.log(`📊 Confianza: ${result.confidence.overall}%`);
        console.log(`✓ Método: ${result.method}\n`);

        if (result.validation.valid) {
          console.log('✅ VALIDACIÓN: Datos válidos según RG90\n');
        } else {
          console.log('⚠️ VALIDACIÓN: Hay errores:');
          result.validation.errors?.forEach(err => {
            console.log(`  - ${err.field}: ${err.message}`);
          });
          console.log();
        }
      }

      console.log('🎉 La solución funciona correctamente con Gemini Vision (¡sin costo!)');
    } else {
      console.error(`❌ Error: ${result.error}`);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

test();
