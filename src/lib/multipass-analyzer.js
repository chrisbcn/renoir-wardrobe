// src/lib/multipass-analyzer.js
// Multi-pass analysis workflow for enhanced embellishment detection

import FashionpediaVocabulary from './fashionpedia-vocabulary.js';

class MultiPassAnalyzer {
  constructor() {
    this.fashionpediaVocabulary = FashionpediaVocabulary;
  }

  // Main multi-pass analysis function
  async analyzeImage(imageData, analysisType = 'wardrobe') {
    try {
      console.log(`Starting multi-pass analysis for type: ${analysisType}`);

      // Pass 1: General garment identification
      const generalAnalysis = await this.pass1GeneralIdentification(imageData);
      console.log('Pass 1 complete: General identification');

      // Pass 2: Component-level analysis (embellishments, materials, construction)
      const componentAnalysis = await this.pass2ComponentAnalysis(imageData, generalAnalysis);
      console.log('Pass 2 complete: Component analysis');

      // Pass 3: Integration and refinement
      const integratedAnalysis = await this.pass3Integration(generalAnalysis, componentAnalysis);
      console.log('Pass 3 complete: Integration and refinement');

      return {
        success: true,
        analysisType,
        passes: {
          general: generalAnalysis,
          components: componentAnalysis,
          integrated: integratedAnalysis
        },
        confidence: this.calculateOverallConfidence(generalAnalysis, componentAnalysis, integratedAnalysis),
        needsReview: this.determineNeedsReview(generalAnalysis, componentAnalysis, integratedAnalysis),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Multi-pass analysis error:', error);
      return {
        success: false,
        error: error.message,
        confidence: 0,
        needsReview: true
      };
    }
  }

  // Pass 1: General garment identification
  async pass1GeneralIdentification(imageData) {
    const prompt = `PASS 1: GENERAL GARMENT IDENTIFICATION

Analyze this image and provide a general overview of the clothing item(s):

1. Primary garment type and category
2. Basic silhouette and fit characteristics
3. Dominant colors and patterns
4. Overall style and aesthetic
5. Formality level assessment
6. Any immediately visible decorative elements

Focus on getting the big picture - what type of garment is this and what's its basic character?

Respond with a JSON object:
{
  "primary_garment_type": "specific garment type",
  "category": "main category",
  "silhouette": "overall shape and fit",
  "dominant_colors": ["primary colors"],
  "basic_pattern": "pattern type if any",
  "style_aesthetic": "overall style description",
  "formality_level": "casual/smart casual/business formal/black-tie",
  "visible_decorative_elements": ["any immediately obvious decorations"],
  "confidence": 0.0-1.0
}`;

    return await this.callClaudeAPI(imageData, prompt);
  }

  // Pass 2: Component-level analysis
  async pass2ComponentAnalysis(imageData, generalAnalysis) {
    const embellishmentPrompt = this.fashionpediaVocabulary.generateEmbellishmentPrompt();
    const materialPrompt = this.fashionpediaVocabulary.generateMaterialPrompt();
    const constructionPrompt = this.fashionpediaVocabulary.generateConstructionPrompt();

    const prompt = `PASS 2: COMPONENT-LEVEL ANALYSIS

Building on the general identification, now analyze specific components in detail:

${embellishmentPrompt}

${materialPrompt}

${constructionPrompt}

COMPONENT BREAKDOWN:
1. Base garment structure and construction
2. All decorative elements and embellishments
3. Hardware and functional elements
4. Surface treatments and finishes
5. Quality indicators and luxury markers

For each component found, provide:
- Specific terminology
- Location on garment
- Material and construction details
- Quality assessment
- Luxury level indicators

Respond with a JSON object:
{
  "base_garment": {
    "structure": "garment construction details",
    "materials": ["primary materials"],
    "construction_quality": "quality assessment"
  },
  "embellishments": {
    "metallic_elements": ["list with details"],
    "beadwork": ["list with details"],
    "embroidery": ["list with details"],
    "textural": ["list with details"],
    "hardware": ["list with details"],
    "surface_treatments": ["list with details"]
  },
  "quality_indicators": {
    "construction_quality": "assessment",
    "material_quality": "assessment",
    "luxury_markers": ["specific indicators"],
    "craftsmanship_evidence": ["handwork, attention to detail"]
  },
  "confidence": 0.0-1.0
}`;

    return await this.callClaudeAPI(imageData, prompt);
  }

  // Pass 3: Integration and refinement
  async pass3Integration(generalAnalysis, componentAnalysis) {
    const prompt = `PASS 3: INTEGRATION AND REFINEMENT

Integrate the general identification and component analysis to provide a comprehensive assessment:

GENERAL ANALYSIS:
${JSON.stringify(generalAnalysis, null, 2)}

COMPONENT ANALYSIS:
${JSON.stringify(componentAnalysis, null, 2)}

INTEGRATION TASKS:
1. Resolve any conflicts between general and component analysis
2. Refine embellishment detection based on component details
3. Assess overall luxury level and quality tier
4. Provide styling and investment recommendations
5. Identify any missing or unclear elements

FINAL ASSESSMENT:
- Overall garment description with all decorative elements
- Quality tier and luxury level
- Brand positioning indicators
- Styling recommendations
- Investment assessment
- Any elements requiring further review

Respond with a JSON object:
{
  "final_description": "comprehensive garment description with all details",
  "embellishment_summary": {
    "primary_embellishments": ["main decorative elements"],
    "secondary_embellishments": ["supporting decorative elements"],
    "embellishment_quality": "quality assessment of decorations",
    "luxury_level": "embellishment luxury level"
  },
  "quality_assessment": {
    "overall_tier": "ultra-luxury/luxury/premium/contemporary/mass-market",
    "construction_quality": "assessment",
    "material_quality": "assessment",
    "embellishment_quality": "assessment"
  },
  "styling_recommendations": {
    "formality_level": "appropriate occasions",
    "seasonality": "best seasons",
    "versatility": "styling options",
    "investment_value": "worth assessment"
  },
  "confidence": 0.0-1.0,
  "needs_review": ["any elements requiring further analysis"]
}`;

    return await this.callClaudeAPI(null, prompt);
  }

  // Call Claude API for analysis
  async callClaudeAPI(imageData, prompt) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }

    const messages = [
      {
        role: 'user',
        content: []
      }
    ];

    // Add image if provided
    if (imageData) {
      messages[0].content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/jpeg',
          data: imageData.includes(',') ? imageData.split(',')[1] : imageData
        }
      });
    }

    // Add text prompt
    messages[0].content.push({
      type: 'text',
      text: prompt
    });

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
        messages: messages
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

  // Calculate overall confidence from all passes
  calculateOverallConfidence(generalAnalysis, componentAnalysis, integratedAnalysis) {
    const generalConf = generalAnalysis.confidence || 0.5;
    const componentConf = componentAnalysis.confidence || 0.5;
    const integratedConf = integratedAnalysis.confidence || 0.5;
    
    // Weight the passes (general: 0.3, component: 0.4, integrated: 0.3)
    return (generalConf * 0.3) + (componentConf * 0.4) + (integratedConf * 0.3);
  }

  // Determine if analysis needs review
  determineNeedsReview(generalAnalysis, componentAnalysis, integratedAnalysis) {
    const overallConfidence = this.calculateOverallConfidence(generalAnalysis, componentAnalysis, integratedAnalysis);
    
    // Needs review if confidence is low or if there are specific review flags
    if (overallConfidence < 0.7) return true;
    if (integratedAnalysis.needs_review && integratedAnalysis.needs_review.length > 0) return true;
    
    return false;
  }

  // Extract embellishment summary for easy access
  extractEmbellishmentSummary(analysis) {
    const integrated = analysis.passes?.integrated;
    if (!integrated) return null;

    return {
      primary: integrated.embellishment_summary?.primary_embellishments || [],
      secondary: integrated.embellishment_summary?.secondary_embellishments || [],
      quality: integrated.embellishment_summary?.embellishment_quality || 'unknown',
      luxuryLevel: integrated.embellishment_summary?.luxury_level || 'unknown'
    };
  }

  // Check if specific embellishment type is present
  hasEmbellishmentType(analysis, type) {
    const embellishments = this.extractEmbellishmentSummary(analysis);
    if (!embellishments) return false;

    const allEmbellishments = [
      ...embellishments.primary,
      ...embellishments.secondary
    ];

    return allEmbellishments.some(embellishment => 
      embellishment.toLowerCase().includes(type.toLowerCase())
    );
  }

  // Get detailed embellishment information
  getEmbellishmentDetails(analysis) {
    const componentAnalysis = analysis.passes?.components;
    if (!componentAnalysis) return null;

    return componentAnalysis.embellishments || null;
  }
}

export default new MultiPassAnalyzer();

