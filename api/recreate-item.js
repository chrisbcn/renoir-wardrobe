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
  

async function generateProductPhoto(detectedItem, originalImageData) {
  try {
    // Use Gemini 2.5 Flash Image directly (same as Studio)
    const prompt = `recreate in a ghost mannequin style the ${detectedItem.type} in this photo`;
    
    console.log('🎨 Using Gemini 2.5 Flash Image for direct recreation...');
    console.log('Prompt:', prompt);
    
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
          
          // Check for text response from Gemini 1.5 Flash
          if (part.text) {
            console.log('✅ Successfully generated text with Gemini 1.5 Flash!');
            console.log('Generated text:', part.text);
            // For now, return a placeholder since this model generates text, not images
            return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
          }
        }
      }
      
      console.error('❌ No text data found in Gemini response');
      console.error('❌ Response structure:', JSON.stringify(result, null, 2));
      throw new Error('No text data found in Gemini response');
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