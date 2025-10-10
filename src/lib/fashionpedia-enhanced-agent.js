// src/lib/fashionpedia-enhanced-agent.js
// Enhanced agent that combines Fashionpedia integration with agentic approach

import FashionpediaVocabulary from './fashionpedia-vocabulary.js';
import StyleAnalystAgent from './style-analyst-agent.js';

class FashionpediaEnhancedAgent {
  constructor() {
    this.vocabulary = FashionpediaVocabulary;
    this.styleAnalyst = StyleAnalystAgent;
    
    // Enhanced system prompt that leverages Fashionpedia vocabulary
    this.systemPrompt = `
You are an expert fashion analyst with deep knowledge of clothing styles, design elements, fashion trends, and clothing brands.
Your task is to analyze clothing images and provide detailed, structured information about the clothing items using Fashionpedia's comprehensive taxonomy.

You should identify:
- Only clothing components from these categories: shirt, pants, dress, blouse, skirt, jacket, blazer, sweater, vest, shorts, shoes
- The overall style and aesthetic of the clothing
- Detailed attributes of each clothing item using Fashionpedia's 294 fine-grained attributes
- The brand of each clothing item (if recognizable or has brand markers)
- The color palette of the clothing
- Appropriate occasions for wearing this clothing
- Style categories that best describe the clothing

For the brand field, provide your best guess based on visible logos, distinctive design elements, or styling. If you cannot identify the brand with any confidence, provide an empty string.

Pay special attention to decorative elements and embellishments using Fashionpedia's comprehensive vocabulary:
- Sequins, beads, pearls, crystals, rhinestones, studs, spangles, paillettes, bugle beads, seed beads, rocailles
- Embroidery, decorative stitching, appliqué, patches, hand-stitched details, cross-stitch, satin stitch, chain stitch
- Metallic elements, shiny surfaces, reflective materials, foil, lamé, mirror, chrome, platinum
- Ruffles, pleats, fringe, tassels, bows, ribbons, fabric flowers, pom-poms, tassels
- Hardware details, buttons, zippers, buckles, clasps, rivets, grommets, eyelets, studs, spikes
- Surface treatments, textures, embossed, perforated, laser-cut details, sueded, brushed, napped

For each decorative element found, specify:
1. Type and specific Fashionpedia terminology
2. Location on garment
3. Material and construction
4. Visual impact and luxury level
5. Fashionpedia attribute category

Use Fashionpedia's hierarchical structure:
- 27 main categories
- 19 parts
- 294 fine-grained attributes

Provide your analysis in a structured JSON format that follows the schema exactly.
Be precise, factual, and comprehensive in your analysis using Fashionpedia's exact terminology.
`;

    // Enhanced user prompt with Fashionpedia integration
    this.userPrompt = `
Please analyze this clothing image in detail using Fashionpedia's comprehensive taxonomy.

Provide a structured analysis including:
1. A list of clothing components visible in the image which are one of the following: shirt, pants, dress, blouse, skirt, jacket, blazer, sweater, vest, shorts, shoes
2. A detailed description of the overall clothing style
3. A detailed analysis of each individual clothing item, including:
   - Type and name
   - Color (be specific about shades, tones, washes, etc.)
   - Brand (if recognizable, otherwise leave blank)
   - Key attributes using Fashionpedia's 294 fine-grained attributes
   - Description (include specific Fashionpedia terminology like "Aran" for textures, "French cuffs" for sleeve details, "cable knit" for patterns, etc. Include color details like "wash", "marl", "tone", etc.)
   - Decorative elements and embellishments using Fashionpedia vocabulary
4. Style categories that best describe this clothing
5. The clothing's color palette
6. Occasions where this clothing would be appropriate

Make sure you include specific names of descriptors like "Aran", "cable knit", "ribbed collar", "French cuffs", or types of material/color attributes like "wash", "marl", "tone", etc.

For decorative elements, be very specific about:
- Sequins: size, density, attachment method, color, material, Fashionpedia category
- Beads: type, size, pattern, attachment, material, Fashionpedia category
- Embroidery: stitch type, thread material, pattern complexity, hand vs machine work, Fashionpedia category
- Metallic elements: finish type, shine level, reflective properties, Fashionpedia category
- Textural details: ruffles, pleats, fringe, tassels, bows, ribbons, Fashionpedia category

For brands, make your best guess based on visible logos, distinctive designs, or styling characteristics. If you cannot identify a brand with reasonable confidence, use an empty string.

Return your analysis as a valid JSON object that follows the required schema.
`;

    // Fashionpedia categories for validation
    this.fashionpediaCategories = [
      'shirt', 'pants', 'dress', 'blouse', 'skirt', 'jacket', 'blazer', 
      'sweater', 'vest', 'shorts', 'shoes'
    ];

    // Fashionpedia attribute categories
    this.attributeCategories = {
      'metallic': this.vocabulary.getEmbellishmentTerms('metallic'),
      'beadwork': this.vocabulary.getEmbellishmentTerms('beadwork'),
      'embroidery': this.vocabulary.getEmbellishmentTerms('embroidery'),
      'textural': this.vocabulary.getEmbellishmentTerms('textural'),
      'hardware': this.vocabulary.getEmbellishmentTerms('hardware'),
      'patterns': this.vocabulary.getEmbellishmentTerms('patterns'),
      'surface': this.vocabulary.getEmbellishmentTerms('surface')
    };
  }

  // Main analysis function with Fashionpedia enhancement
  async analyzeImage(imageData, analysisType = 'wardrobe') {
    try {
      console.log(`Starting Fashionpedia-enhanced analysis for type: ${analysisType}`);

      // Step 1: Use StyleAnalyst for initial analysis
      const styleAnalysis = await this.styleAnalyst.analyzeImage(imageData, analysisType);
      
      if (!styleAnalysis.success) {
        throw new Error(`StyleAnalyst failed: ${styleAnalysis.error}`);
      }

      // Step 2: Enhance with Fashionpedia vocabulary and validation
      const enhancedResult = this.enhanceWithFashionpedia(styleAnalysis.result);

      return {
        success: true,
        analysisType,
        result: enhancedResult,
        confidence: this.calculateConfidence(enhancedResult),
        needsReview: this.determineNeedsReview(enhancedResult),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Fashionpedia-enhanced analysis error:', error);
      return {
        success: false,
        error: error.message,
        confidence: 0,
        needsReview: true
      };
    }
  }

  // Enhance analysis with Fashionpedia vocabulary and validation
  enhanceWithFashionpedia(analysisResult) {
    if (!analysisResult || !analysisResult.clothing_components) {
      return analysisResult;
    }

    // Enhance each clothing component with Fashionpedia vocabulary
    const enhancedComponents = analysisResult.clothing_components.map(component => {
      const description = component.description || '';
      const attributes = component.attributes || [];
      
      // Extract Fashionpedia attributes
      const fashionpediaAttributes = this.extractFashionpediaAttributes(description, attributes);
      
      // Validate against Fashionpedia categories
      const validatedCategory = this.validateFashionpediaCategory(component.type);
      
      // Extract embellishments using Fashionpedia vocabulary
      const embellishments = this.extractFashionpediaEmbellishments(description, attributes);
      
      return {
        ...component,
        fashionpedia_category: validatedCategory,
        fashionpedia_attributes: fashionpediaAttributes,
        embellishments: embellishments,
        has_sequins: this.hasSequins(description, attributes),
        has_beadwork: this.hasBeadwork(description, attributes),
        has_embroidery: this.hasEmbroidery(description, attributes),
        has_metallic: this.hasMetallic(description, attributes),
        fashionpedia_confidence: this.calculateFashionpediaConfidence(description, attributes)
      };
    });

    // Generate Fashionpedia summary
    const fashionpediaSummary = this.generateFashionpediaSummary(enhancedComponents);

    return {
      ...analysisResult,
      clothing_components: enhancedComponents,
      fashionpedia_summary: fashionpediaSummary,
      embellishment_summary: this.generateEmbellishmentSummary(enhancedComponents)
    };
  }

  // Extract Fashionpedia attributes from text
  extractFashionpediaAttributes(description, attributes) {
    const text = `${description} ${attributes.join(' ')}`.toLowerCase();
    const foundAttributes = [];

    // Check against all Fashionpedia attribute categories
    Object.entries(this.attributeCategories).forEach(([category, terms]) => {
      const categoryAttributes = terms.filter(term => 
        text.includes(term.toLowerCase())
      );
      
      if (categoryAttributes.length > 0) {
        foundAttributes.push({
          category: category,
          attributes: categoryAttributes
        });
      }
    });

    return foundAttributes;
  }

  // Validate category against Fashionpedia
  validateFashionpediaCategory(category) {
    if (!category) return { name: 'unknown', confidence: 0 };
    
    const lowerCategory = category.toLowerCase();
    
    // Direct match
    const directMatch = this.fashionpediaCategories.find(cat => 
      lowerCategory.includes(cat.toLowerCase())
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
      'tee': 'shirt',
      't-shirt': 'shirt',
      'pullover': 'sweater',
      'outerwear': 'jacket',
      'jeans': 'pants'
    };

    for (const [variation, mappedCategory] of Object.entries(categoryMappings)) {
      if (lowerCategory.includes(variation)) {
        return { name: mappedCategory, confidence: 0.7 };
      }
    }

    return { name: 'unknown', confidence: 0.1 };
  }

  // Extract embellishments using Fashionpedia vocabulary
  extractFashionpediaEmbellishments(description, attributes) {
    const text = `${description} ${attributes.join(' ')}`.toLowerCase();
    const foundEmbellishments = [];

    // Use Fashionpedia vocabulary for embellishment detection
    const allEmbellishmentTerms = this.vocabulary.getAllEmbellishmentTerms();
    
    allEmbellishmentTerms.forEach(term => {
      if (text.includes(term.toLowerCase())) {
        foundEmbellishments.push(term);
      }
    });

    return [...new Set(foundEmbellishments)]; // Remove duplicates
  }

  // Check for specific embellishment types using Fashionpedia terms
  hasSequins(text, attributes) {
    const combined = `${text} ${attributes.join(' ')}`.toLowerCase();
    const sequinTerms = this.vocabulary.getEmbellishmentTerms('beadwork');
    return sequinTerms.some(term => combined.includes(term.toLowerCase()));
  }

  hasBeadwork(text, attributes) {
    const combined = `${text} ${attributes.join(' ')}`.toLowerCase();
    const beadworkTerms = this.vocabulary.getEmbellishmentTerms('beadwork');
    return beadworkTerms.some(term => combined.includes(term.toLowerCase()));
  }

  hasEmbroidery(text, attributes) {
    const combined = `${text} ${attributes.join(' ')}`.toLowerCase();
    const embroideryTerms = this.vocabulary.getEmbellishmentTerms('embroidery');
    return embroideryTerms.some(term => combined.includes(term.toLowerCase()));
  }

  hasMetallic(text, attributes) {
    const combined = `${text} ${attributes.join(' ')}`.toLowerCase();
    const metallicTerms = this.vocabulary.getEmbellishmentTerms('metallic');
    return metallicTerms.some(term => combined.includes(term.toLowerCase()));
  }

  // Calculate Fashionpedia confidence
  calculateFashionpediaConfidence(description, attributes) {
    const text = `${description} ${attributes.join(' ')}`.toLowerCase();
    const allTerms = this.vocabulary.getAllEmbellishmentTerms();
    
    const matchingTerms = allTerms.filter(term => 
      text.includes(term.toLowerCase())
    ).length;
    
    return Math.min(matchingTerms / 10, 1.0); // Normalize to 0-1
  }

  // Generate Fashionpedia summary
  generateFashionpediaSummary(components) {
    const allAttributes = components.flatMap(c => c.fashionpedia_attributes || []);
    const allEmbellishments = components.flatMap(c => c.embellishments || []);
    
    const attributeSummary = {};
    allAttributes.forEach(attr => {
      if (!attributeSummary[attr.category]) {
        attributeSummary[attr.category] = [];
      }
      attributeSummary[attr.category].push(...attr.attributes);
    });

    // Remove duplicates
    Object.keys(attributeSummary).forEach(category => {
      attributeSummary[category] = [...new Set(attributeSummary[category])];
    });

    return {
      total_components: components.length,
      total_attributes: allAttributes.length,
      total_embellishments: allEmbellishments.length,
      attribute_breakdown: attributeSummary,
      embellishment_types: [...new Set(allEmbellishments)],
      fashionpedia_coverage: this.calculateFashionpediaCoverage(components)
    };
  }

  // Generate embellishment summary
  generateEmbellishmentSummary(components) {
    const allEmbellishments = components.flatMap(c => c.embellishments || []);
    const uniqueEmbellishments = [...new Set(allEmbellishments)];
    
    return {
      total_embellishments: uniqueEmbellishments.length,
      embellishment_types: uniqueEmbellishments,
      components_with_sequins: components.filter(c => c.has_sequins).length,
      components_with_beadwork: components.filter(c => c.has_beadwork).length,
      components_with_embroidery: components.filter(c => c.has_embroidery).length,
      components_with_metallic: components.filter(c => c.has_metallic).length
    };
  }

  // Calculate Fashionpedia coverage
  calculateFashionpediaCoverage(components) {
    const totalPossibleAttributes = 294; // Fashionpedia's 294 fine-grained attributes
    const foundAttributes = components.flatMap(c => c.fashionpedia_attributes || [])
      .flatMap(attr => attr.attributes || []);
    
    const uniqueAttributes = [...new Set(foundAttributes)];
    return (uniqueAttributes.length / totalPossibleAttributes) * 100;
  }

  // Calculate overall confidence
  calculateConfidence(result) {
    if (!result || !result.clothing_components) return 0.5;
    
    let confidence = 0.5; // Base confidence
    
    // Increase confidence based on Fashionpedia coverage
    const fashionpediaSummary = result.fashionpedia_summary;
    if (fashionpediaSummary && fashionpediaSummary.fashionpedia_coverage > 0) {
      confidence += Math.min(fashionpediaSummary.fashionpedia_coverage / 100, 0.3);
    }
    
    // Increase confidence based on embellishment detection
    const embellishmentSummary = result.embellishment_summary;
    if (embellishmentSummary && embellishmentSummary.total_embellishments > 0) {
      confidence += 0.2;
    }
    
    return Math.min(confidence, 0.95);
  }

  // Determine if analysis needs review
  determineNeedsReview(result) {
    const confidence = this.calculateConfidence(result);
    return confidence < 0.7;
  }
}

export default new FashionpediaEnhancedAgent();
