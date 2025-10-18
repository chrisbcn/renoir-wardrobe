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
    const prompt = `Analyze this image and create a detailed product description for recreating the ${detectedItem.type}. 

Focus only on the ${detectedItem.type} in the image and provide:
- Exact colors and color combinations
- Specific patterns, prints, or textures  
- Fabric type and appearance
- Design details (buttons, collars, sleeves, etc.)
- Fit and silhouette
- Any unique styling elements

Be very specific about visual details that would help recreate this exact item as a professional product photo.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
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
          maxOutputTokens: 1024,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini description failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Gemini response structure:', JSON.stringify(result, null, 2));
    
    if (!result.candidates || !result.candidates[0] || !result.candidates[0].content || !result.candidates[0].content.parts || !result.candidates[0].content.parts[0]) {
      console.error('Unexpected Gemini response structure:', result);
      throw new Error('Invalid response structure from Gemini API');
    }
    
    return result.candidates[0].content.parts[0].text;

  } catch (error) {
    console.error('Description generation failed:', error);
    throw new Error(`Failed to generate description: ${error.message}`);
  }
}

async function generateProductPhoto(description, detectedItem, originalImageData) {
  try {
    // Check if API key exists
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not found in environment variables');
    }

    const prompt = `Create a professional product photography image of the ${detectedItem.type} from this reference image. 

Requirements:
- Clean white or light gray background
- Professional studio lighting with soft shadows
- High resolution e-commerce style presentation
- Show only the ${detectedItem.type}, no person or distracting background
- Preserve the exact colors, patterns, and design details from the reference
- Front-facing product view suitable for online retail
- Professional fashion photography quality
- Sharp focus and high detail

Use this detailed description: ${description}`;

    // Use Gemini for image generation (if supported) or fallback to text description
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
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
          temperature: 0.4,
          topK: 40,
          topP: 0.95,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Error Details:', errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Gemini image generation response structure:', JSON.stringify(result, null, 2));
    
    // Extract the generated image data
    if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
      console.error('Unexpected Gemini image response structure:', result);
      throw new Error('Invalid response structure from Gemini API');
    }

    const imageData = result.candidates[0].content.parts[0].inline_data.data;
    return `data:image/jpeg;base64,${imageData}`;
    
  } catch (error) {
    console.error('Gemini image generation failed:', error);
    throw new Error(`Failed to generate product photo: ${error.message}`);
  }
}