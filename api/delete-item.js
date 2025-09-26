// api/delete-item.js - Delete item from database

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // CORS headers
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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { itemId } = req.body;
    
    if (!itemId) {
      return res.status(400).json({ 
        error: 'Item ID is required' 
      });
    }

    console.log('Deleting item with ID:', itemId);

    // Delete from database
    const { error } = await supabase
      .from('wardrobe_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error('Delete error:', error);
      throw error;
    }

    console.log('Successfully deleted item:', itemId);
    
    return res.status(200).json({ 
      success: true,
      message: 'Item deleted successfully' 
    });
    
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      error: 'Failed to delete item',
      details: error.message 
    });
  }
}