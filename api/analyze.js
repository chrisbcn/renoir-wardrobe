// api/analyze.js - Complete Fashion Analysis API with all fixes

const LUXURY_FASHION_ANALYSIS_PROMPT = `
Analyze this luxury fashion item with collector-grade precision. Focus on authentication markers and construction details.

**CRITICAL: Focus heavily on buttons, lapels, and hardware for brand identification:**

## BUTTON ANALYSIS (Priority):
- Material: Horn, mother-of-pearl, metal, plastic, wood, covered fabric
- Style: Shank vs flat, number of holes, size, shape
- Logo engravings: ANY text, symbols, or brand markers on buttons
- Placement: Functional vs decorative, spacing, alignment
- Quality indicators: Hand-sewn, machine-sewn, button thread quality

## LAPEL & COLLAR ANALYSIS (Priority):
- Style: Notched, peak, shawl, mandarin, crew neck, etc.
- Construction: Hand-padded, machine-padded, fused, canvassed
- Stitching: Hand-finished edges, pick-stitching, decorative elements
- Brand signatures: Distinctive lapel shapes, buttonhole styles
- Hardware: Collar stays, pins, brand-specific details

## LOGO & BRAND IDENTIFICATION:
- Visible logos: Text, symbols, monograms anywhere on garment
- Hardware logos: Zippers (YKK, RiRi, Lampo), buckles, snaps, rivets, clasps
- Fabric patterns: Brand-specific prints, weaves, textures
- Construction signatures: Distinctive seaming, dart placement
- Label glimpses: Any visible brand tags or labels

## HARDWARE & FASTENINGS:
- Zippers: Brand, style, metal quality, teeth type
- Buckles: Material, finish, brand engravings
- Snaps/Rivets: Quality, brand markings, placement
- D-rings, clasps, chains: Style and quality markers

## CONSTRUCTION DETAILS:
- Stitching quality: Hand-finished vs machine, stitch density, thread quality
- Seam construction: French seams, flat-felled, serged edges
- Dart placement: Precision, symmetry, brand-specific positioning
- Lining: Visible quality, material (silk, cupro, polyester)
- Hem finishing: Hand-rolled, blind-stitched, raw edge
- Shoulder construction: Soft, structured, padded, natural

## LUXURY QUALITY MARKERS:
- Fabric drape and weight: Heavy wool, silk lining, cashmere blend
- Canvas construction: Full-canvas, half-canvas, or fused
- Hand-work evidence: Pick-stitching, hand-padded lapels, hand-sewn buttons
- Pattern matching: Stripe/plaid alignment at seams
- Pressing quality: Sharp creases, smooth fabric surface

## MATERIALS & TEXTURES:
- Primary fabric: Exact type (worsted wool, cashmere, tweed, etc.)
- Weight: Light, medium, heavy
- Texture: Smooth, textured, napped, ribbed
- Sheen: Matte, subtle sheen, lustrous
- Pattern: Herringbone, glen plaid, pinstripe, windowpane, etc.

Respond with this exact JSON structure:
{
  "type": "specific garment type",
  "category": "Jackets/Tops/Dresses/Bottoms/Skirts/Shoes/Bags/Outerwear/Knitwear/Accessories",
  "colors": ["primary color", "secondary color if any"],
  "pattern": "string",
  "material": "string",
  "style": "string", 
  "fit": "string",
  "details": {
    "buttons": {
      "material": "horn/mother-of-pearl/metal/plastic/covered",
      "style": "shank/flat/decorative", 
      "logo_text": "any text/symbols on buttons or null",
      "quality": "hand-sewn/machine-sewn/quality indicators"
    },
    "lapels": {
      "style": "notched/peak/shawl/none",
      "construction": "hand-padded/fused/structured",
      "stitching": "hand-finished/pick-stitched/clean"
    },
    "hardware": {
      "zippers": "brand/style/quality (YKK/RiRi/Lampo)",
      "other": "buckles, snaps, D-rings with any logos"
    },
    "collar": "spread/button-down/mandarin/crew/etc",
    "sleeves": "construction and style details",
    "closure": "button/zip/snap/hook details"
  },
  "brand_indicators": {
    "visible_logos": "any text, symbols, or brand marks seen",
    "hardware_logos": "logos on zippers, buttons, buckles",
    "construction_signatures": "distinctive brand construction elements",
    "confidence": "high/medium/low confidence in brand identification"
  },
  "luxury_markers": ["specific quality indicator 1", "specific quality indicator 2"],
  "confidence": 0.95,
  "suggested_name": "descriptive name for this item",
  "overallAssessment": {
    "tier": "Luxury/Premium/Contemporary/Fast Fashion",
    "condition": "New/Excellent/Good/Fair",
    "authenticityConfidence": "95-100%"
  },
  "brandIdentifiers": {
    "likelyBrand": "brand name or null",
    "confidence": 90,
    "constructionHouse": "Italian/French/British/American/Asian"
  },
  "fabricAnalysis": {
    "weaveStructure": "plain/twill/satin/jacquard",
    "yarnQuality": "superior/high/standard",
    "weight": "lightweight/midweight/heavy",
    "texture": "smooth/textured/napped/ribbed"
  }
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
    const { image, type = 'wardrobe', prompt: customPrompt, mimeType = 'image/jpeg' } = req.body;
    
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      console.error('No API key found');
      return res.status(500).json({ 
        error: 'Claude API key not configured' 
      });
    }

    // Determine which prompt to use
    let prompt;
    
    // If a custom prompt is provided, use it (for look matching, etc.)
    if (customPrompt) {
      prompt = customPrompt;
      console.log('Using custom prompt for look analysis');
    } 
    // Otherwise use the standard prompts based on type
    else if (type === 'inspiration') {
      prompt = `Analyze this fashion inspiration image. Identify all visible garments: ${LUXURY_FASHION_ANALYSIS_PROMPT}`;
    } 
    else {
      // Default to luxury wardrobe analysis
      prompt = LUXURY_FASHION_ANALYSIS_PROMPT;
    }

    console.log('Starting analysis with type:', type, 'mimeType:', mimeType);

    // Determine the correct media type for Claude API
    let mediaType = 'image/jpeg'; // default
    if (mimeType.includes('png')) {
      mediaType = 'image/png';
    } else if (mimeType.includes('webp')) {
      mediaType = 'image/webp';
    } else if (mimeType.includes('gif')) {
      mediaType = 'image/gif';
    }

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
                  media_type: mediaType, // Use the correct media type
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
      // Clean up any markdown code block formatting
      const cleanJson = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysisResult = JSON.parse(cleanJson);
      
      console.log('Analysis complete. Type:', analysisResult.type || analysisResult.overallLook?.style || 'custom');
      
      // Log if this is a look analysis
      if (analysisResult.itemBreakdown && analysisResult.itemBreakdown.visible_items) {
        console.log('Look analysis detected with', analysisResult.itemBreakdown.visible_items.length, 'items');
      }
      
    } catch (parseError) {
      console.error('Parse error:', parseError);
      console.log('Raw response (first 500 chars):', data.content[0].text.substring(0, 500));
      
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