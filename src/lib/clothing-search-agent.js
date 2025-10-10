// src/lib/clothing-search-agent.js
// ClothingSearch agent for optimized query generation

class ClothingSearchAgent {
  constructor() {
    // System prompt for query generation
    this.systemPrompt = `
You are an expert in creating optimized search queries for clothing items.
Your task is to analyze clothing item details and generate a search query that prioritizes the most important aspects.

When generating queries, follow this priority order:
1. TYPE: The category of item (e.g., dress, shirt, pants)
2. COLOR: Getting as close to the original color is very important. Emphasize color as a top priority.
3. STYLE/SILHOUETTE: Identify the exact cut, distinctive design features, and proportions
4. MATERIAL/TEXTURE: Specify the material composition, weight, drape, and texture
5. BRAND: Brand information when available

Start your prompt with the highest priority elements. Then include the important details:
"Gray Blazer, Classic style, Tailored fit. Important details: Wool textured! Notched Lapel, Two-Button Closure, Flap Pockets, Tailored Fit"

Be sure to include specific names that appear in the description. Names like "Aran" are important descriptors!

**IMPORTANT NOTE**
1. Our system does not use the word "jeans". So if you are going to query for something like "Dark wash denim jeans", substitute "denim pants" instead.
2. Don't get too fancy with color names when you're building a query. Instead of "Terracotta", just use "red" or "dull red".

Return only the query text with no additional explanation.
`;

    // Color simplification mapping
    this.colorSimplifications = {
      'terracotta': 'red',
      'burgundy': 'dark red',
      'maroon': 'dark red',
      'navy': 'blue',
      'teal': 'blue-green',
      'turquoise': 'blue-green',
      'coral': 'pink',
      'salmon': 'pink',
      'peach': 'pink',
      'beige': 'tan',
      'ecru': 'cream',
      'ivory': 'white',
      'charcoal': 'gray',
      'slate': 'gray',
      'taupe': 'brown',
      'camel': 'brown',
      'khaki': 'brown'
    };

    // Clothing type mappings
    this.clothingTypeMappings = {
      'jeans': 'denim pants',
      'denim jeans': 'denim pants',
      'dark wash jeans': 'dark wash denim pants',
      'light wash jeans': 'light wash denim pants'
    };
  }

  // Generate optimized search query for a clothing element
  generateQuery(element) {
    const userPrompt = this.getQueryGenerationPrompt(element);
    return this.callClaudeAPI(this.systemPrompt, userPrompt);
  }

  // Generate prompt for query optimization
  getQueryGenerationPrompt(element) {
    return `
Please generate an optimized search query for this clothing item:

ITEM NAME: ${element.name || 'Unknown'}
TYPE: ${element.type || 'Unknown'}
COLOR: ${element.color || 'Unknown'}
BRAND: ${element.brand || 'Unknown'}
ATTRIBUTES: ${(element.attributes || []).join(', ')}
DESCRIPTION: ${element.description || ''}

Create a search query that prioritizes the most important and distinctive features of this item. The search will be performed on a vector database and your query will be embedded using the text-embedding-004 model. Take this into account. We are searching for items with a similar description.

Be sure to include all attributes and special terms from the description. Follow the prioritization scheme and emphasize elements of the prompt according to that order. Be sure to include specific or unique names like 'Aran' that are used in the description.

Your query might look something like:

"Gray Blazer, Classic style, Tailored fit. Important details: Wool textured! Notched Lapel, Two-Button Closure, Flap Pockets, Tailored Fit"

Be sure to call out important details.

Return ONLY the query text.
`;
  }

  // Full prompt for query generation
  getQueryGenerationFullPrompt(element) {
    return {
      systemPrompt: this.systemPrompt,
      userPrompt: this.getQueryGenerationPrompt(element)
    };
  }

  // Call Claude API for query generation
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
        max_tokens: 500,
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
    return data.content[0].text.trim();
  }

  // Simplify color names
  simplifyColor(color) {
    if (!color) return color;
    
    const lowerColor = color.toLowerCase();
    return this.colorSimplifications[lowerColor] || color;
  }

  // Map clothing types
  mapClothingType(type) {
    if (!type) return type;
    
    const lowerType = type.toLowerCase();
    return this.clothingTypeMappings[lowerType] || type;
  }

  // Generate query for multiple elements
  async generateQueriesForElements(elements) {
    const queries = [];
    
    for (const element of elements) {
      try {
        const query = await this.generateQuery(element);
        queries.push({
          element: element,
          query: query,
          success: true
        });
      } catch (error) {
        console.error(`Failed to generate query for element ${element.name}:`, error);
        queries.push({
          element: element,
          query: '',
          success: false,
          error: error.message
        });
      }
    }
    
    return queries;
  }

  // Extract key features from element for query generation
  extractKeyFeatures(element) {
    const features = {
      type: this.mapClothingType(element.type),
      color: this.simplifyColor(element.color),
      brand: element.brand,
      attributes: element.attributes || [],
      description: element.description || '',
      embellishments: element.embellishments || []
    };

    return features;
  }

  // Generate query with key features
  async generateQueryWithFeatures(element) {
    const features = this.extractKeyFeatures(element);
    const enhancedElement = { ...element, ...features };
    return this.generateQuery(enhancedElement);
  }
}

export default new ClothingSearchAgent();
