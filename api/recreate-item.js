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
  
      // Step 1: Generate product photo using Gemini 2.5 Flash Image via Vertex AI
      const generatedImage = await generateProductPhoto(detectedItem, originalImageData);
      console.log(`✅ Image generation complete for ${detectedItem.type}`);
  
      // Note: No background removal - AI generates with proper gray gradient background and padding
      // This preserves the negative space needed for proper positioning in the UI
  
      res.status(200).json({
        success: true,
        originalItem: detectedItem,
        recreatedImageUrl: generatedImage,
        metadata: {
          timestamp: new Date().toISOString(),
          userId: userId || 'demo',
          model: 'gemini-2.5-flash-image',
          provider: 'vertex-ai',
          backgroundRemoval: false
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

// OAuth token generation - EXACT code from successful diagnostic test
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

  const tokenResponse = await auth.getAccessToken();
  return tokenResponse.token || tokenResponse;
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
    
    const prompt = `Create a professional product photo of ONLY this ${itemDescription} in clean ghost mannequin style.

CRITICAL DIMENSIONAL CONSTRAINTS:
- Output image: EXACTLY 3:4 aspect ratio (portrait orientation) - e.g., 1200x1600 pixels
- Garment MUST be perfectly centered both horizontally AND vertically
- Garment should occupy 65-75% of the VERTICAL frame height regardless of garment type
- All garment types (jackets, pants, skirts, tops) MUST fill the same vertical space
- Maintain consistent scale: photograph from the SAME DISTANCE for all items

COMPOSITION & FRAMING:
- Garment positioned in exact center of frame
- Equal negative space on left and right sides
- Top of garment at approximately 15-20% from top edge
- Bottom of garment at approximately 80-85% from top edge
- For pants/trousers: full length visible, waistband to hem
- For tops/jackets: collar to hem, full garment visible
- For skirts: waistband to hem

STYLE & PRESENTATION:
- Clean ghost mannequin style - garment appears floating with natural 3D shape
- Minimal volume, not inflated or puffy
- Natural drape as if worn by invisible person
- Front view ONLY - straight-on, perpendicular to camera
- NO rotation, NO angle, NO 3/4 turn

GARMENT DETAILS:
- Sleeves/straps positioned naturally at sides
- All details (pockets, buttons, seams) clearly visible
- Natural fabric drape and texture

CRITICAL RESTRICTIONS:
- NO visible mannequin parts
- NO body parts (arms, legs, torso, head)
- NO hands, NO skin
- ONLY the garment itself

BACKGROUND & LIGHTING:
- Background: Solid gradient gray (#D0D0D0 to #E8E8E8)
- Clean, even studio lighting
- Soft shadows for depth
- Professional e-commerce product photography quality

Generate the image with these EXACT specifications to ensure all garments display with identical sizing and positioning.`;
    
    console.log('🎨 Using Gemini 2.5 Flash Image via Vertex AI (enterprise)...');
    console.log('Prompt:', prompt);
    console.log('Item details:', itemDescription);
    
    const accessToken = await getAccessToken();
    console.log('✅ OAuth token generated for Vertex AI');
    
    // Clean the base64 data
    const cleanImageData = originalImageData.replace(/^data:image\/[a-z]+;base64,/, '');
    
    // Use Gemini 2.5 Flash Image via Vertex AI (verified working by diagnostic test)
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
          temperature: 0.8,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 32768
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

// removeBackground function removed - no longer needed
// AI now generates images with proper gray gradient background and padding
// This preserves the negative space required for consistent UI positioning