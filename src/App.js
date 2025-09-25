import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [wardrobe, setWardrobe] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [isAnalyzingInitial, setIsAnalyzingInitial] = useState(false);
  const ITEMS_PER_PAGE = 10;

  // Load saved items on startup - only first 10
  useEffect(() => {
    loadWardrobeItems(0);
  }, []);

  const loadWardrobeItems = async (page) => {
    try {
      const response = await fetch(`/api/get-wardrobe?limit=${ITEMS_PER_PAGE}&offset=${page * ITEMS_PER_PAGE}`);
      const data = await response.json();
      
      if (data.success && data.items?.length > 0) {
        const formattedItems = data.items.map(item => ({
          id: item.id,
          name: item.item_name || item.file_name || 'Item',
          imageUrl: item.image_url,
          analysis: item.analysis_data,
          isSaved: true,
          needsAnalysis: !item.analysis_data || Object.keys(item.analysis_data).length === 0
        }));
        
        if (page === 0) {
          setWardrobe(formattedItems);
          // Analyze first 5 items if they need it
          analyzeInitialItems(formattedItems.slice(0, 5));
        } else {
          setWardrobe(prev => [...prev, ...formattedItems]);
        }
        
        // Check if there are more items to load
        setHasMore(data.items.length === ITEMS_PER_PAGE);
        console.log(`Loaded ${formattedItems.length} items from page ${page}`);
      } else if (page === 0) {
        // No items at all
        setHasMore(false);
      }
    } catch (err) {
      console.log('Could not load saved items:', err);
      setHasMore(false);
    }
  };

  const analyzeInitialItems = async (items) => {
    const itemsNeedingAnalysis = items.filter(item => item.needsAnalysis);
    
    if (itemsNeedingAnalysis.length === 0) {
      console.log('All initial items already have analysis');
      return;
    }

    setIsAnalyzingInitial(true);
    console.log(`Analyzing ${itemsNeedingAnalysis.length} initial items...`);

    for (const item of itemsNeedingAnalysis) {
      try {
        // Extract base64 from the image URL if it's a data URL
        let base64;
        if (item.imageUrl.startsWith('data:')) {
          base64 = item.imageUrl.split(',')[1];
        } else {
          // If it's a regular URL, we need to fetch and convert it
          const response = await fetch(item.imageUrl);
          const blob = await response.blob();
          base64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              const base64String = reader.result.split(',')[1];
              resolve(base64String);
            };
            reader.readAsDataURL(blob);
          });
        }

        // Call API with the enhanced prompt
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            image: base64,
            type: 'wardrobe',
            prompt: getLuxuryAnalysisPrompt()
          })
        });

        const { analysis } = await response.json();
        
        if (analysis && !analysis.error) {
          // Update the item with analysis
          setWardrobe(prev => prev.map(w => 
            w.id === item.id ? { 
              ...w, 
              analysis: analysis,
              name: analysis.category || analysis.type || w.name,
              needsAnalysis: false 
            } : w
          ));

          // Update in database
          fetch('/api/update-item-analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              itemId: item.id,
              analysis: analysis
            })
          }).catch(err => console.log('Failed to update analysis:', err));
        }
      } catch (error) {
        console.error(`Failed to analyze initial item ${item.id}:`, error);
      }
    }

    setIsAnalyzingInitial(false);
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      setIsLoadingMore(true);
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      
      loadWardrobeItems(nextPage).finally(() => {
        setIsLoadingMore(false);
      });
    }
  };

  const getLuxuryAnalysisPrompt = () => {
    return `Analyze this luxury fashion garment image with expert precision. Identify:

BUTTONS: Examine all visible buttons - material (mother of pearl, corozo, horn, metal, plastic), logo/text engraving, attachment method (sewn through, shanked), thread color matching
LAPELS/COLLAR: Style (notch, peak, shawl, spread, point, club), width, construction (fused vs floating canvas), pick stitching presence, roll quality
LOGO PRESENCE: Check all typical locations - buttons, zippers, lining, labels, hardware, embossing
LUXURY CONSTRUCTION MARKERS: Hand-stitching, pick stitching on edges, functional buttonholes, reinforced stress points, French seams, lining attachment
MATERIALS: Identify fabric type, weave structure, weight, sheen, texture

Categorize as ONE of: Jackets, Tops, Dresses, Bottoms, Skirts, Shoes, Bags, Outerwear, Knitwear, Accessories

Return a natural language description (2-3 sentences) covering the most notable features, followed by structured details about:
- Brand indicators (logos, hardware, construction style)
- Quality markers (stitching, finishing, materials)
- Specific construction details
- Design elements (buttons, collars, pockets, closures)
- Estimated quality tier (Luxury/Designer/Premium/High-Street)

Format the response as JSON with these keys:
{
  "category": "[category from list above]",
  "description": "[natural language description]",
  "brand": { "detected": boolean, "name": "string", "confidence": 0-100, "indicators": [] },
  "construction": { "quality": "string", "details": [], "stitching": "string" },
  "materials": { "primary": "string", "quality_indicators": [] },
  "design_elements": { "buttons": "string", "collar": "string", "pockets": "string", "other": [] }
}`;
  };

  const handleWardrobeUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setIsUploading(true);
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        // Convert to base64
        const base64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64String = reader.result.split(',')[1];
            resolve(base64String);
          };
          reader.readAsDataURL(file);
        });

        // Call API with enhanced prompt
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            image: base64,
            type: 'wardrobe',
            prompt: getLuxuryAnalysisPrompt()
          })
        });

        const { analysis } = await response.json();
        
        const item = {
          id: Date.now() + Math.random(),
          imageUrl: `data:image/jpeg;base64,${base64}`,
          name: analysis.category || analysis.type || `Item ${i + 1}`,
          analysis: analysis,
          isSaved: false
        };
        
        setWardrobe(prev => [...prev, item]);

        // Save to database in background
        fetch('/api/save-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            analysisResult: analysis,
            imageData: base64,
            category: 'wardrobe'
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
    e.target.value = null;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Maura - Luxury Fashion Analysis</h1>
          <p className="text-gray-600">
            Upload images to analyze
            {isAnalyzingInitial && (
              <span className="ml-2 text-sm text-blue-600">
                (Analyzing initial items...)
              </span>
            )}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              Your Wardrobe 
              {wardrobe.length > 0 && (
                <span className="text-sm text-gray-500 ml-2">
                  ({wardrobe.length} items loaded)
                </span>
              )}
            </h2>
            <label className="px-4 py-2 bg-blue-500 text-white rounded cursor-pointer">
              <input 
                type="file" 
                multiple 
                accept="image/*"
                onChange={handleWardrobeUpload}
                className="hidden"
              />
              {isUploading ? 'Processing...' : 'Add Images'}
            </label>
          </div>

          {wardrobe.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-500">No items in wardrobe yet</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {wardrobe.map(item => (
                  <div 
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className="cursor-pointer hover:opacity-80 relative"
                  >
                    <img 
                      src={item.imageUrl} 
                      alt={item.name}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    {item.isSaved && (
                      <div className="absolute top-1 left-1 w-2 h-2 bg-green-500 rounded-full" 
                           title="Saved to database" />
                    )}
                    {item.needsAnalysis && (
                      <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-500 rounded-full animate-pulse" 
                           title="Analysis pending" />
                    )}
                    <p className="text-xs text-center mt-1 truncate px-1">
                      {item.analysis?.category || item.name}
                    </p>
                  </div>
                ))}
              </div>
              
              {/* Load More Button */}
              {hasMore && (
                <div className="mt-6 text-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg disabled:opacity-50"
                  >
                    {isLoadingMore ? 'Loading...' : 'Load More Items'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal for item details */}
        {selectedItem && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedItem(null)}
          >
            <div 
              className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center p-4 border-b">
                <h2 className="text-xl font-semibold">
                  {selectedItem.analysis?.category || selectedItem.name}
                </h2>
                <button 
                  onClick={() => setSelectedItem(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <img 
                    src={selectedItem.imageUrl} 
                    alt={selectedItem.name}
                    className="w-full rounded-lg"
                  />
                  
                  <div className="space-y-4">
                    {selectedItem.analysis?.description && (
                      <div className="bg-blue-50 p-3 rounded">
                        <h3 className="font-semibold mb-2">Description</h3>
                        <p className="text-sm">{selectedItem.analysis.description}</p>
                      </div>
                    )}

                    {selectedItem.analysis?.brand && (
                      <div className="bg-purple-50 p-3 rounded">
                        <h3 className="font-semibold mb-2">Brand Analysis</h3>
                        <div className="text-sm space-y-1">
                          {selectedItem.analysis.brand.detected && (
                            <>
                              <p><span className="font-medium">Brand:</span> {selectedItem.analysis.brand.name}</p>
                              <p><span className="font-medium">Confidence:</span> {selectedItem.analysis.brand.confidence}%</p>
                            </>
                          )}
                          {selectedItem.analysis.brand.indicators?.length > 0 && (
                            <p><span className="font-medium">Indicators:</span> {selectedItem.analysis.brand.indicators.join(', ')}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedItem.analysis?.construction && (
                      <div className="bg-yellow-50 p-3 rounded">
                        <h3 className="font-semibold mb-2">Construction Quality</h3>
                        <div className="text-sm space-y-1">
                          <p><span className="font-medium">Quality:</span> {selectedItem.analysis.construction.quality}</p>
                          {selectedItem.analysis.construction.stitching && (
                            <p><span className="font-medium">Stitching:</span> {selectedItem.analysis.construction.stitching}</p>
                          )}
                          {selectedItem.analysis.construction.details?.length > 0 && (
                            <div>
                              <span className="font-medium">Details:</span>
                              <ul className="mt-1 ml-4">
                                {selectedItem.analysis.construction.details.map((detail, idx) => (
                                  <li key={idx} className="text-xs">• {detail}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedItem.analysis?.materials && (
                      <div className="bg-green-50 p-3 rounded">
                        <h3 className="font-semibold mb-2">Materials</h3>
                        <div className="text-sm space-y-1">
                          <p><span className="font-medium">Primary:</span> {selectedItem.analysis.materials.primary}</p>
                          {selectedItem.analysis.materials.quality_indicators?.length > 0 && (
                            <p><span className="font-medium">Quality Indicators:</span> {selectedItem.analysis.materials.quality_indicators.join(', ')}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedItem.analysis?.design_elements && (
                      <div className="bg-indigo-50 p-3 rounded">
                        <h3 className="font-semibold mb-2">Design Elements</h3>
                        <div className="text-sm space-y-1">
                          {selectedItem.analysis.design_elements.buttons && (
                            <p><span className="font-medium">Buttons:</span> {selectedItem.analysis.design_elements.buttons}</p>
                          )}
                          {selectedItem.analysis.design_elements.collar && (
                            <p><span className="font-medium">Collar:</span> {selectedItem.analysis.design_elements.collar}</p>
                          )}
                          {selectedItem.analysis.design_elements.pockets && (
                            <p><span className="font-medium">Pockets:</span> {selectedItem.analysis.design_elements.pockets}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
}

export default App;