// api/recreate-item.js - Complete API endpoint for clothing item recreation
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
    const { originalImageData, detectedItem, userId } = req.body;

    if (!originalImageData || !detectedItem) {
      return res.status(400).json({ error: 'Missing required data' });
    }

    console.log(`🎨 Starting recreation for ${detectedItem.type}`);

    // Check environment variables
    console.log('Environment check:', {
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      keyLength: process.env.GEMINI_API_KEY?.length,
    });

    // Step 1: Generate detailed description using Gemini Vision
    const description = await generateDetailedDescription(detectedItem, originalImageData);
    
    // Step 2: Generate product photo using Imagen
    const recreatedImage = await generateProductPhoto(description, detectedItem, originalImageData);

    console.log(`✅ Recreation complete for ${detectedItem.type}`);

    res.status(200).json({
      success: true,
      originalItem: detectedItem,
      description: description,
      recreatedImageUrl: recreatedImage,
      metadata: {
        timestamp: new Date().toISOString(),
        userId: userId || 'demo'
      }
    });

  } catch (error) {
    console.error('❌ Recreation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Recreation failed',
      message: error.message
    });
  }
}

async function generateDetailedDescription(detectedItem, originalImageData) {
  try {
    const prompt = `Describe the ${detectedItem.type} in this image. Include: colors, pattern, fabric, and key design details. Be specific about visual elements.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: originalImageData
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.3,
          topK: 32,
          topP: 0.8,
          maxOutputTokens: 4096,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini description failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Gemini response structure:', JSON.stringify(result, null, 2));
    
    // Check if we have candidates
    if (!result.candidates || !result.candidates.length) {
      console.error('No candidates in Gemini response:', result);
      throw new Error('No candidates in Gemini response');
    }
    
    const candidate = result.candidates[0];
    
    // Check if the response was truncated due to token limit
    if (candidate.finishReason === 'MAX_TOKENS') {
      console.warn('Response truncated due to MAX_TOKENS limit');
      if (result.usageMetadata && result.usageMetadata.thoughtsTokenCount) {
        console.error('DEBUG: Internal thought tokens may have been exhausted.');
      }
    }
    
    // Check if we have content with parts
    if (!candidate.content || !candidate.content.parts || !candidate.content.parts.length) {
      console.error('No content parts in Gemini response. finishReason:', candidate.finishReason);
      throw new Error('No content parts in Gemini response');
    }
    
    const textPart = candidate.content.parts[0];
    
    // Check if the part has text content
    if (!textPart.text) {
      console.error('No text content in response part:', textPart);
      throw new Error('No text content in Gemini response');
    }
    
    return textPart.text;

  } catch (error) {
    console.error('Description generation failed:', error);
    throw new Error(`Failed to generate description: ${error.message}`);
  }
}

async function generateProductPhoto(description, detectedItem, originalImageData) {
  try {
    // Check if we have the required environment variables for Vertex AI
    if (!process.env.GOOGLE_CLOUD_PROJECT_ID || !process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      console.warn('Vertex AI credentials not found, using placeholder image');
      return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    }

    const prompt = `Professional product photography of a ${detectedItem.type}: ${description}

Style: Clean white background, studio lighting, e-commerce style, high resolution, sharp focus, front-facing view, no person, only the garment`;

    // Use Vertex AI Imagen for image generation
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    const location = 'us-central1'; // Imagen is available in us-central1
    const model = 'imagegeneration@005';
    
    const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateImages`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${await getAccessToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instances: [{
          prompt: prompt,
          parameters: {
            sampleCount: 1,
            aspectRatio: "1:1",
            safetyFilterLevel: "block_some",
            personGeneration: "dont_allow"
          }
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Vertex AI Imagen Error:', errorText);
      throw new Error(`Vertex AI Imagen error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Vertex AI Imagen response:', JSON.stringify(result, null, 2));
    
    if (result.predictions && result.predictions[0] && result.predictions[0].bytesBase64Encoded) {
      const imageData = result.predictions[0].bytesBase64Encoded;
      return `data:image/jpeg;base64,${imageData}`;
    } else {
      console.error('Unexpected Vertex AI response structure:', result);
      throw new Error('No image data in Vertex AI response');
    }
    
  } catch (error) {
    console.error('Image generation failed:', error);
    // Return placeholder on error
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  }
}

// Helper function to get access token for Vertex AI
async function getAccessToken() {
  try {
    const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
    const { GoogleAuth } = await import('google-auth-library');
    const auth = new GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    return accessToken.token;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw new Error('Failed to get access token for Vertex AI');
  }
}