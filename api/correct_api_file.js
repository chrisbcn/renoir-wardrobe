// api/analyze.js - Fashion Analysis API

const LUXURY_FASHION_ANALYSIS_PROMPT = `
Analyze this luxury fashion item with collector-grade precision. Focus on authentication markers and construction details.

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

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image, type = 'wardrobe' } = req.body;
    
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      console.error('No API key found');
      return res.status(500).json({ 
        error: 'Claude API key not configured' 
      });
    }

    const prompt = type === 'inspiration' 
      ? `Analyze this fashion inspiration image. Identify all visible garments: ${LUXURY_FASHION_ANALYSIS_PROMPT}`
      : LUXURY_FASHION_ANALYSIS_PROMPT;

    console.log('Starting analysis...');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: image
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
      const errorText = await response.text();
      console.error('Claude API error:', response.status, errorText);
      
      return res.status(response.status).json({ 
        error: `Analysis failed: ${response.status}`,
        details: errorText
      });
    }

    const data = await response.json();
    
    let analysisResult;
    try {
      const responseText = data.content[0].text;
      const cleanJson = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysisResult = JSON.parse(cleanJson);
      
      console.log('Analysis complete:', {
        type: analysisResult.type,
        brand: analysisResult.brand
      });
      
    } catch (parseError) {
      console.error('Parse error:', parseError);
      
      return res.status(500).json({
        error: 'Failed to parse analysis',
        rawResponse: data.content[0].text
      });
    }

    return res.status(200).json({ 
      analysis: analysisResult
    });
    
  } catch (error) {
    console.error('Server error:', error);
    
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
}