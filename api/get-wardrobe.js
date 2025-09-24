// api/get-wardrobe.js - Fetch saved wardrobe items

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return res.status(200).json({ items: [] }); // Return empty if no database
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Fetch wardrobe items, newest first
    const { data, error } = await supabase
      .from('wardrobe_items')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Database fetch error:', error);
      return res.status(500).json({
        error: 'Failed to fetch items',
        details: error.message
      });
    }

    // Convert database items to your app's format
    const items = data.map(dbItem => ({
      id: dbItem.id,
      databaseId: dbItem.id,
      imageUrl: dbItem.image_url,
      name: dbItem.item_name,
      source: 'database',
      analysis: dbItem.analysis_data,
      category: dbItem.category,
      createdAt: dbItem.created_at
    }));

    console.log(`Loaded ${items.length} items from database`);

    return res.status(200).json({
      success: true,
      items: items,
      count: items.length
    });
    
  } catch (error) {
    console.error('Get wardrobe error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}