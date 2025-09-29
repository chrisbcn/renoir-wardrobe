// api/update-item.js - Simple working version
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
    const { itemId, analysisResult } = req.body;

    const { error } = await supabase
      .from('wardrobe_items')
      .update({
        name: analysisResult?.name || analysisResult?.type,
        garment_type: analysisResult?.type
      })
      .eq('id', itemId);

    if (error) throw error;

    res.status(200).json({ success: true, itemId });

  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}