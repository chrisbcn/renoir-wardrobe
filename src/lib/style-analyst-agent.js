// src/lib/style-analyst-agent.js
// StyleAnalyst agent inspired by renoir_demo's successful approach

import FashionpediaVocabulary from './fashionpedia-vocabulary.js';

class StyleAnalystAgent {
  constructor() {
    this.vocabulary = FashionpediaVocabulary;
    
    // System prompt that establishes the AI's role and capabilities
    this.systemPrompt = `
You are an expert fashion analyst with deep knowledge of clothing styles, design elements, fashion trends, and clothing brands.
Your task is to analyze clothing images and provide detailed, structured information about the clothing items.

You should identify:
- Only clothing components from these categories: shirt, pants, dress, blouse, skirt, jacket, blazer, sweater, vest, shorts, shoes
- The overall style and aesthetic of the clothing
- Detailed attributes of each clothing item (color, texture, fit, etc.)
- The brand of each clothing item (if recognizable or has brand markers)
- The color palette of the clothing
- Appropriate occasions for wearing this clothing
- Style categories that best describe the clothing

For the brand field, provide your best guess based on visible logos, distinctive design elements, or styling. If you cannot identify the brand with any confidence, provide an empty string.

Pay special attention to decorative elements and embellishments. Look for and describe in detail:
- Sequins, beads, pearls, crystals, rhinestones, studs, spangles, paillettes
- Embroidery, decorative stitching, appliqué, patches, hand-stitched details
- Metallic elements, shiny surfaces, reflective materials, foil, lamé
- Ruffles, pleats, fringe, tassels, bows, ribbons, fabric flowers
- Hardware details, buttons, zippers, buckles, clasps, rivets, grommets
- Surface treatments, textures, embossed, perforated, laser-cut details

For each decorative element found, specify:
1. Type and specific terminology
2. Location on garment
3. Material and construction
4. Visual impact and luxury level

Provide your analysis in a structured JSON format that follows the schema exactly.
Be precise, factual, and comprehensive in your analysis.
`;

    // User prompt template for clothing analysis
    this.userPrompt = `
Please analyze this clothing image in detail.

Provide a structured analysis including:
1. A list of clothing components visible in the image which are one of the following: shirt, pants, dress, blouse, skirt, jacket, blazer, sweater, vest, shorts, shoes
2. A detailed description of the overall clothing style
3. A detailed analysis of each individual clothing item, including:
   - Type and name
   - Color (be specific about shades, tones, washes, etc.)
   - Brand (if recognizable, otherwise leave blank)
   - Key attributes and structural elements
   - Description (include additional specific names for attributes, for example "Aran" to describe textures, "French cuffs" for sleeve details, "cable knit" for patterns, etc. Include color details like the kind of "wash", "marl", "tone", etc.)
   - Decorative elements and embellishments (sequins, beads, embroidery, metallic details, etc.)
4. Style categories that best describe this clothing
5. The clothing's color palette
6. Occasions where this clothing would be appropriate

Make sure you include specific names of descriptors like "Aran", "cable knit", "ribbed collar", "French cuffs", or types of material/color attributes like "wash", "marl", "tone", etc.

For decorative elements, be very specific about:
- Sequins: size, density, attachment method, color, material
- Beads: type, size, pattern, attachment, material
- Embroidery: stitch type, thread material, pattern complexity, hand vs machine work
- Metallic elements: finish type, shine level, reflective properties
- Textural details: ruffles, pleats, fringe, tassels, bows, ribbons

For brands, make your best guess based on visible logos, distinctive designs, or styling characteristics. If you cannot identify a brand with reasonable confidence, use an empty string.

Return your analysis as a valid JSON object that follows the required schema.
`;

    // Clothing categories for validation
    this.clothingCategories = [
      'shirt', 'pants', 'dress', 'blouse', 'skirt', 'jacket', 'blazer', 
      'sweater', 'vest', 'shorts', 'shoes'
    ];

    // Detailed structural elements to look for
    this.structuralElements = {
      collar: [
        'ribbed collar', 'wider collars', 'high ribbed turtleneck', 'notch lapels',
        'crew neck', 'V-neck', 'turtleneck', 'scoop neck', 'boat neck', 'off-shoulder',
        'square neck', 'halter neck', 'cowl neck', 'mandarin collar', 'stand collar'
      ],
      sleeves: [
        'French cuffs', 'long sleeves', 'sleeveless', 'fully fashioned', 'cap sleeves',
        'three-quarter sleeves', 'raglan sleeves', 'dolman sleeves', 'batwing sleeves',
        'bishop sleeves', 'puff sleeves', 'bell sleeves', 'kimono sleeves'
      ],
      details: [
        'cable knit', 'button detail', 'ribbing', 'cuffs', 'pockets', 'pleats',
        'ruffles', 'gathers', 'darts', 'seams', 'hemlines', 'waistlines',
        'belt loops', 'buttonholes', 'zippers', 'snaps', 'hooks'
      ],
      construction: [
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
      console.log(`Starting StyleAnalyst agent analysis for type: ${analysisType}`);

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
      console.error('StyleAnalyst agent error:', error);
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

  // Enhance response with additional embellishment detection
  enhanceWithEmbellishmentDetection(response) {
    if (!response || !response.clothing_components) {
      return response;
    }

    // Add embellishment analysis to each clothing component
    const enhancedComponents = response.clothing_components.map(component => {
      const description = component.description || '';
      const attributes = component.attributes || [];
      
      // Extract embellishments from description and attributes
      const embellishments = this.extractEmbellishments(description, attributes);
      
      return {
        ...component,
        embellishments: embellishments,
        has_sequins: this.hasSequins(description, attributes),
        has_beadwork: this.hasBeadwork(description, attributes),
        has_embroidery: this.hasEmbroidery(description, attributes),
        has_metallic: this.hasMetallic(description, attributes)
      };
    });

    return {
      ...response,
      clothing_components: enhancedComponents,
      embellishment_summary: this.generateEmbellishmentSummary(enhancedComponents)
    };
  }

  // Extract embellishments from text
  extractEmbellishments(description, attributes) {
    const text = `${description} ${attributes.join(' ')}`.toLowerCase();
    const foundEmbellishments = [];

    // Check for specific embellishment types
    this.embellishmentTerms.forEach(term => {
      if (text.includes(term.toLowerCase())) {
        foundEmbellishments.push(term);
      }
    });

    return [...new Set(foundEmbellishments)]; // Remove duplicates
  }

  // Check for specific embellishment types
  hasSequins(text, attributes) {
    const combined = `${text} ${attributes.join(' ')}`.toLowerCase();
    return combined.includes('sequin') || combined.includes('sequined') || 
           combined.includes('spangle') || combined.includes('paillette');
  }

  hasBeadwork(text, attributes) {
    const combined = `${text} ${attributes.join(' ')}`.toLowerCase();
    return combined.includes('bead') || combined.includes('beaded') || 
           combined.includes('pearl') || combined.includes('crystal') ||
           combined.includes('rhinestone');
  }

  hasEmbroidery(text, attributes) {
    const combined = `${text} ${attributes.join(' ')}`.toLowerCase();
    return combined.includes('embroidery') || combined.includes('embroidered') ||
           combined.includes('stitched') || combined.includes('appliqué');
  }

  hasMetallic(text, attributes) {
    const combined = `${text} ${attributes.join(' ')}`.toLowerCase();
    return combined.includes('metallic') || combined.includes('shiny') ||
           combined.includes('reflective') || combined.includes('foil') ||
           combined.includes('lamé');
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

  // Calculate confidence score
  calculateConfidence(response) {
    if (!response || !response.clothing_components) return 0.5;
    
    let confidence = 0.5; // Base confidence
    
    // Increase confidence based on detail level
    const totalComponents = response.clothing_components.length;
    if (totalComponents > 0) confidence += 0.2;
    
    // Increase confidence based on embellishment detection
    const embellishmentSummary = response.embellishment_summary;
    if (embellishmentSummary && embellishmentSummary.total_embellishments > 0) {
      confidence += 0.2;
    }
    
    // Increase confidence based on specific details mentioned
    const hasSpecificDetails = response.clothing_components.some(component => 
      component.attributes && component.attributes.length > 3
    );
    if (hasSpecificDetails) confidence += 0.1;
    
    return Math.min(confidence, 0.95);
  }

  // Determine if analysis needs review
  determineNeedsReview(response) {
    const confidence = this.calculateConfidence(response);
    return confidence < 0.7;
  }
}

export default new StyleAnalystAgent();
