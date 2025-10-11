/**
 * Unified Wardrobe Analyzer
 * Consolidates all analysis methods into a single, mobile-first interface
 */

import enhancedImageAnalyzer from './enhanced-image-analyzer.js';
import receiptAnalyzer from './receipt-analyzer.js';
import enhancedDetailedAnalyzer from './enhanced-detailed-analyzer.js';
import { ImageStandardizer } from '../standardization/image-standardizer.js';

export class UnifiedWardrobeAnalyzer {
  constructor() {
    this.enhancedImageAnalyzer = enhancedImageAnalyzer;
    this.receiptAnalyzer = receiptAnalyzer;
    this.enhancedDetailedAnalyzer = enhancedDetailedAnalyzer;
    this.imageStandardizer = new ImageStandardizer();
  }

  /**
   * Main entry point - detects input type and routes to appropriate analyzer
   * @param {Object} input - The input data
   * @param {string} input.type - 'single_image', 'outfit_image', 'receipt_image', 'receipt_text', 'social_media'
   * @param {*} input.data - The actual data (base64, text, etc.)
   * @param {Object} options - Analysis options
   * @returns {Promise<Object>} Unified analysis result
   */
  async analyzeInput(input, options = {}) {
    const { type, data } = input;
    
    console.log(`🔍 Unified Analyzer: Processing ${type} input`);
    
    try {
      switch (type) {
        case 'single_image':
          return await this.processSingleImage(data, options);
        case 'outfit_image':
          return await this.processOutfitImage(data, options);
        case 'receipt_image':
          return await this.processReceiptImage(data, options);
        case 'receipt_text':
          return await this.processReceiptText(data, options);
        case 'social_media':
          return await this.processSocialMedia(data, options);
        default:
          throw new Error(`Unsupported input type: ${type}`);
      }
    } catch (error) {
      console.error(`❌ Unified Analyzer Error (${type}):`, error);
      throw new Error(`Analysis failed for ${type}: ${error.message}`);
    }
  }

  /**
   * Process single wardrobe item image
   */
  async processSingleImage(imageData, options = {}) {
    console.log('📸 Processing single image...');
    
    const analysis = await this.enhancedImageAnalyzer.getLuxuryAnalysis(imageData);
    
    if (!analysis.success) {
      throw new Error('Single image analysis failed');
    }

    // Generate standardized image
    const standardizedImage = await this.imageStandardizer.generateStandardImage(analysis);
    
    const item = this.formatAnalysisResult(analysis, standardizedImage, 'single_image');
    
    return {
      success: true,
      items: [item],
      source: 'single_image',
      processingTime: Date.now() - (options.startTime || Date.now())
    };
  }

  /**
   * Process outfit image with multiple items
   */
  async processOutfitImage(imageData, options = {}) {
    console.log('👗 Processing outfit image...');
    
    try {
      // Use the existing multi-item detection logic
      const detectedItems = await this.detectClothingItems(imageData);
      
      if (!detectedItems || detectedItems.length === 0) {
        throw new Error('No clothing items detected in outfit image');
      }

      console.log(`🔍 Found ${detectedItems.length} items, analyzing each...`);
      
      const analyzedItems = [];
      
      // Analyze each detected item
      for (let i = 0; i < detectedItems.length; i++) {
        const detectedItem = detectedItems[i];
        console.log(`🔬 Analyzing item ${i + 1}/${detectedItems.length}: ${detectedItem.item_type}`);
        
        try {
          const detailedAnalysis = await this.analyzeIndividualItem(detectedItem, imageData);
          
          // Generate standardized image
          const standardizedImage = await this.imageStandardizer.generateStandardImage(detailedAnalysis);
          
          const item = this.formatMultiItemResult(detailedAnalysis, standardizedImage, detectedItem, i);
          analyzedItems.push(item);
        } catch (error) {
          console.warn(`⚠️ Error analyzing item ${i + 1}:`, error.message);
        }
      }

      return {
        success: true,
        items: analyzedItems,
        source: 'outfit_image',
        totalDetected: detectedItems.length,
        successfullyAnalyzed: analyzedItems.length,
        processingTime: Date.now() - (options.startTime || Date.now())
      };
    } catch (error) {
      console.error('❌ Outfit processing failed:', error);
      throw new Error(`Failed to process outfit image: ${error.message}`);
    }
  }

  /**
   * Process receipt image
   */
  async processReceiptImage(imageData, options = {}) {
    console.log('🧾 Processing receipt image...');
    
    const analysis = await this.receiptAnalyzer.analyzeReceipt(imageData);
    
    if (!analysis.success) {
      throw new Error('Receipt analysis failed');
    }

    // Generate items from receipt data
    const items = [];
    
    for (const itemData of analysis.items) {
      try {
        // Generate standardized image based on description
        const standardizedImage = await this.imageStandardizer.generateFromDescription(itemData);
        
        const item = this.formatReceiptResult(itemData, standardizedImage);
        items.push(item);
      } catch (error) {
        console.warn(`⚠️ Failed to generate item from receipt:`, error.message);
      }
    }

    return {
      success: true,
      items: items,
      source: 'receipt_image',
      receiptData: analysis.receiptData,
      processingTime: Date.now() - (options.startTime || Date.now())
    };
  }

  /**
   * Process receipt text
   */
  async processReceiptText(receiptText, options = {}) {
    console.log('📝 Processing receipt text...');
    
    const analysis = await this.receiptAnalyzer.analyzeReceiptText(receiptText);
    
    if (!analysis.success) {
      throw new Error('Receipt text analysis failed');
    }

    // Generate items from receipt data
    const items = [];
    
    for (const itemData of analysis.items) {
      try {
        // Generate standardized image based on description
        const standardizedImage = await this.imageStandardizer.generateFromDescription(itemData);
        
        const item = this.formatReceiptResult(itemData, standardizedImage);
        items.push(item);
      } catch (error) {
        console.warn(`⚠️ Failed to generate item from receipt text:`, error.message);
      }
    }

    return {
      success: true,
      items: items,
      source: 'receipt_text',
      receiptData: analysis.receiptData,
      processingTime: Date.now() - (options.startTime || Date.now())
    };
  }

  /**
   * Process social media data
   */
  async processSocialMedia(socialData, options = {}) {
    console.log('📱 Processing social media data...');
    
    const { platform, images } = socialData;
    
    if (!images || images.length === 0) {
      throw new Error('No images found in social media data');
    }

    const allItems = [];
    
    for (const imageData of images) {
      try {
        // Process each social media image as either single or outfit
        const result = await this.analyzeInput({
          type: imageData.isOutfit ? 'outfit_image' : 'single_image',
          data: imageData.data
        }, options);
        
        // Add social media metadata to each item
        result.items.forEach(item => {
          item.metadata.socialMedia = {
            platform: platform,
            originalPost: imageData.originalPost,
            extractedAt: new Date().toISOString()
          };
        });
        
        allItems.push(...result.items);
      } catch (error) {
        console.warn(`⚠️ Failed to process social media image:`, error.message);
      }
    }

    return {
      success: true,
      items: allItems,
      source: 'social_media',
      platform: platform,
      totalImages: images.length,
      processingTime: Date.now() - (options.startTime || Date.now())
    };
  }

  /**
   * Extract individual item from outfit image using bounding box
   */
  async extractItemFromImage(imageData, detectedItem) {
    // This would use canvas or image processing to crop the item
    // For now, we'll return the full image and let the analyzer handle it
    // TODO: Implement proper image cropping based on bounding box
    return imageData;
  }

  /**
   * Format analysis result into unified structure
   */
  formatAnalysisResult(analysis, standardizedImage, source, metadata = {}) {
    return {
      id: this.generateId(),
      name: analysis.summary || 'Fashion Item',
      category: analysis.category || 'unknown',
      colors: analysis.colors || [],
      fabrics: analysis.fabrics || [],
      patterns: analysis.patterns || [],
      styles: analysis.styles || [],
      brand: analysis.brand || 'Unknown',
      confidence: analysis.confidence || 0.5,
      needsReview: (analysis.confidence || 0.5) < 0.7,
      details: analysis.detailedAnalysis || '',
      embellishments: analysis.embellishments || [],
      hasSequins: analysis.embellishments?.some(e => e.toLowerCase().includes('sequin')) || false,
      hasBeadwork: analysis.embellishments?.some(e => e.toLowerCase().includes('bead')) || false,
      hasEmbroidery: analysis.embellishments?.some(e => e.toLowerCase().includes('embroidery')) || false,
      hasMetallic: analysis.embellishments?.some(e => e.toLowerCase().includes('metallic')) || false,
      source: source,
      brandTier: analysis.qualityTier || 'unknown',
      priceRange: analysis.priceRange || 'Unknown',
      originalImage: analysis.originalImage || null,
      standardizedImage: standardizedImage,
      metadata: {
        processedAt: new Date().toISOString(),
        analyzerVersion: '1.0.0',
        source: source,
        ...metadata
      }
    };
  }

  /**
   * Format receipt result into unified structure
   */
  formatReceiptResult(itemData, standardizedImage) {
    return {
      id: this.generateId(),
      name: itemData.name || 'Fashion Item',
      category: itemData.category || 'unknown',
      colors: itemData.colors || [],
      fabrics: itemData.fabrics || [],
      patterns: itemData.patterns || [],
      styles: itemData.styles || [],
      brand: itemData.brand || 'Unknown',
      confidence: itemData.confidence || 0.8,
      needsReview: false,
      details: itemData.description || '',
      embellishments: itemData.embellishments || [],
      hasSequins: false,
      hasBeadwork: false,
      hasEmbroidery: false,
      hasMetallic: false,
      source: 'receipt',
      brandTier: itemData.brandTier || 'unknown',
      priceRange: itemData.priceRange || 'Unknown',
      originalImage: null,
      standardizedImage: standardizedImage,
      metadata: {
        processedAt: new Date().toISOString(),
        analyzerVersion: '1.0.0',
        source: 'receipt',
        receiptData: itemData.receiptData
      }
    };
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Detect clothing items in an outfit image (copied from multi-item-upload.js)
   */
  async detectClothingItems(base64Image, mimeType = 'image/jpeg') {
    const prompt = `Analyze this image and detect ALL individual clothing items with EXTREME attention to detail and decorative elements. For each item found, provide:

1. Item type (shirt, pants, dress, jacket, shoes, accessories, etc.)
2. Approximate bounding box coordinates (as percentages of image dimensions)
3. Confidence level (0-1)
4. HIGHLY DETAILED visual description including ALL decorative elements, textures, patterns, and construction details

DETAILED ANALYSIS REQUIREMENTS:
For each clothing item, provide an extremely detailed description that includes:

CONSTRUCTION & FIT:
- Specific cut and silhouette (tailored, relaxed, fitted, oversized, cropped, etc.)
- Neckline type (crew neck, V-neck, scoop neck, turtleneck, etc.)
- Sleeve details (long sleeves, short sleeves, sleeveless, French cuffs, etc.)
- Length and proportions (crop length, full length, high-waisted, etc.)
- Closure details (buttons, zippers, ties, etc.)

FABRIC & TEXTURE:
- Fabric type and weight (wool, cotton, silk, cashmere, denim, etc.)
- Texture details (cable knit, ribbed, smooth, textured, etc.)
- Pattern specifics (stripes, checks, floral, geometric, etc.)
- Finish and drape (matte, shiny, structured, flowing, etc.)

COLOR & PATTERN ANALYSIS:
- Exact color descriptions (navy blue, charcoal grey, ecru, etc.)
- Pattern details (pinstripes, wide stripes, subtle texture, etc.)
- Color variations and undertones
- Pattern scale and repeat

EMBELLISHMENTS & DECORATIVE ELEMENTS (HIGH PRIORITY):
- Sequins, beads, pearls, crystals, rhinestones, studs, spangles, paillettes
- Embroidery, decorative stitching, appliqué, patches, hand-stitched details
- Metallic elements, shiny surfaces, reflective materials, foil, lamé
- Ruffles, pleats, fringe, tassels, bows, ribbons, fabric flowers
- Hardware details, buttons, zippers, buckles, clasps, rivets, grommets
- Surface treatments, textures, embossed, perforated, laser-cut details

SPECIFIC TERMINOLOGY:
Use precise fashion terminology like:
- "Aran" for cable knit textures
- "French cuffs" for sleeve details
- "cable knit" for patterns
- "ribbed collar", "notch lapels", "peak lapels"
- "wide leg", "straight leg", "tailored", "relaxed fit"
- "heavy gauge", "intricate cable knit patterns"
- "French seams", "flat-fell seams", "pinked seams"
- "pick stitching", "topstitching", "understitching"

Focus on detecting SEPARATE clothing items - if someone is wearing a full outfit, identify each piece individually.

Respond with a JSON array in this exact format:
[
  {
    "item_type": "vest",
    "bounding_box": {
      "x_percent": 15,
      "y_percent": 10,
      "width_percent": 35,
      "height_percent": 45
    },
    "confidence": 0.92,
    "visual_description": "Dark navy blue sleeveless V-neck vest with subtle vertical pinstripes, tailored fit, welt pockets, five-button front closure, fine-gauge knit fabric with textured stripe pattern, structured silhouette, worn over white collared shirt"
  }
]

IMPORTANT: Be extremely detailed and specific in your descriptions. Include every visible detail that would help recreate the item accurately. Respond ONLY with valid JSON.`;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType,
                  data: base64Image
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
      throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.content[0].text;
    
    // Parse the JSON response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in Claude response');
    }

    const detectedItems = JSON.parse(jsonMatch[0]);
    return detectedItems;
  }

  /**
   * Analyze individual item in detail (copied from multi-item-upload.js)
   */
  async analyzeIndividualItem(detectedItem, base64Image, mimeType = 'image/jpeg') {
    const analysisPrompt = `Analyze this clothing item in extreme detail: ${detectedItem.item_type}

Description: ${detectedItem.visual_description}

Provide a comprehensive analysis with specific terminology and detailed descriptions. Focus on:

1. CONSTRUCTION & FIT: tailored, relaxed, fitted, oversized, cropped, structured, flowing
2. FABRIC & TEXTURE: smooth, ribbed, textured, cable knit, basketweave, slub-knit, matte, shiny
3. PATTERN & DETAILS: pinstripes, stripes, texture, geometric patterns, decorative elements
4. EMBELLISHMENTS: sequins, beads, embroidery, metallic details, hardware, surface treatments
5. SILHOUETTE: A-line, fitted, boxy, structured, flowing, proportions, length details

Use specific fashion terminology like:
- "Double-breasted wool blazer with notch lapels"
- "Fine-gauge wool knit with cable texture"
- "Tailored fit with French seams and pick stitching"
- "Structured silhouette with welt pockets"

Respond with JSON:
{
  "color": "specific color name",
  "fabric": "detailed fabric description",
  "pattern": "pattern details",
  "style": "detailed style description",
  "construction": "construction details",
  "texture": "texture specifics",
  "fit": "fit characteristics",
  "silhouette": "silhouette details",
  "embellishments": {
    "metallic_elements": [],
    "beadwork": [],
    "embroidery": [],
    "textural": [],
    "hardware": [],
    "surface_treatments": []
  },
  "formality_level": "casual/smart casual/business formal/black-tie",
  "season": ["seasons"],
  "price_range": "price range",
  "brand_tier": "contemporary/premium/luxury/ultra-luxury"
}`;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType,
                  data: base64Image
                }
              },
              {
                type: 'text',
                text: analysisPrompt
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.content[0].text;
    
    // Parse the JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in Claude response');
    }

    const analysis = JSON.parse(jsonMatch[0]);
    return analysis;
  }

  /**
   * Format multi-item result (adapted from multi-item-upload.js)
   */
  formatMultiItemResult(detailedAnalysis, standardizedImage, detectedItem, index) {
    return {
      id: this.generateId(),
      name: `${detailedAnalysis.color} ${detectedItem.item_type}`,
      category: detectedItem.item_type,
      colors: [detailedAnalysis.color],
      fabrics: [detailedAnalysis.fabric],
      patterns: detailedAnalysis.pattern ? [detailedAnalysis.pattern] : [],
      styles: [detailedAnalysis.style],
      brand: 'Unknown',
      confidence: detectedItem.confidence,
      needsReview: detectedItem.confidence < 0.7,
      details: this.buildDetailedDescription(detailedAnalysis, detectedItem.item_type),
      embellishments: this.extractEmbellishments(detailedAnalysis.embellishments),
      hasSequins: detailedAnalysis.embellishments?.beadwork?.length > 0 || false,
      hasBeadwork: detailedAnalysis.embellishments?.beadwork?.length > 0 || false,
      hasEmbroidery: detailedAnalysis.embellishments?.embroidery?.length > 0 || false,
      hasMetallic: detailedAnalysis.embellishments?.metallic_elements?.length > 0 || false,
      source: 'outfit_image',
      brandTier: detailedAnalysis.brand_tier || 'unknown',
      priceRange: detailedAnalysis.price_range || 'Unknown',
      originalImage: null,
      standardizedImage: standardizedImage,
      metadata: {
        processedAt: new Date().toISOString(),
        analyzerVersion: '1.0.0',
        source: 'outfit_image',
        originalDetection: detectedItem,
        itemIndex: index
      }
    };
  }

  /**
   * Build detailed description (copied from multi-item-upload.js)
   */
  buildDetailedDescription(analysis, itemType) {
    const parts = [];

    if (analysis.style && analysis.style !== itemType && analysis.style !== 'Unknown') {
      parts.push(analysis.style);
    } else {
      parts.push(itemType);
    }

    if (analysis.fabric && analysis.fabric !== 'Unknown') {
      parts.push(`in ${analysis.fabric}`);
    }

    if (analysis.construction && analysis.construction !== 'Unknown') {
      parts.push(analysis.construction);
    }

    if (analysis.texture && analysis.texture !== 'Unknown') {
      parts.push(analysis.texture);
    }

    if (analysis.fit && analysis.fit !== 'Unknown') {
      parts.push(analysis.fit);
    }

    if (analysis.silhouette && analysis.silhouette !== 'Unknown') {
      parts.push(analysis.silhouette);
    }

    if (analysis.pattern && analysis.pattern !== 'solid' && analysis.pattern !== 'Unknown') {
      parts.push(`with ${analysis.pattern} pattern`);
    }

    if (analysis.embellishments) {
      const embellishmentTypes = [];
      if (analysis.embellishments.metallic_elements?.length > 0) {
        embellishmentTypes.push('metallic details');
      }
      if (analysis.embellishments.beadwork?.length > 0) {
        embellishmentTypes.push('beadwork');
      }
      if (analysis.embellishments.embroidery?.length > 0) {
        embellishmentTypes.push('embroidery');
      }
      if (analysis.embellishments.textural?.length > 0) {
        embellishmentTypes.push('textural embellishments');
      }
      if (embellishmentTypes.length > 0) {
        parts.push(`featuring ${embellishmentTypes.join(', ')}`);
      }
    }

    return parts.join(' ').trim();
  }

  /**
   * Extract embellishments from analysis
   */
  extractEmbellishments(embellishments) {
    if (!embellishments) return [];
    
    const result = [];
    if (embellishments.metallic_elements?.length > 0) {
      result.push(...embellishments.metallic_elements);
    }
    if (embellishments.beadwork?.length > 0) {
      result.push(...embellishments.beadwork);
    }
    if (embellishments.embroidery?.length > 0) {
      result.push(...embellishments.embroidery);
    }
    if (embellishments.textural?.length > 0) {
      result.push(...embellishments.textural);
    }
    if (embellishments.hardware?.length > 0) {
      result.push(...embellishments.hardware);
    }
    if (embellishments.surface_treatments?.length > 0) {
      result.push(...embellishments.surface_treatments);
    }
    
    return result;
  }
}
