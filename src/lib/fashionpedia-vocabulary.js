// src/lib/fashionpedia-vocabulary.js
// Fashionpedia vocabulary service for enhanced embellishment detection

class FashionpediaVocabulary {
  constructor() {
    // Fashionpedia embellishment attributes based on the 294 fine-grained attributes
    this.embellishmentAttributes = {
      // Metallic and reflective elements
      metallic: [
        'metallic', 'gold', 'silver', 'bronze', 'copper', 'chrome', 'platinum',
        'shiny', 'reflective', 'mirror', 'foil', 'lamé', 'sequined', 'beaded'
      ],
      
      // Beadwork and sequins
      beadwork: [
        'sequins', 'sequined', 'beaded', 'beads', 'pearls', 'crystals', 'rhinestones',
        'studs', 'spangles', 'paillettes', 'bugle beads', 'seed beads', 'rocailles',
        'crystal beads', 'pearl beads', 'glass beads', 'plastic beads', 'metal beads'
      ],
      
      // Embroidery and decorative stitching
      embroidery: [
        'embroidered', 'embroidery', 'stitched', 'hand-stitched', 'machine-stitched',
        'cross-stitch', 'satin stitch', 'chain stitch', 'backstitch', 'running stitch',
        'decorative stitching', 'appliqué', 'applied', 'patched', 'quilted'
      ],
      
      // Textural embellishments
      textural: [
        'ruffled', 'ruffles', 'pleated', 'pleats', 'gathered', 'shirred', 'smocked',
        'tucked', 'draped', 'layered', 'fringed', 'fringe', 'tasseled', 'tassels',
        'pom-poms', 'pompons', 'fabric flowers', 'bow', 'bows', 'ribbon', 'ribbons'
      ],
      
      // Hardware and functional embellishments
      hardware: [
        'buttons', 'buttoned', 'zippered', 'zipper', 'buckled', 'buckles', 'snaps',
        'hooks', 'clasps', 'fasteners', 'rivets', 'grommets', 'eyelets', 'studs',
        'spikes', 'chains', 'rings', 'loops', 'D-rings', 'O-rings'
      ],
      
      // Pattern-based embellishments
      patterns: [
        'printed', 'printed pattern', 'screen printed', 'heat transfer', 'sublimated',
        'dyed', 'tie-dyed', 'batik', 'resist dyed', 'ombré', 'gradient', 'faded',
        'distressed', 'worn', 'vintage', 'retro', 'antique'
      ],
      
      // Surface treatments
      surface: [
        'glossy', 'matte', 'sueded', 'brushed', 'napped', 'fuzzy', 'furry',
        'leather', 'suede', 'patent leather', 'textured', 'embossed', 'debossed',
        'perforated', 'laser-cut', 'burned', 'charred', 'weathered'
      ]
    };

    // Fashionpedia material attributes for enhanced detection
    this.materialAttributes = {
      // Natural fibers
      natural: [
        'cotton', 'wool', 'silk', 'linen', 'cashmere', 'mohair', 'alpaca', 'angora',
        'bamboo', 'hemp', 'jute', 'ramie', 'flax', 'camel hair', 'vicuña'
      ],
      
      // Synthetic fibers
      synthetic: [
        'polyester', 'nylon', 'rayon', 'viscose', 'modal', 'lyocell', 'acetate',
        'acrylic', 'spandex', 'elastane', 'polyurethane', 'polyamide'
      ],
      
      // Luxury materials
      luxury: [
        'cashmere', 'silk', 'vicuña', 'mohair', 'angora', 'alpaca', 'merino wool',
        'pashmina', 'chiffon', 'organza', 'tulle', 'satin', 'duchess satin',
        'jacquard', 'brocade', 'damask', 'velvet', 'velour', 'corduroy'
      ],
      
      // Leather and animal products
      leather: [
        'leather', 'suede', 'patent leather', 'nappa leather', 'lambskin', 'calfskin',
        'cowhide', 'goatskin', 'deerskin', 'ostrich', 'crocodile', 'alligator',
        'snakeskin', 'lizard', 'stingray', 'shark', 'kangaroo'
      ]
    };

    // Fashionpedia construction attributes
    this.constructionAttributes = {
      // Seam types
      seams: [
        'french seam', 'flat-fell seam', 'pinked seam', 'serged seam', 'bound seam',
        'welt seam', 'lapped seam', 'butt seam', 'hand-sewn', 'machine-sewn'
      ],
      
      // Stitching types
      stitching: [
        'pick stitching', 'topstitching', 'understitching', 'edge stitching',
        'stay stitching', 'basting', 'gathering', 'easing', 'darting'
      ],
      
      // Finishing techniques
      finishing: [
        'hand-rolled hem', 'blind hem', 'machine hem', 'faced hem', 'bound hem',
        'piped edge', 'bias binding', 'self-finished', 'raw edge'
      ]
    };

    // Fashionpedia style attributes
    this.styleAttributes = {
      // Silhouettes
      silhouettes: [
        'fitted', 'loose', 'oversized', 'tailored', 'relaxed', 'slim', 'straight',
        'tapered', 'flared', 'a-line', 'empire', 'sheath', 'shift', 'tent'
      ],
      
      // Necklines
      necklines: [
        'crew neck', 'v-neck', 'scoop neck', 'boat neck', 'off-shoulder', 'one-shoulder',
        'halter', 'strapless', 'sweetheart', 'square', 'asymmetric', 'cowl'
      ],
      
      // Sleeve types
      sleeves: [
        'long sleeve', 'short sleeve', 'sleeveless', 'cap sleeve', 'three-quarter sleeve',
        'raglan sleeve', 'dolman sleeve', 'batwing sleeve', 'bishop sleeve', 'puff sleeve'
      ]
    };

    // Combined vocabulary for comprehensive analysis
    this.comprehensiveVocabulary = {
      ...this.embellishmentAttributes,
      ...this.materialAttributes,
      ...this.constructionAttributes,
      ...this.styleAttributes
    };
  }

  // Get all embellishment terms for prompt enhancement
  getAllEmbellishmentTerms() {
    const allTerms = [];
    Object.values(this.embellishmentAttributes).forEach(category => {
      allTerms.push(...category);
    });
    return [...new Set(allTerms)]; // Remove duplicates
  }

  // Get specific embellishment category terms
  getEmbellishmentTerms(category) {
    return this.embellishmentAttributes[category] || [];
  }

  // Get material terms for a specific type
  getMaterialTerms(type) {
    return this.materialAttributes[type] || [];
  }

  // Get construction terms
  getConstructionTerms(type) {
    return this.constructionAttributes[type] || [];
  }

  // Get style terms
  getStyleTerms(type) {
    return this.styleAttributes[type] || [];
  }

  // Generate embellishment detection prompt section
  generateEmbellishmentPrompt() {
    const metallicTerms = this.getEmbellishmentTerms('metallic').join(', ');
    const beadworkTerms = this.getEmbellishmentTerms('beadwork').join(', ');
    const embroideryTerms = this.getEmbellishmentTerms('embroidery').join(', ');
    const texturalTerms = this.getEmbellishmentTerms('textural').join(', ');
    const hardwareTerms = this.getEmbellishmentTerms('hardware').join(', ');
    const patternTerms = this.getEmbellishmentTerms('patterns').join(', ');
    const surfaceTerms = this.getEmbellishmentTerms('surface').join(', ');

    return `
EMBELLISHMENT & DECORATIVE ELEMENTS ANALYSIS:
Pay special attention to decorative elements and embellishments. Look for:

METALLIC & REFLECTIVE ELEMENTS:
- ${metallicTerms}
- Note: metallic finish, shine level, reflective properties

BEADWORK & SEQUINS:
- ${beadworkTerms}
- Note: size, density, attachment method, color, material

EMBROIDERY & DECORATIVE STITCHING:
- ${embroideryTerms}
- Note: stitch type, thread material, pattern complexity, hand vs machine work

TEXTURAL EMBELLISHMENTS:
- ${texturalTerms}
- Note: texture type, placement, construction method

HARDWARE & FUNCTIONAL DECORATIONS:
- ${hardwareTerms}
- Note: material, finish, placement, functionality

PATTERN-BASED DECORATIONS:
- ${patternTerms}
- Note: pattern type, application method, coverage

SURFACE TREATMENTS:
- ${surfaceTerms}
- Note: finish type, texture, visual effect

For each decorative element found, specify:
1. Type and specific terminology
2. Location on garment
3. Material and construction
4. Visual impact and luxury level
5. Brand or design signature indicators`;
  }

  // Generate material analysis prompt section
  generateMaterialPrompt() {
    const naturalTerms = this.getMaterialTerms('natural').join(', ');
    const syntheticTerms = this.getMaterialTerms('synthetic').join(', ');
    const luxuryTerms = this.getMaterialTerms('luxury').join(', ');
    const leatherTerms = this.getMaterialTerms('leather').join(', ');

    return `
MATERIAL ANALYSIS:
Identify all materials and their characteristics:

NATURAL FIBERS:
- ${naturalTerms}
- Note: fiber quality, weave, weight, hand feel

SYNTHETIC FIBERS:
- ${syntheticTerms}
- Note: blend ratios, performance properties

LUXURY MATERIALS:
- ${luxuryTerms}
- Note: quality indicators, rarity, luxury level

LEATHER & ANIMAL PRODUCTS:
- ${leatherTerms}
- Note: type, finish, quality, authenticity markers`;
  }

  // Generate construction analysis prompt section
  generateConstructionPrompt() {
    const seamTerms = this.getConstructionTerms('seams').join(', ');
    const stitchingTerms = this.getConstructionTerms('stitching').join(', ');
    const finishingTerms = this.getConstructionTerms('finishing').join(', ');

    return `
CONSTRUCTION ANALYSIS:
Examine construction techniques and quality:

SEAM TYPES:
- ${seamTerms}
- Note: seam quality, consistency, reinforcement

STITCHING TECHNIQUES:
- ${stitchingTerms}
- Note: stitch quality, handwork evidence, precision

FINISHING TECHNIQUES:
- ${finishingTerms}
- Note: edge finishing, attention to detail, luxury markers`;
  }

  // Generate comprehensive analysis prompt
  generateComprehensivePrompt() {
    return `
COMPREHENSIVE FASHION ANALYSIS USING FASHIONPEDIA VOCABULARY:

${this.generateEmbellishmentPrompt()}

${this.generateMaterialPrompt()}

${this.generateConstructionPrompt()}

COMPONENT-LEVEL ANALYSIS:
Break down the garment into specific components:
1. Base garment structure
2. Decorative elements and embellishments
3. Hardware and functional elements
4. Surface treatments and finishes
5. Construction details and quality markers

Use precise Fashionpedia terminology throughout your analysis.`;
  }

  // Check if a term is an embellishment term
  isEmbellishmentTerm(term) {
    const lowerTerm = term.toLowerCase();
    return this.getAllEmbellishmentTerms().some(embellishment => 
      embellishment.toLowerCase().includes(lowerTerm) || 
      lowerTerm.includes(embellishment.toLowerCase())
    );
  }

  // Get related terms for a given embellishment
  getRelatedTerms(term) {
    const lowerTerm = term.toLowerCase();
    const related = [];
    
    Object.entries(this.embellishmentAttributes).forEach(([category, terms]) => {
      if (terms.some(t => t.toLowerCase().includes(lowerTerm) || lowerTerm.includes(t.toLowerCase()))) {
        related.push(...terms);
      }
    });
    
    return [...new Set(related)];
  }
}

export default new FashionpediaVocabulary();

