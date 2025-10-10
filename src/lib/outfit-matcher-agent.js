// src/lib/outfit-matcher-agent.js
// OutfitMatcher agent for intelligent matching

class OutfitMatcherAgent {
  constructor() {
    // System prompt that establishes the AI's role and capabilities
    this.systemPrompt = `
You are an expert fashion stylist who specializes in matching outfit inspirations with available clothing items.
Your task is to analyze an outfit description and select the best matching items from available options.

For each clothing element in the original outfit, you will:
1. Review the detailed description of the original element
2. Examine each potential match from the database
3. Select the best match based on the matching priority below
4. Determine if it's an "exact match" or requires substitution
5. Explain why you selected this item

Matching Priority:
When analyzing clothing items, follow this priority order to find the best match:
1. COLOR: Getting as close to the original color is very important.
2. STYLE/SILHOUETTE: Identify the exact cut, distinctive design features, and proportions
3. FABRIC/TEXTURE: Specify the material composition, weight, drape, and texture
4. BRAND: Identify brands when possible but don't guess

For "exact_match" decisions:
- Set to TRUE only when the match is very close in all key attributes (color, style, cut, etc.)
- Set to FALSE when significant differences exist, indicating this is a substitution
- Never factor in the image background color in your decision process. Only focus on attributes of the clothing items.
- Do not factor in brand to your decision if no brand is given.

Some guidelines for determining "exact_match":
- Color is a primary factor - if the colors are significantly different, it's not an exact match
- Style and silhouette are important - the cut and overall style should be similar
- Pattern/texture matching is necessary - a striped shirt is not an exact match for a solid one
- Brand is less important unless the brand defines a very specific style

Be precise, consistent, and thoughtful in your selections.
Provide your selections in a structured JSON format that follows the schema exactly.
`;

    // Matching priority weights
    this.matchingWeights = {
      color: 0.4,
      style: 0.3,
      fabric: 0.2,
      brand: 0.1
    };
  }

  // Generate a dynamic user prompt for outfit matching
  getOutfitMatcherPrompt(originalOutfit, searchResults) {
    return `
Please analyze this outfit description and select the best matches from available options.

ORIGINAL OUTFIT DESCRIPTION:
${originalOutfit.description || 'No description available'}

${searchResults.map(result => {
      return `
CLOTHING ELEMENT: ${result.element.name || 'Unknown'}
DESCRIPTION: ${result.element.description || 'No description'}
COLOR: ${result.element.color || 'Unknown'}
ATTRIBUTES: ${(result.element.attributes || []).join(', ')}
EMBELLISHMENTS: ${(result.element.embellishments || []).join(', ')}

POTENTIAL MATCHES:
${result.matches.map(match => `
  ITEM ID: ${match.id}
  CLASSIFICATION: ${match.classification || 'Unknown'}
  BRAND: ${match.brand || 'Unknown'}
  SIMILARITY SCORE: ${(match.similarity * 100).toFixed(1)}%
  CONTENT: ${match.content || 'No content'}
`).join('\n')}

Select the best match for this element.
`;
    }).join('\n')}

Return your selection for each element in valid JSON that follows the schema exactly, with no extra text.
For each selection, determine if it's an "exact match" (true) or requires substitution (false).

Please provide explanations for why you selected each item.

Your response must be a valid JSON object with this structure:
{
  "matches": [
    {
      "element_name": "The name of the element",
      "selected_item_id": 123, // The ID of the selected match (must be a number)
      "exact_match": true, // Boolean indicating if this is an exact match
      "match_reason": "Explanation for why this item was selected"
    },
    // ... repeat for each clothing element
  ]
}
`;
  }

  // Full prompt for outfit matching, combining system and user prompts
  getOutfitMatcherFullPrompt(originalOutfit, searchResults) {
    return {
      systemPrompt: this.systemPrompt,
      userPrompt: this.getOutfitMatcherPrompt(originalOutfit, searchResults)
    };
  }

  // Call Claude API for outfit matching
  async matchOutfit(originalOutfit, searchResults) {
    try {
      const prompts = this.getOutfitMatcherFullPrompt(originalOutfit, searchResults);
      
      const response = await this.callClaudeAPI(prompts.systemPrompt, prompts.userPrompt);
      
      return {
        success: true,
        matches: response.matches || [],
        confidence: this.calculateMatchingConfidence(response.matches || []),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('OutfitMatcher agent error:', error);
      return {
        success: false,
        error: error.message,
        matches: [],
        confidence: 0
      };
    }
  }

  // Call Claude API for matching
  async callClaudeAPI(systemPrompt, userPrompt) {
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

  // Calculate matching confidence
  calculateMatchingConfidence(matches) {
    if (!matches || matches.length === 0) return 0;
    
    const exactMatches = matches.filter(match => match.exact_match).length;
    const totalMatches = matches.length;
    
    return exactMatches / totalMatches;
  }

  // Analyze match quality
  analyzeMatchQuality(originalElement, selectedMatch) {
    const quality = {
      colorMatch: this.analyzeColorMatch(originalElement.color, selectedMatch),
      styleMatch: this.analyzeStyleMatch(originalElement, selectedMatch),
      fabricMatch: this.analyzeFabricMatch(originalElement, selectedMatch),
      brandMatch: this.analyzeBrandMatch(originalElement.brand, selectedMatch.brand)
    };

    const overallScore = Object.values(quality).reduce((sum, score) => sum + score, 0) / Object.keys(quality).length;
    
    return {
      ...quality,
      overallScore: overallScore,
      isExactMatch: overallScore >= 0.8
    };
  }

  // Analyze color match
  analyzeColorMatch(originalColor, selectedMatch) {
    if (!originalColor || !selectedMatch.color) return 0.5;
    
    const original = originalColor.toLowerCase();
    const selected = selectedMatch.color.toLowerCase();
    
    // Exact match
    if (original === selected) return 1.0;
    
    // Similar colors
    const colorGroups = {
      'red': ['burgundy', 'maroon', 'coral', 'pink'],
      'blue': ['navy', 'teal', 'turquoise'],
      'green': ['olive', 'sage', 'mint'],
      'brown': ['tan', 'beige', 'camel', 'khaki'],
      'gray': ['charcoal', 'slate'],
      'black': ['dark', 'navy'],
      'white': ['cream', 'ivory', 'ecru']
    };
    
    for (const [group, colors] of Object.entries(colorGroups)) {
      if (colors.includes(original) && colors.includes(selected)) return 0.8;
      if (original === group && colors.includes(selected)) return 0.7;
      if (colors.includes(original) && selected === group) return 0.7;
    }
    
    return 0.3; // Different colors
  }

  // Analyze style match
  analyzeStyleMatch(originalElement, selectedMatch) {
    const originalAttrs = (originalElement.attributes || []).join(' ').toLowerCase();
    const selectedAttrs = (selectedMatch.attributes || []).join(' ').toLowerCase();
    
    // Count matching attributes
    const originalWords = originalAttrs.split(' ');
    const selectedWords = selectedAttrs.split(' ');
    const matchingWords = originalWords.filter(word => selectedWords.includes(word));
    
    return matchingWords.length / Math.max(originalWords.length, 1);
  }

  // Analyze fabric match
  analyzeFabricMatch(originalElement, selectedMatch) {
    const originalDesc = (originalElement.description || '').toLowerCase();
    const selectedDesc = (selectedMatch.description || '').toLowerCase();
    
    const fabricTerms = ['cotton', 'wool', 'silk', 'linen', 'cashmere', 'polyester', 'nylon', 'rayon', 'viscose', 'spandex', 'leather', 'suede', 'denim', 'tweed', 'velvet', 'corduroy', 'chiffon', 'satin'];
    
    const originalFabrics = fabricTerms.filter(fabric => originalDesc.includes(fabric));
    const selectedFabrics = fabricTerms.filter(fabric => selectedDesc.includes(fabric));
    
    if (originalFabrics.length === 0 || selectedFabrics.length === 0) return 0.5;
    
    const matchingFabrics = originalFabrics.filter(fabric => selectedFabrics.includes(fabric));
    return matchingFabrics.length / Math.max(originalFabrics.length, 1);
  }

  // Analyze brand match
  analyzeBrandMatch(originalBrand, selectedBrand) {
    if (!originalBrand || !selectedBrand) return 0.5;
    
    const original = originalBrand.toLowerCase();
    const selected = selectedBrand.toLowerCase();
    
    if (original === selected) return 1.0;
    if (original.includes(selected) || selected.includes(original)) return 0.7;
    
    return 0.3;
  }
}

export default new OutfitMatcherAgent();
