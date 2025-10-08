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
      
      // Step 2: Create product photo using DALL-E 3
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
  
  async function generateDetailedDescription(detectedItem, originalImageData) {
    try {
      const prompt = `You are a fashion expert creating a product description for e-commerce. 
  
  Based on this detected item:
  - Type: ${detectedItem.type}
  - Color: ${detectedItem.color}
  - Material: ${detectedItem.material}
  - Description: ${detectedItem.description}
  
  Create a detailed, professional product photo description that DALL-E 3 can use to generate a clean, isolated product image. The description should:
  
  1. Specify it's a professional product photo with white/neutral background
  2. Describe the exact garment type, fit, and styling details
  3. Include specific color and material details
  4. Mention professional lighting and photography style
  5. Ensure the item appears as if photographed for a high-end retail website
  
  Format: Return ONLY the DALL-E prompt description, no other text.`;
  
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 300,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: 'image/jpeg',
                    data: originalImageData
                  }
                },
                {
                  type: 'text',
                  text: prompt
                }
              ]
            }
          ]
        })
      });
  
      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }
  
      const result = await response.json();
      return result.content[0].text.trim();
  
    } catch (error) {
      console.error('Description generation failed:', error);
      // Fallback description
      return `Professional product photography of a ${detectedItem.color} ${detectedItem.type} made of ${detectedItem.material}, shot on a clean white background with studio lighting, high resolution, e-commerce style photography, front view, well-lit, professional fashion photography`;
    }
  }
  
  async function generateProductPhoto(description, detectedItem) {
    try {
      const dallePrompt = `${description}
  
  Additional requirements:
  - Clean white or light neutral background
  - Professional studio lighting
  - High resolution product photography
  - No models or people
  - Item should be the main focus
  - E-commerce style presentation
  - Front-facing view for clear visibility`;
  
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
  
    } catch (error) {
      console.error('Image generation failed:', error);
      throw new Error(`Failed to generate product photo: ${error.message}`);
    }
  }