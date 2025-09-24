import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || '';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [wardrobe, setWardrobe] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadWardrobe();
  }, []);

  const loadWardrobe = async () => {
    try {
      const response = await fetch(`${API_URL}/api/get-wardrobe`);
      if (response.ok) {
        const data = await response.json();
        setWardrobe(data || []);
      }
    } catch (error) {
      console.error('Error loading wardrobe:', error);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async () => {
    if (!preview) return;

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      // Enhanced prompt with detailed garment analysis
      const DETAILED_WARDROBE_PROMPT = `Analyze this luxury fashion garment image with expert-level detail.

      **CRITICAL: Focus heavily on buttons, lapels, and hardware for brand identification:**
      
      **BUTTON ANALYSIS (Priority):**
      - Material: Horn (natural grain visible), mother-of-pearl (iridescence), metal (brass/silver/gold tone), plastic (uniform appearance), wood, covered fabric
      - Style: Shank vs flat (2-hole/4-hole), size (ligne measurement if possible), shape (round/square/novelty)
      - Logo engravings: ANY text, symbols, or brand markers on buttons (check center and edges)
      - Placement: Functional vs decorative, spacing (measure if asymmetric), alignment
      - Quality indicators: Hand-sewn (slight irregularity in thread tension), machine-sewn (uniform stitching), button thread quality (silk/poly), shank attachment method
      
      **LAPEL & COLLAR ANALYSIS (Priority):**
      - Style: Notched (angle of notch), peak (height of peak), shawl, mandarin, crew neck, etc.
      - Width: Narrow (<3"), Standard (3-3.5"), Wide (>3.5")
      - Gorge height: High (modern), medium (classic), low (vintage)
      - Construction: Hand-padded (visible pad stitching), machine-padded, fused (flat appearance), canvassed (natural roll)
      - Stitching: Hand-finished edges (slight irregularity), pick-stitching (spacing and depth), AMF stitching presence
      - Buttonhole: Hand-finished (keyhole/straight), machine-made, gimp reinforcement visible
      - Brand signatures: Distinctive lapel shapes, buttonhole styles, roll characteristics
      
      **LOGO & BRAND IDENTIFICATION:**
      - Visible logos: Text, symbols, monograms anywhere on garment
      - Hardware logos: Zippers (YKK/RiRi/Lampo), buckles, snaps, rivets, clasps
      - Fabric patterns: Brand-specific prints (check/plaid registry), weaves, textures
      - Construction signatures: Distinctive seaming (curved/straight), dart placement, shoulder expression
      - Label glimpses: Any visible brand tags, care labels, "Made in" tags
      - Button stance: Height relative to natural waist (brand-specific)
      
      **LUXURY QUALITY MARKERS:**
      - Stitching quality: Stitch density (8-14 SPI for luxury), hand-finished vs machine, thread luster
      - Pattern matching: Check alignment at seams (chest, back, sleeves)
      - Fabric drape: Natural fall, recovery from manipulation, wrinkle resistance
      - Edge finishing: French seams, Hong Kong finish, serged, bound, hand-rolled, pinked edges
      - Interior construction: Visible canvas structure, half/full lining, seam taping
      - Shoulder construction: Natural (soft), roped (raised ridge), built-up, pagoda, spalla camicia
      - Sleeve attachment: Set-in precision, pitch, ease distribution
      
      **FABRIC ASSESSMENT:**
      - Apparent fiber: Wool (matte/worsted), cotton (oxford/poplin/twill), silk (charmeuse/twill), linen, synthetic blend
      - Weave structure: Plain, twill (angle visible), herringbone, houndstooth, birdseye, basketweave
      - Weight indicators: Drape stiffness (light/medium/heavy), transparency, structure retention
      - Surface texture: Smooth, napped, brushed, textured, slubbed
      - Special finishes: Mercerized (high luster cotton), calendered (pressed smooth), water-resistant coating
      
      **CONSTRUCTION DETAILS:**
      - Pocket types: Jetted/besom (most formal), flap, ticket pocket presence, patch (casual), barchetta curve
      - Pocket alignment: Pattern matching across pocket opening
      - Vent style: Center, side, ventless - check stitching quality
      - Trouser details: Break type (no/slight/medium/full), cuff presence (height), crease sharpness
      - Hem finish: Blind stitched (invisible), hand-rolled, machine hemmed, original length indicators
      
      **FIT & SILHOUETTE MARKERS:**
      - Cut indicators: British (structured/nipped waist), Italian (soft/natural shoulder), American (sack/relaxed)
      - Silhouette: Slim, tailored, regular, relaxed, oversized - note intentionality
      - Proportion: Jacket length relative to body, button stance height, lapel-to-shoulder ratio
      - Drape: Clean lines vs intentional rumpling, fabric memory, structure retention
      
      Provide structured analysis:
      {
        "type": "specific garment type",
        "colors": ["primary color with tone (warm/cool)", "secondary colors"],
        "pattern": "specific pattern name from glossary",
        "material": "fiber content estimate with weight descriptor",
        "style": "design era/influence", 
        "fit": "silhouette type with fit intention",
        "details": {
          "buttons": {
            "material": "specific material with quality grade",
            "style": "technical description with ligne size estimate", 
            "logo_text": "exact text/symbols on buttons",
            "quality": "hand-sewn/machine with thread type",
            "spacing": "measurement or regular/irregular"
          },
          "lapels": {
            "style": "specific type with measurements",
            "width": "narrow/standard/wide with estimate",
            "gorge_height": "high/medium/low position",
            "construction": "canvas/fused with roll quality",
            "stitching": "hand-finished/AMF/machine with SPI",
            "buttonhole": "hand/machine with style details"
          },
          "hardware": {
            "zippers": "brand/type/tooth material/quality",
            "other": "specific hardware with any markings",
            "quality_grade": "luxury/premium/standard"
          },
          "collar": "style with construction details",
          "sleeves": "button functionality, pitch, finish",
          "pockets": "types, alignment, construction quality",
          "shoulder": "construction type with padding details",
          "closure": "type with spacing/alignment notes"
        },
        "brand_indicators": {
          "visible_logos": "exact locations and descriptions",
          "hardware_logos": "specific markings on all hardware",
          "construction_signatures": "unique construction elements",
          "button_stance": "height and spacing patterns",
          "stitching_patterns": "distinctive stitch signatures",
          "confidence": "percentage with reasoning"
        },
        "luxury_markers": [
          "specific quality indicators with locations",
          "hand-work evidence",
          "pattern matching quality",
          "construction precision details"
        ],
        "construction_analysis": {
          "seam_types": "French/flat-felled/serged with locations",
          "seam_allowances": "narrow/standard/generous estimate",
          "pattern_matching": "excellent/good/poor with examples",
          "hand_work_evidence": ["specific hand-stitching locations"],
          "time_intensive_elements": ["elements requiring skilled labor"]
        },
        "confidence": 0.0,
        "suggested_name": "Brand (if identified) + Color + Type",
        "care_requirements": ["specific care based on materials"],
        "styling_versatility": ["suggested outfit combinations"],
        "overallAssessment": {
          "tier": "Haute Couture/Luxury/Premium/Contemporary/Fast Fashion",
          "estimatedRetail": "$XXX-$XXXX with reasoning",
          "condition": "New/Excellent/Good/Fair with specific notes",
          "authenticityConfidence": "percentage with indicators",
          "craftsmanship_hours": "estimated labor hours"
        },
        "brandIdentifiers": {
          "likelyBrand": "specific brand or 'Unidentified'",
          "confidence": 0-100,
          "supportingEvidence": ["list specific brand indicators"],
          "constructionHouse": "Italian/French/British/American/Japanese/Other",
          "factoryTier": "Artisanal/High-end/Standard/Mass-production"
        },
        "fabricAnalysis": {
          "weaveStructure": "specific weave from glossary",
          "yarnQuality": "superior/high/standard with micron estimate",
          "weight": "specific GSM or oz estimate",
          "handfeel": "crisp/soft/structured/fluid",
          "colors": ["specific color names with undertones"],
          "pattern_repeat": "measurement if applicable"
        },
        "lapelCollarArchitecture": {
          "style": "specific cut name",
          "construction": "detailed build method",
          "roll_quality": "soft/medium/crisp",
          "gorge_seam": "hand-finished/machine with quality"
        },
        "qualityScore": {
          "materials": 0-10,
          "construction": 0-10,
          "finishing": 0-10,
          "overall": 0-10
        }
      }
      
      DO NOT OUTPUT ANYTHING OTHER THAN VALID JSON.`;
//end of prompt

      const response = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: preview.split(',')[1],
          prompt: DETAILED_PROMPT
        }),
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const result = await response.json();
      console.log('Analysis result:', result);
      
      setAnalysisResult(result);
      
      // Save to wardrobe if analysis was successful
      if (result.garment_type) {
        await saveToWardrobe(result);
      }
    } catch (error) {
      console.error('Error analyzing image:', error);
      setAnalysisResult({ error: 'Failed to analyze image. Please try again.' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveToWardrobe = async (analysis) => {
    try {
      const response = await fetch(`${API_URL}/api/save-item`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...analysis,
          image_url: preview
        }),
      });

      if (response.ok) {
        await loadWardrobe();
      }
    } catch (error) {
      console.error('Error saving to wardrobe:', error);
    }
  };

  const openItemModal = (item) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
  };

  const renderDetailSection = (title, content) => {
    if (!content || (typeof content === 'object' && Object.keys(content).length === 0)) {
      return null;
    }

    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 text-gray-800 border-b pb-2">
          {title}
        </h3>
        {typeof content === 'object' ? (
          <div className="space-y-2">
            {Object.entries(content).map(([key, value]) => (
              <div key={key} className="flex justify-between items-start">
                <span className="font-medium text-gray-700 capitalize">
                  {key.replace(/_/g, ' ')}:
                </span>
                <span className="text-gray-600 text-right max-w-[60%]">
                  {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                </span>
              </div>
            ))}
          </div>
        ) : Array.isArray(content) ? (
          <ul className="list-disc list-inside space-y-1">
            {content.map((item, idx) => (
              <li key={idx} className="text-gray-600">{item}</li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-600">{content}</p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            RENOIR
          </h1>
          <p className="text-gray-600 text-lg">
            AI-Powered Luxury Fashion Analysis
          </p>
        </header>

        <div className="max-w-4xl mx-auto mb-12">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold mb-6">Analyze Garment</h2>
            
            <div className="mb-6">
              <label className="block mb-4">
                <span className="text-gray-700 font-medium">Select Image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="mt-2 block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                />
              </label>

              {preview && (
                <div className="mt-6">
                  <img
                    src={preview}
                    alt="Selected garment"
                    className="w-full max-w-md mx-auto rounded-lg shadow-md"
                  />
                  
                  <button
                    onClick={analyzeImage}
                    disabled={isAnalyzing}
                    className="mt-6 w-full bg-blue-600 text-white py-3 px-6 rounded-lg 
                      hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed
                      transition-colors duration-200"
                  >
                    {isAnalyzing ? 'Analyzing...' : 'Analyze Garment'}
                  </button>
                </div>
              )}
            </div>

            {analysisResult && !analysisResult.error && (
              <div className="mt-8 p-6 bg-gray-50 rounded-lg">
                <h3 className="text-xl font-semibold mb-4">Quick Analysis</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium">Type:</span> {analysisResult.garment_type}
                  </div>
                  <div>
                    <span className="font-medium">Colors:</span> {analysisResult.colors?.join(', ')}
                  </div>
                  {analysisResult.brand_indicators?.probable_brand && (
                    <div className="col-span-2">
                      <span className="font-medium">Probable Brand:</span> {analysisResult.brand_indicators.probable_brand}
                    </div>
                  )}
                  <div className="col-span-2">
                    <span className="font-medium">Quality:</span> {analysisResult.quality_assessment?.overall_quality}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-semibold mb-8 text-center">Your Wardrobe</h2>
          
          {wardrobe.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {wardrobe.map((item) => (
                <div
                  key={item.id}
                  onClick={() => openItemModal(item)}
                  className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer
                    transform transition-transform duration-200 hover:scale-105"
                >
                  <div className="aspect-w-3 aspect-h-4">
                    <img
                      src={item.image_url}
                      alt={item.name || item.garment_type}
                      className="w-full h-64 object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-800 truncate">
                      {item.name || item.garment_type}
                    </h3>
                    <p className="text-sm text-gray-600">{item.colors}</p>
                    {item.brand_indicators?.probable_brand && (
                      <p className="text-sm font-medium text-blue-600 mt-1">
                        {item.brand_indicators.probable_brand}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg">
              <p className="text-gray-500 text-lg">Your wardrobe is empty</p>
              <p className="text-gray-400 mt-2">Upload your first garment to get started</p>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && selectedItem && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={closeModal}
        >
          <div 
            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  {selectedItem.name || selectedItem.garment_type}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <img
                    src={selectedItem.image_url}
                    alt={selectedItem.name}
                    className="w-full rounded-lg shadow-md"
                  />
                </div>

                <div className="space-y-4">
                  {renderDetailSection('Basic Information', {
                    'Garment Type': selectedItem.garment_type,
                    'Colors': selectedItem.colors,
                    'Pattern': selectedItem.pattern,
                    'Style': selectedItem.style,
                    'Fit': selectedItem.fit,
                    'Price Estimate': selectedItem.price_estimate,
                    'Season': selectedItem.season
                  })}

                  {selectedItem.material && renderDetailSection('Material', selectedItem.material)}
                  
                  {selectedItem.brand_indicators && renderDetailSection('Brand Indicators', selectedItem.brand_indicators)}
                  
                  {selectedItem.quality_assessment && renderDetailSection('Quality Assessment', selectedItem.quality_assessment)}
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {selectedItem.construction_details && (
                  <>
                    {selectedItem.construction_details.buttons && 
                      renderDetailSection('Button Details', selectedItem.construction_details.buttons)}
                    
                    {selectedItem.construction_details.lapels && 
                      renderDetailSection('Lapel Construction', selectedItem.construction_details.lapels)}
                    
                    {selectedItem.construction_details.collar && 
                      renderDetailSection('Collar Details', selectedItem.construction_details.collar)}
                    
                    {selectedItem.construction_details.hardware && 
                      renderDetailSection('Hardware & Fastenings', selectedItem.construction_details.hardware)}
                    
                    {selectedItem.construction_details.shoulders && 
                      renderDetailSection('Shoulder Construction', selectedItem.construction_details.shoulders)}
                    
                    {selectedItem.construction_details.seams && 
                      renderDetailSection('Seam Construction', selectedItem.construction_details.seams)}
                    
                    {selectedItem.construction_details.pockets && 
                      renderDetailSection('Pocket Details', selectedItem.construction_details.pockets)}
                  </>
                )}

                {selectedItem.luxury_markers && selectedItem.luxury_markers.length > 0 && 
                  renderDetailSection('Luxury Markers', selectedItem.luxury_markers)}
                
                {selectedItem.care_instructions && 
                  renderDetailSection('Care Instructions', selectedItem.care_instructions)}
                
                {selectedItem.occasion_suitability && 
                  renderDetailSection('Suitable Occasions', selectedItem.occasion_suitability)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;