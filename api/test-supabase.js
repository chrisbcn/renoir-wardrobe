// api/test-supabase.js - Simple Supabase connection test

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Test environment variables
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      urlPreview: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'missing'
    });

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        error: 'Missing Supabase environment variables',
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey
      });
    }

    // Try to import and initialize Supabase
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test database connection with a simple query
    const { data, error } = await supabase
      .from('wardrobe_items')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('Supabase query error:', error);
      return res.status(500).json({
        error: 'Database connection failed',
        details: error.message
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Supabase connection working',
      itemCount: data || 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Test error:', error);
    return res.status(500).json({
      error: 'Connection test failed',
      details: error.message,
      stack: error.stack
    });
  }
}