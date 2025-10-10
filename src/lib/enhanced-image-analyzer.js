// src/lib/enhanced-image-analyzer.js
// FIXED VERSION: Correct API key reference and enhanced luxury analysis

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

Provide detailed, specific observations rather than generic descriptions.`;

    // Fashionpedia categories for validation
    this.fashionpediaCategories = [
      'blazer', 'coat', 'jacket', 'vest', 'cardigan',
      'dress', 'skirt', 'pants', 'jeans', 'shorts',
      'shirt', 'blouse', 'top', 'sweater', 'hoodie',
      'suit', 'jumpsuit', 'romper', 'kimono'
    ];

    this.colors = [
      'black', 'white', 'gray', 'grey', 'navy', 'blue', 'red', 'pink',
      'green', 'yellow', 'orange', 'purple', 'brown', 'tan', 'beige',
      'cream', 'ivory', 'burgundy', 'maroon', 'teal', 'turquoise'
    ];

    this.fabrics = [
      'wool', 'cotton', 'silk', 'linen', 'cashmere', 'polyester',
      'nylon', 'rayon', 'viscose', 'spandex', 'leather', 'suede',
      'denim', 'tweed', 'velvet', 'corduroy', 'chiffon', 'satin'
    ];
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
    // FIXED: Use correct environment variable name
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey, // FIXED: Use the correct API key variable
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514', // FIXED: Use correct model name
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
                  data: imageData.includes(',') ? imageData.split(',')[1] : imageData
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
      const errorText = await response.text();
      console.error('Anthropic API error:', response.status, errorText);
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
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
      category: categoryMatch ? categoryMatch[1].trim() : ''
    };
  }

  validateCategory(categoryText) {
    if (!categoryText) return { name: 'unknown', confidence: 0 };
    
    const lowerText = categoryText.toLowerCase();
    
    // Direct match
    const directMatch = this.fashionpediaCategories.find(cat => 
      lowerText.includes(cat.toLowerCase())
    );
    
    if (directMatch) {
      return { name: directMatch, confidence: 0.9 };
    }

    // Fuzzy matching for common variations
    const categoryMappings = {
      'suit jacket': 'blazer',
      'sport coat': 'blazer',
      'sports jacket': 'blazer',
      'button-down': 'shirt',
      'polo': 'shirt',
      'tee': 'top',
      't-shirt': 'top',
      'pullover': 'sweater',
      'outerwear': 'jacket'
    };

    for (const [variation, category] of Object.entries(categoryMappings)) {
      if (lowerText.includes(variation)) {
        return { name: category, confidence: 0.7 };
      }
    }

    return { name: 'unknown', confidence: 0.1 };
  }

  extractColors(text) {
    const foundColors = [];
    const lowerText = text.toLowerCase();
    
    this.colors.forEach(color => {
      if (lowerText.includes(color.toLowerCase())) {
        foundColors.push(color);
      }
    });

    // Also look for color descriptions
    const colorPatterns = [
      /(\w+)\s+(?:blue|red|green|yellow|purple|orange|pink|brown)/gi,
      /(?:dark|light|deep|bright|pale|rich)\s+(\w+)/gi
    ];

    colorPatterns.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && !foundColors.includes(match[1])) {
          foundColors.push(match[1].toLowerCase());
        }
      }
    });

    return foundColors.length > 0 ? foundColors : ['unknown'];
  }

  extractFabrics(text) {
    const foundFabrics = [];
    const lowerText = text.toLowerCase();
    
    this.fabrics.forEach(fabric => {
      if (lowerText.includes(fabric.toLowerCase())) {
        foundFabrics.push(fabric);
      }
    });

    return foundFabrics.length > 0 ? foundFabrics : ['unknown'];
  }

  extractPatterns(text) {
    const patterns = ['solid', 'striped', 'checkered', 'plaid', 'polka dot', 'floral', 'geometric', 'abstract'];
    const lowerText = text.toLowerCase();
    
    const foundPatterns = patterns.filter(pattern => 
      lowerText.includes(pattern.toLowerCase())
    );

    return foundPatterns.length > 0 ? foundPatterns : ['solid'];
  }

  extractQualityTier(text) {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('ultra-luxury') || lowerText.includes('haute couture')) {
      return 'ultra-luxury';
    } else if (lowerText.includes('luxury')) {
      return 'luxury';
    } else if (lowerText.includes('premium')) {
      return 'premium';
    } else if (lowerText.includes('contemporary')) {
      return 'contemporary';
    }
    
    return 'unknown';
  }

  extractPriceRange(text) {
    // Look for price patterns
    const priceMatches = text.match(/\$[\d,]+(?:\s*-\s*\$[\d,]+)?/g);
    if (priceMatches && priceMatches.length > 0) {
      return priceMatches[0];
    }
    
    return 'Unknown';
  }

  extractFormalityLevel(text) {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('black-tie') || lowerText.includes('formal evening')) {
      return 'black-tie';
    } else if (lowerText.includes('business formal') || lowerText.includes('professional')) {
      return 'business formal';
    } else if (lowerText.includes('smart casual') || lowerText.includes('business casual')) {
      return 'smart casual';
    } else if (lowerText.includes('casual')) {
      return 'casual';
    }
    
    return 'versatile';
  }

  extractSeasonality(text) {
    const seasons = ['spring', 'summer', 'fall', 'autumn', 'winter'];
    const lowerText = text.toLowerCase();
    
    const foundSeasons = seasons.filter(season => 
      lowerText.includes(season)
    );

    return foundSeasons.length > 0 ? foundSeasons : ['all-season'];
  }

  extractLuxuryIndicators(text) {
    const indicators = [];
    const lowerText = text.toLowerCase();
    
    const luxuryTerms = [
      'hand-stitched', 'hand-sewn', 'handmade', 'bespoke', 'made-to-measure',
      'italian craftsmanship', 'french craftsmanship', 'luxury materials',
      'premium hardware', 'quality construction', 'fine details',
      'authentic', 'heritage', 'artisan', 'couture'
    ];

    luxuryTerms.forEach(term => {
      if (lowerText.includes(term)) {
        indicators.push(term);
      }
    });

    return indicators;
  }

  extractStylingContext(text) {
    // Extract styling advice and context
    const stylingMatches = text.match(/styling[^.]*\./gi);
    return stylingMatches || [];
  }

  extractInvestmentAssessment(text) {
    // Extract investment-related insights
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('investment piece') || lowerText.includes('timeless')) {
      return 'excellent investment';
    } else if (lowerText.includes('versatile') || lowerText.includes('wardrobe staple')) {
      return 'good investment';
    } else if (lowerText.includes('trendy') || lowerText.includes('seasonal')) {
      return 'limited investment';
    }
    
    return 'assess based on personal style';
  }

  calculateConfidence(analysisText, structuredData) {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence based on detail level
    if (analysisText.length > 500) confidence += 0.2;
    if (analysisText.length > 1000) confidence += 0.1;
    
    // Increase confidence based on specific details mentioned
    const detailTerms = ['construction', 'fabric', 'brand', 'quality', 'stitching'];
    const mentionedTerms = detailTerms.filter(term => 
      analysisText.toLowerCase().includes(term)
    );
    confidence += mentionedTerms.length * 0.05;
    
    // Cap at 0.95
    return Math.min(confidence, 0.95);
  }

  generateSummary({ category, colors, fabrics, qualityTier, priceRange, formalityLevel, luxuryIndicators, confidence }) {
    let summary = '';
    
    // Item description
    const colorStr = colors.length > 0 && colors[0] !== 'unknown' ? colors.slice(0, 2).join(' and ') : '';
    const fabricStr = fabrics.length > 0 && fabrics[0] !== 'unknown' ? fabrics.slice(0, 2).join(' and ') : '';
    
    if (category !== 'unknown') {
      summary = category.charAt(0).toUpperCase() + category.slice(1);
      if (colorStr) summary = `${colorStr} ${summary}`;
      if (fabricStr) summary += ` in ${fabricStr}`;
    } else {
      summary = 'Fashion item';
    }
    
    // Quality and price
    if (qualityTier !== 'unknown') {
      summary += `. ${qualityTier.charAt(0).toUpperCase() + qualityTier.slice(1)} quality`;
      if (priceRange && priceRange !== 'Unknown') {
        summary += ` (${priceRange})`;
      }
    }
    
    // Occasion appropriateness
    if (formalityLevel !== 'versatile') {
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
      if (color !== 'unknown') {
        terms.push(color);
        if (result.category && result.category !== 'unknown') {
          terms.push(`${color} ${result.category}`);
        }
      }
    });
    
    // Add fabric terms
    result.fabrics.forEach(fabric => {
      if (fabric !== 'unknown') {
        terms.push(fabric);
        if (result.category && result.category !== 'unknown') {
          terms.push(`${fabric} ${result.category}`);
        }
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