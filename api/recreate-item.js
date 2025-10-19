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
        keyPrefix: process.env.GEMINI_API_KEY?.substring(0, 10) + '...',
      });
  
      // Direct image generation using Gemini 2.5 Flash Image (same as Studio)
      const recreatedImage = await generateProductPhoto(detectedItem, originalImageData);
  
      console.log(`✅ Recreation complete for ${detectedItem.type}`);
  
      res.status(200).json({
        success: true,
        originalItem: detectedItem,
        recreatedImageUrl: recreatedImage,
        metadata: {
          timestamp: new Date().toISOString(),
          userId: userId || 'demo',
          model: 'gemini-2.5-flash-image'
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
  

async function getAccessToken() {
  const { GoogleAuth } = require('google-auth-library');
  
  const auth = new GoogleAuth({
    credentials: {
      type: 'service_account',
      project_id: process.env.GOOGLE_CLOUD_PROJECT_ID,
      private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      client_id: process.env.GOOGLE_CLIENT_ID,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
    },
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  });

  const accessToken = await auth.getAccessToken();
  return accessToken.token;
}

async function generateProductPhoto(detectedItem, originalImageData) {
  try {
    // Use Gemini 2.5 Flash Image via Vertex AI
    const prompt = `recreate in a ghost mannequin style the ${detectedItem.type} in this photo`;
    
    console.log('🎨 Using Gemini 2.5 Flash Image via Vertex AI for direct recreation...');
    console.log('Prompt:', prompt);
    
    const accessToken = await getAccessToken();
    
    const response = await fetch(`https://us-central1-aiplatform.googleapis.com/v1/projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/locations/us-central1/publishers/google/models/gemini-2.5-flash-image:generateContent`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: originalImageData.replace(/^data:image\/[a-z]+;base64,/, '')
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 1.0,
          topK: 32,
          topP: 0.95,
          maxOutputTokens: 32768,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Error:', errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log("🔍 FULL Gemini API Response:", JSON.stringify(result, null, 2));

    if (result.candidates && result.candidates.length > 0) {
      const candidate = result.candidates[0];
      console.log("🔍 Candidate structure:", JSON.stringify(candidate, null, 2));
      
      if (candidate.content && candidate.content.parts) {
        console.log("🔍 Parts found:", candidate.content.parts.length);
        for (let i = 0; i < candidate.content.parts.length; i++) {
          const part = candidate.content.parts[i];
          console.log(`🔍 Part ${i}:`, JSON.stringify(part, null, 2));
          
          // Check for image data in inlineData
          if (part.inlineData && part.inlineData.data) {
            console.log('✅ Successfully generated image with Gemini 2.0 Flash Preview Image Generation!');
            console.log('Found image data, length:', part.inlineData.data.length);
            console.log('MIME type:', part.inlineData.mimeType);
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          }
          // Check for text response (for debugging)
          if (part.text) {
            console.log('Generated text:', part.text);
          }
        }
      }
      
      console.error('❌ No image data found in Gemini response');
      console.error('❌ Response structure:', JSON.stringify(result, null, 2));
      throw new Error('No image data found in Gemini response');
    } else {
      console.error('❌ No candidates found in Gemini response');
      throw new Error('No candidates found in Gemini response');
    }

  } catch (error) {
    console.error('Image generation failed:', error);
    console.log('🔄 Falling back to placeholder image');
    // Return placeholder on error
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  }
}