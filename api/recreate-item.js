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
        hasVertexProject: !!process.env.GOOGLE_CLOUD_PROJECT_ID,
        hasVertexLocation: !!process.env.GOOGLE_CLOUD_LOCATION,
      });
  
      // Step 1: Generate detailed description using Gemini
      const description = await generateDetailedDescription(detectedItem, originalImageData);
      console.log('📝 Generated description:', description);
  
      // Step 2: Generate product photo using Vertex AI Imagen
      const recreatedImage = await generateProductPhoto(description, detectedItem);
  
      console.log(`✅ Recreation complete for ${detectedItem.type}`);
  
      res.status(200).json({
        success: true,
        originalItem: detectedItem,
        description: description,
        recreatedImageUrl: recreatedImage,
        metadata: {
          timestamp: new Date().toISOString(),
          userId: userId || 'demo',
          models: {
            description: 'gemini-2.5-flash',
            imageGeneration: 'imagen-4.0-ultra-generate-001'
          }
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
    const prompt = `Analyze this ${detectedItem.type} and provide a detailed description for recreating it in a ghost mannequin style. Focus on:
    - Fabric type and texture
    - Color and patterns
    - Fit and silhouette
    - Style details (collar, sleeves, length, etc.)
    - Any distinctive features
    
    Be specific and detailed for accurate recreation.`;
    
    console.log('📝 Generating detailed description with Gemini 2.5 Flash...');
    
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
          temperature: 0.7,
          topK: 32,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Error:', errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log("📝 Gemini description response:", JSON.stringify(result, null, 2));

    if (result.candidates && result.candidates.length > 0) {
      const candidate = result.candidates[0];
      if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        const description = candidate.content.parts[0].text;
        console.log('✅ Generated description:', description);
        return description;
      }
    }
    
    console.error('❌ No description found in Gemini response');
    throw new Error('No description found in Gemini response');

  } catch (error) {
    console.error('Description generation failed:', error);
    // Return a basic description as fallback
    return `A ${detectedItem.type} in a ghost mannequin style, professional product photography`;
  }
}

async function generateProductPhoto(description, detectedItem) {
  try {
    // Get access token for Vertex AI
    const accessToken = await getAccessToken();
    
    const prompt = `Create a professional product photo of a ${detectedItem.type} in a ghost mannequin style. ${description}. 
    
    Requirements:
    - Ghost mannequin/invisible mannequin style
    - Professional product photography
    - Clean white background
    - High quality, detailed
    - Show the garment's shape and fit clearly
    - Good lighting and shadows`;
    
    console.log('🎨 Generating product photo with Vertex AI Imagen Ultra...');
    console.log('Prompt:', prompt);
    
    const response = await fetch(`https://us-central1-aiplatform.googleapis.com/v1/projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/locations/${process.env.GOOGLE_CLOUD_LOCATION}/publishers/google/models/imagen-4.0-ultra-generate-001:predict`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instances: [{
          prompt: prompt
        }],
        parameters: {
          sampleCount: 1,
          aspectRatio: "1:1",
          safetyFilterLevel: "block_few",
          personGeneration: "allow_adult"
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Vertex AI Imagen Error:', errorText);
      throw new Error(`Vertex AI Imagen error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log("🎨 Vertex AI Imagen response:", JSON.stringify(result, null, 2));

    if (result.predictions && result.predictions.length > 0) {
      const prediction = result.predictions[0];
      if (prediction.bytesBase64Encoded) {
        console.log('✅ Successfully generated image with Vertex AI Imagen Ultra!');
        return `data:image/png;base64,${prediction.bytesBase64Encoded}`;
      }
    }
    
    console.error('❌ No image data found in Vertex AI response');
    throw new Error('No image data found in Vertex AI response');

  } catch (error) {
    console.error('Image generation failed:', error);
    console.log('🔄 Falling back to placeholder image');
    // Return placeholder on error
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  }
}

async function getAccessToken() {
  try {
    const { GoogleAuth } = await import('google-auth-library');
    
    const auth = new GoogleAuth({
      credentials: {
        type: "service_account",
        project_id: process.env.GOOGLE_CLOUD_PROJECT_ID,
        private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_CLIENT_ID,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.GOOGLE_CLIENT_EMAIL}`
      },
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });

    const accessTokenResponse = await auth.getAccessToken();
    return accessTokenResponse.token;
  } catch (error) {
    console.error('Failed to get access token:', error);
    throw new Error('Authentication failed');
  }
}
