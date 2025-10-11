/**
 * Multi-Item Detector
 * Simplified class for detecting multiple clothing items in outfit images
 */

export class MultiItemDetector {
  constructor() {
    this.claudeApiKey = process.env.CLAUDE_API_KEY;
  }

  /**
   * Detect clothing items in an outfit image
   * @param {string} imageData - Base64 encoded image data
   * @returns {Promise<Array>} Array of detected items with bounding boxes
   */
  async detectClothingItems(imageData) {
    try {
      console.log('🔍 Detecting clothing items in outfit image...');
      
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.claudeApiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this outfit image and identify all visible clothing items. For each item, provide:
                1. Item type (shirt, pants, dress, jacket, blazer, sweater, vest, shoes, handbag, skirt, shorts)
                2. Visual description
                3. Approximate bounding box coordinates (x, y, width, height as percentages)
                4. Confidence level (0-1)
                
                Respond with a JSON array of objects in this format:
                [
                  {
                    "item_type": "shirt",
                    "visual_description": "Blue button-up shirt with collar",
                    "bounding_box": {"x": 20, "y": 30, "width": 30, "height": 40},
                    "confidence": 0.9
                  }
                ]
                
                Only include items that are clearly visible and identifiable.`
              },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: imageData.replace(/^data:image\/[a-z]+;base64,/, '')
                }
              }
            ]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.content[0].text;
      
      // Parse the JSON response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in Claude response');
      }

      const detectedItems = JSON.parse(jsonMatch[0]);
      
      console.log(`✅ Detected ${detectedItems.length} clothing items`);
      
      return detectedItems;
      
    } catch (error) {
      console.error('❌ Multi-item detection failed:', error);
      throw new Error(`Failed to detect clothing items: ${error.message}`);
    }
  }

  /**
   * Extract individual item from image using bounding box
   * @param {string} imageData - Base64 encoded image data
   * @param {Object} detectedItem - Item with bounding box info
   * @returns {Promise<string>} Base64 encoded cropped image
   */
  async extractItemFromImage(imageData, detectedItem) {
    // For now, return the full image
    // TODO: Implement actual image cropping based on bounding box
    console.log(`📸 Extracting item: ${detectedItem.item_type} from bounding box`);
    return imageData;
  }

  /**
   * Validate detected items
   * @param {Array} items - Array of detected items
   * @returns {Object} Validation result
   */
  validateDetectedItems(items) {
    const validItems = [];
    const errors = [];

    items.forEach((item, index) => {
      if (!item.item_type) {
        errors.push(`Item ${index}: Missing item_type`);
        return;
      }

      if (!item.visual_description) {
        errors.push(`Item ${index}: Missing visual_description`);
        return;
      }

      if (!item.bounding_box || typeof item.bounding_box.x !== 'number') {
        errors.push(`Item ${index}: Invalid bounding_box`);
        return;
      }

      if (typeof item.confidence !== 'number' || item.confidence < 0 || item.confidence > 1) {
        errors.push(`Item ${index}: Invalid confidence value`);
        return;
      }

      validItems.push(item);
    });

    return {
      valid: validItems.length > 0,
      items: validItems,
      errors: errors
    };
  }
}
