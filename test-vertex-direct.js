import VertexAIService from './src/lib/vertex-ai/service.js';
import dotenv from 'dotenv';

dotenv.config();

async function testVertexAI() {
  try {
    console.log('🧪 Testing VertexAI directly...');
    console.log('Project ID:', process.env.GOOGLE_CLOUD_PROJECT_ID);
    console.log('Credentials file:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
    
    const vertexAI = new VertexAIService();
    const result = await vertexAI.healthCheck();
    
    console.log('\n📊 Health Check Results:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\n🎉 VertexAI is ready for deployment!');
    } else {
      console.log('\n❌ Issues found - check configuration');
    }
    
  } catch (error) {
    console.error('❌ Direct test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testVertexAI();
