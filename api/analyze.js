// api/analyze.js - Simplified to work with Supabase
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
    console.log('API request received:', { 
      type: req.body?.type, 
      hasImage: !!req.body?.image,
      imageLength: req.body?.image?.length 
    });

    const { image, type = 'wardrobe', prompt, mimeType } = req.body;

    if (!image) {
      console.log('No image provided');
      return res.status(400).json({ error: 'No image data provided' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      console.error('No API key found');
      return res.status(500).json({ 
        error: 'Claude API key not configured' 
      });
    }

    console.log(`🔍 Starting analysis for type: ${type}`);

    // Use custom prompt if provided, otherwise use the default
    const analysisPrompt = prompt || getLuxuryAnalysisPrompt(type);
    console.log('Using prompt length:', analysisPrompt.length);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType || 'image/jpeg',
                  data: image
                }
              },
              {
                type: 'text',
                text: analysisPrompt
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', response.status, errorText);
      
      return res.status(response.status).json({ 
        error: `Analysis failed: ${response.status}`,
        details: errorText
      });
    }

    const data = await response.json();
    console.log('Claude API response received, content length:', data.content?.[0]?.text?.length);
    
    let analysisResult;
    try {
      const responseText = data.content[0].text;
      console.log('Response text preview:', responseText.substring(0, 200));
      
      const cleanJson = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysisResult = JSON.parse(cleanJson);
      
      console.log('Analysis complete:', {
        type: analysisResult.type,
        brand: analysisResult.brand
      });
      
    } catch (parseError) {
      console.error('Parse error:', parseError);
      console.error('Raw response:', data.content[0].text);
      
      return res.status(500).json({
        error: 'Failed to parse analysis',
        rawResponse: data.content[0].text
      });
    }

    return res.status(200).json({ 
      analysis: analysisResult
    });

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      error: 'Analysis failed',
      details: error.message
    });
  }
}

/**
 * Get the appropriate analysis prompt based on type
 */
function getLuxuryAnalysisPrompt(type) {
  if (type === 'inspiration') {
    return `Analyze this fashion inspiration image with expert detail. Identify the main garment types, colors, fabrics, and styling. Focus on what makes this look appealing and how it could be recreated. Provide a JSON response with: {"type": "garment type", "colors": ["color1", "color2"], "style": "overall style description", "key_pieces": ["piece1", "piece2"], "occasion": "when to wear this"}`;
  }
  
  if (type === 'receipt') {
    return `Analyze this receipt or invoice for fashion items. Extract item names, prices, brands, and any other relevant details. Provide a JSON response with: {"items": [{"name": "item name", "price": "price", "brand": "brand if visible", "category": "item category"}]}`;
  }
  
  // Default wardrobe analysis
  return `Analyze this luxury fashion item with expert-level detail. Focus on authentication markers and construction details.

Analyze the key features:
- Item type and style
- Brand identification (logos, labels, construction signatures)
- Quality indicators (materials, stitching, hardware)
- Construction details
- Estimated tier and value

Response Format:
{
  "type": "blazer/suit/dress/coat/shirt/pants/etc",
  "name": "Descriptive name with potential brand",
  "brand": "identified or likely brand",
  "qualityScore": 1-100,
  "tier": "luxury/premium/diffusion/mass market",
  "estimatedValue": "$X,XXX - $X,XXX",
  "authenticityConfidence": "high/medium/low",
  "keyFeatures": ["notable construction details", "material quality", "hardware quality"],
  "condition": "pristine/excellent/good/fair/poor",
  "summary": "brief overall assessment with authentication notes"
}

Respond ONLY with valid JSON.`;
}