// multi-item-detection-api.js
// Add this to your existing Express.js backend

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase (replace with your actual credentials)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class MultiItemDetectionAPI {
  constructor() {
    this.claudeApiUrl = "https://api.anthropic.com/v1/messages";
  }

  // Main endpoint: Upload and process multi-item image
  async processMultiItemUpload(req, res) {
    try {
      const { userId, autoSave = false } = req.body;
      const imageFile = req.files?.image;
      
      if (!imageFile) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      if (!userId) {
        return res.status(400).json({ error: 'User ID required' });
      }

      console.log(`🚀 Processing multi-item upload for user: ${userId}`);
      
      // Step 1: Create detection session
      const sessionId = await this.createDetectionSession(userId, imageFile);
      
      // Step 2: Detect and analyze items using Claude API
      const detectionResult = await this.detectAndAnalyzeItems(imageFile);
      
      if (!detectionResult.success) {
        await this.updateSessionStatus(sessionId, 'failed', detectionResult.error);
        return res.status(500).json(detectionResult);
      }

      // Step 3: Update session with results
      await this.updateDetectionSession(sessionId, detectionResult);
      
      // Step 4: Save items to wardrobe if requested
      let savedItems = [];
      if (autoSave) {
        savedItems = await this.saveItemsToWardrobe(
          detectionResult.items, 
          userId, 
          sessionId
        );
      }

      console.log(`✅ Successfully processed ${detectionResult.items.length} items`);

      res.json({
        success: true,
        sessionId,
        detectedItems: detectionResult.items,
        savedItems,
        itemCount: detectionResult.items.length,
        confidence: detectionResult.confidence
      });

    } catch (error) {
      console.error('❌ Multi-item upload error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Create detection session
  async createDetectionSession(userId, imageFile) {
    const imageHash = await this.calculateImageHash(imageFile);
    
    // Check for duplicate uploads
    const { data: existingSession } = await supabase
      .from('multi_item_detection_sessions')
      .select('id')
      .eq('user_id', userId)
      .eq('image_hash', imageHash)
      .single();

    if (existingSession) {
      console.log('🔄 Found existing session for this image');
      return existingSession.id;
    }

    const { data, error } = await supabase
      .from('multi_item_detection_sessions')
      .insert({
        user_id: userId,
        image_hash: imageHash,
        original_image_url: '', // Will be updated later
        processing_status: 'processing'
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  // Main AI detection function
  async detectAndAnalyzeItems(imageFile) {
    try {
      console.log('🔍 Starting AI clothing detection...');
      
      // Convert image to base64
      const base64Image = await this.imageToBase64(imageFile);
      
      // Step 1: Use Claude to detect individual items
      const detectedItems = await this.detectClothingItems(base64Image);
      
      // Step 2: Analyze each item in detail
      const analyzedItems = [];
      for (let i = 0; i < detectedItems.length; i++) {
        const item = detectedItems[i];
        console.log(`🔬 Analyzing item ${i + 1}: ${item.item_type}`);
        
        const detailedAnalysis = await this.analyzeIndividualItem(item, base64Image);
        
        analyzedItems.push({
          id: i + 1,
          type: item.item_type,
          confidence: item.confidence,
          bounding_box: item.bounding_box,
          visual_description: item.visual_description,
          details: detailedAnalysis,
          analysis_confidence: item.confidence
        });
      }

      return {
        success: true,
        items: analyzedItems,
        confidence: analyzedItems.reduce((sum, item) => sum + item.confidence, 0) / analyzedItems.length
      };

    } catch (error) {
      console.error('❌ Detection error:', error);
      return {
        success: false,
        error: error.message,
        items: []
      };
    }
  }

  // Use Claude API to detect clothing items
  async detectClothingItems(base64Image) {
    const prompt = `Analyze this image and detect ALL individual clothing items. For each item found, provide:

1. Item type (shirt, pants, dress, jacket, shoes, accessories, etc.)
2. Approximate bounding box coordinates (as percentages of image dimensions)
3. Confidence level (0-1)
4. Visual description

Focus on detecting SEPARATE clothing items - if someone is wearing a full outfit, identify each piece individually.

Respond with a JSON array in this exact format:
[
  {
    "item_type": "blazer",
    "bounding_box": {
      "x_percent": 15,
      "y_percent": 10,
      "width_percent": 35,
      "height_percent": 45
    },
    "confidence": 0.92,
    "visual_description": "Navy blue tailored blazer with lapels"
  }
]

IMPORTANT: Respond ONLY with valid JSON. Do not include any other text.`;

    const response = await fetch(this.claudeApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/jpeg",
                  data: base64Image
                }
              },
              {
                type: "text",
                text: prompt
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();
    const responseText = data.content[0].text;
    
    // Clean and parse JSON
    const cleanedResponse = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleanedResponse);
  }

  // Analyze individual clothing item
  async analyzeIndividualItem(detectedItem, base64Image) {
    const analysisPrompt = `Analyze this specific clothing item in detail: ${detectedItem.item_type}

Located at: ${JSON.stringify(detectedItem.bounding_box)}
Description: ${detectedItem.visual_description}

Provide detailed analysis in this JSON format:
{
  "color": "primary color name",
  "fabric": "fabric type (cotton, wool, silk, etc.)",
  "pattern": "pattern type (solid, striped, plaid, etc.)",
  "style": "specific style details",
  "formality_level": "casual, smart casual, business formal, black-tie",
  "season": ["applicable seasons"],
  "price_range": "estimated price range",
  "brand_tier": "contemporary, premium, luxury, ultra-luxury",
  "care_instructions": "care requirements",
  "fit_characteristics": "fit description",
  "occasion_suitability": ["suitable occasions"]
}

Respond ONLY with valid JSON.`;

    try {
      const response = await fetch(this.claudeApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
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
                    data: base64Image
                  }
                },
                {
                  type: "text",
                  text: analysisPrompt
                }
              ]
            }
          ]
        })
      });

      const data = await response.json();
      const responseText = data.content[0].text;
      
      const cleanedResponse = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      return JSON.parse(cleanedResponse);
      
    } catch (error) {
      console.error('Error in detailed analysis:', error);
      return this.getBasicItemDetails(detectedItem);
    }
  }

  // Save items to wardrobe_items table
  async saveItemsToWardrobe(items, userId, sessionId) {
    const savedItems = [];

    for (const item of items) {
      try {
        // Format data for your wardrobe_items table structure
        const wardrobeItem = {
          user_id: userId,
          name: this.generateItemName(item),
          garment_type: item.type,
          colors: JSON.stringify([{
            name: item.details.color,
            primary: true,
            confidence: 0.9
          }]),
          pattern: item.details.pattern,
          material: item.details.fabric,
          style: item.details.style,
          fit: item.details.fit_characteristics,
          brand_indicators: JSON.stringify({
            tier: item.details.brand_tier,
            luxury_level: ['luxury', 'ultra-luxury'].includes(item.details.brand_tier)
          }),
          luxury_markers: JSON.stringify({
            fabric_quality: ['cashmere', 'silk', 'wool', 'leather'].includes(item.details.fabric?.toLowerCase()),
            price_point: item.details.price_range?.includes('$500') || false
          }),
          quality_indicators: JSON.stringify({
            overall_grade: this.calculateQualityGrade(item.details)
          }),
          ai_confidence: item.analysis_confidence,
          price_range_estimate: item.details.price_range,
          source: 'multi_item_detection',
          fabrics: item.details.fabric,
          search_terms: this.generateSearchTerms(item),
          confidence_score: item.analysis_confidence,
          needs_review: item.analysis_confidence < 0.7,
          detection_session_id: sessionId,
          bounding_box: JSON.stringify(item.bounding_box),
          detection_confidence: item.confidence,
          visual_description: item.visual_description,
          item_position: item.id
        };

        const { data, error } = await supabase
          .from('wardrobe_items')
          .insert(wardrobeItem)
          .select()
          .single();

        if (error) throw error;

        savedItems.push(data);

      } catch (error) {
        console.error(`Error saving item ${item.id}:`, error);
      }
    }

    return savedItems;
  }

  // Helper functions
  async imageToBase64(imageFile) {
    if (imageFile.buffer) {
      return imageFile.buffer.toString('base64');
    }
    
    // If it's a file path, read it
    const fs = require('fs');
    const buffer = fs.readFileSync(imageFile.path);
    return buffer.toString('base64');
  }

  async calculateImageHash(imageFile) {
    const crypto = require('crypto');
    const buffer = imageFile.buffer || require('fs').readFileSync(imageFile.path);
    return crypto.createHash('sha256').update(buffer).digest('hex').substring(0, 64);
  }

  generateItemName(item) {
    const color = item.details.color || '';
    const fabric = item.details.fabric || '';
    const type = item.type || 'Item';
    return `${color} ${fabric} ${type}`.trim().replace(/\s+/g, ' ');
  }

  generateSearchTerms(item) {
    const terms = [];
    if (item.type) terms.push(item.type);
    if (item.details.color) terms.push(item.details.color);
    if (item.details.fabric) terms.push(item.details.fabric);
    if (item.details.pattern) terms.push(item.details.pattern);
    return terms;
  }

  calculateQualityGrade(details) {
    const fabricScores = { cashmere: 10, silk: 9, wool: 8, leather: 8, cotton: 6 };
    const fabricScore = fabricScores[details.fabric?.toLowerCase()] || 5;
    return fabricScore >= 8 ? 'A' : fabricScore >= 6 ? 'B' : 'C';
  }

  getBasicItemDetails(item) {
    return {
      color: 'unknown',
      fabric: 'unknown',
      pattern: 'solid',
      style: 'standard',
      formality_level: 'casual',
      season: ['all seasons'],
      price_range: 'unknown',
      brand_tier: 'contemporary'
    };
  }

  async updateDetectionSession(sessionId, results) {
    await supabase
      .from('multi_item_detection_sessions')
      .update({
        total_items_detected: results.items.length,
        overall_confidence: results.confidence,
        processing_status: 'completed'
      })
      .eq('id', sessionId);
  }

  async updateSessionStatus(sessionId, status, errorMessage = null) {
    await supabase
      .from('multi_item_detection_sessions')
      .update({
        processing_status: status,
        error_message: errorMessage
      })
      .eq('id', sessionId);
  }
}

// Export the API class and setup function
const multiItemAPI = new MultiItemDetectionAPI();

export function setupMultiItemAPI(app) {
  // Main upload endpoint
  app.post('/api/wardrobe/multi-item-upload', (req, res) => {
    multiItemAPI.processMultiItemUpload(req, res);
  });

  // Get session results
  app.get('/api/wardrobe/detection-session/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      const { data: session } = await supabase
        .from('multi_item_detection_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      const { data: items } = await supabase
        .from('wardrobe_items')
        .select('*')
        .eq('detection_session_id', sessionId);

      res.json({ session, items });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Submit feedback
  app.post('/api/wardrobe/detection-feedback', async (req, res) => {
    try {
      const { sessionId, wardrobeItemId, feedbackType, originalValues, correctedValues, notes } = req.body;
      
      await supabase
        .from('multi_item_detection_feedback')
        .insert({
          detection_session_id: sessionId,
          wardrobe_item_id: wardrobeItemId,
          feedback_type: feedbackType,
          original_values: originalValues,
          corrected_values: correctedValues,
          user_notes: notes
        });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

export default multiItemAPI;