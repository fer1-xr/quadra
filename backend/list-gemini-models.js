import { GoogleGenerativeAI } from '@google/generative-ai';

async function listModels() {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error('❌ GOOGLE_API_KEY no configurada');
    process.exit(1);
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    console.log('📋 Listando modelos disponibles...\n');
    const models = await genAI.listModels();

    console.log('Modelos disponibles:');
    for (const model of models.models) {
      console.log(`  - ${model.name}`);
      if (model.displayName) {
        console.log(`    Display: ${model.displayName}`);
      }
      if (model.supportedGenerationMethods) {
        console.log(`    Métodos: ${model.supportedGenerationMethods.join(', ')}`);
      }
      console.log();
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

listModels();
