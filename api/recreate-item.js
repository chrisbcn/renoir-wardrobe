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
    console.log('🎨 Attempting image generation with Gemini 2.5 Flash Image...');
    
    // Use Gemini 2.5 Flash Image for image generation (more widely available than Imagen)
    const prompt = `Create a professional e-commerce product photography image based on this description:

${description}

Requirements:
- Ghost mannequin style (no person visible)
- Clean white studio background
- Professional lighting
- High resolution
- Product thumbnail format
- E-commerce ready
- Only the garment visible`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt }
          ]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 32,
          topP: 0.8,
          maxOutputTokens: 4096,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini image generation failed:', errorText);
      throw new Error(`Gemini image generation failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Gemini image response structure:', JSON.stringify(result, null, 2));

    if (result.candidates && result.candidates.length > 0) {
      const candidate = result.candidates[0];
      
      if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        const part = candidate.content.parts[0];
        
        if (part.inlineData && part.inlineData.data) {
          console.log('✅ Successfully generated image with Gemini!');
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        } else {
          console.error('No image data in Gemini response:', part);
          throw new Error('No image data found in Gemini response');
        }
      } else {
        console.error('No content parts in Gemini response');
        throw new Error('No content parts in Gemini response');
      }
    } else {
      console.error('No candidates in Gemini response');
      throw new Error('No candidates in Gemini response');
    }

  } catch (error) {
    console.error('Image generation failed:', error);
    console.log('🔄 Falling back to placeholder image');
    // Return placeholder on error
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  }
}

// Helper function to get access token for Vertex AI
async function getAccessToken() {
  try {
    // Use individual environment variables instead of JSON string
    const credentials = {
      type: "service_account",
      project_id: process.env.GOOGLE_CLOUD_PROJECT_ID,
      private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
      private_key: process.env.GOOGLE_PRIVATE_KEY
        ?.replace(/\\n/g, '\n')  // Convert literal \n to actual newlines
        ?.replace(/\n/g, '\n')   // Ensure proper line breaks
        ?.trim(),                // Remove extra whitespace
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      client_id: process.env.GOOGLE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.GOOGLE_CLIENT_EMAIL}`
    };

    console.log('Using individual env vars for authentication');
    console.log('Project ID:', process.env.GOOGLE_CLOUD_PROJECT_ID);
    console.log('Client Email:', process.env.GOOGLE_CLIENT_EMAIL);
    console.log('Private Key ID:', process.env.GOOGLE_PRIVATE_KEY_ID);
    console.log('Client ID:', process.env.GOOGLE_CLIENT_ID);
    console.log('Private Key length:', process.env.GOOGLE_PRIVATE_KEY?.length);
    console.log('Private Key starts with:', process.env.GOOGLE_PRIVATE_KEY?.substring(0, 50));
    console.log('Private Key ends with:', process.env.GOOGLE_PRIVATE_KEY?.substring(-50));
    console.log('Private Key contains \\n:', process.env.GOOGLE_PRIVATE_KEY?.includes('\\n'));
    console.log('Private Key contains actual newlines:', process.env.GOOGLE_PRIVATE_KEY?.includes('\n'));
    console.log('Processed Private Key starts with:', credentials.private_key?.substring(0, 50));

    // Fix the private key format - it needs proper line breaks
    if (credentials.private_key && !credentials.private_key.includes('\n')) {
      console.log('Private key is on one line, fixing format...');
      // Insert newlines every 64 characters for proper PEM format
      const fixedKey = credentials.private_key
        .replace(/-----BEGIN PRIVATE KEY-----/, '-----BEGIN PRIVATE KEY-----\n')
        .replace(/-----END PRIVATE KEY-----/, '\n-----END PRIVATE KEY-----')
        .replace(/(.{64})/g, '$1\n')
        .replace(/\n\n/g, '\n')
        .trim();
      
      credentials.private_key = fixedKey;
      console.log('Fixed private key starts with:', credentials.private_key.substring(0, 100));
    }
    
    const { GoogleAuth } = await import('google-auth-library');
    const auth = new GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    return accessToken.token;
  } catch (error) {
    console.error('Error getting access token with individual vars:', error);
    
    // Fallback: try the JSON approach if individual variables fail
    try {
      console.log('Trying fallback JSON approach...');
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
          .replace(/\\n/g, '\n')
          .trim();
        const credentials = JSON.parse(credentialsJson);
        
        const { GoogleAuth } = await import('google-auth-library');
        const auth = new GoogleAuth({
          credentials: credentials,
          scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });
        const client = await auth.getClient();
        const accessToken = await client.getAccessToken();
        console.log('Fallback JSON approach succeeded');
        return accessToken.token;
      }
    } catch (fallbackError) {
      console.error('Fallback JSON approach also failed:', fallbackError);
    }
    
    throw new Error(`Failed to get access token for Vertex AI: ${error.message}`);
  }
  }