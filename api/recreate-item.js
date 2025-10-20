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
        hasProjectId: !!process.env.GOOGLE_CLOUD_PROJECT_ID,
        hasCredentials: !!(process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_CLIENT_EMAIL),
      });
  
      // Image generation using Gemini 2.5 Flash Image via Vertex AI
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
    // Build a detailed prompt for Gemini 2.5 Flash Image
    const itemDescription = [
      detectedItem.type,
      detectedItem.color,
      detectedItem.pattern,
      detectedItem.material
    ].filter(Boolean).join(', ');
    
    const prompt = `Create a professional product photo of this ${itemDescription} displayed on an invisible ghost mannequin. The clothing should be shown in a clean, studio lighting setup with a pure white background. The garment should appear floating and properly shaped as if worn, with all details clearly visible. High-quality fashion e-commerce photography style.`;
    
    console.log('🎨 Using Gemini 2.5 Flash Image via Vertex AI...');
    console.log('Prompt:', prompt);
    console.log('Item details:', itemDescription);
    
    const accessToken = await getAccessToken();
    
    // Clean the base64 data
    const cleanImageData = originalImageData.replace(/^data:image\/[a-z]+;base64,/, '');
    
    // Use Gemini 2.5 Flash Image - KEY: Must specify responseModalities: ["IMAGE"]
    const response = await fetch(`https://us-central1-aiplatform.googleapis.com/v1/projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/locations/us-central1/publishers/google/models/gemini-2.5-flash-image:generateContent`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: cleanImageData
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 1.0,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
          responseModalities: ["IMAGE"],  // CRITICAL: This tells Gemini to return an image!
          responseMimeType: "image/jpeg"
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini API Error:', errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log("🔍 Gemini API Response received");
    console.log("🔍 Full response structure:", JSON.stringify(result, null, 2));

    if (result.candidates && result.candidates.length > 0) {
      const candidate = result.candidates[0];
      
      if (candidate.content && candidate.content.parts) {
        console.log("🔍 Parts found:", candidate.content.parts.length);
        
        for (const part of candidate.content.parts) {
          // Check for inline_data (new format)
          if (part.inline_data && part.inline_data.data) {
            console.log('✅ Successfully generated image with Gemini 2.5 Flash Image!');
            console.log('Image data length:', part.inline_data.data.length);
            console.log('MIME type:', part.inline_data.mime_type);
            return `data:${part.inline_data.mime_type};base64,${part.inline_data.data}`;
          }
          // Check for inlineData (alternate format)
          if (part.inlineData && part.inlineData.data) {
            console.log('✅ Successfully generated image with Gemini 2.5 Flash Image!');
            console.log('Image data length:', part.inlineData.data.length);
            console.log('MIME type:', part.inlineData.mimeType);
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          }
        }
      }
      
      console.error('❌ No image data found in Gemini response');
      console.error('❌ Response structure:', JSON.stringify(result, null, 2));
      throw new Error('No image data found in Gemini response. Check logs for full response structure.');
    } else {
      console.error('❌ No candidates found in Gemini response');
      console.error('❌ Full response:', JSON.stringify(result, null, 2));
      throw new Error('No candidates found in Gemini response');
    }

  } catch (error) {
    console.error('❌ Image generation failed:', error);
    console.error('❌ Error details:', error.message);
    // Re-throw the error so the main handler can return a proper error response
    throw error;
  }
}