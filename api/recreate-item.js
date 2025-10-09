// api/recreate-item.js
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
  
      // Step 1: Generate detailed description using Gemini
      const description = await generateDetailedDescription(detectedItem, originalImageData);
      
      // Step 2: Create product photo using Nano Banana
      const recreatedImage = await generateProductPhoto(description, detectedItem);  
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
  
  async function generateProductPhoto(description, detectedItem, originalImageData) {
    try {
      const prompt = `Create a professional product photography image of the ${detectedItem.type} from this reference image. The output should be:
      - Clean white background
      - Professional studio lighting  
      - High resolution e-commerce style
      - Only the ${detectedItem.type}, no person or background
      - Preserve exact colors, patterns, and design details
      - Front-facing product view suitable for online retail`;
  
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:generateContent?key=${process.env.GEMINI_API_KEY}`, {
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
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }
  
      const result = await response.json();
      
      // Extract the generated image data
      const imageData = result.candidates[0].content.parts[0].inline_data.data;
      return `data:image/jpeg;base64,${imageData}`;
      
    } catch (error) {
      console.error('Gemini image generation failed:', error);
      throw new Error(`Failed to generate product photo: ${error.message}`);
    }
  }
  
  async function generateProductPhoto(description, detectedItem, originalImageData) {
    try {
      const prompt = `Create a professional product photography image of just the ${detectedItem.type} from this photo. Extract and recreate it as a clean product photo with:
      - White or neutral background
      - Professional studio lighting
      - High resolution e-commerce style
      - Preserve the exact pattern, colors, and design details
      - Remove background and focus only on the garment
      - Front-facing view suitable for online retail`;
  
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
            temperature: 0.4,
            topK: 32,
            topP: 1,
            maxOutputTokens: 4096,
          }
        })
      });
  
      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }
  
      const result = await response.json();
      
      // Convert base64 to data URL for frontend display
      const base64Image = result.candidates[0].content.parts[0].inline_data.data;
      return `data:image/jpeg;base64,${base64Image}`;
      
    } catch (error) {
      console.error('Gemini image generation failed:', error);
      throw new Error(`Failed to generate product photo: ${error.message}`);
    }
  }