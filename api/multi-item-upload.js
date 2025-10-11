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
      console.log(`✅ COMPLETED analysis for item ${i + 1}: ${item.item_type}`);
      
      // Debug logging to see what we're getting
      console.log(`🔍 DEBUG - Item ${i + 1} analysis:`, JSON.stringify(detailedAnalysis, null, 2));
      
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
        description: buildDetailedDescription(detailedAnalysis, item.item_type),
        debug_analysis: detailedAnalysis, // Add this for debugging
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
  console.log('🚀 STARTING analyzeIndividualItem for:', detectedItem.item_type);
  const analysisPrompt = `Analyze this clothing item in extreme detail: ${detectedItem.item_type}

Description: ${detectedItem.visual_description}

Provide a comprehensive analysis with specific terminology and detailed descriptions. Focus on:

1. CONSTRUCTION & FIT: tailored, relaxed, fitted, oversized, cropped, structured, flowing
2. FABRIC & TEXTURE: smooth, ribbed, textured, cable knit, basketweave, slub-knit, matte, shiny
3. PATTERN & DETAILS: pinstripes, stripes, texture, geometric patterns, decorative elements
4. EMBELLISHMENTS: sequins, beads, embroidery, metallic details, hardware, surface treatments
5. SILHOUETTE: A-line, fitted, boxy, structured, flowing, proportions, length details

Use specific fashion terminology like:
- "Double-breasted wool blazer with notch lapels"
- "Fine-gauge wool knit with cable texture"
- "Tailored fit with French seams and pick stitching"
- "Structured silhouette with welt pockets"

Respond with JSON:
{
  "color": "specific color name",
  "fabric": "detailed fabric description",
  "pattern": "pattern details",
  "style": "detailed style description",
  "construction": "construction details",
  "texture": "texture specifics",
  "fit": "fit characteristics",
  "silhouette": "silhouette details",
  "embellishments": {
    "metallic_elements": [],
    "beadwork": [],
    "embroidery": [],
    "textural": [],
    "hardware": [],
    "surface_treatments": []
  },
  "formality_level": "casual/smart casual/business formal/black-tie",
  "season": ["seasons"],
  "price_range": "price range",
  "brand_tier": "contemporary/premium/luxury/ultra-luxury"
}`;

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
    console.warn('Falling back to basic details for item:', detectedItem.item_type);
    return getBasicItemDetails(detectedItem);
  }
  
  if (!data.content || !data.content[0]) {
    console.warn('Unexpected analysis response:', JSON.stringify(data, null, 2));
    console.warn('Falling back to basic details for item:', detectedItem.item_type);
    return getBasicItemDetails(detectedItem);
  }
  
  try {
    const responseText = data.content[0].text;
    console.log('Raw Claude response for', detectedItem.item_type, ':', responseText.substring(0, 200) + '...');
    const cleanedResponse = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleanedResponse);
    console.log('Successfully parsed analysis for', detectedItem.item_type, ':', JSON.stringify(parsed, null, 2));
    return parsed;
  } catch (error) {
    console.warn('Failed to parse analysis for', detectedItem.item_type, ':', error);
    console.warn('Raw response was:', data.content[0].text);
    console.warn('Falling back to basic details for item:', detectedItem.item_type);
    return getBasicItemDetails(detectedItem);
  }
}

function buildDetailedDescription(analysis, itemType) {
  const parts = [];
  
  // Start with style or item type
  if (analysis.style && analysis.style !== itemType && analysis.style !== 'Unknown') {
    parts.push(analysis.style);
  } else {
    parts.push(itemType);
  }
  
  // Add fabric/material
  if (analysis.fabric && analysis.fabric !== 'Unknown') {
    parts.push(`in ${analysis.fabric}`);
  }
  
  // Add construction details
  if (analysis.construction && analysis.construction !== 'Unknown') {
    parts.push(analysis.construction);
  }
  
  // Add texture details
  if (analysis.texture && analysis.texture !== 'Unknown') {
    parts.push(analysis.texture);
  }
  
  // Add fit details
  if (analysis.fit && analysis.fit !== 'Unknown') {
    parts.push(analysis.fit);
  }
  
  // Add silhouette details
  if (analysis.silhouette && analysis.silhouette !== 'Unknown') {
    parts.push(analysis.silhouette);
  }
  
  // Add pattern details
  if (analysis.pattern && analysis.pattern !== 'solid' && analysis.pattern !== 'Unknown') {
    parts.push(`with ${analysis.pattern} pattern`);
  }
  
  // Add embellishment details
  if (analysis.embellishments) {
    const embellishmentTypes = [];
    if (analysis.embellishments.metallic_elements?.length > 0) {
      embellishmentTypes.push('metallic details');
    }
    if (analysis.embellishments.beadwork?.length > 0) {
      embellishmentTypes.push('beadwork');
    }
    if (analysis.embellishments.embroidery?.length > 0) {
      embellishmentTypes.push('embroidery');
    }
    if (analysis.embellishments.textural?.length > 0) {
      embellishmentTypes.push('textural embellishments');
    }
    if (embellishmentTypes.length > 0) {
      parts.push(`featuring ${embellishmentTypes.join(', ')}`);
    }
  }
  
  // If we only have basic info, try to make it more descriptive
  if (parts.length <= 2) {
    // Add some descriptive terms based on the item type
    if (itemType === 'vest') {
      parts.push('sleeveless', 'structured');
    } else if (itemType === 'shirt') {
      parts.push('collared', 'button-up');
    } else if (itemType === 'pants') {
      parts.push('tailored', 'fitted');
    } else if (itemType === 'dress') {
      parts.push('elegant', 'structured');
    }
  }
  
  // If we still don't have enough detail, add more descriptive terms
  if (parts.length <= 3) {
    // Add more specific descriptive terms
    if (itemType === 'vest') {
      parts.push('knitted', 'sleeveless', 'structured', 'tailored');
    } else if (itemType === 'shirt') {
      parts.push('collared', 'button-up', 'long-sleeved', 'crisp');
    } else if (itemType === 'pants') {
      parts.push('tailored', 'fitted', 'cropped', 'cuffed');
    } else if (itemType === 'dress') {
      parts.push('elegant', 'structured', 'fitted', 'flowing');
    } else if (itemType === 'shoes') {
      parts.push('flat', 'leather', 'comfortable', 'stylish');
    } else if (itemType === 'handbag') {
      parts.push('leather', 'structured', 'spacious', 'designer');
    }
  }
  
  return parts.join(' ').trim();
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