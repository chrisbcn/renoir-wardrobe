import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  try {
    const { data: items, error } = await supabase
      .from('wardrobe_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
    app.get('/api/get-wardrobe', async (req, res) => {
      const limit = parseInt(req.query.limit) || 10;
      const offset = parseInt(req.query.offset) || 0;
      
      // Your database query with limit and offset
      // Example for SQL: SELECT * FROM wardrobe_items LIMIT ${limit} OFFSET ${offset}
    });
    // Format items to match what the app expects
    const formattedItems = items?.map(item => ({
      id: item.id,
      item_name: item.name,
      item_type: item.garment_type,
      image_url: item.image_url,
      analysis_data: {
        name: item.name,
        type: item.garment_type,
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