// api/recreate-item.js
// Add this new API endpoint to work with your existing multi-item detection

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { item, originalImage } = req.body;

    if (!item) {
      return res.status(400).json({ error: 'No item data provided' });
    }

    console.log(`🎨 Recreating item: ${item.type}`);

    // Step 1: Use your existing Claude setup to create enhanced descriptions
    const enhancedDescription = await createEnhancedDescription(item, originalImage);
    
    // Step 2: Generate professional product image using Claude + DALL-E
    const recreatedImage = await generateProductImage(enhancedDescription, item);
    
    // Step 3: Create product title and marketing description
    const productDetails = await generateProductDetails(item, enhancedDescription);

    return res.status(200).json({
      success: true,
      recreatedImage: recreatedImage,
      productTitle: productDetails.title,
      productDescription: productDetails.description,
      enhancedDescription: enhancedDescription,
      features: productDetails.features
    });

  } catch (error) {
    console.error('❌ Recreation error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// Use Claude API to create enhanced description (similar to your existing setup)
async function createEnhancedDescription(item, originalImage) {
  const prompt = `Based on this detected clothing item, create a detailed description suitable for generating a professional product photo:

Detected Item: ${item.type}
Color: ${item.color}
Material: ${item.material || 'Unknown'}
Description: ${item.description}
Confidence: ${Math.round(item.confidence * 100)}%

Create a comprehensive description for a professional e-commerce product photo that includes:
1. Exact garment style and cut details
2. Color accuracy and any patterns
3. Fabric texture and finish
4. Construction details (buttons, seams, collar, etc.)
5. How it should be presented (flat lay, on model, hanging)

The photo should look like it belongs on a luxury fashion website like Zara, COS, or a designer brand.

Focus on creating a clean, professional product shot with:
- Neutral background (white or light gray)
- Professional lighting
- Front-facing clear view
- High-end retail presentation style`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const result = await response.json();
    return result.content[0].text;

  } catch (error) {
    console.error('Error creating enhanced description:', error);
    // Fallback description
    return `Professional ${item.type} in ${item.color}, photographed on clean white background with professional lighting. High-quality fashion product photo suitable for e-commerce display.`;
  }
}

// Generate professional product image
async function generateProductImage(enhancedDescription, item) {
  // Option 1: Use DALL-E 3 for highest quality
  if (process.env.OPENAI_API_KEY) {
    try {
      const dallePrompt = `Professional fashion e-commerce product photograph: ${enhancedDescription}

Style requirements:
- Clean white or light gray background
- Professional studio lighting
- High-end fashion photography
- Sharp focus and high resolution
- Suitable for luxury brand website
- No model, just the garment
- Front-facing view
- Premium retail presentation`;

      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: dallePrompt,
          n: 1,
          size: "1024x1024",
          quality: "hd",
          style: "natural"
        }),
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.data && result.data[0]) {
          // Convert URL to base64 for consistent handling
          const imageResponse = await fetch(result.data[0].url);
          const imageBuffer = await imageResponse.arrayBuffer();
          const imageBase64 = Buffer.from(imageBuffer).toString('base64');
          return `data:image/png;base64,${imageBase64}`;
        }
      }
    } catch (error) {
      console.error('DALL-E generation failed:', error);
    }
  }

  // Option 2: Use Gemini for image generation (if you prefer to stick with Google)
  if (process.env.GEMINI_API_KEY) {
    try {
      const geminiPrompt = `Generate a professional fashion product photograph: ${enhancedDescription}`;
      
      // Note: Gemini 2.0 Flash can generate images, but API might be limited
      // This would need to be implemented based on available Gemini capabilities
      
    } catch (error) {
      console.error('Gemini generation failed:', error);
    }
  }

  // Option 3: Placeholder with styling that matches your UI
  return generatePlaceholderImage(item);
}

// Generate product title and description
async function generateProductDetails(item, enhancedDescription) {
  const prompt = `Based on this clothing item analysis, create marketing copy for an e-commerce product:

Item Type: ${item.type}
Color: ${item.color}
Enhanced Description: ${enhancedDescription}

Create:
1. A product title (like "Slim-Fit Cotton Oxford Shirt" or "High-Waisted Straight-Leg Trousers")
2. A brief marketing description (2-3 sentences)
3. Key features list (3-5 bullet points)

Return as JSON:
{
  "title": "product title here",
  "description": "marketing description here",
  "features": ["feature1", "feature2", "feature3"]
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const result = await response.json();
    const content = result.content[0].text;
    
    // Parse JSON response
    try {
      const cleanedContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      return JSON.parse(cleanedContent);
    } catch (parseError) {
      // Fallback if JSON parsing fails
      return {
        title: `${item.color} ${item.type}`,
        description: `Premium ${item.type.toLowerCase()} in ${item.color.toLowerCase()}. Professionally curated for your wardrobe.`,
        features: ["High quality", "Professional style", "Versatile design"]
      };
    }

  } catch (error) {
    console.error('Error generating product details:', error);
    // Fallback details
    return {
      title: `${item.color} ${item.type}`,
      description: `Beautiful ${item.type.toLowerCase()} detected from your photo, recreated as a professional product image.`,
      features: ["AI-detected style", "Color-matched", "Professional recreation"]
    };
  }
}

// Generate styled placeholder image
function generatePlaceholderImage(item) {
  const svg = `
    <svg width="400" height="500" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#f8fafc;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#e2e8f0;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="400" height="500" fill="url(#bg)"/>
      
      <!-- Clothing icon based on type -->
      <g transform="translate(200, 250)">
        ${getClothingIcon(item.type)}
      </g>
      
      <!-- Item details -->
      <text x="200" y="350" text-anchor="middle" fill="#475569" font-family="Arial, sans-serif" font-size="18" font-weight="bold">
        ${item.color} ${item.type}
      </text>
      <text x="200" y="375" text-anchor="middle" fill="#64748b" font-family="Arial, sans-serif" font-size="14">
        Professional Recreation
      </text>
      <text x="200" y="400" text-anchor="middle" fill="#94a3b8" font-family="Arial, sans-serif" font-size="12">
        AI-Generated Product Photo
      </text>
      
      <!-- Decorative border -->
      <rect x="20" y="20" width="360" height="460" fill="none" stroke="#e2e8f0" stroke-width="2" rx="8"/>
    </svg>
  `;

  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
}

// Helper function to get appropriate clothing icon
function getClothingIcon(type) {
  const iconSize = 80;
  const color = "#6366f1";
  
  switch (type.toLowerCase()) {
    case 'shirt':
    case 'blouse':
      return `<rect x="-${iconSize/2}" y="-${iconSize/2}" width="${iconSize}" height="${iconSize*0.8}" fill="${color}" rx="8"/>
              <rect x="-${iconSize/3}" y="-${iconSize/2}" width="${iconSize*0.15}" height="${iconSize*0.4}" fill="${color}"/>
              <rect x="${iconSize/5}" y="-${iconSize/2}" width="${iconSize*0.15}" height="${iconSize*0.4}" fill="${color}"/>`;
    
    case 'pants':
    case 'trousers':
      return `<rect x="-${iconSize/4}" y="-${iconSize/2}" width="${iconSize*0.2}" height="${iconSize}" fill="${color}" rx="4"/>
              <rect x="${iconSize/20}" y="-${iconSize/2}" width="${iconSize*0.2}" height="${iconSize}" fill="${color}" rx="4"/>`;
    
    case 'dress':
      return `<polygon points="0,-${iconSize/2} -${iconSize/3},${iconSize/4} ${iconSize/3},${iconSize/4}" fill="${color}"/>
              <rect x="-${iconSize/6}" y="-${iconSize/2}" width="${iconSize/3}" height="${iconSize/4}" fill="${color}" rx="4"/>`;
    
    case 'jacket':
    case 'blazer':
      return `<rect x="-${iconSize/2}" y="-${iconSize/3}" width="${iconSize}" height="${iconSize*0.9}" fill="${color}" rx="12"/>
              <rect x="-${iconSize/2.5}" y="-${iconSize/3}" width="${iconSize*0.3}" height="${iconSize*0.5}" fill="${color}"/>
              <rect x="${iconSize/8}" y="-${iconSize/3}" width="${iconSize*0.3}" height="${iconSize*0.5}" fill="${color}"/>`;
    
    default:
      return `<circle cx="0" cy="0" r="${iconSize/2}" fill="${color}"/>
              <text x="0" y="8" text-anchor="middle" fill="white" font-family="Arial" font-size="24">👕</text>`;
  }
}