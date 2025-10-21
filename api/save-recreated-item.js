// api/save-recreated-item.js - Save recreated wardrobe item to database
import { createClient } from '@supabase/supabase-js';

// Helper function to normalize confidence values (handles both 0-1 and 0-100 ranges)
function normalizeConfidence(value) {
  if (!value) return null;
  // If value is > 1, assume it's a percentage (0-100) and convert to 0-1
  if (value > 1) {
    return value / 100;
  }
  return value;
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Health check endpoint
  if (req.method === 'GET') {
    console.log('🏥 Health check called');
    return res.status(200).json({ 
      status: 'ok', 
      message: 'save-recreated-item endpoint is running',
      timestamp: new Date().toISOString()
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  console.log('🚀 POST request received at save-recreated-item');

  try {
    const { 
      detectedItem,           // Original detected item data
      originalImageUrl,       // Original image (base64 or URL)
      recreatedImageUrl,      // Recreated image (base64)
      recreationMetadata      // Metadata from recreation API
    } = req.body;

    console.log('📥 Received request to save recreated item');
    console.log('   - Has detectedItem:', !!detectedItem);
    console.log('   - Has originalImageUrl:', !!originalImageUrl);
    console.log('   - Has recreatedImageUrl:', !!recreatedImageUrl);
    console.log('   - DetectedItem type:', detectedItem?.type);
    
    if (!detectedItem || !originalImageUrl || !recreatedImageUrl) {
      console.error('❌ Missing required data');
      return res.status(400).json({ 
        error: 'Missing required data: detectedItem, originalImageUrl, recreatedImageUrl' 
      });
    }

    console.log(`💾 Saving recreated item: ${detectedItem.type}`);

    // Initialize Supabase
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      console.error('❌ Supabase credentials missing');
      throw new Error('Supabase not configured');
    }
    
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    console.log('✅ Supabase client initialized');

    // Log and normalize confidence
    console.log('📊 Raw confidence value:', detectedItem.confidence);
    const normalizedConfidence = normalizeConfidence(detectedItem.confidence) || 0.85;
    console.log('📊 Normalized confidence:', normalizedConfidence);

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
        confidence: 0.9
      }] : null,
      
      // Confidence scores - use pre-normalized value
      ai_confidence: normalizedConfidence,
      confidence_score: normalizedConfidence,
      detection_confidence: normalizedConfidence,
      
      // Visual description
      visual_description: detectedItem.description || `${detectedItem.color || ''} ${detectedItem.type || 'item'}`.trim(),
      
      // Metadata
      source: 'recreation',
      needs_review: false,  // Recreated items are approved
      bounding_box: detectedItem.boundingBox || null,
      item_position: null,  // We don't have a numeric position for recreated items
      
      // Timestamps
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📝 Inserting recreated item into database...');
    console.log('   - Item name:', itemData.name);
    console.log('   - Has recreated image:', !!itemData.recreated_image_url);
    console.log('   - Recreated image length:', itemData.recreated_image_url?.length);
    console.log('   - Confidence values:', {
      ai_confidence: itemData.ai_confidence,
      confidence_score: itemData.confidence_score,
      detection_confidence: itemData.detection_confidence
    });
    console.log('   - Item position:', itemData.item_position);

    // Insert into database
    const { data, error } = await supabase
      .from('wardrobe_items')
      .insert(itemData)
      .select()
      .single();

    if (error) {
      console.error('❌ Database insert error:', error);
      console.error('   - Error code:', error.code);
      console.error('   - Error message:', error.message);
      console.error('   - Error details:', error.details);
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
    console.error('   - Error name:', error.name);
    console.error('   - Error message:', error.message);
    console.error('   - Error stack:', error.stack);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to save recreated item',
      message: error.message,
      errorType: error.name,
      details: error.details || error.hint || null
    });
  }
}

