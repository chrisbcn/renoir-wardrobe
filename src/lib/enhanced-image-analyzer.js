// src/lib/enhanced-image-analyzer.js
// FIXED VERSION: Combines your detailed luxury prompts with Fashionpedia validation

class EnhancedImageAnalyzer {
  constructor() {
    // Your original detailed luxury fashion analysis prompt:
    this.luxuryAnalysisPrompt = `Analyze this luxury fashion item with expert-level detail. Provide comprehensive analysis covering:

BASIC IDENTIFICATION:
- Item name (be specific: "Double-breasted wool blazer" not just "jacket")
- Brand (if visible/recognizable)
- Category and subcategory

DETAILED CONSTRUCTION & MATERIALS:
- Primary fabric composition and quality indicators
- Construction techniques (hand-stitched, machine-sewn, bonded, etc.)
- Hardware details (buttons, zippers, buckles - material and finish)
- Lining type and quality
- Seaming and finishing techniques

DESIGN & STYLING:
- Silhouette and fit characteristics
- Color analysis (exact shade, undertones, finish)
- Pattern details (if applicable - type, scale, repeat)
- Unique design elements or signatures
- Seasonal appropriateness

LUXURY INDICATORS:
- Quality tier assessment (ultra-luxury, luxury, premium, contemporary)
- Craftsmanship quality indicators
- Materials luxury level
- Design sophistication
- Brand positioning indicators

STYLING CONTEXT:
- Formality level (black-tie, business formal, smart casual, etc.)
- Versatility rating
- Key styling opportunities
- Wardrobe compatibility
- Investment piece assessment

MARKET CONTEXT:
- Estimated price range based on visible quality
- Target demographic
- Occasion appropriateness
- Seasonality

Provide detailed, specific observations rather than generic descriptions. Focus on elements that matter to luxury consumers and professional stylists.`;

    // Fashionpedia knowledge for validation and enhancement
    this.fashionpediaCategories = {
      'shirt': { name: 'shirt', confidence: 0.9 },
      'blouse': { name: 'shirt', confidence: 0.85 },
      'dress': { name: 'dress', confidence: 0.9 },
      'jumpsuit': { name: 'jumpsuit', confidence: 0.85 },
      'top': { name: 'top', confidence: 0.8 },
      'sweater': { name: 'sweater', confidence: 0.9 },
      'cardigan': { name: 'sweater', confidence: 0.85 },
      'jacket': { name: 'jacket', confidence: 0.9 },
      'blazer': { name: 'jacket', confidence: 0.85 },
      'coat': { name: 'coat', confidence: 0.9 },
      'vest': { name: 'vest', confidence: 0.8 },
      'pants': { name: 'pants', confidence: 0.9 },
      'jeans': { name: 'pants', confidence: 0.85 },
      'shorts': { name: 'shorts', confidence: 0.9 },
      'skirt': { name: 'skirt', confidence: 0.9 }
    };

    this.fashionpediaAttributes = {
      colors: ['black', 'white', 'navy', 'gray', 'brown', 'beige', 'red', 'pink', 'blue', 'green', 'yellow', 'purple', 'orange', 'silver', 'gold'],
      fabrics: ['cotton', 'wool', 'silk', 'linen', 'cashmere', 'leather', 'denim', 'polyester', 'nylon', 'rayon', 'viscose', 'bamboo', 'modal'],
      patterns: ['solid', 'striped', 'plaid', 'floral', 'geometric', 'animal print', 'polka dot', 'paisley', 'abstract'],
      fits: ['loose', 'regular', 'slim', 'tight', 'oversized', 'tailored', 'relaxed', 'fitted']
    };
  }

  async analyzeImage(imageData, analysisType = 'wardrobe') {
    try {
      console.log(`Starting enhanced luxury analysis for type: ${analysisType}`);

      // Step 1: Get detailed luxury analysis using your original prompt
      const luxuryAnalysis = await this.getLuxuryAnalysis(imageData);

      // Step 2: Enhance with Fashionpedia structure and validation
      const enhancedResult = await this.enhanceWithFashionpedia(luxuryAnalysis);

      // Step 3: Generate optimized search terms
      const searchTerms = this.generateSearchTerms(enhancedResult);

      const result = {
        ...enhancedResult,
        searchTerms,
        analysisType,
        confidence: enhancedResult.confidence || 0.85,
        needsReview: enhancedResult.confidence < 0.8,
        timestamp: new Date().toISOString()
      };

      console.log('Enhanced luxury analysis complete:', result);
      return result;

    } catch (error) {
      console.error('Enhanced luxury analysis error:', error);
      return {
        success: false,
        error: error.message,
        confidence: 0,
        needsReview: true
      };
    }
  }

  async getLuxuryAnalysis(imageData) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY || process.env.REACT_APP_CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: imageData.split(',')[1]
                }
              },
              {
                type: 'text',
                text: this.luxuryAnalysisPrompt
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }

  async enhanceWithFashionpedia(luxuryAnalysisText) {
    // Extract structured data from the luxury analysis
    const structured = this.parseAnalysisText(luxuryAnalysisText);

    // Validate and enhance with Fashionpedia categories
    const category = this.validateCategory(structured.category);
    const colors = this.extractColors(luxuryAnalysisText);
    const fabrics = this.extractFabrics(luxuryAnalysisText);
    const patterns = this.extractPatterns(luxuryAnalysisText);

    // Calculate confidence based on detailed analysis quality
    const confidence = this.calculateConfidence(luxuryAnalysisText, structured);

    const qualityTier = this.extractQualityTier(luxuryAnalysisText);
    const priceRange = this.extractPriceRange(luxuryAnalysisText);
    const formalityLevel = this.extractFormalityLevel(luxuryAnalysisText);
    const seasonality = this.extractSeasonality(luxuryAnalysisText);
    const luxuryIndicators = this.extractLuxuryIndicators(luxuryAnalysisText);
    const stylingContext = this.extractStylingContext(luxuryAnalysisText);
    const investmentAssessment = this.extractInvestmentAssessment(luxuryAnalysisText);

    // Generate concise summary
    const summary = this.generateSummary({
      category: category.name,
      colors,
      fabrics,
      qualityTier,
      priceRange,
      formalityLevel,
      luxuryIndicators,
      confidence
    });

    return {
      success: true,
      
      // Concise summary for quick reference
      summary,
      
      // Keep your original detailed analysis
      detailedAnalysis: luxuryAnalysisText,
      
      // Add structured Fashionpedia data
      category: category.name,
      categoryConfidence: category.confidence,
      colors,
      fabrics,
      patterns,
      
      // Extract key luxury indicators
      qualityTier,
      priceRange,
      formalityLevel,
      seasonality,
      
      confidence,
      
      // Luxury-specific analysis
      luxuryIndicators,
      stylingContext,
      investmentAssessment
    };
  }

  parseAnalysisText(text) {
    // Extract item name and category from the detailed analysis
    const itemNameMatch = text.match(/Item name[:\-]\s*([^\n]+)/i);
    const categoryMatch = text.match(/Category[:\-]\s*([^\n]+)/i);
    
    return {
      itemName: itemNameMatch ? itemNameMatch[1].trim() : '',
      category: categoryMatch ? categoryMatch[1].toLowerCase() : ''
    };
  }

  validateCategory(categoryText) {
    // Check against Fashionpedia categories
    for (const [key, value] of Object.entries(this.fashionpediaCategories)) {
      if (categoryText.includes(key)) {
        return value;
      }
    }
    return { name: 'unknown', confidence: 0.5 };
  }

  extractColors(text) {
    const foundColors = [];
    this.fashionpediaAttributes.colors.forEach(color => {
      if (text.toLowerCase().includes(color)) {
        foundColors.push(color);
      }
    });
    return foundColors;
  }

  extractFabrics(text) {
    const foundFabrics = [];
    this.fashionpediaAttributes.fabrics.forEach(fabric => {
      if (text.toLowerCase().includes(fabric)) {
        foundFabrics.push(fabric);
      }
    });
    return foundFabrics;
  }

  extractPatterns(text) {
    const foundPatterns = [];
    this.fashionpediaAttributes.patterns.forEach(pattern => {
      if (text.toLowerCase().includes(pattern)) {
        foundPatterns.push(pattern);
      }
    });
    return foundPatterns;
  }

  extractQualityTier(text) {
    if (text.toLowerCase().includes('ultra-luxury')) return 'ultra-luxury';
    if (text.toLowerCase().includes('luxury')) return 'luxury';
    if (text.toLowerCase().includes('premium')) return 'premium';
    if (text.toLowerCase().includes('contemporary')) return 'contemporary';
    return 'unknown';
  }

  extractPriceRange(text) {
    const priceMatch = text.match(/\$[\d,]+/g);
    if (priceMatch) {
      return priceMatch[0];
    }
    
    // Look for price range indicators
    if (text.includes('ultra-luxury')) return '$2000+';
    if (text.includes('luxury')) return '$500-2000';
    if (text.includes('premium')) return '$200-500';
    return 'unknown';
  }

  extractFormalityLevel(text) {
    if (text.includes('black-tie')) return 'black-tie';
    if (text.includes('business formal')) return 'business formal';
    if (text.includes('smart casual')) return 'smart casual';
    if (text.includes('casual')) return 'casual';
    return 'unknown';
  }

  extractSeasonality(text) {
    const seasons = ['spring', 'summer', 'fall', 'winter'];
    const foundSeasons = seasons.filter(season => 
      text.toLowerCase().includes(season)
    );
    return foundSeasons.length > 0 ? foundSeasons : ['year-round'];
  }

  extractLuxuryIndicators(text) {
    const indicators = [];
    if (text.includes('hand-stitched')) indicators.push('hand-stitched');
    if (text.includes('hand-sewn')) indicators.push('hand-sewn');
    if (text.includes('Italian')) indicators.push('Italian craftsmanship');
    if (text.includes('French')) indicators.push('French craftsmanship');
    if (text.includes('cashmere')) indicators.push('luxury materials');
    if (text.includes('silk')) indicators.push('luxury materials');
    return indicators;
  }

  extractStylingContext(text) {
    // Extract styling opportunities and versatility info
    const stylingMatch = text.match(/STYLING CONTEXT:(.*?)(?=\n\n|\n[A-Z]|$)/s);
    return stylingMatch ? stylingMatch[1].trim() : '';
  }

  extractInvestmentAssessment(text) {
    // Extract investment piece assessment
    const investmentMatch = text.match(/Investment piece assessment[:\-]\s*([^\n]+)/i);
    return investmentMatch ? investmentMatch[1].trim() : '';
  }

  calculateConfidence(analysisText, structured) {
    let confidence = 0.7; // Base confidence
    
    // Increase confidence based on detail level
    if (analysisText.length > 1000) confidence += 0.1;
    if (structured.itemName) confidence += 0.05;
    if (structured.category) confidence += 0.05;
    if (analysisText.includes('fabric')) confidence += 0.05;
    if (analysisText.includes('construction')) confidence += 0.05;
    
    return Math.min(confidence, 0.95);
  }

  generateSummary(data) {
    const { category, colors, fabrics, qualityTier, priceRange, formalityLevel, luxuryIndicators, confidence } = data;
    
    // Build concise summary
    let summary = '';
    
    // Category and materials
    if (category && category !== 'unknown') {
      summary += `${category.charAt(0).toUpperCase() + category.slice(1)}`;
      
      if (colors.length > 0) {
        summary += ` in ${colors.join(' and ')}`;
      }
      
      if (fabrics.length > 0) {
        summary += ` ${fabrics.join(' and ')}`;
      }
    }
    
    // Quality and price
    if (qualityTier && qualityTier !== 'unknown') {
      summary += `. ${qualityTier.charAt(0).toUpperCase() + qualityTier.slice(1)} quality`;
    }
    
    if (priceRange && priceRange !== 'unknown') {
      summary += ` (${priceRange})`;
    }
    
    // Formality
    if (formalityLevel && formalityLevel !== 'unknown') {
      summary += `. Suitable for ${formalityLevel}`;
    }
    
    // Key luxury features
    if (luxuryIndicators.length > 0) {
      summary += `. Features: ${luxuryIndicators.slice(0, 3).join(', ')}`;
    }
    
    // Confidence indicator
    const confidenceLevel = confidence >= 0.9 ? 'High confidence' : 
                           confidence >= 0.7 ? 'Good confidence' : 'Low confidence';
    summary += `. (${confidenceLevel} analysis)`;
    
    return summary;
  }

  generateSearchTerms(result) {
    const terms = [];
    
    // Add category terms
    if (result.category && result.category !== 'unknown') {
      terms.push(result.category);
    }
    
    // Add color terms
    result.colors.forEach(color => {
      terms.push(color);
      if (result.category) {
        terms.push(`${color} ${result.category}`);
      }
    });
    
    // Add fabric terms
    result.fabrics.forEach(fabric => {
      terms.push(fabric);
      if (result.category) {
        terms.push(`${fabric} ${result.category}`);
      }
    });
    
    // Add luxury terms
    if (result.qualityTier !== 'unknown') {
      terms.push(result.qualityTier);
    }
    
    return [...new Set(terms)]; // Remove duplicates
  }
}

export default new EnhancedImageAnalyzer();