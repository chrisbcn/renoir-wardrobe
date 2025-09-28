// src/lib/receipt-analyzer.js
// Comprehensive receipt analysis with OCR and intelligent text processing

class ReceiptAnalyzer {
  constructor() {
    // Enhanced fashion knowledge for receipt text analysis
    this.fashionKnowledge = {
      categories: {
        'shirt': { variations: ['shirt', 'blouse', 'top', 'tee', 't-shirt', 'polo'], confidence: 0.9 },
        'dress': { variations: ['dress', 'gown', 'frock', 'sundress', 'maxi', 'midi'], confidence: 0.9 },
        'pants': { variations: ['pants', 'trousers', 'jeans', 'chinos', 'slacks', 'leggings'], confidence: 0.9 },
        'jacket': { variations: ['jacket', 'blazer', 'coat', 'outerwear', 'windbreaker'], confidence: 0.9 },
        'sweater': { variations: ['sweater', 'pullover', 'cardigan', 'jumper', 'hoodie'], confidence: 0.9 },
        'shoes': { variations: ['shoes', 'boots', 'sneakers', 'heels', 'flats', 'sandals', 'loafers'], confidence: 0.9 },
        'bag': { variations: ['bag', 'handbag', 'purse', 'tote', 'clutch', 'backpack', 'satchel'], confidence: 0.9 },
        'skirt': { variations: ['skirt', 'mini', 'maxi', 'pencil', 'a-line'], confidence: 0.9 },
        'shorts': { variations: ['shorts', 'bermuda', 'cargo', 'board'], confidence: 0.9 },
        'underwear': { variations: ['underwear', 'bra', 'panties', 'briefs', 'boxers', 'lingerie'], confidence: 0.8 }
      },

      luxuryBrands: [
        'kiton', 'brioni', 'ermenegildo zegna', 'loro piana', 'brunello cucinelli',
        'tom ford', 'ralph lauren', 'armani', 'gucci', 'prada', 'bottega veneta',
        'hermès', 'chanel', 'dior', 'saint laurent', 'balenciaga', 'givenchy',
        'valentino', 'versace', 'dolce gabbana', 'fendi', 'louis vuitton'
      ],

      fabrics: {
        'wool': { variations: ['wool', 'merino', 'lambswool', 'cashmere wool'], confidence: 0.9 },
        'cashmere': { variations: ['cashmere', 'kashmir', 'cash'], confidence: 0.95 },
        'silk': { variations: ['silk', 'mulberry silk', 'pure silk'], confidence: 0.9 },
        'cotton': { variations: ['cotton', 'pima cotton', 'egyptian cotton', 'organic cotton'], confidence: 0.9 },
        'linen': { variations: ['linen', 'flax', 'belgian linen'], confidence: 0.9 },
        'leather': { variations: ['leather', 'genuine leather', 'full grain', 'top grain'], confidence: 0.95 },
        'suede': { variations: ['suede', 'nubuck'], confidence: 0.9 },
        'denim': { variations: ['denim', 'jean', 'chambray'], confidence: 0.9 }
      },

      colors: {
        'black': { variations: ['black', 'nero', 'noir', 'charcoal'], confidence: 0.95 },
        'white': { variations: ['white', 'bianco', 'blanc', 'ivory', 'cream', 'off-white'], confidence: 0.95 },
        'navy': { variations: ['navy', 'naval', 'midnight', 'deep blue'], confidence: 0.95 },
        'blue': { variations: ['blue', 'azure', 'cerulean', 'cobalt', 'royal'], confidence: 0.95 },
        'grey': { variations: ['grey', 'gray', 'grigio', 'charcoal', 'slate'], confidence: 0.95 },
        'brown': { variations: ['brown', 'chocolate', 'cognac', 'tan', 'camel'], confidence: 0.95 },
        'beige': { variations: ['beige', 'nude', 'sand', 'khaki', 'taupe'], confidence: 0.9 },
        'red': { variations: ['red', 'crimson', 'burgundy', 'wine', 'cherry'], confidence: 0.95 },
        'green': { variations: ['green', 'forest', 'olive', 'emerald', 'sage'], confidence: 0.95 }
      },

      pricePatterns: [
        /\$\s?(\d{1,5}(?:[,.]\d{2})?)/g,  // $1,234.56 or $1234.56
        /(\d{1,5}(?:[,.]\d{2})?)\s?USD/g,  // 1234.56 USD
        /(\d{1,5}(?:[,.]\d{2})?)\s?€/g,    // 1234.56 €
        /€\s?(\d{1,5}(?:[,.]\d{2})?)/g,    // € 1234.56
        /(\d{1,5}(?:[,.]\d{2})?)\s?GBP/g   // 1234.56 GBP
      ]
    };

    this.commonReceiptNoise = [
      'tax', 'vat', 'total', 'subtotal', 'qty', 'quantity', 'size', 'color',
      'item', 'product', 'code', 'sku', 'style', 'ref', 'reference'
    ];
  }

  /**
   * Main function: Analyze receipt (image or text)
   */
  async analyzeReceipt(input, inputType = 'auto') {
    console.log('📋 Starting receipt analysis...');
    
    try {
      let receiptText = '';
      
      // Step 1: Extract text from receipt
      if (inputType === 'image' || (inputType === 'auto' && input instanceof File)) {
        console.log('🔍 Extracting text from receipt image...');
        receiptText = await this.extractTextFromReceiptImage(input);
      } else {
        receiptText = input;
      }
      
      // Step 2: Clean and structure the text
      const cleanedText = this.cleanReceiptText(receiptText);
      
      // Step 3: Extract individual items
      const items = this.extractReceiptItems(cleanedText);
      
      // Step 4: Analyze each item with fashion intelligence
      const analyzedItems = items.map(item => this.analyzeFashionItem(item));
      
      // Step 5: Extract receipt metadata
      const metadata = this.extractReceiptMetadata(cleanedText);
      
      // Step 6: Calculate overall confidence
      const confidence = this.calculateReceiptConfidence(analyzedItems);
      
      const result = {
        receipt_metadata: metadata,
        items: analyzedItems,
        summary: {
          total_items: analyzedItems.length,
          high_confidence_items: analyzedItems.filter(item => item.confidence_score >= 0.7).length,
          needs_review_items: analyzedItems.filter(item => item.needs_review).length,
          overall_confidence: confidence,
          estimated_total: analyzedItems.reduce((sum, item) => sum + (item.price || 0), 0)
        },
        raw_text: receiptText,
        processed_at: new Date().toISOString()
      };

      console.log(`✅ Receipt analysis complete. Found ${analyzedItems.length} items with ${(confidence * 100).toFixed(0)}% confidence`);
      return result;

    } catch (error) {
      console.error('❌ Receipt analysis failed:', error);
      throw new Error(`Receipt analysis failed: ${error.message}`);
    }
  }

  /**
   * Extract text from receipt image using Claude Vision
   */
  async extractTextFromReceiptImage(imageFile) {
    const base64Image = await this.convertImageToBase64(imageFile);
    
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
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
                    media_type: imageFile.type,
                    data: base64Image
                  }
                },
                {
                  type: "text",
                  text: `Extract ALL text from this receipt image. Focus on:
                  
1. Store/brand name and address
2. Date and time of purchase
3. Each item description with price
4. SKU/style numbers if visible
5. Subtotal, tax, and total amounts
6. Payment method used

Please preserve the original formatting and include every piece of text you can see, even if it seems unclear. Format your response as:

STORE INFO:
[store details]

DATE: [date/time]

ITEMS:
[each item on its own line with price]

TOTALS:
[subtotal, tax, total]

PAYMENT:
[payment info]

Be thorough and include all visible text.`
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status}`);
      }

      const data = await response.json();
      return data.content[0].text;

    } catch (error) {
      console.error('OCR failed:', error);
      throw new Error(`Text extraction failed: ${error.message}`);
    }
  }

  /**
   * Clean and normalize receipt text
   */
  cleanReceiptText(rawText) {
    return rawText
      .replace(/\r\n/g, '\n')  // Normalize line endings
      .replace(/\t/g, ' ')     // Replace tabs with spaces
      .replace(/  +/g, ' ')    // Replace multiple spaces with single space
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');
  }

  /**
   * Extract individual items from receipt text
   */
  extractReceiptItems(cleanedText) {
    const lines = cleanedText.split('\n');
    const items = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip obvious non-item lines
      if (this.isNonItemLine(line)) continue;
      
      // Look for price patterns
      const priceMatch = this.extractPrice(line);
      if (!priceMatch) continue;
      
      // Extract description (everything before the price)
      const description = this.extractDescription(line, priceMatch);
      
      if (description && description.length > 2) {
        items.push({
          description: description.trim(),
          price: priceMatch.amount,
          currency: priceMatch.currency,
          raw_line: line,
          line_number: i + 1
        });
      }
    }
    
    return items;
  }

  /**
   * Check if a line is clearly not an item (headers, totals, etc.)
   */
  isNonItemLine(line) {
    const lowerLine = line.toLowerCase();
    
    const nonItemKeywords = [
      'subtotal', 'total', 'tax', 'vat', 'discount', 'payment', 'change',
      'cash', 'card', 'credit', 'debit', 'receipt', 'store', 'address',
      'phone', 'thank you', 'thanks', 'visit', 'return', 'exchange',
      'policy', 'www', 'http', 'email', '@'
    ];
    
    return nonItemKeywords.some(keyword => lowerLine.includes(keyword)) ||
           line.length < 3 ||
           /^\d{1,3}$/.test(line.trim()) || // Just a number
           /^[*\-=+_\s]+$/.test(line);      // Just symbols/spaces
  }

  /**
   * Extract price from a line
   */
  extractPrice(line) {
    for (const pattern of this.fashionKnowledge.pricePatterns) {
      const match = pattern.exec(line);
      if (match) {
        const amount = parseFloat(match[1].replace(',', ''));
        const currency = this.detectCurrency(line, match[0]);
        
        // Reasonable price range for fashion items ($10 - $50,000)
        if (amount >= 10 && amount <= 50000) {
          return { amount, currency, match: match[0] };
        }
      }
    }
    return null;
  }

  /**
   * Detect currency from price match
   */
  detectCurrency(line, priceMatch) {
    if (priceMatch.includes('$')) return 'USD';
    if (priceMatch.includes('€')) return 'EUR';
    if (priceMatch.includes('£') || priceMatch.includes('GBP')) return 'GBP';
    return 'USD'; // Default
  }

  /**
   * Extract item description from line
   */
  extractDescription(line, priceMatch) {
    // Remove the price match from the line
    const description = line.replace(priceMatch.match, '').trim();
    
    // Remove common prefixes/suffixes
    return description
      .replace(/^\d+\s*x?\s*/i, '')  // Remove quantity prefix
      .replace(/\s*-\s*$/, '')       // Remove trailing dash
      .replace(/^\s*-\s*/, '')       // Remove leading dash
      .trim();
  }

  /**
   * Analyze individual fashion item with Fashionpedia knowledge
   */
  analyzeFashionItem(item) {
    const description = item.description.toLowerCase();
    
    // Detect category
    const category = this.detectCategory(description);
    
    // Detect colors
    const colors = this.detectColors(description);
    
    // Detect fabrics
    const fabrics = this.detectFabrics(description);
    
    // Detect brand
    const brand = this.detectBrand(description);
    
    // Generate search terms
    const searchTerms = this.generateItemSearchTerms(category, colors, fabrics, description);
    
    // Calculate confidence
    const confidence = this.calculateItemConfidence(category, colors, fabrics, brand);
    
    return {
      ...item,
      analysis: {
        category: category,
        colors: colors,
        fabrics: fabrics,
        brand: brand,
        search_terms: searchTerms,
        confidence_score: confidence,
        needs_review: confidence < 0.7
      }
    };
  }

  detectCategory(description) {
    for (const [categoryName, categoryData] of Object.entries(this.fashionKnowledge.categories)) {
      if (categoryData.variations.some(variation => description.includes(variation))) {
        return {
          name: categoryName,
          confidence: categoryData.confidence,
          matched_term: categoryData.variations.find(v => description.includes(v))
        };
      }
    }
    return { name: 'unknown', confidence: 0.0, matched_term: null };
  }

  detectColors(description) {
    const detectedColors = [];
    
    for (const [colorName, colorData] of Object.entries(this.fashionKnowledge.colors)) {
      if (colorData.variations.some(variation => description.includes(variation))) {
        detectedColors.push({
          name: colorName,
          confidence: colorData.confidence,
          matched_term: colorData.variations.find(v => description.includes(v))
        });
      }
    }
    
    return detectedColors;
  }

  detectFabrics(description) {
    const detectedFabrics = [];
    
    for (const [fabricName, fabricData] of Object.entries(this.fashionKnowledge.fabrics)) {
      if (fabricData.variations.some(variation => description.includes(variation))) {
        detectedFabrics.push({
          name: fabricName,
          confidence: fabricData.confidence,
          matched_term: fabricData.variations.find(v => description.includes(v))
        });
      }
    }
    
    return detectedFabrics;
  }

  detectBrand(description) {
    const brand = this.fashionKnowledge.luxuryBrands.find(brand => 
      description.includes(brand.toLowerCase())
    );
    
    return brand ? { name: brand, confidence: 0.95 } : { name: 'unknown', confidence: 0.0 };
  }

  generateItemSearchTerms(category, colors, fabrics, description) {
    const terms = new Set();
    
    // Add category
    if (category.name !== 'unknown') {
      terms.add(category.name);
    }
    
    // Add colors
    colors.forEach(color => terms.add(color.name));
    
    // Add fabrics
    fabrics.forEach(fabric => terms.add(fabric.name));
    
    // Add combinations
    if (colors.length > 0 && category.name !== 'unknown') {
      terms.add(`${colors[0].name} ${category.name}`);
    }
    
    if (fabrics.length > 0 && category.name !== 'unknown') {
      terms.add(`${fabrics[0].name} ${category.name}`);
    }
    
    // Add original description as fallback
    terms.add(description);
    
    return Array.from(terms);
  }

  calculateItemConfidence(category, colors, fabrics, brand) {
    let confidence = 0.2; // Base confidence
    
    // Category confidence
    if (category.name !== 'unknown') {
      confidence += 0.4;
    }
    
    // Attribute confidence
    if (colors.length > 0) confidence += 0.15;
    if (fabrics.length > 0) confidence += 0.15;
    if (brand.name !== 'unknown') confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  extractReceiptMetadata(cleanedText) {
    const lines = cleanedText.split('\n');
    
    return {
      store_name: this.extractStoreName(lines),
      date: this.extractDate(lines),
      location: this.extractLocation(lines),
      receipt_number: this.extractReceiptNumber(lines)
    };
  }

  extractStoreName(lines) {
    // Store name is usually in the first few lines
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i].trim();
      if (line.length > 3 && !line.match(/^\d+/) && !line.includes('address')) {
        return line;
      }
    }
    return 'Unknown Store';
  }

  extractDate(lines) {
    const datePatterns = [
      /(\d{1,2}\/\d{1,2}\/\d{2,4})/,      // MM/DD/YYYY
      /(\d{1,2}-\d{1,2}-\d{2,4})/,       // MM-DD-YYYY
      /(\d{4}-\d{1,2}-\d{1,2})/,         // YYYY-MM-DD
      /(\w{3,9}\s+\d{1,2},?\s+\d{4})/    // Month DD, YYYY
    ];
    
    for (const line of lines) {
      for (const pattern of datePatterns) {
        const match = line.match(pattern);
        if (match) {
          return match[1];
        }
      }
    }
    return null;
  }

  extractLocation(lines) {
    // Look for address patterns
    for (const line of lines) {
      if (line.toLowerCase().includes('address') || 
          line.match(/\d+\s+\w+\s+(st|street|ave|avenue|rd|road|blvd|boulevard)/i)) {
        return line;
      }
    }
    return null;
  }

  extractReceiptNumber(lines) {
    for (const line of lines) {
      const match = line.match(/(?:receipt|ref|transaction|order)[\s#:]*(\w+\d+|\d+\w*)/i);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  calculateReceiptConfidence(analyzedItems) {
    if (analyzedItems.length === 0) return 0.0;
    
    const totalConfidence = analyzedItems.reduce((sum, item) => 
      sum + item.analysis.confidence_score, 0
    );
    
    return totalConfidence / analyzedItems.length;
  }

  // Helper function
  async convertImageToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

// Export singleton instance
const receiptAnalyzer = new ReceiptAnalyzer();
export default receiptAnalyzer;