// src/lib/fashion-analyzer.js
// Working fashion analyzer based on Fashionpedia knowledge

const CLOTHING_CATEGORIES = {
    'jacket': ['blazer', 'coat', 'cardigan', 'bomber', 'denim jacket'],
    'top': ['shirt', 'blouse', 'sweater', 'turtleneck', 't-shirt', 'tank'],
    'bottom': ['trouser', 'pant', 'jean', 'skirt', 'short'],
    'dress': ['dress', 'gown', 'sundress', 'maxi dress'],
    'outerwear': ['overcoat', 'trench', 'parka', 'peacoat'],
    'shoes': ['heel', 'flat', 'boot', 'sneaker', 'sandal', 'loafer'],
    'accessories': ['bag', 'purse', 'belt', 'scarf', 'hat', 'jewelry']
  };
  
  const LUXURY_BRANDS = [
    'hermès', 'chanel', 'louis vuitton', 'gucci', 'prada', 'dior', 'bottega veneta',
    'saint laurent', 'valentino', 'givenchy', 'celine', 'loewe', 'balenciaga',
    'brunello cucinelli', 'loro piana', 'kiton', 'brioni', 'tom ford', 'armani',
    'versace', 'dolce gabbana', 'fendi', 'burberry', 'cartier', 'tiffany'
  ];
  
  const FABRIC_TYPES = [
    'wool', 'cashmere', 'silk', 'cotton', 'linen', 'leather', 'suede',
    'velvet', 'tweed', 'denim', 'polyester', 'viscose', 'modal'
  ];
  
  const COLORS = [
    'black', 'white', 'navy', 'blue', 'brown', 'tan', 'beige', 'cream',
    'gray', 'grey', 'red', 'pink', 'green', 'yellow', 'purple', 'orange',
    'gold', 'silver', 'camel', 'khaki', 'burgundy', 'maroon'
  ];
  
  class FashionAnalyzer {
    analyzeFashionText(text) {
      if (!text) return null;
      
      const lowerText = text.toLowerCase();
      const words = lowerText.split(/\s+/);
      
      // Find clothing category
      const clothingType = this.findClothingType(lowerText);
      
      // Extract colors
      const colors = this.extractColors(lowerText);
      
      // Extract fabrics
      const fabrics = this.extractFabrics(lowerText);
      
      // Extract brand
      const brand = this.extractBrand(lowerText);
      
      // Generate search terms
      const searchTerms = this.generateSearchTerms(clothingType, colors, fabrics, words);
      
      // Calculate confidence
      const confidence = this.calculateConfidence(clothingType, colors, fabrics, brand);
      
      return {
        clothingType,
        colors,
        fabrics,
        brand,
        searchTerms,
        confidence,
        needsReview: confidence < 0.7
      };
    }
    
    findClothingType(text) {
      for (const [category, types] of Object.entries(CLOTHING_CATEGORIES)) {
        for (const type of types) {
          if (text.includes(type)) {
            return category;
          }
        }
      }
      return 'unknown';
    }
    
    extractColors(text) {
      return COLORS.filter(color => text.includes(color));
    }
    
    extractFabrics(text) {
      return FABRIC_TYPES.filter(fabric => text.includes(fabric));
    }
    
    extractBrand(text) {
      const foundBrand = LUXURY_BRANDS.find(brand => text.includes(brand));
      return foundBrand || null;
    }
    
    generateSearchTerms(type, colors, fabrics, words) {
      const terms = new Set();
      
      // Add basic type
      if (type && type !== 'unknown') {
        terms.add(type);
      }
      
      // Add colors
      colors.forEach(color => {
        terms.add(color);
        if (type && type !== 'unknown') {
          terms.add(`${color} ${type}`);
        }
      });
      
      // Add fabrics
      fabrics.forEach(fabric => {
        terms.add(fabric);
        if (type && type !== 'unknown') {
          terms.add(`${fabric} ${type}`);
        }
      });
      
      // Add original important words (filter common words)
      const importantWords = words.filter(word => 
        word.length > 3 && 
        !['with', 'from', 'size', 'item', 'piece'].includes(word)
      );
      importantWords.forEach(word => terms.add(word));
      
      return Array.from(terms);
    }
    
    calculateConfidence(type, colors, fabrics, brand) {
      let confidence = 0.3; // Base confidence
      
      if (type && type !== 'unknown') confidence += 0.3;
      if (colors.length > 0) confidence += 0.2;
      if (fabrics.length > 0) confidence += 0.15;
      if (brand) confidence += 0.05;
      
      return Math.min(confidence, 1.0);
    }
  }
  
  // Export the analyzer
  const fashionAnalyzer = new FashionAnalyzer();
  
  module.exports = { fashionAnalyzer };
  
  // For browser environments
  if (typeof window !== 'undefined') {
    window.fashionAnalyzer = fashionAnalyzer;
  }