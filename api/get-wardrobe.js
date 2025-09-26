// api/get-wardrobe.js
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Add CORS headers
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

  try {
    // Check if Supabase environment variables are available
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      console.error('Missing Supabase environment variables');
      return res.status(200).json({ 
        success: true, 
        items: [],
        count: 0,
        message: 'Database not configured - returning empty wardrobe'
      });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Get pagination parameters from query string
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    
    console.log(`Fetching wardrobe items: limit=${limit}, offset=${offset}`);
    
    // Fetch items with pagination
    const { data: items, error } = await supabase
      .from('wardrobe_items')
      .select('*')
      .range(offset, offset + limit - 1)  // This is how Supabase does pagination
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    console.log(`Found ${items?.length || 0} items in database`);

    // Format items to match what the app expects
    const formattedItems = items?.map(item => ({
      id: item.id,
      item_name: item.name || item.item_name,
      garment_type: item.garment_type || item.item_type,
      image_url: item.image_url,
      analysis_data: item.analysis_data || {
        name: item.name || item.item_name,
        type: item.garment_type || item.item_type,
        brandIdentifiers: item.brand_indicators,
        overallAssessment: item.quality_indicators,
        constructionSignatures: item.construction_details,
        qualityIndicators: item.luxury_markers
      }
    })) || [];

    return res.status(200).json({ 
      success: true, 
      items: formattedItems,
      count: formattedItems.length
    }); 

  } catch (error) {
    console.error('Fetch error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}