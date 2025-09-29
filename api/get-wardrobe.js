// api/get-wardrobe.js - Fixed to preserve analysis data
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    
    const { data: items, error } = await supabase
      .from('wardrobe_items')
      .select('*')
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const formattedItems = items?.map(item => ({
      id: `db-${item.id}`,
      imageUrl: item.image_url,
      name: item.name || 'Item',
      source: 'database',
      databaseId: item.id,
      needsAnalysis: false,
      analysis: {
        type: item.garment_type || 'unknown',
        name: item.name,
        brand: item.brand_indicators?.likelyBrand || 'Unknown',
        qualityScore: item.ai_confidence ? Math.round(item.ai_confidence * 100) : null,
        tier: item.quality_indicators?.tier || 'Unknown',
        estimatedValue: item.price_range_estimate || 'Unknown',
        authenticityConfidence: item.ai_confidence >= 0.8 ? 'high' : 'medium',
        condition: 'excellent',
        summary: `${item.garment_type || 'Item'}`,
        fabricAnalysis: {
          colors: item.colors || [],
          materials: item.material ? [item.material] : []
        },
        constructionSignatures: item.construction_details || {},
        brandIdentifiers: item.brand_indicators || {},
        qualityIndicators: item.quality_indicators || {}
      }
    })) || [];

    return res.status(200).json({ success: true, items: formattedItems }); 

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}