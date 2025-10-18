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
      
      // Step 2: Generate image with Gemini (no fallback)
      const recreatedImage = await generateWithGemini(description, detectedItem, originalImageData);
      console.log('✅ Generated with Gemini');

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
            description: 'gemini-1.5-flash',
            imageGeneration: 'gemini-1.5-flash'
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
        const prompt = `Analyze this image and focus specifically on the ${detectedItem.type} worn by the person. Provide a detailed description that captures:

        1. Exact pattern details (type of print, motifs, layout)
        2. Precise color palette (primary, secondary, accent colors)
        3. Fabric appearance and texture
        4. Specific design elements (collar style, buttons, fit, sleeves)
        5. Any unique characteristics that make this garment distinctive
        
        Be extremely specific about the visual pattern - describe the shapes, colors, and arrangement in detail. This description will be used to recreate an identical garment.
        
        Current detection shows: "${detectedItem.description}" - expand on this with much more visual detail.`;
  
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
        - Preserve all colors, patterns, and design details exactly as shown
    FOCUS AREA: The ${detectedItem.type} is located approximately at:
        - Left: ${detectedItem.boundingBox.left}% from left edge
        - Top: ${detectedItem.boundingBox.top}% from top edge  
        - Width: ${detectedItem.boundingBox.width}% of image width
        - Height: ${detectedItem.boundingBox.height}% of image height

    Pay special attention to this region when extracting the garment details.`;

  
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
  