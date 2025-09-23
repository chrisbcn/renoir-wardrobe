// api/analyze.js - Fashion Analysis API with Optional Supabase Integration

const LUXURY_FASHION_ANALYSIS_PROMPT = `
Analyze this luxury fashion item with collector-grade precision. Focus on authentication markers and construction details.

Analyze the key features:
- Item type and style
- Brand identification (logos, labels, construction signatures)
- Quality indicators (materials, stitching, hardware)
- Construction details
- Estimated tier and value

Response Format:
{
  "type": "blazer/suit/dress/coat/shirt/pants/etc",
  "name": "Descriptive name with potential brand",
  "brand": "identified or likely brand",
  "qualityScore": 1-100,
  "tier": "luxury/premium/diffusion/mass market",
  "estimatedValue": "$X,XXX - $X,XXX",
  "authenticityConfidence": "high/medium/low",
  "keyFeatures": ["notable construction details", "material quality", "hardware quality"],
  "condition": "pristine/excellent/good/fair/poor",
  "summary": "brief overall assessment with authentication notes"
}

Respond ONLY with valid JSON.`;

// Helper function to save to Supabase (optional)
async function saveToSupabase(analysisResult, imageData, category = 'wardrobe') {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('Supabase not configured - skipping database save');
      return null;
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Convert base64 to blob for upload
    const imageBlob = base64ToBlob(imageData, 'image/jpeg');
    
    // Generate unique filename
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`;
    const filePath = `${category}/${fileName}`;

    // Upload image to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('wardrobe-images')
      .upload(filePath, imageBlob);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('wardrobe-images')
      .getPublicUrl(filePath);

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
      return null;
    }

    console.log('Successfully saved to database:', dbData.id);
    return dbData;
    
  } catch (error) {
    console.error('Error saving to Supabase:', error);
    return null;
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
    const { image, type = 'wardrobe', saveToDatabase = true } = req.body;
    
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      console.error('No API key found');
      return res.status(500).json({ 
        error: 'Claude API key not configured' 
      });
    }

    const prompt = type === 'inspiration' 
      ? `Analyze this fashion inspiration image. Identify all visible garments: ${LUXURY_FASHION_ANALYSIS_PROMPT}`
      : LUXURY_FASHION_ANALYSIS_PROMPT;

    console.log('Starting analysis...');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: image
                }
              },
              {
                type: 'text',
                text: prompt
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', response.status, errorText);
      
      return res.status(response.status).json({ 
        error: `Analysis failed: ${response.status}`,
        details: errorText
      });
    }

    const data = await response.json();
    
    let analysisResult;
    try {
      const responseText = data.content[0].text;
      const cleanJson = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysisResult = JSON.parse(cleanJson);
      
      console.log('Analysis complete:', {
        type: analysisResult.type,
        brand: analysisResult.brand
      });
      
    } catch (parseError) {
      console.error('Parse error:', parseError);
      
      return res.status(500).json({
        error: 'Failed to parse analysis',
        rawResponse: data.content[0].text
      });
    }

    // Try to save to Supabase (optional - won't break if it fails)
    let savedItem = null;
    if (saveToDatabase) {
      savedItem = await saveToSupabase(analysisResult, image, type);
    }

    // Always return the analysis, regardless of database save status
    return res.status(200).json({ 
      analysis: analysisResult,
      saved: !!savedItem,
      itemId: savedItem?.id || null
    });
    
  } catch (error) {
    console.error('Server error:', error);
    
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
}