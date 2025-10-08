// api/multi-item-upload.js
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
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
    const { userId, imageData, autoSave = false } = req.body;
    
    if (!imageData) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    console.log(`🚀 Processing multi-item upload for user: ${userId}`);
    
    // Step 1: Create detection session
    const sessionId = await createDetectionSession(userId, imageData);
    
    // Step 2: Detect and analyze items using Claude API
    const detectionResult = await detectAndAnalyzeItems(imageData);
    
    if (!detectionResult.success) {
      await updateSessionStatus(sessionId, 'failed', detectionResult.error);
      return res.status(500).json(detectionResult);
    }

    // Step 3: Update session with results
    await updateDetectionSession(sessionId, detectionResult);
    
    // Step 4: Save items to wardrobe if requested
    let savedItems = [];
    if (autoSave) {
      savedItems = await saveItemsToWardrobe(detectionResult.items, userId, sessionId);
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
async function createDetectionSession(userId, imageData) {
  const imageHash = require('crypto')
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
      original_image_url: `data:image/jpeg;base64,${imageData}`,
      processing_status: 'processing'
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

async function detectAndAnalyzeItems(base64Image) {
  try {
    console.log('🔍 Starting AI clothing detection...');
    
    // Step 1: Use Claude to detect individual items
    const detectedItems = await detectClothingItems(base64Image);
    
    // Step 2: Analyze each item in detail
    const analyzedItems = [];
    for (let i = 0; i < detectedItems.length; i++) {
      const item = detectedItems[i];
      console.log(`🔬 Analyzing item ${i + 1}: ${item.item_type}`);
      
      const detailedAnalysis = await analyzeIndividualItem(item, base64Image);
      
      analyzedItems.push({
        id: i + 1,
        type: item.item_type,
        confidence: item.confidence,
        bounding_box: item.bounding_box,
        visual_description: item.visual_description,
        details: detailedAnalysis,
        analysis_confidence: item.confidence
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

async function detectClothingItems(base64Image) {
  const prompt = `Analyze this image and detect ALL individual clothing items. For each item found, provide:

1. Item type (shirt, pants, dress, jacket, shoes, accessories, etc.)
2. Approximate bounding box coordinates (as percentages of image dimensions)
3. Confidence level (0-1)
4. Visual description

Focus on detecting SEPARATE clothing items - if someone is wearing a full outfit, identify each piece individually.

Respond with a JSON array in this exact format:
[
  {
    "item_type": "blazer",
    "bounding_box": {
      "x_percent": 15,
      "y_percent": 10,
      "width_percent": 35,
      "height_percent": 45
    },
    "confidence": 0.92,
    "visual_description": "Navy blue tailored blazer with lapels"
  }
]

IMPORTANT: Respond ONLY with valid JSON. Do not include any other text.`;

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
                media_type: 'image/jpeg',
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

  if (data.error) {
    throw new Error(`Claude API error: ${data.error.message || data.error}`);
  }
  
  if (!data.content || !data.content[0]) {
    throw new Error(`Unexpected API response: ${JSON.stringify(data)}`);
  }
  
  const responseText = data.content[0].text;
}

async function analyzeIndividualItem(detectedItem, base64Image) {
  // Use your existing analyze.js logic here
  const analysisPrompt = `Analyze this specific clothing item: ${detectedItem.item_type}

Description: ${detectedItem.visual_description}

Provide analysis in JSON format:
{
  "color": "primary color name",
  "fabric": "fabric type",
  "pattern": "pattern type",
  "style": "specific style details",
  "formality_level": "casual, smart casual, business formal, black-tie",
  "season": ["applicable seasons"],
  "price_range": "estimated price range",
  "brand_tier": "contemporary, premium, luxury, ultra-luxury"
}

Respond ONLY with valid JSON.`;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  try {
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

    // Add error checking
    if (data.error) {
        throw new Error(`Claude API error: ${data.error.message || JSON.stringify(data.error)}`);
    }
    
    if (!data.content || !data.content[0]) {
        throw new Error(`Unexpected API response: ${JSON.stringify(data)}`);
    }
    
    const responseText = data.content[0].text;
    
    // const cleanedResponse = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    // return JSON.parse(cleanedResponse);
    
  } catch (error) {
    console.error('Error in detailed analysis:', error);
    return {
      color: 'unknown',
      fabric: 'unknown',
      pattern: 'solid',
      style: 'standard',
      formality_level: 'casual',
      season: ['all seasons'],
      price_range: 'unknown',
      brand_tier: 'contemporary'
    };
  }
}

async function saveItemsToWardrobe(items, userId, sessionId) {
  const savedItems = [];

  for (const item of items) {
    try {
      const wardrobeItem = {
        user_id: userId,
        name: generateItemName(item),
        garment_type: item.type,
        colors: JSON.stringify([{
          name: item.details.color,
          primary: true,
          confidence: 0.9
        }]),
        pattern: item.details.pattern,
        material: item.details.fabric,
        style: item.details.style,
        ai_confidence: item.analysis_confidence,
        price_range_estimate: item.details.price_range,
        source: 'multi_item_detection',
        confidence_score: item.analysis_confidence,
        needs_review: item.analysis_confidence < 0.7,
        detection_session_id: sessionId,
        bounding_box: JSON.stringify(item.bounding_box),
        detection_confidence: item.confidence,
        visual_description: item.visual_description,
        item_position: item.id,
        image_url: `data:image/jpeg;base64,placeholder` // You'd store the actual image
      };

      const { data, error } = await supabase
        .from('wardrobe_items')
        .insert(wardrobeItem)
        .select()
        .single();

      if (error) throw error;
      savedItems.push(data);

    } catch (error) {
      console.error(`Error saving item ${item.id}:`, error);
    }
  }

  return savedItems;
}

function generateItemName(item) {
  const color = item.details.color || '';
  const fabric = item.details.fabric || '';
  const type = item.type || 'Item';
  return `${color} ${fabric} ${type}`.trim().replace(/\s+/g, ' ');
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