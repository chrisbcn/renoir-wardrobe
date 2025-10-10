// src/lib/enhanced-image-analyzer.js
// ENHANCED VERSION: Fashionpedia vocabulary integration for embellishment detection

import FashionpediaVocabulary from './fashionpedia-vocabulary.js';

class EnhancedImageAnalyzer {
  constructor() {
    this.fashionpediaVocabulary = FashionpediaVocabulary;
    
    // Enhanced luxury fashion analysis prompt with explicit embellishment detection
    this.luxuryAnalysisPrompt = `Analyze this luxury fashion item with expert-level detail using Fashionpedia vocabulary. Provide comprehensive analysis covering:

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

EMBELLISHMENT & DECORATIVE ELEMENTS ANALYSIS:
Pay special attention to decorative elements and embellishments. Look for:

METALLIC & REFLECTIVE ELEMENTS:
- metallic, gold, silver, bronze, copper, chrome, platinum, shiny, reflective, mirror, foil, lamé, sequined, beaded
- Note: metallic finish, shine level, reflective properties

BEADWORK & SEQUINS:
- sequins, sequined, beaded, beads, pearls, crystals, rhinestones, studs, spangles, paillettes, bugle beads, seed beads, rocailles, crystal beads, pearl beads, glass beads, plastic beads, metal beads
- Note: size, density, attachment method, color, material

EMBROIDERY & DECORATIVE STITCHING:
- embroidered, embroidery, stitched, hand-stitched, machine-stitched, cross-stitch, satin stitch, chain stitch, backstitch, running stitch, decorative stitching, appliqué, applied, patched, quilted
- Note: stitch type, thread material, pattern complexity, hand vs machine work

TEXTURAL EMBELLISHMENTS:
- ruffled, ruffles, pleated, pleats, gathered, shirred, smocked, tucked, draped, layered, fringed, fringe, tasseled, tassels, pom-poms, pompons, fabric flowers, bow, bows, ribbon, ribbons
- Note: texture type, placement, construction method

HARDWARE & FUNCTIONAL DECORATIONS:
- buttons, buttoned, zippered, zipper, buckled, buckles, snaps, hooks, clasps, fasteners, rivets, grommets, eyelets, studs, spikes, chains, rings, loops, D-rings, O-rings
- Note: material, finish, placement, functionality

PATTERN-BASED DECORATIONS:
- printed, printed pattern, screen printed, heat transfer, sublimated, dyed, tie-dyed, batik, resist dyed, ombré, gradient, faded, distressed, worn, vintage, retro, antique
- Note: pattern type, application method, coverage

SURFACE TREATMENTS:
- glossy, matte, sueded, brushed, napped, fuzzy, furry, leather, suede, patent leather, textured, embossed, debossed, perforated, laser-cut, burned, charred, weathered
- Note: finish type, texture, visual effect

For each decorative element found, specify:
1. Type and specific terminology
2. Location on garment
3. Material and construction
4. Visual impact and luxury level
5. Brand or design signature indicators

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

COMPONENT-LEVEL ANALYSIS:
Break down the garment into specific components:
1. Base garment structure
2. Decorative elements and embellishments
3. Hardware and functional elements
4. Surface treatments and finishes
5. Construction details and quality markers

Use precise Fashionpedia terminology throughout your analysis. Provide detailed, specific observations rather than generic descriptions.`;

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

    // Extract key details directly from the detailed analysis text
    const keyDetails = this.extractKeyDetails(luxuryAnalysisText);

    // Generate concise summary
    const summary = this.generateSummary({
      category: category.name,
      colors: keyDetails.colors,
      fabrics: keyDetails.fabrics,
      qualityTier,
      priceRange,
      formalityLevel,
      luxuryIndicators,
      confidence,
      itemName: keyDetails.itemName
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
      colors: keyDetails.colors,
      fabrics: keyDetails.fabrics,
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

  extractKeyDetails(text) {
    const details = {
      itemName: null,
      colors: [],
      fabrics: []
    };

    // Extract item name - look for the first clear item description
    const itemMatch = text.match(/\*\*Item:\*\*\s*([^\n]+)/i);
    if (itemMatch) {
      details.itemName = itemMatch[1].trim();
    }

    // Extract primary color - look for color analysis section
    const colorMatch = text.match(/\*\*Color Analysis:\*\*[\s\S]*?-\s*([^\n]+)/i);
    if (colorMatch) {
      const colorText = colorMatch[1].toLowerCase();
      // Extract the main color from the description
      if (colorText.includes('sage') || colorText.includes('olive')) {
        details.colors.push('sage green');
      } else if (colorText.includes('navy')) {
        details.colors.push('navy');
      } else if (colorText.includes('black')) {
        details.colors.push('black');
      } else if (colorText.includes('white')) {
        details.colors.push('white');
      } else if (colorText.includes('brown')) {
        details.colors.push('brown');
      } else if (colorText.includes('grey') || colorText.includes('gray')) {
        details.colors.push('grey');
      } else {
        // Extract any color word from the description
        const colorWords = colorText.match(/\b(?:sage|olive|navy|black|white|brown|grey|gray|blue|red|green|yellow|orange|purple|pink|beige|cream|ivory|tan|khaki|mauve|taupe|rust|burgundy|maroon|teal|turquoise)\b/gi);
        if (colorWords) {
          details.colors.push(colorWords[0]);
        }
      }
    }

    // Extract primary material - look for material section
    const materialMatch = text.match(/\*\*Primary Material:\*\*[\s\S]*?-\s*([^\n]+)/i);
    if (materialMatch) {
      const materialText = materialMatch[1].toLowerCase();
      if (materialText.includes('leather')) {
        details.fabrics.push('leather');
      } else if (materialText.includes('wool')) {
        details.fabrics.push('wool');
      } else if (materialText.includes('cotton')) {
        details.fabrics.push('cotton');
      } else if (materialText.includes('silk')) {
        details.fabrics.push('silk');
      } else if (materialText.includes('cashmere')) {
        details.fabrics.push('cashmere');
      } else {
        // Extract any fabric word from the description
        const fabricWords = materialText.match(/\b(?:leather|wool|cotton|silk|cashmere|linen|denim|tweed|velvet|corduroy|chiffon|satin|polyester|nylon|rayon|viscose|spandex|suede)\b/gi);
        if (fabricWords) {
          details.fabrics.push(fabricWords[0]);
        }
      }
    }

    // Fallback to generic extraction if nothing found
    if (details.colors.length === 0) {
      details.colors = ['unknown'];
    }
    if (details.fabrics.length === 0) {
      details.fabrics = ['unknown'];
    }

    return details;
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

  generateSummary({ category, colors, fabrics, qualityTier, priceRange, formalityLevel, luxuryIndicators, confidence, itemName }) {
    let summary = '';
    
    // Use extracted item name if available, otherwise build from components
    if (itemName) {
      summary = itemName;
    } else {
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