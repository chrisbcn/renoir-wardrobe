// api/save-item.js - Add explicit timestamp
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { analysisResult, imageData } = req.body;
    
    const { data, error } = await supabase
      .from('wardrobe_items')
      .insert({
        name: analysisResult?.name || 'New Item',
        garment_type: analysisResult?.type || 'unknown',
        image_url: `data:image/jpeg;base64,${imageData}`,
        created_at: new Date().toISOString()  // Add this line
      })
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({ success: true, itemId: data.id });

  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}