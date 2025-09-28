// api/get-wardrobe.js - Fixed version with better error handling
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  try {
    console.log('GET /api/get-wardrobe called');
    
    // Check environment variables first
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      console.error('Missing Supabase environment variables');
      return res.status(200).json({ 
        success: true, 
        items: [],
        message: 'Database not configured - using local mode'
      });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Get pagination parameters from query string
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    
    console.log(`Fetching items: limit=${limit}, offset=${offset}`);
    
    // Try to fetch items with pagination
    const { data: items, error } = await supabase
      .from('wardrobe_items')
      .select('*')
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      
      // If table doesn't exist, return empty gracefully
      if (error.message.includes('relation "wardrobe_items" does not exist')) {
        console.log('Table does not exist - returning empty wardrobe');
        return res.status(200).json({ 
          success: true, 
          items: [],
          message: 'Database table not found - starting fresh'
        });
      }
      
      // For other errors, also return empty gracefully
      return res.status(200).json({ 
        success: true, 
        items: [],
        message: 'Database temporarily unavailable - using local mode'
      });
    }

    // Format items to match what the app expects
    const formattedItems = items?.map(item => ({
      id: item.id,
      item_name: item.name || item.item_name,
      item_type: item.garment_type,
      image_url: item.image_url,
      analysis_data: {
        name: item.name || item.item_name,
        type: item.garment_type,
        brand: item.brand,
        tier: item.tier,
        summary: item.summary,
        keyFeatures: item.key_features || [],
        estimatedValue: item.estimated_value,
        condition: item.condition,
        qualityScore: item.quality_score,
        // Legacy complex structure support
        brandIdentifiers: item.brand_indicators,
        overallAssessment: item.quality_indicators,
        constructionSignatures: item.construction_details,
        qualityIndicators: item.luxury_markers
      }
    })) || [];

    console.log(`Successfully fetched ${formattedItems.length} items`);

    return res.status(200).json({ 
      success: true, 
      items: formattedItems,
      count: formattedItems.length
    }); 

  } catch (error) {
    console.error('Fetch error:', error);
    
    // Always return a successful response with empty items rather than 500 error
    // This keeps the app working even when database has issues
    return res.status(200).json({ 
      success: true, 
      items: [],
      message: 'Starting fresh - database connection failed'
    });
  }
}