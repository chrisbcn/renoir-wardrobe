import VertexAIService from '../../src/lib/vertex-ai/service.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('VertexAI test endpoint called');
    
    const vertexAI = new VertexAIService();
    const healthCheck = await vertexAI.healthCheck();
    
    return res.status(healthCheck.success ? 200 : 500).json({
      ...healthCheck,
      message: healthCheck.success 
        ? 'All VertexAI tests passed! Ready for fashion analysis.' 
        : 'Some tests failed. Check configuration.'
    });
    
  } catch (error) {
    console.error('Test suite error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
