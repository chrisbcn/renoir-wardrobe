/**
 * Unified Wardrobe Analyzer
 * Consolidates all analysis methods into a single, mobile-first interface
 */

import { EnhancedImageAnalyzer } from './enhanced-image-analyzer.js';
import { ReceiptAnalyzer } from './receipt-analyzer.js';
import { MultiItemDetector } from './multi-item-detector.js';
import { ImageStandardizer } from '../standardization/image-standardizer.js';

export class UnifiedWardrobeAnalyzer {
  constructor() {
    this.enhancedImageAnalyzer = new EnhancedImageAnalyzer();
    this.receiptAnalyzer = new ReceiptAnalyzer();
    this.multiItemDetector = new MultiItemDetector();
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
    
    // First detect all items in the outfit
    const detectedItems = await this.multiItemDetector.detectClothingItems(imageData);
    
    if (!detectedItems || detectedItems.length === 0) {
      throw new Error('No clothing items detected in outfit image');
    }

    console.log(`🔍 Found ${detectedItems.length} items, analyzing each...`);
    
    const analyzedItems = [];
    
    // Analyze each detected item individually
    for (let i = 0; i < detectedItems.length; i++) {
      const detectedItem = detectedItems[i];
      console.log(`🔬 Analyzing item ${i + 1}/${detectedItems.length}: ${detectedItem.item_type}`);
      
      try {
        // Extract the item from the original image using bounding box
        const itemImage = await this.extractItemFromImage(imageData, detectedItem);
        
        // Analyze the extracted item
        const analysis = await this.enhancedImageAnalyzer.getLuxuryAnalysis(itemImage);
        
        if (analysis.success) {
          // Generate standardized image
          const standardizedImage = await this.imageStandardizer.generateStandardImage(analysis);
          
          const item = this.formatAnalysisResult(analysis, standardizedImage, 'outfit_image', {
            originalDetection: detectedItem,
            itemIndex: i
          });
          
          analyzedItems.push(item);
        } else {
          console.warn(`⚠️ Failed to analyze item ${i + 1}: ${detectedItem.item_type}`);
        }
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
}
