// api/vertex-ai/analyze.js - Main VertexAI analysis endpoint
import VertexAIService from '../../src/lib/vertex-ai/service.js';

const vertexAI = new VertexAIService();

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('VertexAI analysis request received:', { 
      type: req.body?.type, 
      hasImage: !!req.body?.image,
      imageLength: req.body?.image?.length 
    });

    const { image, type = 'wardrobe' } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    // Validate image data
    if (typeof image !== 'string' || image.length < 100) {
      return res.status(400).json({ error: 'Invalid image data format' });
    }

    console.log(`Starting VertexAI analysis for type: ${type}`);

    const result = await vertexAI.analyzeFashionItem(image, type);
    
    if (!result.success) {
      console.error('VertexAI analysis failed:', result.error);
      return res.status(500).json({ 
        error: 'Analysis failed',
        details: result.error,
        provider: 'vertexai-gemini'
      });
    }

    console.log('VertexAI analysis completed successfully');
    
    return res.status(200).json({ 
      analysis: result.analysis,
      provider: result.provider,
      model: result.model,
      metadata: result.metadata
    });
    
  } catch (error) {
    console.error('VertexAI API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message,
      provider: 'vertexai-gemini'
    });
  }
}