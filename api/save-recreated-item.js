// api/save-recreated-item.js - Save recreated wardrobe item to database
import { createClient } from '@supabase/supabase-js';

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
    const { 
      detectedItem,           // Original detected item data
      originalImageUrl,       // Original image (base64 or URL)
      recreatedImageUrl,      // Recreated image (base64)
      recreationMetadata      // Metadata from recreation API
    } = req.body;

    if (!detectedItem || !originalImageUrl || !recreatedImageUrl) {
      return res.status(400).json({ 
        error: 'Missing required data: detectedItem, originalImageUrl, recreatedImageUrl' 
      });
    }

    console.log(`💾 Saving recreated item: ${detectedItem.type}`);

    // Initialize Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Prepare item data for database
    const itemData = {
      // Required fields
      name: detectedItem.type || 'Fashion Item',
      image_url: recreatedImageUrl,  // Use recreated as primary display image
      
      // Recreation tracking
      is_recreated: true,
      original_image_url: originalImageUrl,
      recreated_image_url: recreatedImageUrl,
      recreation_metadata: {
        model: recreationMetadata?.model || 'gemini-2.5-flash-image',
        timestamp: recreationMetadata?.timestamp || new Date().toISOString(),
        userId: recreationMetadata?.userId || 'demo'
      },
      
      // Item attributes from detection
      garment_type: detectedItem.type,
      clothing_type: detectedItem.type,
      pattern: detectedItem.pattern,
      material: detectedItem.material,
      style: detectedItem.type,
      
      // Colors as JSONB
      colors: detectedItem.color ? [{
        name: detectedItem.color,
        primary: true,
        confidence: detectedItem.confidence || 0.9
      }] : null,
      
      // Confidence scores
      ai_confidence: detectedItem.confidence || 0.85,
      confidence_score: detectedItem.confidence || 0.85,
      detection_confidence: detectedItem.confidence || 0.85,
      
      // Visual description
      visual_description: detectedItem.description || `${detectedItem.color || ''} ${detectedItem.type || 'item'}`.trim(),
      
      // Metadata
      source: 'recreation',
      needs_review: false,  // Recreated items are approved
      bounding_box: detectedItem.boundingBox || null,
      item_position: detectedItem.id,
      
      // Timestamps
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📝 Inserting recreated item into database...');

    // Insert into database
    const { data, error } = await supabase
      .from('wardrobe_items')
      .insert(itemData)
      .select()
      .single();

    if (error) {
      console.error('❌ Database insert error:', error);
      throw error;
    }

    console.log('✅ Successfully saved recreated item:', data.id);

    return res.status(200).json({
      success: true,
      itemId: data.id,
      item: data,
      message: 'Recreated item saved successfully'
    });

  } catch (error) {
    console.error('❌ Error saving recreated item:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to save recreated item',
      message: error.message
    });
  }
}

