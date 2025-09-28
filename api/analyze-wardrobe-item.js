// api/analyze-wardrobe-item.js
// Main API for analyzing both images and receipts

import { createClient } from '@supabase/supabase-js';
import enhancedImageAnalyzer from '../src/lib/enhanced-image-analyzer.js';
import receiptAnalyzer from '../src/lib/receipt-analyzer.js';

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { analysis_type, user_id, brand_id, image_data, receipt_data } = req.body;

    if (!analysis_type || !user_id) {
      return res.status(400).json({ 
        error: 'Missing required fields: analysis_type, user_id' 
      });
    }

    console.log(`🔍 Starting ${analysis_type} analysis for user ${user_id}`);

    let result;

    switch (analysis_type) {
      case 'wardrobe_image':
        result = await analyzeWardrobeImage(image_data, user_id, brand_id);
        break;
        
      case 'receipt_image':
        result = await analyzeReceiptImage(image_data, user_id, brand_id);
        break;
        
      case 'receipt_text':
        result = await analyzeReceiptText(receipt_data, user_id, brand_id);
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid analysis_type' });
    }

    // Save results to database
    const savedItems = await saveAnalysisResults(result, user_id, brand_id, analysis_type);

    res.status(200).json({
      success: true,
      analysis_type: analysis_type,
      result: result,
      saved_items: savedItems,
      message: `${analysis_type} analysis completed successfully`
    });

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      error: 'Analysis failed',
      details: error.message
    });
  }
}

/**
 * Analyze wardrobe item image
 */
async function analyzeWardrobeImage(imageData, userId, brandId) {
  if (!imageData) {
    throw new Error('No image data provided');
  }

  console.log('🖼️ Analyzing wardrobe image...');
  
  // Convert base64 to File-like object for the analyzer
  const imageFile = base64ToFile(imageData.base64, imageData.filename, imageData.type);
  
  // Use enhanced image analyzer
  const analysis = await enhancedImageAnalyzer.analyzeWardrobeImage(imageFile, userId, brandId);
  
  return {
    type: 'wardrobe_image',
    items: [{
      name: generateItemName(analysis.analysis),
      category: analysis.analysis.category.name,
      colors: analysis.analysis.attributes.colors,
      fabrics: analysis.analysis.attributes.fabrics,
      patterns: analysis.analysis.attributes.patterns,
      styles: analysis.analysis.attributes.styles,
      search_terms: analysis.analysis.search_terms,
      confidence_score: analysis.analysis.confidence_score,
      needs_review: analysis.analysis.needs_review,
      details: analysis.analysis.attributes.details,
      source: 'wardrobe_image'
    }],
    metadata: analysis.metadata,
    summary: {
      total_items: 1,
      high_confidence_items: analysis.analysis.confidence_score >= 0.75 ? 1 : 0,
      overall_confidence: analysis.analysis.confidence_score
    }
  };
}

/**
 * Analyze receipt image
 */
async function analyzeReceiptImage(imageData, userId, brandId) {
  if (!imageData) {
    throw new Error('No image data provided');
  }

  console.log('📄 Analyzing receipt image...');
  
  const imageFile = base64ToFile(imageData.base64, imageData.filename, imageData.type);
  
  // Use receipt analyzer
  const analysis = await receiptAnalyzer.analyzeReceipt(imageFile, 'image');
  
  return {
    type: 'receipt_image',
    items: analysis.items.map(item => ({
      name: item.description,
      price: item.price,
      currency: item.currency,
      category: item.analysis.category.name,
      colors: item.analysis.colors,
      fabrics: item.analysis.fabrics,
      brand: item.analysis.brand,
      search_terms: item.analysis.search_terms,
      confidence_score: item.analysis.confidence_score,
      needs_review: item.analysis.needs_review,
      source: 'receipt_image',
      raw_line: item.raw_line
    })),
    receipt_metadata: analysis.receipt_metadata,
    summary: analysis.summary
  };
}

/**
 * Analyze receipt text
 */
async function analyzeReceiptText(receiptText, userId, brandId) {
  if (!receiptText) {
    throw new Error('No receipt text provided');
  }

  console.log('📝 Analyzing receipt text...');
  
  const analysis = await receiptAnalyzer.analyzeReceipt(receiptText, 'text');
  
  return {
    type: 'receipt_text',
    items: analysis.items.map(item => ({
      name: item.description,
      price: item.price,
      currency: item.currency,
      category: item.analysis.category.name,
      colors: item.analysis.colors,
      fabrics: item.analysis.fabrics,
      brand: item.analysis.brand,
      search_terms: item.analysis.search_terms,
      confidence_score: item.analysis.confidence_score,
      needs_review: item.analysis.needs_review,
      source: 'receipt_text',
      raw_line: item.raw_line
    })),
    receipt_metadata: analysis.receipt_metadata,
    summary: analysis.summary
  };
}

/**
 * Save analysis results to database
 */
async function saveAnalysisResults(analysisResult, userId, brandId, analysisType) {
  const savedItems = [];
  
  for (const item of analysisResult.items) {
    try {
      const wardrobeItem = {
        user_id: userId,
        brand_id: brandId,
        name: item.name,
        price: item.price || null,
        currency: item.currency || 'USD',
        
        // Enhanced fashion data
        clothing_type: item.category,
        colors: JSON.stringify(item.colors),
        fabrics: JSON.stringify(item.fabrics),
        patterns: JSON.stringify(item.patterns || []),
        styles: JSON.stringify(item.styles || []),
        search_terms: item.search_terms,
        confidence_score: item.confidence_score,
        needs_review: item.needs_review,
        
        // Metadata
        source: item.source,
        analysis_type: analysisType,
        brand_detected: item.brand?.name || null,
        details: JSON.stringify(item.details || {}),
        
        // Timestamps
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('wardrobe_items')
        .insert(wardrobeItem)
        .select()
        .single();

      if (error) {
        console.error(`Failed to save item "${item.name}":`, error);
        continue;
      }

      savedItems.push({
        ...data,
        original_analysis: item
      });

      console.log(`✅ Saved item: ${item.name} (confidence: ${(item.confidence_score * 100).toFixed(0)}%)`);

    } catch (itemError) {
      console.error(`Error saving item "${item.name}":`, itemError);
    }
  }
  
  return savedItems;
}

/**
 * Helper functions
 */
function base64ToFile(base64String, filename, mimeType) {
  // Convert base64 to blob then to File-like object
  const byteCharacters = atob(base64String);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });
  
  // Add File-like properties
  blob.name = filename;
  blob.lastModified = Date.now();
  blob.size = byteArray.length;
  blob.type = mimeType;
  
  return blob;
}

function generateItemName(analysis) {
  const category = analysis.category.name;
  const primaryColor = analysis.attributes.colors.find(c => c.validated)?.name;
  const primaryFabric = analysis.attributes.fabrics.find(f => f.validated)?.name;
  
  let name = category !== 'unknown' ? category : 'Fashion Item';
  
  if (primaryFabric) {
    name = `${primaryFabric} ${name}`;
  }
  
  if (primaryColor) {
    name = `${primaryColor} ${name}`;
  }
  
  return name.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}