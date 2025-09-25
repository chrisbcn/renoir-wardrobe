// Create api/update-item.js
export default async function handler(req, res) {
  const { itemId, analysisResult } = req.body;
  
  const { data, error } = await supabase
    .from('wardrobe_items')
    .update({ analysis_data: analysisResult })
    .eq('id', itemId);
    
  res.json({ success: !error, error });
}