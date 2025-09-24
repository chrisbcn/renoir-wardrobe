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
    const { analysisResult, imageData, category } = req.body;

    // Save to Supabase with correct column names
    const { data, error } = await supabase
      .from('wardrobe_items')
      .insert({
        name: analysisResult.name || analysisResult.type || 'Fashion Item',
        garment_type: analysisResult.type || 'unknown',
        image_url: `data:image/jpeg;base64,${imageData}`,
        colors: analysisResult.fabricAnalysis?.colors || null,
        pattern: analysisResult.fabricAnalysis?.pattern || null,
        material: analysisResult.fabricAnalysis?.weaveStructure || null,
        style: analysisResult.style || null,
        fit: analysisResult.fit || null,
        construction_details: analysisResult.constructionSignatures || null,
        brand_indicators: analysisResult.brandIdentifiers || null,
        luxury_markers: analysisResult.qualityIndicators || null,
        quality_indicators: analysisResult.overallAssessment || null,
        price_range_estimate: analysisResult.overallAssessment?.estimatedRetail || null,
        source: 'uploaded'
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.status(200).json({ 
      success: true, 
      itemId: data.id,
      message: 'Item saved successfully'
    });

  } catch (error) {
    console.error('Save error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}