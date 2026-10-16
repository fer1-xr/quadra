import Anthropic from '@anthropic-ai/sdk';

const textOCR = `AGROPECUARIA Armielo
RUC: 4243793-8
Timbrado: 1812103
Factura 001-001
Fecha: 26 de Setiembre 2026
PROVEEDOR: Santiago Rodríguez Machado
Caño de Reveco
Total: 612.000
IVA: 55.636`;

async function testClaude() {
  console.log('🚀 Probando extracción con Claude...\n');

  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('❌ Error: ANTHROPIC_API_KEY no configurada');
      console.log('Configura: $env:ANTHROPIC_API_KEY = "tu-clave"');
      process.exit(1);
    }

    console.log(`✓ API Key configurada (primeros 10 chars: ${apiKey.substring(0, 10)}...)\n`);

    const client = new Anthropic({ apiKey });

    const prompt = `Extrae TODOS los datos de esta factura paraguaya en formato JSON RG90.

TEXTO OCR DE LA FACTURA:
${textOCR}

Retorna SOLO JSON válido con esta estructura exacta:
{
  "informante": {
    "ruc": "número sin puntos",
    "nombre": "razón social"
  },
  "informado": {
    "ruc": "número sin puntos",
    "tipoIdentificacion": "RUC",
    "nombre": "razón social proveedor"
  },
  "comprobante": {
    "tipoRegistro": "Compra",
    "tipoComprobante": "Factura",
    "fechaEmision": "YYYY-MM-DD",
    "periodoEmision": "YYYYMM",
    "timbrado": "números",
    "numero": "001-001-0000001",
    "condicionOperacion": "Contado",
    "monedaExtranjera": false
  },
  "financiero": {
    "montoGravado10": número,
    "iva10": número,
    "montoGravado5": número,
    "iva5": número,
    "montoNoGravado": número,
    "totalComprobante": número
  },
  "tributario": {
    "imputaIva": true
  }
}`;

    console.log('📤 Enviando a Claude...');
    const message = await client.messages.create({
      model: 'claude-opus-4-1-20250108',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

    console.log('\n📥 Respuesta de Claude:');
    console.log(responseText);

    // Parsear JSON
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('❌ No se encontró JSON válido');
      process.exit(1);
    }

    const extracted = JSON.parse(jsonMatch[0]);

    console.log('\n✅ JSON EXTRAÍDO CORRECTAMENTE:');
    console.log(JSON.stringify(extracted, null, 2));

    console.log('\n📊 DATOS EXTRAÍDOS:');
    console.log(`  Informante RUC: ${extracted.informante?.ruc || 'NO EXTRAÍDO'}`);
    console.log(`  Informante Nombre: ${extracted.informante?.nombre || 'NO EXTRAÍDO'}`);
    console.log(`  Proveedor RUC: ${extracted.informado?.ruc || 'NO EXTRAÍDO'}`);
    console.log(`  Proveedor Nombre: ${extracted.informado?.nombre || 'NO EXTRAÍDO'}`);
    console.log(`  Factura #: ${extracted.comprobante?.numero || 'NO EXTRAÍDO'}`);
    console.log(`  Fecha: ${extracted.comprobante?.fechaEmision || 'NO EXTRAÍDO'}`);
    console.log(`  Timbrado: ${extracted.comprobante?.timbrado || 'NO EXTRAÍDO'}`);
    console.log(`  Total: ${extracted.financiero?.totalComprobante || 'NO EXTRAÍDO'}`);

    console.log('\n✨ Prueba exitosa - Claude está funcionando correctamente');
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

testClaude();
