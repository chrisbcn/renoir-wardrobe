// api/analyze.js - Enhanced version of your existing endpoint
import enhancedImageAnalyzer from '../lib/enhanced-image-analyzer.js';

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
    const { image, type, prompt, mimeType } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    console.log(`🔍 Starting enhanced analysis for type: ${type}`);

    let analysis;

    if (type === 'wardrobe' || type === 'inspiration') {
      // Use enhanced image analyzer instead of basic Claude Vision
      
      // Convert base64 to File-like object
      const imageFile = base64ToFile(image, 'uploaded-image.jpg', mimeType || 'image/jpeg');
      
      // Use enhanced analyzer
      const enhancedResult = await enhancedImageAnalyzer.analyzeWardrobeImage(
        imageFile, 
        'temp-user', // You can get this from request if needed
        null
      );
      
      // Transform to match your existing app structure
      analysis = transformToLegacyFormat(enhancedResult.analysis);
      
    } else {
      // Fallback to your existing Claude Vision for other types
      analysis = await callClaudeVision(image, type, prompt, mimeType);
    }

    res.status(200).json({ analysis });

  } catch (error) {
    console.error('Enhanced analysis error:', error);
    res.status(500).json({
      error: 'Analysis failed',
      details: error.message
    });
  }
}

/**
 * Enhanced Claude Vision call with better prompts
 */
async function callClaudeVision(base64Image, type, customPrompt, mimeType = 'image/jpeg') {
  const prompt = customPrompt || getLuxuryAnalysisPrompt(type);
  
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mimeType,
                  data: base64Image
                }
              },
              {
                type: "text",
                text: prompt
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    let analysisText = data.content[0].text;
    
    // Try to parse as JSON first
    try {
      return JSON.parse(analysisText);
    } catch {
      // If not JSON, convert to legacy format
      return parseTextAnalysis(analysisText, type);
    }

  } catch (error) {
    console.error('Claude Vision error:', error);
    throw error;
  }
}

/**
 * Transform enhanced analysis to match your app's expected format
 */
function transformToLegacyFormat(enhancedAnalysis) {
  const category = enhancedAnalysis.category;
  const attributes = enhancedAnalysis.attributes;
  
  return {
    // Basic fields your app expects
    name: generateItemName(category, attributes),
    type: category.name,
    
    // Enhanced fields with much better data
    overallAssessment: {
      tier: determineTier(enhancedAnalysis),
      estimatedRetail: estimateRetail(category, attributes),
      authenticityConfidence: enhancedAnalysis.confidence_score >= 0.8 ? 'high' : 
                            enhancedAnalysis.confidence_score >= 0.6 ? 'medium' : 'low',
      condition: 'excellent', // Could be enhanced further
      estimatedAge: 'current season'
    },
    
    // Fabric analysis from enhanced data
    fabricAnalysis: {
      colors: attributes.colors.map(c => c.name),
      weaveStructure: attributes.fabrics.length > 0 ? attributes.fabrics[0].name : 'unknown',
      yarnQuality: attributes.fabrics.some(f => f.name === 'cashmere') ? 'Super 150s+' : 'Standard',
      weight: 'medium',
      pattern: attributes.patterns.length > 0 ? attributes.patterns[0].name : 'solid',
      patternMatching: 'yes'
    },
    
    // Brand identification
    brandIdentifiers: {
      likelyBrand: 'Unknown',
      confidence: Math.round(enhancedAnalysis.confidence_score * 100),
      constructionHouse: 'European',
      visibleLogos: 'none detected',
      hiddenSignatures: 'none detected'
    },
    
    // Quality indicators
    qualityIndicators: {
      handworkEvidence: generateQualityMarkers(attributes),
      luxuryMarkers: generateLuxuryMarkers(category, attributes),
      authenticityMarkers: ['consistent stitching', 'quality materials']
    },
    
    // Construction details
    constructionSignatures: {
      pickStitching: attributes.details?.construction || 'standard',
      shoulderConstruction: 'natural',
      seamConstruction: 'flat-fell',
      handwork: generateHandworkDetails(attributes)
    },
    
    // Enhanced search capability
    searchTerms: enhancedAnalysis.search_terms,
    confidenceScore: enhancedAnalysis.confidence_score,
    needsReview: enhancedAnalysis.needs_review
  };
}

/**
 * Helper functions for transformation
 */
function generateItemName(category, attributes) {
  let name = category.name !== 'unknown' ? category.name : 'Fashion Item';
  
  const primaryColor = attributes.colors.find(c => c.validated)?.name;
  const primaryFabric = attributes.fabrics.find(f => f.validated)?.name;
  
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

function determineTier(analysis) {
  const confidence = analysis.confidence_score;
  const hasLuxuryFabrics = analysis.attributes.fabrics.some(f => 
    ['cashmere', 'silk', 'wool'].includes(f.name)
  );
  
  if (confidence >= 0.9 && hasLuxuryFabrics) return 'luxury';
  if (confidence >= 0.7) return 'premium';
  return 'contemporary';
}

function estimateRetail(category, attributes) {
  const hasLuxuryFabrics = attributes.fabrics.some(f => 
    ['cashmere', 'silk'].includes(f.name)
  );
  
  if (hasLuxuryFabrics) {
    return category.name === 'jacket' ? '$2,000-$5,000' : '$500-$2,000';
  }
  
  return category.name === 'jacket' ? '$500-$1,500' : '$200-$800';
}

function generateQualityMarkers(attributes) {
  const markers = [];
  
  if (attributes.fabrics.some(f => f.name === 'cashmere')) {
    markers.push('premium cashmere construction');
  }
  
  if (attributes.fabrics.some(f => f.name === 'silk')) {
    markers.push('silk lining or construction');
  }
  
  if (attributes.styles.some(s => s.name === 'tailored')) {
    markers.push('tailored construction');
  }
  
  return markers.length > 0 ? markers : ['quality construction'];
}

function generateLuxuryMarkers(category, attributes) {
  const markers = [];
  
  if (category.name === 'jacket') {
    markers.push('structured shoulders', 'functional buttonholes');
  }
  
  if (attributes.fabrics.length > 0) {
    markers.push(`premium ${attributes.fabrics[0].name} fabric`);
  }
  
  return markers.length > 0 ? markers : ['quality materials'];
}

function generateHandworkDetails(attributes) {
  if (attributes.details?.construction) {
    return attributes.details.construction;
  }
  return 'machine construction with quality finishing';
}

function getLuxuryAnalysisPrompt(type) {
  if (type === 'inspiration') {
    return `Analyze this fashion inspiration image with expert detail. Identify the main garment types, colors, fabrics, and styling. Focus on what makes this look appealing and how it could be recreated. Provide a JSON response with: {"type": "garment type", "colors": ["color1", "color2"], "style": "overall style description", "key_pieces": ["piece1", "piece2"], "occasion": "when to wear this"}`;
  }
  
  // Default wardrobe analysis
  return `Analyze this luxury fashion item with expert-level detail. Identify the garment type, construction quality, fabric details, and any brand indicators. Focus on: garment category, fabric type and quality, construction details, color analysis, and overall quality assessment. Provide detailed analysis in JSON format.`;
}

function parseTextAnalysis(text, type) {
  // Fallback parser for non-JSON responses
  return {
    type: extractType(text),
    brand: extractBrand(text),
    tier: extractTier(text),
    summary: text.substring(0, 200) + '...',
    error: null
  };
}

function extractType(text) {
  const types = ['blazer', 'jacket', 'shirt', 'dress', 'pants', 'shoes', 'bag'];
  for (const type of types) {
    if (text.toLowerCase().includes(type)) {
      return type;
    }
  }
  return 'unknown';
}

function extractBrand(text) {
  const brands = ['kiton', 'brioni', 'armani', 'gucci', 'prada'];
  for (const brand of brands) {
    if (text.toLowerCase().includes(brand)) {
      return brand;
    }
  }
  return 'unknown';
}

function extractTier(text) {
  if (text.toLowerCase().includes('luxury') || text.toLowerCase().includes('haute')) {
    return 'luxury';
  }
  if (text.toLowerCase().includes('premium')) {
    return 'premium';
  }
  return 'contemporary';
}

function base64ToFile(base64String, filename, mimeType) {
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