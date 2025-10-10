// src/lib/enhanced-detailed-analyzer.js
// Enhanced analyzer combining our existing work with renoir_demo's detailed approach

import FashionpediaVocabulary from './fashionpedia-vocabulary.js';

class EnhancedDetailedAnalyzer {
  constructor() {
    this.vocabulary = FashionpediaVocabulary;
    
    // Enhanced system prompt combining our existing work with renoir_demo's detailed approach
    this.systemPrompt = `
You are an expert fashion analyst with deep knowledge of clothing styles, design elements, fashion trends, and clothing brands.
Your task is to analyze clothing images and provide highly detailed, structured information about clothing items using Fashionpedia's comprehensive taxonomy.

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

SEQUINS AND BEADWORK (HIGH PRIORITY):
- Sequins, sequined, beaded, beads, pearls, crystals, rhinestones, studs, spangles, paillettes
- Bugle beads, seed beads, rocailles, crystal beads, pearl beads, glass beads, plastic beads, metal beads
- Look for: small reflective discs, metallic dots, shiny circular elements, glittery surfaces
- Specify: size (small, medium, large), density (sparse, moderate, dense), attachment method, color, material

EMBROIDERY AND STITCHING:
- Embroidery, embroidered, decorative stitching, appliqué, patches, hand-stitched details
- Cross-stitch, satin stitch, chain stitch, backstitch, running stitch, decorative stitching
- Specify: stitch type, thread material, pattern complexity, hand vs machine work

METALLIC ELEMENTS:
- Metallic, shiny, reflective, foil, lamé, mirror, chrome, platinum, gold, silver, bronze
- Look for: reflective surfaces, metallic finishes, shiny materials
- Specify: finish type, shine level, reflective properties

TEXTURAL EMBELLISHMENTS:
- Ruffles, pleats, fringe, tassels, bows, ribbons, fabric flowers, pom-poms, tassels
- Ruffled, pleated, gathered, shirred, smocked, tucked, draped, layered
- Specify: texture type, placement, construction method

HARDWARE AND FUNCTIONAL:
- Buttons, zippers, buckles, clasps, rivets, grommets, eyelets, studs, spikes, chains, rings, loops
- Specify: material, finish, placement, functionality

SURFACE TREATMENTS:
- Textures, embossed, perforated, laser-cut, sueded, brushed, napped, fuzzy, furry
- Specify: finish type, texture, visual effect

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

    // Enhanced user prompt with renoir_demo-style detailed descriptions
    this.userPrompt = `
Please analyze this clothing image in detail using Fashionpedia's comprehensive taxonomy.

Provide a structured analysis including:
1. A list of clothing components visible in the image which are one of the following: shirt, pants, dress, blouse, skirt, jacket, blazer, sweater, vest, shorts, shoes
2. A detailed description of the overall clothing style
3. A detailed analysis of each individual clothing item, including:
   - Type and name (be very specific: "Double-breasted wool blazer" not just "blazer")
   - Color (be specific about shades, tones, washes, etc. - use terms like "navy blue", "ecru", "oatmeal marl", "burgundy", "whiter white")
   - Brand (if recognizable, otherwise leave blank)
   - Key attributes using Fashionpedia's 294 fine-grained attributes
   - Description (include specific terminology like "Aran" for textures, "French cuffs" for sleeve details, "cable knit" for patterns, "ribbed collar", "notch lapels", "wide leg", "straight leg", "tailored", "relaxed fit", etc. Include color details like "wash", "marl", "tone", etc.)
   - Decorative elements and embellishments using Fashionpedia vocabulary
   - Structural elements (collar types, sleeve details, construction, etc.)

Make sure you include specific names of descriptors like:
- "Aran" for cable knit textures
- "French cuffs" for sleeve details
- "cable knit" for patterns
- "ribbed collar", "wider collars", "high ribbed turtleneck", "notch lapels"
- "wide leg", "straight leg", "tailored", "relaxed fit"
- "heavy gauge", "intricate cable knit patterns"
- "French seams", "flat-fell seams", "pinked seams", "serged seams"
- "pick stitching", "topstitching", "understitching", "edge stitching"
- Color details like "wash", "marl", "tone", "oatmeal marl", "ecru", "burgundy"

For decorative elements, be very specific about:

SEQUINS (CRITICAL - Look carefully for these):
- If you see small reflective discs, metallic dots, or shiny circular elements, call them "sequins" or "sequined"
- Specify: size (small, medium, large), density (sparse, moderate, dense), attachment method, color, material
- Look for: individual sequins, sequin patterns, sequin trim, sequin embellishments
- Use terms: "sequins", "sequined", "spangles", "paillettes" - be explicit!

BEADWORK:
- Beads: type, size, pattern, attachment, material, Fashionpedia category
- Look for: individual beads, beaded patterns, beaded trim, beaded embellishments

EMBROIDERY:
- Stitch type, thread material, pattern complexity, hand vs machine work, Fashionpedia category

METALLIC ELEMENTS:
- Finish type, shine level, reflective properties, Fashionpedia category
- Look for: metallic finishes, shiny surfaces, reflective materials

TEXTURAL DETAILS:
- Ruffles, pleats, fringe, tassels, bows, ribbons, Fashionpedia category

For brands, make your best guess based on visible logos, distinctive designs, or styling characteristics. If you cannot identify a brand with reasonable confidence, use an empty string.

Return your analysis as a valid JSON object that follows the required schema.
`;

    // Clothing categories for validation
    this.clothingCategories = [
      'shirt', 'pants', 'dress', 'blouse', 'skirt', 'jacket', 'blazer', 
      'sweater', 'vest', 'shorts', 'shoes'
    ];

    // Enhanced attribute categories from renoir_demo
    this.attributeCategories = {
      'color': [
        'purple tone', 'whiter white', 'light blue', 'burgundy', 'ecru', 'oatmeal marl',
        'navy', 'teal', 'coral', 'salmon', 'peach', 'beige', 'ivory', 'charcoal', 'slate'
      ],
      'style': [
        'turtleneck', 'crew neck', 'V-neck', 'blouse', 'blazer', 'sweater',
        'wide leg', 'straight leg', 'tailored', 'relaxed fit', 'cropped', 'oversized'
      ],
      'fabric': [
        'suede', 'leather', 'silk', 'cotton', 'wool', 'velvety', 'cashmere',
        'linen', 'denim', 'tweed', 'corduroy', 'chiffon', 'satin', 'organza'
      ],
      'pattern': [
        'floral', 'striped', 'pinstripe', 'botanical print', 'all over multicolored',
        'cable knit', 'ribbed', 'quilted', 'embroidered', 'printed'
      ],
      'fit': [
        'wide leg', 'straight leg', 'tailored', 'relaxed fit', 'slim fit', 'regular fit',
        'oversized', 'cropped', 'high-waisted', 'mid-rise', 'low-rise'
      ],
      'collar': [
        'ribbed collar', 'wider collars', 'high ribbed turtleneck', 'notch lapels',
        'peak lapels', 'shawl collar', 'mandarin collar', 'band collar'
      ],
      'sleeves': [
        'French cuffs', 'long sleeves', 'sleeveless', 'fully fashioned', 'raglan sleeves',
        'set-in sleeves', 'drop shoulders', 'batwing sleeves'
      ],
      'details': [
        'cable knit', 'button detail', 'ribbing', 'cuffs', 'pockets', 'pleats',
        'ruffles', 'fringe', 'tassels', 'bows', 'ribbons'
      ],
      'construction': [
        'heavy gauge', 'intricate cable knit patterns', 'hand-stitched', 'machine-sewn',
        'French seams', 'flat-fell seams', 'pinked seams', 'serged seams',
        'pick stitching', 'topstitching', 'understitching', 'edge stitching'
      ]
    };

    // Embellishment-specific terms
    this.embellishmentTerms = this.vocabulary.getAllEmbellishmentTerms();
  }

  // Main analysis function
  async analyzeImage(imageData, analysisType = 'wardrobe') {
    try {
      console.log(`Starting enhanced detailed analysis for type: ${analysisType}`);

      const response = await this.callClaudeAPI(imageData, this.systemPrompt, this.userPrompt);
      
      // Enhance the response with additional embellishment detection
      const enhancedResponse = this.enhanceWithEmbellishmentDetection(response);

      return {
        success: true,
        analysisType,
        result: enhancedResponse,
        confidence: this.calculateConfidence(enhancedResponse),
        needsReview: this.determineNeedsReview(enhancedResponse),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Enhanced detailed analysis error:', error);
      return {
        success: false,
        error: error.message,
        confidence: 0,
        needsReview: true
      };
    }
  }

  // Call Claude API for analysis
  async callClaudeAPI(imageData, systemPrompt, userPrompt) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
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
                text: userPrompt
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
    const responseText = data.content[0].text;
    
    // Clean and parse JSON
    const cleanedResponse = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleanedResponse);
  }

  // Enhance response with embellishment detection
  enhanceWithEmbellishmentDetection(response) {
    if (!response || !response.clothing_components) {
      return response;
    }

    // Enhance each clothing component with embellishment detection
    const enhancedComponents = response.clothing_components.map(component => {
      const description = component.description || '';
      const attributes = component.attributes || [];
      
      // Extract embellishments using Fashionpedia vocabulary
      const embellishments = this.extractFashionpediaEmbellishments(description, attributes);
      
      return {
        ...component,
        embellishments: embellishments,
        has_sequins: this.hasSequins(description, attributes),
        has_beadwork: this.hasBeadwork(description, attributes),
        has_embroidery: this.hasEmbroidery(description, attributes),
        has_metallic: this.hasMetallic(description, attributes),
        fashionpedia_confidence: this.calculateFashionpediaConfidence(description, attributes)
      };
    });

    return {
      ...response,
      clothing_components: enhancedComponents,
      embellishment_summary: this.generateEmbellishmentSummary(enhancedComponents)
    };
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

  // Calculate overall confidence
  calculateConfidence(result) {
    if (!result || !result.clothing_components) return 0.5;
    
    let confidence = 0.5; // Base confidence
    
    // Increase confidence based on embellishment detection
    const embellishmentSummary = result.embellishment_summary;
    if (embellishmentSummary && embellishmentSummary.total_embellishments > 0) {
      confidence += 0.2;
    }
    
    // Increase confidence based on detailed descriptions
    const hasDetailedDescriptions = result.clothing_components.some(component => 
      component.description && component.description.length > 50
    );
    
    if (hasDetailedDescriptions) {
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

export default new EnhancedDetailedAnalyzer();
