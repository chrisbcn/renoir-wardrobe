// api/recreate-item.js - Complete version with all functions
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
  
      // Step 1: Generate detailed description using Gemini Vision
      const description = await generateDetailedDescription(detectedItem, originalImageData);
      
      // Step 2: Try Gemini image generation, fallback to DALL-E
      let recreatedImage;
      try {
        recreatedImage = await generateWithGemini(description, detectedItem, originalImageData);
        console.log('✅ Generated with Gemini');
      } catch (geminiError) {
        console.log('Gemini failed, falling back to DALL-E:', geminiError.message);
        recreatedImage = await generateWithDALLE(description, detectedItem);
        console.log('✅ Generated with DALL-E fallback');
      }
  
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
      const prompt = `Analyze this image and create a detailed product description for recreating the ${detectedItem.type}. Include:
      - Exact colors and patterns visible
      - Fabric texture and finish
      - Specific design elements (buttons, collars, prints, etc.)
      - Fit and style details
      Be very specific about visual characteristics that would help recreate this exact item.`;
  
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
          }]
        })
      });
  
      if (!response.ok) {
        throw new Error(`Gemini analysis failed: ${response.status}`);
      }
  
      const result = await response.json();
      return result.candidates[0].content.parts[0].text;
  
    } catch (error) {
      console.error('Description generation failed:', error);
      // Fallback description
      return `Professional product photography of a ${detectedItem.color} ${detectedItem.type} with ${detectedItem.description || 'detailed patterns'}, made of ${detectedItem.material}`;
    }
  }
  
  async function generateWithGemini(description, detectedItem, originalImageData) {
    const prompt = `Create a professional product photo of the ${detectedItem.type} from the reference image:
  
  ${description}
  
  Requirements:
  - Clean white background
  - Professional studio lighting
  - E-commerce product photography style
  - High resolution and sharp focus
  - Only the garment, no person or background elements
  - Preserve all colors, patterns, and design details exactly as shown`;
  
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${process.env.GEMINI_API_KEY}`, {
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
            temperature: 1.0,      // Match AI Studio default
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
            candidateCount: 1
        }
      })
    });
  
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }
  
    const result = await response.json();
    
    if (!result.candidates || !result.candidates[0] || !result.candidates[0].content.parts[0].inline_data) {
      throw new Error('No image generated by Gemini');
    }
    
    const imageData = result.candidates[0].content.parts[0].inline_data.data;
    return `data:image/jpeg;base64,${imageData}`;
  }
  
  async function generateWithDALLE(description, detectedItem) {
    const dallePrompt = `Professional product photography: ${description}. Shot on clean white background with studio lighting, high resolution, e-commerce style, front view, no person, isolated ${detectedItem.type} only, preserve exact patterns and colors.`;
  
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: dallePrompt,
        size: '1024x1024',
        quality: 'hd',
        style: 'natural',
        n: 1
      })
    });
  
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`DALL-E API error: ${response.status} - ${error}`);
    }
  
    const result = await response.json();
    return result.data[0].url;
  }