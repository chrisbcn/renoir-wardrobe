// api/analyze.js - Vercel Serverless Function for Luxury Fashion Analysis

const LUXURY_FASHION_ANALYSIS_PROMPT = `
Analyze this luxury fashion item with collector-grade precision. Focus on authentication markers and construction details that distinguish high-end pieces from mass market alternatives.

## HARDWARE & FASTENINGS (Priority Authentication)

### Button Analysis (Critical for Brand ID):
- **Material Classification**: Horn (water buffalo/corozo), mother-of-pearl (Trocas/Akoya), metal (brass/zamak/silver-plated), composition/resin, covered fabric, wooden (ebony/rosewood)
- **Logo Engraving**: ANY text, monograms, house codes, brand signatures on face or shank
- **Construction**: Shank vs flat/sew-through, hand-sewn with irregular stitching vs machine-attached
- **Thread Quality**: Silk thread, hand-knotted, thread tension variations
- **Button Stance**: Spacing, alignment, functional vs decorative placement

### Zipper & Hardware:
- **Zipper Brand**: YKK Excella, Lampo, RiRi, Talon - note any engraved logos
- **Zipper Type**: Metal teeth, nylon coil, plastic molded, invisible/concealed
- **Puller Details**: Logo engravings, leather tabs, custom pulls with brand markers
- **Other Hardware**: Buckles, clasps, snaps, grommets, D-rings - check for logo stamps, plating quality

## LAPEL & COLLAR ARCHITECTURE

### Lapel Construction:
- **Style**: Notched, peak/pointed, shawl, cloverleaf, fishmouth
- **Canvas Structure**: Full canvas, half-canvas, fused interlining
- **Lapel Roll**: Soft roll vs pressed flat, belly depth, con rollino (Italian roll)
- **Buttonhole**: Milanese/Asola Lucida (hand-worked with gimp), keyhole, straight

### Collar Details:
- **Attachment**: Hand-set with irregular stitching vs machine-sewn
- **Under Collar**: Felt vs melton vs self-fabric
- **Collar Stand**: Height, stiffness, turn-back finishing

## CONSTRUCTION SIGNATURES

### Stitching Analysis:
- **Pick Stitching/AMF**: Distance from edge (2mm classic, 6mm statement), hand vs AMF machine
- **Stitch Regularity**: Hand variation (slightly off-axis) vs machine precision
- **Saddle Stitching**: Hand-sewn with visible thread on both sides
- **Bar Tacks**: Hand-worked vs machine, placement at stress points

### Seam Construction:
- **French Seams**: Enclosed raw edges, double-stitched
- **Flat-Fell Seams**: Double-folded, topstitched
- **Bound Seams**: Hong Kong finish, bias-bound edges

### Shoulder Construction:
- **Spalla Camicia**: Shirt shoulder with pleating (Neapolitan)
- **Con Rollino**: Natural shoulder with soft construction
- **Roped Shoulder**: Elevated sleeve head with padding

## POCKET ARCHITECTURE
- **Barchetta**: Curved boat-shaped breast pocket (Italian)
- **Patch Pockets**: Applied with pick stitching or hand-sewn
- **Jetted/Besom**: Welted pockets, clean finished
- **Ticket Pocket**: Small additional pocket above hip pocket

## FABRIC & PATTERN ANALYSIS

### Fabric Quality Markers:
- **Weave Structure**: Twill, herringbone, birdseye, sharkskin, barathea
- **Yarn Quality**: Super numbers (120s-200s+), yarn twist, mercerization
- **Pattern Matching**: Aligned at seams, pockets, collar junction
- **Hand Feel**: Dry hand vs soft hand, drape quality

### Interlining & Canvas:
- **Canvas Type**: Horsehair/goat hair blend, hymo, cotton canvas
- **Chest Piece**: Floating vs fused, hand-padded

## LINING & INTERNAL CONSTRUCTION
- **Material**: Silk (Bemberg/cupro), viscose, acetate, signature prints
- **Construction**: Full lined, half-lined (sfoderato), buggy/butterfly lined
- **Internal Pockets**: Pen pockets, phone pockets, ticket pockets

## BRAND-SPECIFIC IDENTIFIERS

### Logo Placement:
- **Visible Branding**: Embroidered, woven labels, metal plaques
- **Hidden Signatures**: Inside pocket labels, under-collar stamps
- **Serial Numbers**: Authentication codes, date stamps, atelier marks

### Construction Signatures by House:
- **Italian**: Soft construction, spalla camicia, barchetta pockets
- **British**: Structured, roped shoulders, side vents, ticket pockets
- **French**: Clean lines, subtle pick stitching, minimalist hardware
- **Japanese**: Precision stitching, innovative fabrics, minimal ease

## QUALITY ASSESSMENT INDICATORS
- **Buttonholes**: Gimp presence, stitch density, thread quality
- **Armhole**: High vs low, clean finished vs rough
- **Sleeve Pitch**: Forward pitch, natural hang, ease distribution
- **Hem**: Hand-rolled, blind-stitched, raw edge, chain-stitched
- **Cuff Construction**: Functional buttons (surgeon's cuffs), hand-finished

Response Format:
{
  "type": "blazer/suit/dress/coat/shirt/pants/etc",
  "name": "Descriptive name with potential brand",
  "hardwareFastenings": {
    "buttons": {
      "material": "specific material identified",
      "diameter": "measurement in mm if visible",
      "logoEngraving": "exact text/monograms/symbols found",
      "construction": "shank vs flat, attachment method",
      "threadQuality": "silk/cotton/poly, hand vs machine",
      "buttonStance": "spacing notes, alignment"
    },
    "zippers": {
      "brand": "YKK/Lampo/RiRi/other",
      "type": "metal/coil/plastic",
      "pullerDetails": "logos, custom pulls, quality"
    },
    "otherHardware": "buckles, snaps, clasps details"
  },
  "lapelCollarArchitecture": {
    "style": "specific style identified",
    "canvasStructure": "full/half/fused",
    "lapelRoll": "soft/pressed, belly depth",
    "gorgeHeight": "high/medium/low",
    "buttonhole": "Milanese/keyhole/straight, hand vs machine"
  },
  "constructionSignatures": {
    "pickStitching": "distance from edge in mm, regularity",
    "stitchQuality": "hand variation vs machine precision",
    "seamConstruction": "types identified",
    "shoulderConstruction": "specific style",
    "barTacks": "placement and quality"
  },
  "pocketArchitecture": {
    "breastPocket": "style and construction",
    "hipPockets": "jetted/patch/flap",
    "internalPockets": "number and types",
    "ticketPocket": "present/absent"
  },
  "fabricAnalysis": {
    "weaveStructure": "specific weave identified",
    "yarnQuality": "super number estimate",
    "weight": "light/medium/heavy",
    "patternMatching": "quality of alignment",
    "handfeel": "dry/soft, drape quality"
  },
  "liningInternal": {
    "material": "silk/cupro/viscose/acetate",
    "construction": "full/half/buggy lined",
    "signaturePrint": "if present",
    "internalFinish": "quality indicators"
  },
  "brandIdentifiers": {
    "visibleLogos": "locations and types",
    "hiddenSignatures": "internal labels/stamps",
    "serialNumbers": "if found",
    "constructionHouse": "Italian/British/French/Japanese/American",
    "likelyBrand": "best assessment with evidence",
    "confidence": 0-100
  },
  "qualityIndicators": {
    "handworkEvidence": ["specific hand work found"],
    "machineWork": ["machine construction noted"],
    "alterabilityMarkers": "seam allowances, let-out potential",
    "luxuryMarkers": ["specific high-end indicators"],
    "qualityIssues": ["any flaws or concerns"],
    "authenticityMarkers": ["evidence supporting genuine vs replica"]
  },
  "measurements": {
    "estimatedSize": "38R/40L/etc if identifiable",
    "keyProportions": "any notable measurements"
  },
  "overallAssessment": {
    "tier": "mass market/diffusion/premium/luxury/haute couture",
    "estimatedAge": "new/recent/vintage estimate",
    "condition": "pristine/excellent/good/fair/poor",
    "authenticityConfidence": "high/medium/low with reasoning"
  }
}

Respond ONLY with valid JSON. Be extremely detailed and specific in your analysis, noting exact measurements where visible, specific materials identified, and all construction details that indicate quality tier and potential authenticity.`;

// Vercel Serverless Function Handler
export default async function handler(req, res) {
  // Add CORS headers for React app
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image, type } = req.body;
    
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      console.error('No API key found in environment');
      return res.status(500).json({ 
        error: 'Claude API key not configured in environment variables' 
      });
    }

    // Use enhanced prompt for wardrobe items, slightly modified for inspiration
    const prompt = type === 'inspiration' 
      ? `Analyze this fashion inspiration image. Identify all visible garments and for each one: ${LUXURY_FASHION_ANALYSIS_PROMPT}`
      : LUXURY_FASHION_ANALYSIS_PROMPT;

    console.log('Starting luxury-grade analysis...');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514', // Working model confirmed
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: image
                }
              },
              {
                type: 'text',
                text: prompt
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', response.status, errorText);
      
      return res.status(response.status).json({ 
        error: `Claude API error: ${response.status}`,
        details: errorText,
        analysis: {
          error: `Failed to analyze image: ${response.status}`,
          type: 'error',
          name: 'Analysis Failed'
        }
      });
    }

    const data = await response.json();
    
    let analysisResult;
    try {
      const responseText = data.content[0].text;
      const cleanJson = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysisResult = JSON.parse(cleanJson);
      
      console.log('Luxury analysis complete:', {
        type: analysisResult.type,
        brand: analysisResult.brandIdentifiers?.likelyBrand,
        tier: analysisResult.overallAssessment?.tier
      });
      
    } catch (parseError) {
      console.error('Failed to parse Claude response:', parseError);
      
      return res.status(500).json({
        analysis: {
          error: 'Failed to parse AI response',
          type: 'parse_error',
          name: 'Invalid Response Format',
          rawResponse: data.content[0].text
        }
      });
    }

    return res.status(200).json({ analysis: analysisResult });
    
  } catch (error) {
    console.error('Server error:', error);
    
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message,
      analysis: {
        error: error.message,
        type: 'server_error',
        name: 'Server Error'
      }
    });
  }
}