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
        keyLength: process.env.GEMINI_API_KEY?.length
      });
  
      // Step 1: Generate product photo using Gemini 2.5 Flash Image
      const generatedImage = await generateProductPhoto(detectedItem, originalImageData);
      console.log(`✅ Image generation complete for ${detectedItem.type}`);
  
      // Step 2: Remove background for clean extraction
      const recreatedImage = await removeBackground(generatedImage);
      console.log(`✅ Background removal complete for ${detectedItem.type}`);
  
      res.status(200).json({
        success: true,
        originalItem: detectedItem,
        recreatedImageUrl: recreatedImage,
        metadata: {
          timestamp: new Date().toISOString(),
          userId: userId || 'demo',
          model: 'gemini-2.5-flash-image',
          backgroundRemoval: true
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
  

async function generateProductPhoto(detectedItem, originalImageData) {
  try {
    // Build a detailed prompt for Gemini 2.5 Flash Image
    const itemDescription = [
      detectedItem.type,
      detectedItem.color,
      detectedItem.pattern,
      detectedItem.material
    ].filter(Boolean).join(', ');
    
    const prompt = `Create a professional product photo of ONLY this ${itemDescription} in subtle ghost mannequin style.

STYLE: Subtle, natural ghost mannequin - the garment should appear as if worn by an invisible person, maintaining its natural shape with MINIMAL volume. Not overly inflated or puffy. Think understated luxury e-commerce like The Row or COS.

CAMERA ANGLE: Photographed STRAIGHT-ON from the front, looking directly at the garment. The camera must be perfectly perpendicular - FACE-FORWARD, NO angle, NO rotation, NO 3/4 turn, NO side view.

GARMENT FORM:
- Subtle 3D shape as if naturally worn, not dramatically inflated
- Front of garment facing directly at camera
- Natural drape and fit, not overstuffed
- Sleeves/straps positioned naturally at sides
- For pants: show natural leg shape without visible leg forms inside
- Consistent framing - garment should fill similar proportion of frame regardless of type

CRITICAL: Show ONLY the clothing item itself - absolutely NO visible mannequin, NO body parts, NO torso, NO arms, NO legs, NO head forms, NO hands. The garment must appear floating with subtle, natural volume.

Pure white background. Clean studio lighting. Professional e-commerce product photography with consistent sizing and framing.`;
    
    console.log('🎨 Using Gemini 2.5 Flash Image via Google AI Studio API...');
    console.log('Prompt:', prompt);
    console.log('Item details:', itemDescription);
    
    // Clean the base64 data
    const cleanImageData = originalImageData.replace(/^data:image\/[a-z]+;base64,/, '');
    
    // Use Gemini 2.5 Flash Image via Google AI Studio API (same as test-gemini-direct.js)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
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

async function removeBackground(imageDataUrl) {
  try {
    console.log('🎯 Starting background removal...');
    console.log('📊 API Key present:', !!process.env.REMOVEBG_API_KEY);
    console.log('📊 API Key length:', process.env.REMOVEBG_API_KEY?.length);
    
    // Check for remove.bg API key
    if (!process.env.REMOVEBG_API_KEY) {
      console.error('❌❌❌ REMOVEBG_API_KEY NOT FOUND - SKIPPING BACKGROUND REMOVAL');
      return imageDataUrl; // Return original if no API key
    }

    console.log('✅ API Key found, proceeding with background removal...');

    // Extract base64 data
    const base64Data = imageDataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
    console.log('📊 Base64 data length:', base64Data.length);
    
    // Call remove.bg API
    console.log('📡 Calling remove.bg API...');
    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': process.env.REMOVEBG_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image_file_b64: base64Data,
        size: 'auto',
        format: 'png',
        type: 'product', // Optimized for product photos
        crop: false,
        scale: '100%'
      })
    });

    console.log('📡 Remove.bg API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Remove.bg API Error - Status:', response.status);
      console.error('❌ Remove.bg API Error - Response:', errorText);
      console.warn('⚠️ Background removal failed - returning original image');
      return imageDataUrl; // Fallback to original
    }

    // Get the result as a buffer
    console.log('📦 Parsing response buffer...');
    const resultBuffer = await response.arrayBuffer();
    const base64Result = Buffer.from(resultBuffer).toString('base64');
    
    console.log('✅✅✅ Background removed successfully!');
    console.log('📊 Result size:', base64Result.length);
    return `data:image/png;base64,${base64Result}`;

  } catch (error) {
    console.error('❌❌❌ Background removal exception:', error.message);
    console.error('❌ Full error:', error);
    console.warn('⚠️ Returning original image without background removal');
    return imageDataUrl; // Fallback to original on error
  }
}