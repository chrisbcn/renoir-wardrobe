// api/multi-item-upload.js - Updated with MIME type support and enhanced detailed analysis
import { createClient } from '@supabase/supabase-js';
import enhancedDetailedAnalyzer from '../src/lib/enhanced-detailed-analyzer.js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

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
    const { imageData, userId, mimeType = 'image/jpeg' } = req.body;

    if (!imageData) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    // if (!userId) {
    //   return res.status(400).json({ error: 'User ID required' });
    // }

    console.log('📸 Multi-item upload request received');
    console.log('🎨 Image MIME type:', mimeType);

    const effectiveUserId = userId || "00000000-0000-0000-0000-000000000001";
    const sessionId = await createDetectionSession(effectiveUserId, imageData, mimeType);
    console.log('📋 Created detection session:', sessionId);

    const detectionResult = await detectAndAnalyzeItems(imageData, mimeType);

    if (!detectionResult.success) {
      await updateSessionStatus(sessionId, 'failed', detectionResult.error);
      return res.status(500).json({
        success: false,
        error: detectionResult.error
      });
    }

    await updateDetectionSession(sessionId, detectionResult);

    const savedItems = [];
    
    for (const item of detectionResult.items) {
      try {
        const savedItem = await saveItemToDatabase(item, sessionId, userId);
        if (savedItem) {
          savedItems.push(savedItem);
        }
      } catch (error) {
        console.error('Error saving item:', error);
      }
    }

    if (savedItems.length > 0) {
      await updateSessionStatus(sessionId, 'completed');
    } else {
      await updateSessionStatus(sessionId, 'completed_no_saves');
    }

    console.log(`✅ Successfully processed ${detectionResult.items.length} items`);

    res.json({
      success: true,
      sessionId,
      detectedItems: detectionResult.items,
      savedItems,
      itemCount: detectionResult.items.length,
      confidence: detectionResult.confidence
    });

  } catch (error) {
    console.error('❌ Multi-item upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}

// Helper functions
async function createDetectionSession(userId, imageData, mimeType) {
  const imageHash = crypto
    .createHash('sha256')
    .update(imageData)
    .digest('hex')
    .substring(0, 64);
  
  // Check for duplicate uploads
  const { data: existingSession } = await supabase
    .from('multi_item_detection_sessions')
    .select('id')
    .eq('user_id', userId)
    .eq('image_hash', imageHash)
    .single();

  if (existingSession) {
    console.log('🔄 Found existing session for this image');
    return existingSession.id;
  }

  const { data, error } = await supabase
    .from('multi_item_detection_sessions')
    .insert({
      user_id: userId,
      image_hash: imageHash,
      original_image_url: `data:${mimeType};base64,${imageData}`,
      processing_status: 'processing'
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

async function detectAndAnalyzeItems(base64Image, mimeType) {
  try {
    console.log('🔍 Starting AI clothing detection with enhanced embellishment detection...');
    
    // Step 1: Use Claude to detect individual items
    const detectedItems = await detectClothingItems(base64Image, mimeType);
    
    // Step 2: Analyze each item in detail
    const analyzedItems = [];
    for (let i = 0; i < detectedItems.length; i++) {
      const item = detectedItems[i];
      console.log(`🔬 Analyzing item ${i + 1}: ${item.item_type}`);
      
      const detailedAnalysis = await analyzeIndividualItem(item, base64Image, mimeType);
      
      analyzedItems.push({
        id: i + 1,
        type: item.item_type,
        confidence: item.confidence,
        boundingBox: {
          left: item.bounding_box.x_percent,
          top: item.bounding_box.y_percent,
          width: item.bounding_box.width_percent,
          height: item.bounding_box.height_percent
        },
        description: `${detailedAnalysis.style || item.item_type} in ${detailedAnalysis.fabric || 'unknown material'}. ${detailedAnalysis.construction || ''} ${detailedAnalysis.texture || ''} ${detailedAnalysis.fit || ''} ${detailedAnalysis.silhouette || ''}`.trim(),
        color: detailedAnalysis.color,
        brand: 'Unknown',
        material: detailedAnalysis.fabric,
        embellishments: detailedAnalysis.embellishments || {},
        has_sequins: detailedAnalysis.embellishments?.beadwork?.length > 0 || false,
        has_beadwork: detailedAnalysis.embellishments?.beadwork?.length > 0 || false,
        has_embroidery: detailedAnalysis.embellishments?.embroidery?.length > 0 || false,
        has_metallic: detailedAnalysis.embellishments?.metallic_elements?.length > 0 || false,
        analysis: {
          name: `${detailedAnalysis.color} ${item.item_type}`,
          type: item.item_type,
          colorAnalysis: {
            dominantColors: [{ name: detailedAnalysis.color, confidence: 0.9 }]
          },
          fabricAnalysis: {
            weaveStructure: detailedAnalysis.fabric
          },
          overallAssessment: {
            tier: detailedAnalysis.brand_tier
          },
          embellishments: detailedAnalysis.embellishments || {}
        }
      });
    }

    return {
      success: true,
      items: analyzedItems,
      confidence: analyzedItems.reduce((sum, item) => sum + item.confidence, 0) / analyzedItems.length
    };

  } catch (error) {
    console.error('❌ Detection error:', error);
    return {
      success: false,
      error: error.message,
      items: []
    };
  }
}

async function detectClothingItems(base64Image, mimeType = 'image/jpeg') {
  const prompt = `Analyze this image and detect ALL individual clothing items with EXTREME attention to detail and decorative elements. For each item found, provide:

1. Item type (shirt, pants, dress, jacket, shoes, accessories, etc.)
2. Approximate bounding box coordinates (as percentages of image dimensions)
3. Confidence level (0-1)
4. HIGHLY DETAILED visual description including ALL decorative elements, textures, patterns, and construction details

DETAILED ANALYSIS REQUIREMENTS:
For each clothing item, provide an extremely detailed description that includes:

CONSTRUCTION & FIT:
- Specific cut and silhouette (tailored, relaxed, fitted, oversized, cropped, etc.)
- Neckline type (crew neck, V-neck, scoop neck, turtleneck, etc.)
- Sleeve details (long sleeves, short sleeves, sleeveless, French cuffs, etc.)
- Length and proportions (crop length, full length, high-waisted, etc.)
- Closure details (buttons, zippers, ties, etc.)

FABRIC & TEXTURE:
- Fabric type and weight (wool, cotton, silk, cashmere, denim, etc.)
- Texture details (cable knit, ribbed, smooth, textured, etc.)
- Pattern specifics (stripes, checks, floral, geometric, etc.)
- Finish and drape (matte, shiny, structured, flowing, etc.)

COLOR & PATTERN ANALYSIS:
- Exact color descriptions (navy blue, charcoal grey, ecru, etc.)
- Pattern details (pinstripes, wide stripes, subtle texture, etc.)
- Color variations and undertones
- Pattern scale and repeat

EMBELLISHMENTS & DECORATIVE ELEMENTS (HIGH PRIORITY):
- Sequins, beads, pearls, crystals, rhinestones, studs, spangles, paillettes
- Embroidery, decorative stitching, appliqué, patches, hand-stitched details
- Metallic elements, shiny surfaces, reflective materials, foil, lamé
- Ruffles, pleats, fringe, tassels, bows, ribbons, fabric flowers
- Hardware details, buttons, zippers, buckles, clasps, rivets, grommets
- Surface treatments, textures, embossed, perforated, laser-cut details

SPECIFIC TERMINOLOGY:
Use precise fashion terminology like:
- "Aran" for cable knit textures
- "French cuffs" for sleeve details
- "cable knit" for patterns
- "ribbed collar", "notch lapels", "peak lapels"
- "wide leg", "straight leg", "tailored", "relaxed fit"
- "heavy gauge", "intricate cable knit patterns"
- "French seams", "flat-fell seams", "pinked seams"
- "pick stitching", "topstitching", "understitching"

Focus on detecting SEPARATE clothing items - if someone is wearing a full outfit, identify each piece individually.

Respond with a JSON array in this exact format:
[
  {
    "item_type": "vest",
    "bounding_box": {
      "x_percent": 15,
      "y_percent": 10,
      "width_percent": 35,
      "height_percent": 45
    },
    "confidence": 0.92,
    "visual_description": "Dark navy blue sleeveless V-neck vest with subtle vertical pinstripes, tailored fit, welt pockets, five-button front closure, fine-gauge knit fabric with textured stripe pattern, structured silhouette, worn over white collared shirt"
  }
]

IMPORTANT: Be extremely detailed and specific in your descriptions. Include every visible detail that would help recreate the item accurately. Respond ONLY with valid JSON.`;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  
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
                media_type: mimeType, // Use passed MIME type
                data: base64Image
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

  const data = await response.json();

  if (data.error) {
    throw new Error(`Claude API error: ${data.error.message || data.error}`);
  }
  
  if (!data.content || !data.content[0]) {
    throw new Error(`Unexpected API response: ${JSON.stringify(data)}`);
  }
  
  const responseText = data.content[0].text;
  const cleanedResponse = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleanedResponse);
}

async function analyzeIndividualItem(detectedItem, base64Image, mimeType = 'image/jpeg') {
  const analysisPrompt = `Analyze this specific clothing item with special focus on decorative elements and embellishments: ${detectedItem.item_type}

Description: ${detectedItem.visual_description}

EMBELLISHMENT DETECTION:
Pay special attention to decorative elements and embellishments. Look for and describe:

SEQUINS AND BEADWORK (HIGH PRIORITY):
- Sequins, sequined, beaded, beads, pearls, crystals, rhinestones, studs, spangles, paillettes
- Bugle beads, seed beads, rocailles, crystal beads, pearl beads, glass beads, plastic beads, metal beads
- Look for: small reflective discs, metallic dots, shiny circular elements, glittery surfaces
- Specify: size (small, medium, large), density (sparse, moderate, dense), attachment method, color, material

EMBROIDERY AND STITCHING:
- Embroidery, embroidered, decorative stitching, appliqué, patches, hand-stitched details
- Cross-stitch, satin stitch, chain stitch, backstitch, running stitch, decorative stitching
- Specify: stitch type, thread material, pattern complexity, hand vs machine work

METALLIC ELEMENTS:
- Metallic, shiny, reflective, foil, lamé, mirror, chrome, platinum, gold, silver, bronze
- Look for: reflective surfaces, metallic finishes, shiny materials
- Specify: finish type, shine level, reflective properties

TEXTURAL EMBELLISHMENTS:
- Ruffles, pleats, fringe, tassels, bows, ribbons, fabric flowers, pom-poms, tassels
- Ruffled, pleated, gathered, shirred, smocked, tucked, draped, layered
- Specify: texture type, placement, construction method

HARDWARE AND FUNCTIONAL:
- Buttons, zippers, buckles, clasps, rivets, grommets, eyelets, studs, spikes, chains, rings, loops
- Specify: material, finish, placement, functionality

SURFACE TREATMENTS:
- Textures, embossed, perforated, laser-cut, sueded, brushed, napped, fuzzy, furry
- Specify: finish type, texture, visual effect

For each decorative element found, specify:
1. Type and specific terminology
2. Location on garment
3. Material and construction
4. Visual impact and luxury level

DETAILED DESCRIPTIONS - BE EXTREMELY VERBOSE:
Use specific terminology and provide comprehensive details:

CONSTRUCTION DETAILS:
- "Aran" for cable knit textures, "French cuffs" for sleeve details, "cable knit" for patterns
- "ribbed collar", "wider collars", "high ribbed turtleneck", "notch lapels", "peak lapels"
- "wide leg", "straight leg", "tailored", "relaxed fit", "cropped", "oversized"
- "heavy gauge", "intricate cable knit patterns", "fine-gauge knit"
- "French seams", "flat-fell seams", "pinked seams", "serged seams"
- "pick stitching", "topstitching", "understitching", "edge stitching"

FABRIC & TEXTURE SPECIFICS:
- Fabric weight and drape (lightweight, medium weight, heavyweight)
- Texture details (smooth, ribbed, textured, cable knit, basketweave, slub-knit)
- Pattern specifics (pinstripes, wide stripes, subtle texture, geometric patterns)
- Finish details (matte, shiny, structured, flowing, crisp, soft)

COLOR & PATTERN ANALYSIS:
- Exact color names (navy blue, charcoal grey, ecru, oatmeal marl, burgundy, whiter white)
- Pattern details (vertical pinstripes, horizontal stripes, subtle texture, etc.)
- Color variations and undertones
- Pattern scale and repeat frequency

EMBELLISHMENT SPECIFICS:
- Size and density of decorative elements
- Attachment methods and construction
- Material composition of embellishments
- Placement and distribution patterns
- Visual impact and luxury level

SILHOUETTE & FIT DETAILS:
- Overall silhouette (A-line, fitted, boxy, oversized, etc.)
- Specific fit characteristics (tailored, relaxed, slim, regular, etc.)
- Proportions and length details
- Layering and styling context

Provide analysis in JSON format with EXTREMELY DETAILED descriptions:
{
  "color": "primary color name (be specific: navy blue, ecru, oatmeal marl, burgundy, whiter white)",
  "fabric": "fabric type and weight (be specific: fine-gauge wool knit, medium-weight cotton, lightweight silk, etc.)",
  "pattern": "pattern type and details (vertical pinstripes, cable knit, ribbed texture, subtle stripe pattern, etc.)",
  "style": "specific style details (Double-breasted wool blazer with notch lapels, not just blazer)",
  "construction": "construction details (tailored fit, French seams, pick stitching, welt pockets, etc.)",
  "texture": "texture specifics (smooth, ribbed, textured, cable knit, basketweave, slub-knit, etc.)",
  "fit": "fit characteristics (tailored, relaxed, fitted, oversized, cropped, etc.)",
  "silhouette": "silhouette details (A-line, fitted, boxy, structured, flowing, etc.)",
  "embellishments": {
    "metallic_elements": ["list of metallic/reflective elements with specific details"],
    "beadwork": ["list of beadwork and sequins with size, density, and placement details"],
    "embroidery": ["list of embroidery and decorative stitching with stitch types and patterns"],
    "textural": ["list of textural embellishments with specific texture types"],
    "hardware": ["list of hardware and functional decorations with materials and finishes"],
    "surface_treatments": ["list of surface treatments with specific finish types"]
  },
  "formality_level": "casual, smart casual, business formal, black-tie",
  "season": ["applicable seasons"],
  "price_range": "estimated price range",
  "brand_tier": "contemporary, premium, luxury, ultra-luxury"
}

Respond ONLY with valid JSON.`;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  
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
                media_type: mimeType, // Use passed MIME type
                data: base64Image
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

  const data = await response.json();

  if (data.error) {
    console.warn('Analysis API error:', data.error);
    return getBasicItemDetails(detectedItem);
  }
  
  if (!data.content || !data.content[0]) {
    console.warn('Unexpected analysis response');
    return getBasicItemDetails(detectedItem);
  }
  
  try {
    const responseText = data.content[0].text;
    const cleanedResponse = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleanedResponse);
  } catch (error) {
    console.warn('Failed to parse analysis:', error);
    return getBasicItemDetails(detectedItem);
  }
}

function getBasicItemDetails(detectedItem) {
  return {
    color: 'Unknown',
    fabric: 'Unknown',
    pattern: 'solid',
    style: detectedItem.item_type,
    formality_level: 'casual',
    season: ['all-season'],
    price_range: 'Unknown',
    brand_tier: 'contemporary'
  };
}

async function saveItemToDatabase(item, sessionId, userId) {
  try {
    const wardrobeItem = {
      user_id: userId,
      name: item.analysis?.name || `${item.color} ${item.type}`,
      garment_type: item.type,
      colors: JSON.stringify([{
        name: item.color,
        primary: true,
        confidence: 0.9
      }]),
      pattern: item.analysis?.fabricAnalysis?.weaveStructure || 'unknown',
      material: item.material,
      style: item.type,
      ai_confidence: item.confidence,
      price_range_estimate: item.analysis?.overallAssessment?.tier || 'contemporary',
      source: 'multi_item_detection',
      confidence_score: item.confidence,
      needs_review: item.confidence < 0.7,
      detection_session_id: sessionId,
      bounding_box: JSON.stringify(item.boundingBox),
      detection_confidence: item.confidence,
      visual_description: item.description,
      item_position: item.id
    };

    const { data, error } = await supabase
      .from('wardrobe_items')
      .insert(wardrobeItem)
      .select()
      .single();

    if (error) throw error;
    return data;

  } catch (error) {
    console.error(`Error saving item ${item.id}:`, error);
    return null;
  }
}

// Helper functions for component data extraction
function extractPrimaryColor(component) {
  const description = component.description || '';
  const attributes = component.attributes || [];
  const text = `${description} ${attributes.join(' ')}`.toLowerCase();
  
  const colorTerms = ['black', 'white', 'navy', 'blue', 'red', 'pink', 'green', 'yellow', 'purple', 'orange', 'brown', 'tan', 'beige', 'cream', 'ivory', 'burgundy', 'maroon', 'teal', 'turquoise', 'gray', 'grey'];
  
  for (const color of colorTerms) {
    if (text.includes(color)) {
      return color;
    }
  }
  
  return 'unknown';
}

function extractPrimaryFabric(component) {
  const description = component.description || '';
  const attributes = component.attributes || [];
  const text = `${description} ${attributes.join(' ')}`.toLowerCase();
  
  const fabricTerms = ['cotton', 'wool', 'silk', 'linen', 'cashmere', 'polyester', 'nylon', 'rayon', 'viscose', 'spandex', 'leather', 'suede', 'denim', 'tweed', 'velvet', 'corduroy', 'chiffon', 'satin'];
  
  for (const fabric of fabricTerms) {
    if (text.includes(fabric)) {
      return fabric;
    }
  }
  
  return 'unknown';
}

function determineBrandTier(component) {
  const description = component.description || '';
  const brand = component.brand || '';
  const text = `${description} ${brand}`.toLowerCase();
  
  if (text.includes('luxury') || text.includes('designer') || text.includes('couture')) {
    return 'luxury';
  } else if (text.includes('premium') || text.includes('high-end')) {
    return 'premium';
  } else if (text.includes('contemporary') || text.includes('mid-range')) {
    return 'contemporary';
  } else {
    return 'unknown';
  }
}

async function updateDetectionSession(sessionId, results) {
  await supabase
    .from('multi_item_detection_sessions')
    .update({
      total_items_detected: results.items.length,
      overall_confidence: results.confidence,
      processing_status: 'completed'
    })
    .eq('id', sessionId);
}

async function updateSessionStatus(sessionId, status, errorMessage = null) {
  await supabase
    .from('multi_item_detection_sessions')
    .update({
      processing_status: status,
      error_message: errorMessage
    })
    .eq('id', sessionId);
}