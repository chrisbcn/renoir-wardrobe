import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

function App() {
  const [wardrobe, setWardrobe] = useState([]);
  const [filteredWardrobe, setFilteredWardrobe] = useState([]);
  const [selectedType, setSelectedType] = useState('all');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentAnalysisStep, setCurrentAnalysisStep] = useState('');
  const [visibleItems, setVisibleItems] = useState(20);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Infinite scroll setup
  const observerRef = useRef();
  const loadMoreRef = useCallback(node => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && visibleItems < filteredWardrobe.length) {
        setVisibleItems(prev => Math.min(prev + 20, filteredWardrobe.length));
      }
    });
    if (node) observerRef.current.observe(node);
  }, [visibleItems, filteredWardrobe.length]);

  // Enhanced prompt with category assignment
  const DETAILED_WARDROBE_PROMPT = `Analyze this luxury fashion garment image with expert-level detail.

**CRITICAL: Focus heavily on buttons, lapels, and hardware for brand identification:**

**BUTTON ANALYSIS (Priority):**
- Material: Horn, mother-of-pearl, metal, plastic, wood, covered fabric
- Style: Shank vs flat, number of holes, size, shape
- Logo engravings: ANY text, symbols, or brand markers on buttons
- Placement: Functional vs decorative, spacing, alignment
- Quality indicators: Hand-sewn, machine-sewn, button thread quality

**LAPEL & COLLAR ANALYSIS (Priority):**
- Style: Notched, peak, shawl, mandarin, crew neck, etc.
- Construction: Hand-padded, machine-padded, fused, canvassed
- Stitching: Hand-finished edges, pick-stitching, decorative elements
- Brand signatures: Distinctive lapel shapes, buttonhole styles
- Hardware: Collar stays, pins, brand-specific details

**LOGO & BRAND IDENTIFICATION:**
- Visible logos: Text, symbols, monograms anywhere on garment
- Hardware logos: Zippers, buckles, snaps, rivets, clasps
- Fabric patterns: Brand-specific prints, weaves, textures
- Construction signatures: Distinctive seaming, dart placement
- Label glimpses: Any visible brand tags or labels

**LUXURY QUALITY MARKERS:**
- Stitching quality: Hand-finished vs machine, stitch density
- Fabric drape and weight: Heavy wool, silk lining, cashmere
- Construction methods: Canvassed vs fused, dart placement
- Hardware quality: Metal finish, weight, precision
- Edge finishing: Serged, bound, hand-rolled, raw edges

IMPORTANT: Assign a category from EXACTLY these options: Jackets, Tops, Dresses, Bottoms, Skirts, Shoes, Bags, Outerwear, Knitwear, Accessories

Provide structured analysis:
{
  "type": "string",
  "category": "Jackets|Tops|Dresses|Bottoms|Skirts|Shoes|Bags|Outerwear|Knitwear|Accessories",
  "colors": ["primary color", "secondary color if any"],
  "pattern": "string",
  "material": "string",
  "style": "string", 
  "fit": "string",
  "details": {
    "buttons": {
      "material": "string",
      "style": "string", 
      "logo_text": "any text/symbols on buttons",
      "quality": "hand-sewn/machine-sewn/quality indicators"
    },
    "lapels": {
      "style": "notched/peak/shawl/etc",
      "construction": "hand-padded/fused/etc",
      "stitching": "hand-finished/machine/etc"
    },
    "hardware": {
      "zippers": "brand/style/quality",
      "other": "buckles, snaps, etc with any logos"
    },
    "collar": "string",
    "sleeves": "string",
    "closure": "string"
  },
  "brand_indicators": {
    "visible_logos": "any text, symbols, or brand marks seen",
    "hardware_logos": "logos on zippers, buttons, buckles",
    "construction_signatures": "distinctive brand construction elements",
    "confidence": "high/medium/low confidence in brand identification"
  },
  "luxury_markers": ["array of specific quality indicators"],
  "confidence": 0.0,
  "suggested_name": "descriptive name for this item",
  "overallAssessment": {
    "tier": "Luxury/Premium/Contemporary/Fast Fashion",
    "estimatedRetail": "$XXX-$XXXX",
    "condition": "New/Excellent/Good/Fair",
    "authenticityConfidence": "95-100%"
  },
  "brandIdentifiers": {
    "likelyBrand": "brand name or null",
    "confidence": 90,
    "constructionHouse": "Italian/French/British/American/Asian"
  },
  "fabricAnalysis": {
    "weaveStructure": "plain/twill/satin/jacquard",
    "yarnQuality": "superior/high/standard",
    "weight": "lightweight/midweight/heavy",
    "colors": ["primary", "secondary"]
  },
  "lapelCollarArchitecture": {
    "style": "notched/peak/shawl/etc",
    "construction": "details"
  }
}

DO NOT OUTPUT ANYTHING OTHER THAN VALID JSON.`;

  // Get unique categories from wardrobe
  const getGarmentCategories = () => {
    const categories = new Set(wardrobe.map(item => item.analysis?.category || 'Other'));
    return ['all', ...Array.from(categories).sort()];
  };

  // Filter wardrobe when category changes
  useEffect(() => {
    if (selectedType === 'all') {
      setFilteredWardrobe(wardrobe);
    } else {
      setFilteredWardrobe(wardrobe.filter(item => 
        item.analysis?.category === selectedType
      ));
    }
    setVisibleItems(20);
  }, [selectedType, wardrobe]);

  // Load saved items on startup
  useEffect(() => {
    fetch('/api/get-wardrobe')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.items?.length > 0) {
          const formattedItems = data.items.map(item => ({
            id: item.id,
            name: item.item_name || 'Item',
            imageUrl: item.image_url,
            analysis: item.analysis_data,
            isSaved: true
          }));
          setWardrobe(formattedItems);
          console.log(`Loaded ${formattedItems.length} saved items`);
        }
      })
      .catch(err => console.log('Could not load saved items:', err));
  }, []);

  // Handle multi-select
  const toggleItemSelection = (itemId) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  // Batch analyze selected items
  const analyzeSelectedItems = async () => {
    if (selectedItems.size === 0) return;
    
    setIsAnalyzing(true);
    const itemsToAnalyze = wardrobe.filter(item => selectedItems.has(item.id));
    
    for (let item of itemsToAnalyze) {
      if (!item.analysis || !item.analysis.details) {
        try {
          const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              image: item.imageUrl.split(',')[1],
              type: 'wardrobe',
              prompt: DETAILED_WARDROBE_PROMPT
            })
          });

          const { analysis } = await response.json();
          
          setWardrobe(prev => prev.map(w => 
            w.id === item.id ? { ...w, analysis: analysis } : w
          ));

          await fetch('/api/update-item-analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              itemId: item.id,
              analysis: analysis
            })
          });

        } catch (error) {
          console.error(`Failed to analyze item ${item.id}:`, error);
        }
      }
    }
    
    setIsAnalyzing(false);
    setSelectedItems(new Set());
    setSelectionMode(false);
  };

  const handleWardrobeUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setIsUploading(true);
    setUploadProgress(0);
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      setCurrentAnalysisStep(`Analyzing item ${i + 1} of ${files.length}: ${file.name}`);
      
      try {
        const base64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64String = reader.result.split(',')[1];
            resolve(base64String);
          };
          reader.readAsDataURL(file);
        });

        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            image: base64,
            type: 'wardrobe',
            prompt: DETAILED_WARDROBE_PROMPT
          })
        });

        const { analysis } = await response.json();
        
        const item = {
          id: Date.now() + Math.random(),
          imageUrl: `data:image/jpeg;base64,${base64}`,
          name: analysis.suggested_name || analysis.name || `Item ${i + 1}`,
          analysis: analysis,
          isSaved: false
        };
        
        setWardrobe(prev => [...prev, item]);

        fetch('/api/save-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            analysisResult: analysis,
            imageData: base64,
            category: analysis.category || 'Other'
          })
        })
        .then(res => res.json())
        .then(result => {
          if (result.success) {
            console.log('Saved to database:', result.itemId);
            setWardrobe(prev => prev.map(w => 
              w.id === item.id ? { ...w, isSaved: true } : w
            ));
          }
        })
        .catch(err => console.log('Save failed:', err));
        
      } catch (error) {
        console.error(`Failed to analyze ${file.name}:`, error);
      }
    }
    
    setIsUploading(false);
    setUploadProgress(0);
    setCurrentAnalysisStep('');
    e.target.value = null;
  };

  // Lazy loading image component
  const LazyImage = ({ src, alt, className, onClick }) => {
    const [imageSrc, setImageSrc] = useState(null);
    const [imageRef, setImageRef] = useState();

    useEffect(() => {
      let observer;
      if (imageRef && !imageSrc) {
        observer = new IntersectionObserver(
          entries => {
            entries.forEach(entry => {
              if (entry.isIntersecting) {
                setImageSrc(src);
                observer.unobserve(imageRef);
              }
            });
          },
          { threshold: 0.1 }
        );
        observer.observe(imageRef);
      }
      return () => {
        if (observer && observer.unobserve && imageRef) {
          observer.unobserve(imageRef);
        }
      };
    }, [imageRef, imageSrc, src]);

    return (
      <div ref={setImageRef} className={className} onClick={onClick}>
        {imageSrc ? (
          <img 
            src={imageSrc} 
            alt={alt}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gray-200 animate-pulse" />
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Maura - Luxury Fashion Analysis</h1>
          <p className="text-gray-600">Upload images to analyze garment details, construction, and brand indicators</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              Your Wardrobe 
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({filteredWardrobe.length} {selectedType !== 'all' ? selectedType : 'items'})
              </span>
            </h2>
            <div className="flex items-center gap-4">
              {isUploading && (
                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-600">{currentAnalysisStep}</div>
                  <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
              
              {wardrobe.length > 0 && (
                <>
                  <button
                    onClick={() => {
                      setSelectionMode(!selectionMode);
                      setSelectedItems(new Set());
                    }}
                    className={`px-4 py-2 rounded transition ${
                      selectionMode 
                        ? 'bg-gray-500 text-white' 
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    }`}
                  >
                    {selectionMode ? 'Cancel Selection' : 'Select Items'}
                  </button>
                  
                  {selectionMode && selectedItems.size > 0 && (
                    <button
                      onClick={analyzeSelectedItems}
                      disabled={isAnalyzing}
                      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition disabled:bg-gray-400"
                    >
                      {isAnalyzing 
                        ? `Analyzing ${selectedItems.size} items...` 
                        : `Analyze ${selectedItems.size} Selected`}
                    </button>
                  )}
                </>
              )}
              
              <label className="px-4 py-2 bg-blue-500 text-white rounded cursor-pointer hover:bg-blue-600 transition">
                <input 
                  type="file" 
                  multiple 
                  accept="image/*"
                  onChange={handleWardrobeUpload}
                  className="hidden"
                  disabled={isUploading}
                />
                {isUploading ? 'Processing...' : 'Add Images'}
              </label>
            </div>
          </div>

          {wardrobe.length > 0 && (
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 border-b">
              {getGarmentCategories().map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedType(category)}
                  className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                    selectedType === category 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {category}
                  {category !== 'all' && (
                    <span className="ml-2 text-xs opacity-75">
                      ({wardrobe.filter(item => item.analysis?.category === category).length})
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {filteredWardrobe.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-500">
                {wardrobe.length === 0 
                  ? "No items in wardrobe yet" 
                  : `No ${selectedType.toLowerCase()} in your wardrobe`}
              </p>
              <p className="text-gray-400 text-sm mt-2">
                {wardrobe.length === 0 
                  ? "Upload garments to see detailed analysis" 
                  : "Try selecting a different category"}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {filteredWardrobe.slice(0, visibleItems).map(item => (
                  <div 
                    key={item.id}
                    onClick={() => {
                      if (selectionMode) {
                        toggleItemSelection(item.id);
                      } else {
                        setSelectedItem(item);
                      }
                    }}
                    className={`cursor-pointer relative group ${
                      selectionMode && selectedItems.has(item.id) 
                        ? 'ring-2 ring-blue-500 rounded-lg' 
                        : 'hover:opacity-80'
                    }`}
                  >
                    <LazyImage
                      src={item.imageUrl} 
                      alt={item.name}
                      className="w-full h-32 rounded-lg overflow-hidden"
                    />
                    {selectionMode && (
                      <div className={`absolute top-2 right-2 w-5 h-5 rounded-full border-2 ${
                        selectedItems.has(item.id) 
                          ? 'bg-blue-500 border-blue-500' 
                          : 'bg-white border-gray-400'
                      }`}>
                        {selectedItems.has(item.id) && (
                          <svg className="w-3 h-3 text-white m-auto" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    )}
                    {item.isSaved && (
                      <div className="absolute top-1 left-1 w-2 h-2 bg-green-500 rounded-full" 
                           title="Saved to database" />
                    )}
                    <p className="text-xs text-center mt-1 truncate px-1">{item.name}</p>
                  </div>
                ))}
              </div>
              
              {visibleItems < filteredWardrobe.length && (
                <div ref={loadMoreRef} className="text-center py-4 mt-4">
                  <div className="inline-flex items-center gap-2 text-gray-500">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                    Loading more items...
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {selectedItem && !selectionMode && (
          <div 
            className="fixed inset-0 bg-black z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedItem(null)}
          >
            <div 
              className="bg-white rounded-lg max-w-5xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white flex justify-between items-center p-4 border-b z-10">
                <h2 className="text-xl font-semibold">{selectedItem.name}</h2>
                <button 
                  onClick={() => setSelectedItem(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <img 
                      src={selectedItem.imageUrl} 
                      alt={selectedItem.name}
                      className="w-full rounded-lg shadow-md"
                    />
                  </div>
                  
                  <div className="space-y-4 overflow-y-auto max-h-[600px]">
                    {selectedItem.analysis?.overallAssessment && (
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <h3 className="font-semibold mb-2 text-purple-900">Overall Assessment</h3>
                        <div className="text-sm space-y-1">
                          <p><span className="font-medium">Tier:</span> {selectedItem.analysis.overallAssessment.tier}</p>
                          <p><span className="font-medium">Est. Retail:</span> {selectedItem.analysis.overallAssessment.estimatedRetail}</p>
                          <p><span className="font-medium">Condition:</span> {selectedItem.analysis.overallAssessment.condition}</p>
                          <p><span className="font-medium">Authenticity:</span> {selectedItem.analysis.overallAssessment.authenticityConfidence}</p>
                        </div>
                      </div>
                    )}
                    
                    {selectedItem.analysis?.brandIdentifiers && (
                      <div className="bg-yellow-50 p-4 rounded-lg">
                        <h3 className="font-semibold mb-2 text-yellow-900">Brand Identifiers</h3>
                        <div className="text-sm space-y-1">
                          {selectedItem.analysis.brandIdentifiers.likelyBrand && (
                            <p><span className="font-medium">Likely Brand:</span> {selectedItem.analysis.brandIdentifiers.likelyBrand} ({selectedItem.analysis.brandIdentifiers.confidence}%)</p>
                          )}
                          <p><span className="font-medium">Construction:</span> {selectedItem.analysis.brandIdentifiers.constructionHouse}</p>
                        </div>
                      </div>
                    )}

                    {selectedItem.analysis?.brand_indicators && (
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h3 className="font-semibold mb-2 text-blue-900">Brand & Logo Analysis</h3>
                        <div className="text-sm space-y-1">
                          {selectedItem.analysis.brand_indicators.visible_logos && (
                            <p><span className="font-medium">Visible Logos:</span> {selectedItem.analysis.brand_indicators.visible_logos}</p>
                          )}
                          {selectedItem.analysis.brand_indicators.hardware_logos && (
                            <p><span className="font-medium">Hardware Logos:</span> {selectedItem.analysis.brand_indicators.hardware_logos}</p>
                          )}
                          {selectedItem.analysis.brand_indicators.construction_signatures && (
                            <p><span className="font-medium">Construction Signatures:</span> {selectedItem.analysis.brand_indicators.construction_signatures}</p>
                          )}
                          <p><span className="font-medium">Confidence:</span> {selectedItem.analysis.brand_indicators.confidence}</p>
                        </div>
                      </div>
                    )}

                    {selectedItem.analysis?.luxury_markers && selectedItem.analysis.luxury_markers.length > 0 && (
                      <div className="bg-amber-50 p-4 rounded-lg">
                        <h3 className="font-semibold mb-2 text-amber-900">Luxury Quality Markers</h3>
                        <ul className="text-sm space-y-1">
                          {selectedItem.analysis.luxury_markers.map((marker, idx) => (
                            <li key={idx} className="flex items-start">
                              <span className="text-amber-600 mr-2">•</span>
                              <span>{marker}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="bg-slate-50 p-4 rounded-lg">
                      <h3 className="font-semibold mb-2 text-slate-900">Basic Information</h3>
                      <div className="text-sm space-y-1">
                        <p><span className="font-medium">Type:</span> {selectedItem.analysis?.type}</p>
                        <p><span className="font-medium">Category:</span> {selectedItem.analysis?.category}</p>
                        <p><span className="font-medium">Colors:</span> {selectedItem.analysis?.colors?.join(', ')}</p>
                        <p><span className="font-medium">Pattern:</span> {selectedItem.analysis?.pattern}</p>
                        <p><span className="font-medium">Material:</span> {selectedItem.analysis?.material}</p>
                        <p><span className="font-medium">Style:</span> {selectedItem.analysis?.style}</p>
                        <p><span className="font-medium">Fit:</span> {selectedItem.analysis?.fit}</p>
                        <p><span className="font-medium">Confidence:</span> {(selectedItem.analysis?.confidence * 100).toFixed(0)}%</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;