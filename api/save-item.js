// api/save-item.js - Save analysis results to Supabase

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { analysisResult, imageData, category = 'wardrobe' } = req.body;
    
    // Check if Supabase is configured
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({
        error: 'Supabase not configured',
        saved: false
      });
    }

    if (!analysisResult || !imageData) {
      return res.status(400).json({
        error: 'Missing analysis result or image data',
        saved: false
      });
    }

    // Import and initialize Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Convert base64 to blob for upload
    const imageBlob = base64ToBlob(imageData, 'image/jpeg');
    
    // Generate unique filename
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`;
    const filePath = `${category}/${fileName}`;

    console.log('Uploading image to Supabase Storage...');

    // Upload image to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('wardrobe-images')
      .upload(filePath, imageBlob);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return res.status(500).json({
        error: 'Failed to upload image',
        details: uploadError.message,
        saved: false
      });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('wardrobe-images')
      .getPublicUrl(filePath);

    console.log('Saving to database...');

    // Prepare database record
    const wardrobeItem = {
      item_name: analysisResult.name || 'Unknown Item',
      item_type: analysisResult.type || null,
      category: category,
      image_url: publicUrl,
      analysis_data: analysisResult,
      brand: analysisResult.brand || null,
      estimated_tier: analysisResult.tier || null,
      quality_score: analysisResult.qualityScore || 50
    };

    // Save to database
    const { data: dbData, error: dbError } = await supabase
      .from('wardrobe_items')
      .insert([wardrobeItem])
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return res.status(500).json({
        error: 'Failed to save to database',
        details: dbError.message,
        saved: false
      });
    }

    console.log('Successfully saved item:', dbData.id);

    return res.status(200).json({
      success: true,
      saved: true,
      itemId: dbData.id,
      message: 'Item saved to wardrobe'
    });
    
  } catch (error) {
    console.error('Save error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message,
      saved: false
    });
  }
}

// Helper function to convert base64 to blob
function base64ToBlob(base64, mimeType) {
  const byteCharacters = atob(base64);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: mimeType });
}