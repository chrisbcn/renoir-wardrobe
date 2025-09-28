// api/analyze.js
// Working version with enhanced fashion analysis

const { fashionAnalyzer } = require('../src/lib/fashion-analyzer');

// Luxury fashion analysis prompt
const getLuxuryAnalysisPrompt = () => {
  return `Analyze this fashion item as a luxury fashion expert. Provide detailed analysis in JSON format:

{
  "name": "Item name (e.g., 'Double-breasted blazer', 'Silk dress')",
  "type": "Specific garment type",
  "brand": "Brand name if identifiable",
  "tier": "luxury/premium/contemporary/fast fashion",
  "colors": ["primary color", "secondary colors"],
  "fabrics": ["fabric types identified"],
  "summary": "Brief professional description",
  "keyFeatures": ["distinctive features that matter for styling"],
  "estimatedValue": "$X,XXX range",
  "condition": "new/excellent/good/fair",
  "qualityScore": "1-10 scale",
  "authenticityConfidence": "high/medium/low"
}

Focus on details that matter for luxury fashion curation and styling. Respond ONLY with valid JSON.`;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image, type = 'wardrobe', prompt } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    console.log('Starting enhanced analysis for type:', type);

    // Use custom prompt or default luxury prompt
    const analysisPrompt = prompt || getLuxuryAnalysisPrompt();

    // Call Claude API for image analysis
    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-sonnet-20240229",
        max_tokens: 1500,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/jpeg",
                  data: image,
                },
              },
              {
                type: "text",
                text: analysisPrompt,
              },
            ],
          },
        ],
      }),
    });

    if (!claudeResponse.ok) {
      throw new Error(`Claude API error: ${claudeResponse.status}`);
    }

    const claudeData = await claudeResponse.json();
    let analysis = claudeData.content[0].text;

    // Clean up the response to extract JSON
    analysis = analysis.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    // Try to parse as JSON
    let parsedAnalysis;
    try {
      parsedAnalysis = JSON.parse(analysis);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      // Return a basic analysis if JSON parsing fails
      parsedAnalysis = {
        name: "Fashion Item",
        type: "unknown",
        summary: analysis.substring(0, 200) + "...",
        error: "Could not parse detailed analysis"
      };
    }

    // Enhance with Fashionpedia knowledge if it's a text-based analysis
    if (parsedAnalysis.name || parsedAnalysis.summary) {
      const textToAnalyze = `${parsedAnalysis.name || ''} ${parsedAnalysis.summary || ''}`;
      const fashionEnhancement = fashionAnalyzer.analyzeFashionText(textToAnalyze);
      
      if (fashionEnhancement) {
        // Merge the enhancements
        parsedAnalysis.enhancedCategory = fashionEnhancement.clothingType;
        parsedAnalysis.enhancedColors = fashionEnhancement.colors;
        parsedAnalysis.enhancedFabrics = fashionEnhancement.fabrics;
        parsedAnalysis.searchTerms = fashionEnhancement.searchTerms;
        parsedAnalysis.confidence = fashionEnhancement.confidence;
        parsedAnalysis.needsReview = fashionEnhancement.needsReview;
        
        console.log(`Analysis complete. Category: ${fashionEnhancement.clothingType}, Confidence: ${Math.round(fashionEnhancement.confidence * 100)}%`);
      }
    }

    return res.status(200).json({ 
      success: true, 
      analysis: parsedAnalysis 
    });

  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({ 
      error: 'Analysis failed', 
      details: error.message 
    });
  }
}