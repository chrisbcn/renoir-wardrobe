import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // CORS headers
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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { itemId } = req.body;
    
    if (!itemId) {
      return res.status(400).json({ error: 'Item ID is required' });
    }

    // Check if Supabase environment variables are available
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      console.error('Missing Supabase environment variables');
      return res.status(500).json({ 
        success: false, 
        error: 'Database not configured' 
      });
    }

    // Delete from database
    const { error } = await supabase
      .from('wardrobe_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error('Supabase delete error:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }

    console.log(`Successfully deleted item ${itemId} from database`);
    
    return res.status(200).json({ 
      success: true,
      message: 'Item deleted successfully' 
    });

  } catch (error) {
    console.error('Delete error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}