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
    const { image, type = 'wardrobe', prompt, mimeType } = req.body;

    if (!image) {
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
    console.error('Analysis error:', error);
    res.status(500).json({
      error: 'Analysis failed',
      details: error.message
    });
  }
}

/**
 * Enhanced Claude Vision call with better prompts
 */
async function callClaudeVision(base64Image, type, customPrompt, mimeType = 'image/jpeg') {
  const prompt = customPrompt || getLuxuryAnalysisPrompt(type);
  
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mimeType,
                  data: base64Image
                }
              },
              {
                type: "text",
                text: prompt
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    let analysisText = data.content[0].text;
    
    // Try to parse as JSON first
    try {
      return JSON.parse(analysisText);
    } catch {
      // If not JSON, convert to legacy format
      return parseTextAnalysis(analysisText, type);
    }

  } catch (error) {
    console.error('Claude Vision error:', error);
    throw error;
  }
}

/**
 * Transform enhanced analysis to match your app's expected format
 */
function transformToLegacyFormat(enhancedAnalysis) {
  const category = enhancedAnalysis.category;
  const colors = enhancedAnalysis.colors || [];
  const fabrics = enhancedAnalysis.fabrics || [];
  
  return {
    // Basic fields your app expects
    name: generateItemName(category, { colors, fabrics }),
    type: category,
    
    // Enhanced fields with much better data
    overallAssessment: {
      tier: enhancedAnalysis.qualityTier || 'contemporary',
      estimatedRetail: enhancedAnalysis.priceRange || 'unknown',
      authenticityConfidence: enhancedAnalysis.confidence >= 0.8 ? 'high' : 
                            enhancedAnalysis.confidence >= 0.6 ? 'medium' : 'low',
      condition: 'excellent',
      estimatedAge: 'current season'
    },
    
    // Fabric analysis from enhanced data
    fabricAnalysis: {
      colors: colors,
      weaveStructure: fabrics.length > 0 ? fabrics[0] : 'unknown',
      yarnQuality: fabrics.some(f => f === 'cashmere') ? 'Super 150s+' : 'Standard',
      weight: 'medium',
      pattern: enhancedAnalysis.patterns && enhancedAnalysis.patterns.length > 0 ? enhancedAnalysis.patterns[0] : 'solid',
      patternMatching: 'yes'
    },
    
    // Brand identification
    brandIdentifiers: {
      likelyBrand: 'Unknown',
      confidence: Math.round((enhancedAnalysis.confidence || 0.7) * 100),
      constructionHouse: 'European',
      visibleLogos: 'none detected',
      hiddenSignatures: 'none detected'
    },
    
    // Quality indicators
    qualityIndicators: {
      handworkEvidence: enhancedAnalysis.luxuryIndicators || ['quality construction'],
      luxuryMarkers: generateLuxuryMarkers(category, { colors, fabrics }),
      authenticityMarkers: ['consistent stitching', 'quality materials']
    },
    
    // Construction details
    constructionSignatures: {
      pickStitching: 'standard',
      shoulderConstruction: 'natural',
      seamConstruction: 'flat-fell',
      handwork: 'machine construction with quality finishing'
    },
    
    // Enhanced search capability
    searchTerms: enhancedAnalysis.searchTerms || [],
    confidenceScore: enhancedAnalysis.confidence || 0.7,
    needsReview: enhancedAnalysis.needsReview || false,
    
    // Summary
    summary: enhancedAnalysis.summary || 'Quality fashion item with good construction'
  };
}

/**
 * Helper functions for transformation
 */
function generateItemName(category, attributes) {
  let name = category !== 'unknown' ? category : 'Fashion Item';
  
  const primaryColor = attributes.colors && attributes.colors[0];
  const primaryFabric = attributes.fabrics && attributes.fabrics[0];
  
  if (primaryFabric) {
    name = `${primaryFabric} ${name}`;
  }
  
  if (primaryColor) {
    name = `${primaryColor} ${name}`;
  }
  
  return name.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

function generateLuxuryMarkers(category, attributes) {
  const markers = [];
  
  if (category === 'jacket') {
    markers.push('structured shoulders', 'functional buttonholes');
  }
  
  if (attributes.fabrics && attributes.fabrics.length > 0) {
    markers.push(`premium ${attributes.fabrics[0]} fabric`);
  }
  
  return markers.length > 0 ? markers : ['quality materials'];
}

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

function parseTextAnalysis(text, type) {
  // Fallback parser for non-JSON responses
  return {
    type: extractType(text),
    brand: extractBrand(text),
    tier: extractTier(text),
    summary: text.substring(0, 200) + '...',
    error: null
  };
}

function extractType(text) {
  const types = ['blazer', 'jacket', 'shirt', 'dress', 'pants', 'shoes', 'bag'];
  for (const type of types) {
    if (text.toLowerCase().includes(type)) {
      return type;
    }
  }
  return 'unknown';
}

function extractBrand(text) {
  const brands = ['kiton', 'brioni', 'armani', 'gucci', 'prada'];
  for (const brand of brands) {
    if (text.toLowerCase().includes(brand)) {
      return brand;
    }
  }
  return 'unknown';
}

function extractTier(text) {
  if (text.toLowerCase().includes('luxury') || text.toLowerCase().includes('haute')) {
    return 'luxury';
  }
  if (text.toLowerCase().includes('premium')) {
    return 'premium';
  }
  return 'contemporary';
}

function base64ToFile(base64String, filename, mimeType) {
  const byteCharacters = atob(base64String);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });
  
  // Create a File-like object without trying to modify read-only properties
  const file = new File([byteArray], filename, { 
    type: mimeType,
    lastModified: Date.now()
  });
  
  return file;
}