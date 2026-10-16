import { GoogleGenerativeAI } from '@google/generative-ai';

async function testGemini() {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error('❌ GOOGLE_API_KEY no configurada');
    console.log('\nUsage: $env:GOOGLE_API_KEY = "tu-api-key" ; node test-gemini-models.js');
    process.exit(1);
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  console.log('🔍 Probando conexión con Google Gemini API...\n');

  const modelsToTry = [
    'gemini-pro',
    'gemini-pro-vision',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-2.0-flash',
  ];

  for (const model of modelsToTry) {
    try {
      console.log(`⏳ Probando ${model}...`);
      const m = genAI.getGenerativeModel({ model });
      const result = await m.generateContent('test');
      console.log(`✅ ${model} - FUNCIONA\n`);
      return model; // Retorna el primer modelo que funciona
    } catch (error) {
      const errorMsg = error.message.split('\n')[0];
      console.log(`❌ ${model} - ${errorMsg}\n`);
    }
  }

  console.log('⚠️  Ningún modelo funcionó. Verifica tu API key en https://ai.google.dev/');
}

testGemini();
