// api/analyze-wardrobe-item.js
// Main API for analyzing both images and receipts

import { createClient } from '@supabase/supabase-js';
import enhancedImageAnalyzer from '../src/lib/enhanced-image-analyzer.js';
import componentFocusedAnalyzer from '../src/lib/component-focused-analyzer.js';
import agentOrchestrator from '../src/lib/agent-orchestrator.js';
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

  console.log('🖼️ Analyzing wardrobe image with enhanced detailed analysis...');
  
  const imageDataUrl = `data:${imageData.type || 'image/jpeg'};base64,${imageData.base64}`;
  
  // Use the enhanced image analyzer for detailed analysis
  const analysis = await enhancedImageAnalyzer.getLuxuryAnalysis(imageDataUrl);
  
  if (!analysis.success) {
    throw new Error(analysis.error || 'Analysis failed');
  }

  const result = analysis;
  
  // Map the enhanced image analyzer response structure
  return {
    type: 'wardrobe_image',
    items: [{
      name: result.summary?.itemName || 'Fashion Item',
      category: result.category || 'unknown',
      colors: result.colors || [],
      fabrics: result.fabrics || [],
      patterns: result.patterns || [],
      styles: result.styles || [],
      brand: 'Unknown',
      confidence_score: result.confidence || 0.8,
      needs_review: result.confidence < 0.7,
      details: result.detailedAnalysis || '',
      embellishments: result.embellishments || [],
      has_sequins: result.embellishments?.some(e => e.toLowerCase().includes('sequin')) || false,
      has_beadwork: result.embellishments?.some(e => e.toLowerCase().includes('bead')) || false,
      has_embroidery: result.embellishments?.some(e => e.toLowerCase().includes('embroidery')) || false,
      has_metallic: result.embellishments?.some(e => e.toLowerCase().includes('metallic')) || false,
      source: 'wardrobe_image',
      brand_tier: result.qualityTier || 'unknown',
      price_range: result.priceRange || 'Unknown'
    }],
    metadata: {
      analysisType: 'wardrobe',
      timestamp: new Date().toISOString(),
      confidence: result.confidence,
      embellishment_summary: result.embellishment_summary || null
    },
    summary: {
      total_items: 1,
      high_confidence_items: result.confidence >= 0.75 ? 1 : 0,
      overall_confidence: result.confidence,
      embellishment_detected: result.embellishment_summary ? result.embellishment_summary.total_embellishments > 0 : false
    }
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
 * Helper functions for component-focused analysis
 */

// Extract colors from component
function extractColors(component) {
  const colors = [];
  const text = `${component.description || ''} ${(component.attributes || []).join(' ')}`.toLowerCase();
  
  const colorTerms = ['black', 'white', 'navy', 'blue', 'red', 'pink', 'green', 'yellow', 'purple', 'orange', 'brown', 'tan', 'beige', 'cream', 'ivory', 'burgundy', 'maroon', 'teal', 'turquoise', 'gray', 'grey'];
  
  colorTerms.forEach(color => {
    if (text.includes(color)) {
      colors.push(color);
    }
  });
  
  return colors.length > 0 ? colors : ['unknown'];
}

// Extract fabrics from component
function extractFabrics(component) {
  const fabrics = [];
  const text = `${component.description || ''} ${(component.attributes || []).join(' ')}`.toLowerCase();
  
  const fabricTerms = ['cotton', 'wool', 'silk', 'linen', 'cashmere', 'polyester', 'nylon', 'rayon', 'viscose', 'spandex', 'leather', 'suede', 'denim', 'tweed', 'velvet', 'corduroy', 'chiffon', 'satin'];
  
  fabricTerms.forEach(fabric => {
    if (text.includes(fabric)) {
      fabrics.push(fabric);
    }
  });
  
  return fabrics.length > 0 ? fabrics : ['unknown'];
}

// Extract patterns from component
function extractPatterns(component) {
  const patterns = [];
  const text = `${component.description || ''} ${(component.attributes || []).join(' ')}`.toLowerCase();
  
  const patternTerms = ['solid', 'striped', 'checkered', 'plaid', 'polka dot', 'floral', 'geometric', 'abstract', 'cable knit', 'ribbed'];
  
  patternTerms.forEach(pattern => {
    if (text.includes(pattern)) {
      patterns.push(pattern);
    }
  });
  
  return patterns.length > 0 ? patterns : ['solid'];
}

// Extract styles from component
function extractStyles(component) {
  const styles = [];
  const text = `${component.description || ''} ${(component.attributes || []).join(' ')}`.toLowerCase();
  
  const styleTerms = ['casual', 'formal', 'business', 'elegant', 'vintage', 'modern', 'classic', 'trendy', 'tailored', 'relaxed'];
  
  styleTerms.forEach(style => {
    if (text.includes(style)) {
      styles.push(style);
    }
  });
  
  return styles.length > 0 ? styles : ['casual'];
}

// Determine brand tier based on component
function determineBrandTier(component) {
  const text = `${component.description || ''} ${(component.brand || '')} ${(component.attributes || []).join(' ')}`.toLowerCase();
  
  if (text.includes('luxury') || text.includes('designer') || text.includes('couture')) {
    return 'luxury';
  } else if (text.includes('premium') || text.includes('high-end')) {
    return 'premium';
  } else if (text.includes('contemporary') || text.includes('mid-range')) {
    return 'contemporary';
  } else {
    return 'unknown';
  }
}

// Estimate price range based on component
function estimatePriceRange(component) {
  const text = `${component.description || ''} ${(component.attributes || []).join(' ')}`.toLowerCase();
  
  if (text.includes('luxury') || text.includes('designer') || text.includes('couture')) {
    return '$500+';
  } else if (text.includes('premium') || text.includes('high-end')) {
    return '$200-500';
  } else if (text.includes('contemporary') || text.includes('mid-range')) {
    return '$50-200';
  } else {
    return 'Unknown';
  }
}

// FIXED: base64ToFile function for api/analyze-wardrobe-item.js
// Replace the existing base64ToFile function with this:

function base64ToFile(base64String, filename, mimeType) {
  const byteCharacters = atob(base64String);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });
  
  // FIX: Don't try to set read-only properties
  // Create a File-like object that extends the blob
  const fileObj = Object.create(blob);
  
  // Add File-like properties as non-writable properties
  Object.defineProperty(fileObj, 'name', {
    value: filename,
    writable: false,
    enumerable: true,
    configurable: true
  });
  
  Object.defineProperty(fileObj, 'lastModified', {
    value: Date.now(),
    writable: false,
    enumerable: true,
    configurable: true
  });
  
  // Note: size is already available from the blob and is read-only
  // type is already available from the blob
  
  return fileObj;
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