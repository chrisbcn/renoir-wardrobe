import React, { useState, useEffect } from 'react';

// Detailed luxury fashion analysis prompt
const getLuxuryAnalysisPrompt = () => {
  return {
    type: "Analyze as luxury fashion expert",
    name: "Item name (e.g., 'Double-breasted blazer', 'Silk dress')",
    
    hardwareFastenings: {
      buttons: {
        material: "mother of pearl/corozo/horn/brass/plastic/covered",
        logoEngraving: "any text or logo visible",
        construction: "sewn through/shanked",
        threadColor: "matching or contrasting"
      },
      zippers: {
        brand: "YKK/Lampo/RiRi/Raccagni",
        type: "metal/plastic/invisible",
        pulls: "logo presence or custom pulls"
      }
    },
    
    lapelCollarArchitecture: {
      style: "notch/peak/shawl for lapels, spread/point/club for collars",
      width: "narrow/standard/wide",
      construction: "fused/floating canvas",
      pickStitching: "present/absent",
      rollQuality: "soft/structured"
    },
    
    constructionSignatures: {
      pickStitching: "edges with visible pick stitching",
      shoulderConstruction: "natural/structured/roped",
      sleeveHeads: "gathered/smooth",
      lining: "fully/half/butterfly lined",
      seamConstruction: "French/flat-fell/pinked/serged",
      handwork: "areas showing hand stitching"
    },
    
    fabricAnalysis: {
      weaveStructure: "plain/twill/satin/herringbone/houndstooth",
      yarnQuality: "Super 120s-180s for wool",
      weight: "light/medium/heavy",
      pattern: "solid/striped/checked/plaid",
      patternMatching: "matched at seams yes/no",
      colors: ["primary color", "secondary colors"]
    },
    
    brandIdentifiers: {
      likelyBrand: "brand name if identifiable",
      confidence: 0-100,
      visibleLogos: "locations of any logos",
      constructionHouse: "Italian/French/British/Japanese styling",
      hiddenSignatures: "internal stamps, tags, serial numbers"
    },
    
    qualityIndicators: {
      handworkEvidence: ["hand-rolled edges", "hand-sewn buttonholes", "pick stitching"],
      luxuryMarkers: ["functional buttonholes", "surgeon's cuffs", "reinforced stress points"],
      authenticityMarkers: ["consistent stitching", "quality control stamps", "proper labeling"]
    },
    
    overallAssessment: {
      tier: "haute couture/luxury/premium/contemporary/fast fashion",
      estimatedRetail: "$X,XXX-$X,XXX range",
      authenticityConfidence: "high/medium/low with reasoning",
      condition: "new/excellent/good/fair/poor",
      estimatedAge: "current season/1-2 years/vintage"
    }
  };
};

function App() {
  const [wardrobe, setWardrobe] = useState([]);
  const [inspirationImage, setInspirationImage] = useState(null);
  const [inspirationAnalysis, setInspirationAnalysis] = useState(null);
  const [matchingResults, setMatchingResults] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isProcessingInspiration, setIsProcessingInspiration] = useState(false);
  const [uploadingItems, setUploadingItems] = useState([]);
  const [currentAnalysisStep, setCurrentAnalysisStep] = useState('');
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
  // New states for pagination and auto-analysis
  const [hasMoreItems, setHasMoreItems] = useState(true);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isAnalyzingInitial, setIsAnalyzingInitial] = useState(false);
  const [analyzingItems, setAnalyzingItems] = useState(new Set());
  const [isAnalyzingAll, setIsAnalyzingAll] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const ITEMS_PER_PAGE = 10;

  const [lookImage, setLookImage] = useState(null);
  const [lookAnalysis, setLookAnalysis] = useState(null);
  const [lookMatches, setLookMatches] = useState(null);
  const [isProcessingLook, setIsProcessingLook] = useState(false);

  // Load saved wardrobe items - now with pagination
  useEffect(() => {
    loadWardrobeItems(0);
  }, []);

  // ✅ FIXED: New function to load items with pagination
  const loadWardrobeItems = async (offset) => {
    if (isLoadingMore) return;
    
    setIsLoadingMore(true);
    if (offset === 0) {
      setIsInitialLoading(true);
    }
    
    try {
      const response = await fetch(`/api/get-wardrobe?limit=${ITEMS_PER_PAGE}&offset=${offset}`);
      
      if (!response.ok) {
        console.error(`API error: ${response.status} ${response.statusText}`);
        if (response.status === 500) {
          console.log('Database connection issue - showing empty state');
          setHasMoreItems(false);
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.log('API returned non-JSON response, falling back to localStorage');
        throw new Error('API not available - non-JSON response');
      }
      
      const data = await response.json();
      console.log('API Response:', data);
      
      if (data.success && data.items) {
        const formattedItems = data.items.map(item => ({
          id: `db-${item.id}`, // Unique frontend ID
          databaseId: item.id,  // ✅ FIXED: Store the actual database ID
          name: item.analysis_data?.name || item.item_name || 'Unknown Item',
          imageUrl: item.image_url,
          analysis: item.analysis_data,
          needsAnalysis: !item.analysis_data || !item.analysis_data.name,
          garmentType: item.garment_type
        }));
        
        console.log(`Loaded ${formattedItems.length} items from database`);
        
        if (offset === 0) {
          setWardrobe(formattedItems);
        } else {
          setWardrobe(prev => [...prev, ...formattedItems]);
        }
        
        setCurrentOffset(offset);
        setHasMoreItems(formattedItems.length === ITEMS_PER_PAGE);
        
        if (offset === 0 && formattedItems.some(item => item.needsAnalysis)) {
          const unanalyzedCount = formattedItems.filter(item => item.needsAnalysis).length;
          if (unanalyzedCount > 0 && window.confirm(`Found ${unanalyzedCount} items that need analysis. Analyze them now?`)) {
            setIsAnalyzingInitial(true);
            analyzeUnanalyzedItems(formattedItems.filter(item => item.needsAnalysis));
          }
        }
      } else {
        console.warn('No items found or API response format unexpected');
        setHasMoreItems(false);
      }
      
    } catch (error) {
      console.warn('Failed to load from database, falling back to localStorage:', error);
      
      if (offset === 0) {
        const saved = localStorage.getItem('wardrobe-items');
        if (saved) {
          try {
            const savedItems = JSON.parse(saved);
            setWardrobe(savedItems);
          } catch (parseError) {
            console.error('Failed to parse localStorage data:', parseError);
          }
        }
      }
      setHasMoreItems(false);
    } finally {
      setIsLoadingMore(false);
      if (offset === 0) {
        setIsInitialLoading(false);
      }
    }
  };

  // Generate a unique ID for new items
  const generateUniqueId = () => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // ✅ FIXED: Updated saveToDatabase to return the database ID
  const saveToDatabase = async (analysisResult, imageData, category = 'wardrobe', itemId = null) => {
    try {
      const endpoint = itemId ? '/api/update-item' : '/api/save-item';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          analysisResult,
          imageData,
          category
        })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log(`Successfully ${itemId ? 'updated' : 'saved'} to database:`, result.itemId || itemId);
        return result.itemId || itemId; // ✅ FIXED: Return the database ID
      } else {
        console.warn('Failed to save to database:', result.error);
        return null;
      }
    } catch (error) {
      console.warn('Database save failed (analysis still works):', error);
      return null;
    }
  };

  // ✅ FIXED: Handle wardrobe image uploads
  const handleWardrobeUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setIsUploading(true);
    setUploadProgress(0);

    const placeholders = files.map((file, index) => ({
      id: `placeholder-${Date.now()}-${index}`,
      imageUrl: URL.createObjectURL(file),
      name: file.name,
      isLoading: true,
      loadingMessage: 'Preparing image...'
    }));
    
    setUploadingItems(placeholders);
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      
      setUploadingItems(prev => prev.map((item, index) => 
        index === i ? { ...item, loadingMessage: 'Analyzing luxury details...' } : item
      ));
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

        setUploadingItems(prev => prev.map((item, index) => 
          index === i ? { ...item, loadingMessage: 'Getting analysis from AI...' } : item
        ));

        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64, type: 'wardrobe' })
        });

        if (!response.ok) {
          throw new Error(`Analysis failed: ${response.status}`);
        }

        const { analysis } = await response.json();
        
        if (analysis && !analysis.error) {
          setUploadingItems(prev => prev.map((item, index) => 
            index === i ? { ...item, loadingMessage: 'Saving to database...' } : item
          ));

          // ✅ FIXED: Save to database and get the ID
          const databaseId = await saveToDatabase(analysis, base64, 'wardrobe');

          const newItem = {
            id: generateUniqueId(),
            databaseId: databaseId, // ✅ FIXED: Store the database ID
            name: analysis.name || analysis.type || file.name,
            imageUrl: URL.createObjectURL(file),
            analysis: analysis,
            needsAnalysis: false,
            garmentType: analysis.type
          };

          setWardrobe(prev => [...prev, newItem]);
          console.log(`Successfully processed: ${newItem.name}`);
        } else {
          throw new Error(analysis?.error || 'Analysis failed');
        }
      } catch (error) {
        console.error(`Failed to process ${file.name}:`, error);
        alert(`Failed to process ${file.name}: ${error.message}`);
      }
    }

    setUploadingItems([]);
    setIsUploading(false);
    setUploadProgress(0);
    setCurrentAnalysisStep('');
    e.target.value = '';
  };

  // ✅ FIXED: Complete delete function
  const deleteSingleItem = async (item) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete "${item.name}"?\n\nThis action cannot be undone.`);
    
    if (!confirmDelete) return;
    
    try {
      console.log('Attempting to delete item:', {
        id: item.id,
        databaseId: item.databaseId,
        name: item.name
      });
      
      // Only try to delete from database if item has a databaseId
      if (item.databaseId) {
        console.log(`Deleting item ${item.databaseId} from database...`);
        
        const response = await fetch('/api/delete-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId: item.databaseId }) // ✅ FIXED: Use databaseId
        });
        
        console.log('Delete API response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Database delete failed:', errorData);
          alert(`Delete failed: ${errorData.error || 'Unknown error'}`);
          return; // Don't remove from UI if delete failed
        }
        
        const result = await response.json();
        console.log('Database delete successful:', result);
      } else {
        console.log('Item has no databaseId, skipping database deletion (local-only item)');
      }
      
      // Remove from frontend state
      setWardrobe(prev => prev.filter(w => w.id !== item.id));
      
      // Close modal if this item was selected
      if (selectedItem && selectedItem.id === item.id) {
        setSelectedItem(null);
      }
      
      console.log(`Successfully deleted item: ${item.name}`);
      
    } catch (error) {
      console.error(`Failed to delete item ${item.id}:`, error);
      alert(`Failed to delete item: ${error.message}`);
    }
  };

  // Function to re-analyze an already analyzed item
  const reanalyzeSingleItem = async (item) => {
    const confirmReanalyze = window.confirm(`Re-analyze "${item.name}"? This will replace the existing analysis.`);
    
    if (!confirmReanalyze) return;
    
    await analyzeSingleItem(item);
  };

  // Single item analysis function
  const analyzeSingleItem = async (item) => {
    if (analyzingItems.has(item.id)) {
      console.log(`Item ${item.id} is already being analyzed`);
      return;
    }

    setAnalyzingItems(prev => {
      const newSet = new Set(prev);
      newSet.add(item.id);
      return newSet;
    });

    try {
      console.log(`Starting analysis for item ${item.id}: ${item.name}`);
      
      const base64 = await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          const dataURL = canvas.toDataURL('image/jpeg', 0.8);
          resolve(dataURL.split(',')[1]);
        };
        img.src = item.imageUrl;
      });

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, type: 'wardrobe' })
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }

      const { analysis } = await response.json();
      
      if (analysis && !analysis.error) {
        setWardrobe(prev => prev.map(w => 
          w.id === item.id ? { 
            ...w, 
            analysis, 
            name: analysis.name || analysis.type || w.name,
            needsAnalysis: false 
          } : w
        ));
        
        await saveToDatabase(analysis, base64, 'wardrobe', item.databaseId);
        
        console.log(`Successfully analyzed item ${item.id}`);
      } else {
        throw new Error(analysis?.error || 'Analysis failed');
      }
    } catch (error) {
      console.error(`Failed to analyze item ${item.id}:`, error);
      alert(`Failed to analyze item: ${error.message}`);
    } finally {
      setAnalyzingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  };

  // Selection functions
  const toggleItemSelection = (itemId) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  const selectAll = () => {
    setSelectedItems(new Set(wardrobe.map(item => item.id)));
  };

  // Bulk actions
  const deleteSelectedItems = async () => {
    if (selectedItems.size === 0) return;
    
    const confirmDelete = window.confirm(`Delete ${selectedItems.size} selected item(s)?\n\nThis action cannot be undone.`);
    if (!confirmDelete) return;
    
    const itemsToDelete = wardrobe.filter(item => selectedItems.has(item.id));
    
    for (const item of itemsToDelete) {
      await deleteSingleItem(item);
    }
    
    clearSelection();
  };

  const analyzeSelectedItems = async () => {
    if (selectedItems.size === 0) return;
    
    const itemsToAnalyze = wardrobe.filter(item => selectedItems.has(item.id));
    
    for (const item of itemsToAnalyze) {
      if (item.needsAnalysis) {
        await analyzeSingleItem(item);
      } else {
        await reanalyzeSingleItem(item);
      }
    }
    
    clearSelection();
  };

  // Handle inspiration image uploads
  const handleInspirationUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsProcessingInspiration(true);
    setMatchingResults(null);
    setInspirationAnalysis(null);
    
    try {
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64String = reader.result.split(',')[1];
          resolve(base64String);
        };
        reader.readAsDataURL(file);
      });

      const imageUrl = `data:image/jpeg;base64,${base64}`;
      setInspirationImage(imageUrl);
      
      setCurrentAnalysisStep('Analyzing fashion items with luxury detail...');

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image: base64,
          type: 'inspiration'
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`API error: ${response.status} - ${error}`);
      }

      const { analysis } = await response.json();
      
      if (analysis.error) {
        throw new Error(analysis.error);
      }
      
      setInspirationAnalysis(analysis);
      
      setCurrentAnalysisStep('Saving inspiration...');
      saveToDatabase(analysis, base64, 'inspiration').then(itemId => {
        if (itemId) {
          console.log('Inspiration saved to database:', itemId);
        }
      });
      
      setCurrentAnalysisStep('Matching with your wardrobe...');
      generateMatches(analysis);
      setCurrentAnalysisStep('');
      
    } catch (error) {
      console.error('Failed to analyze inspiration:', error);
      alert(`Failed to analyze inspiration image: ${error.message}`);
      setCurrentAnalysisStep('');
    }
    
    setIsProcessingInspiration(false);
  };

  // Generate matching results with enhanced luxury matching
  const generateMatches = (inspirationData) => {
    const matches = wardrobe.map(item => {
      const similarity = calculateLuxurySimilarity(inspirationData, item.analysis);
      return { ...item, similarity };
    });
    
    matches.sort((a, b) => b.similarity.score - a.similarity.score);
    setMatchingResults(matches.slice(0, 5));
  };

  // Enhanced similarity calculation for luxury items
  const calculateLuxurySimilarity = (inspiration, wardrobe) => {
    if (!wardrobe || wardrobe.error) {
      return { score: 0, reasoning: 'Unable to analyze this item' };
    }

    let score = 0;
    const factors = [];
    
    // Type match (30%)
    if (inspiration.type === wardrobe.type) {
      score += 30;
      factors.push(`Same garment type (${wardrobe.type})`);
    }
    
    // Quality tier match (20%)
    if (inspiration.overallAssessment?.tier === wardrobe.overallAssessment?.tier) {
      score += 20;
      factors.push(`Same quality tier (${wardrobe.overallAssessment?.tier})`);
    }
    
    // Construction style match (15%)
    if (inspiration.brandIdentifiers?.constructionHouse === wardrobe.brandIdentifiers?.constructionHouse) {
      score += 15;
      factors.push(`Similar construction style (${wardrobe.brandIdentifiers?.constructionHouse})`);
    }
    
    // Color match (15%)
    const colorMatch = inspiration.fabricAnalysis?.colors?.some(c1 => 
      wardrobe.fabricAnalysis?.colors?.some(c2 => 
        c1.toLowerCase().includes(c2.toLowerCase()) || 
        c2.toLowerCase().includes(c1.toLowerCase())
      )
    );
    if (colorMatch) {
      score += 15;
      factors.push('Color match found');
    }
    
    // Material match (10%)
    if (inspiration.fabricAnalysis?.weaveStructure === wardrobe.fabricAnalysis?.weaveStructure) {
      score += 10;
      factors.push(`Same fabric type (${wardrobe.fabricAnalysis?.weaveStructure})`);
    }
    
    // Detail match (10%)
    if (inspiration.lapelCollarArchitecture?.style === wardrobe.lapelCollarArchitecture?.style) {
      score += 10;
      factors.push(`Similar collar/lapel style`);
    }
    
    return {
      score: Math.min(score, 95),
      reasoning: factors.join(', ') || 'No significant matches'
    };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4">
        <header className="text-center py-12 mb-6">
          <h1 className="text-5xl font-bold mb-2 text-gray-900">Maura</h1>
          <p className="text-xl text-gray-600">Luxury Wardrobe Management & Style Matching</p>
        </header>

        {/* Upload Inspiration Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Upload Inspiration Image</h2>
          <p className="text-gray-600 mb-4">
            Upload a fashion image to find similar luxury pieces in your wardrobe
          </p>
          
          <label className="btn-primary cursor-pointer">
            <input 
              type="file" 
              accept="image/*"
              onChange={handleInspirationUpload}
              disabled={isProcessingInspiration}
              className="hidden"
            />
            {isProcessingInspiration ? 'Analyzing...' : 'Choose Inspiration Image'}
          </label>
          
          {currentAnalysisStep && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-blue-800 font-medium">
              {currentAnalysisStep}
            </div>
          )}
        </div>

        {/* Results Section */}
        {inspirationImage && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold mb-4">Inspiration</h3>
              <img src={inspirationImage} alt="Fashion inspiration" className="w-full max-w-md rounded-lg mb-4" />
              
              {inspirationAnalysis && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Analysis</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div><strong>Type:</strong> {inspirationAnalysis.type}</div>
                    <div><strong>Brand:</strong> {inspirationAnalysis.brandIdentifiers?.likelyBrand || 'Unidentified'}</div>
                    <div><strong>Tier:</strong> {inspirationAnalysis.overallAssessment?.tier}</div>
                    <div><strong>Colors:</strong> {inspirationAnalysis.fabricAnalysis?.colors?.join(', ')}</div>
                  </div>
                </div>
              )}
            </div>

            {matchingResults && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-semibold mb-4">Your Wardrobe Matches</h3>
                <div className="space-y-4">
                  {matchingResults.map(match => (
                    <div key={match.id} className="flex gap-4 p-3 bg-gray-50 rounded-lg">
                      <img src={match.imageUrl} alt={match.name} className="w-16 h-16 object-cover rounded" />
                      <div className="flex-1">
                        <div className="font-medium">{match.name}</div>
                        <div className="text-green-600 font-semibold">{Math.round(match.similarity.score)}% match</div>
                        <div className="text-sm text-gray-600">{match.similarity.reasoning}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Wardrobe Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">
              Your Wardrobe ({wardrobe.length} items)
            </h2>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  isEditMode 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                {isEditMode ? 'Exit Edit' : 'Edit Mode'}
              </button>
              
              <label className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg font-medium cursor-pointer transition-all">
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
          </div>

          {/* Action Bar for Selected Items - only in edit mode */}
          {isEditMode && selectedItems.size > 0 && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-blue-900">
                    {selectedItems.size} item{selectedItems.size > 1 ? 's' : ''} selected
                  </span>
                  <button
                    onClick={clearSelection}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    Clear selection
                  </button>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={analyzeSelectedItems}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg"
                  >
                    Analyze Selected
                  </button>
                  
                  <button
                    onClick={deleteSelectedItems}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg"
                  >
                    Delete Selected
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Show uploading items */}
          {uploadingItems.length > 0 && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">Uploading Items...</h3>
              <div className="text-sm text-gray-600 mb-4">Progress: {uploadProgress}%</div>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {uploadingItems.map(item => (
                  <div key={item.id} className="text-center">
                    <div className="item-image-container relative">
                      <img src={item.imageUrl} alt={item.name} className="item-image opacity-50" />
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-30">
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mb-2"></div>
                        <p className="text-white text-xs text-center px-2">{item.loadingMessage}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Loading state */}
          {isInitialLoading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your wardrobe...</p>
            </div>
          ) : (
            <>
              {/* Show existing wardrobe items */}
              <div className="wardrobe-grid">
                {wardrobe.map(item => (
                  <div 
                    key={item.id}
                    className="cursor-pointer relative"
                    onMouseEnter={() => setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                    title={item.needsAnalysis ? "Hover for options" : "Click image for details, hover for options"}
                  >
                    <div className="item-image-container relative">
                      {/* Selection checkbox in edit mode */}
                      {isEditMode && (
                        <div className="absolute top-2 left-2 z-20">
                          <input
                            type="checkbox"
                            checked={selectedItems.has(item.id)}
                            onChange={() => toggleItemSelection(item.id)}
                            className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      )}

                      <img 
                        src={item.imageUrl} 
                        alt={item.name}
                        className="item-image"
                        onClick={() => !analyzingItems.has(item.id) && setSelectedItem(item)}
                        style={{ cursor: 'pointer' }}
                      />
                      
                      {/* Hover overlay with buttons */}
                      {hoveredItem === item.id && (
                        <div 
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            display: 'flex',
                            alignItems: 'flex-end',
                            justifyContent: 'center',
                            paddingBottom: '8px',
                            gap: '8px',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {/* Analyze/Re-analyze button */}
                          <button
                            style={{
                              padding: '6px 12px',
                              backgroundColor: analyzingItems.has(item.id) ? '#9CA3AF' : '#10B981',
                              color: 'white',
                              fontSize: '12px',
                              fontWeight: '500',
                              borderRadius: '4px',
                              border: 'none',
                              cursor: analyzingItems.has(item.id) ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!analyzingItems.has(item.id)) {
                                if (item.needsAnalysis) {
                                  analyzeSingleItem(item);
                                } else {
                                  reanalyzeSingleItem(item);
                                }
                              }
                            }}
                            disabled={analyzingItems.has(item.id)}
                          >
                            {analyzingItems.has(item.id) ? (
                              <>
                                <div style={{
                                  width: '12px',
                                  height: '12px',
                                  border: '2px solid white',
                                  borderTop: '2px solid transparent',
                                  borderRadius: '50%',
                                  animation: 'spin 1s linear infinite'
                                }}></div>
                                Analyzing...
                              </>
                            ) : (
                              <>
                                ⚡
                                {item.needsAnalysis ? 'Analyze' : 'Re-analyze'}
                              </>
                            )}
                          </button>
                          
                          {/* ✅ FIXED: Delete button */}
                          <button
                            style={{
                              padding: '6px 12px',
                              backgroundColor: '#EF4444',
                              color: 'white',
                              fontSize: '12px',
                              fontWeight: '500',
                              borderRadius: '4px',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log('Delete clicked for item:', {
                                id: item.id,
                                databaseId: item.databaseId,
                                name: item.name
                              });
                              deleteSingleItem(item);
                            }}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {/* Quality tier indicator */}
                    {item.analysis?.overallAssessment?.tier && (
                      <div 
                        className={`absolute top-1 right-1 px-1 py-0.5 text-xs font-medium rounded ${
                          item.analysis.overallAssessment.tier === 'luxury' ? 'bg-purple-100 text-purple-800' :
                          item.analysis.overallAssessment.tier === 'premium' ? 'bg-blue-100 text-blue-800' :
                          item.analysis.overallAssessment.tier === 'haute couture' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}
                        style={{ zIndex: 10 }}
                      >
                        {item.analysis.overallAssessment.tier}
                      </div>
                    )}
                    
                    {/* Status indicators */}
                    {item.databaseId && !item.needsAnalysis && (
                      <div 
                        className="absolute top-1 left-1 w-2 h-2 bg-green-500 rounded-full" 
                        style={{ zIndex: 10 }}
                        title="Saved and analyzed"
                      />
                    )}
                    {item.needsAnalysis && !analyzingItems.has(item.id) && (
                      <div 
                        className="absolute top-1 left-1 w-2 h-2 bg-yellow-500 rounded-full animate-pulse" 
                        style={{ zIndex: 10 }}
                        title="Analysis needed"
                      />
                    )}
                    
                    <p className="text-sm mt-1 text-center">{item.name}</p>
                  </div>
                ))}
              </div>

              {/* Load more button */}
              {hasMoreItems && (
                <div className="text-center mt-6">
                  <button
                    onClick={() => {
                      if (!isLoadingMore && hasMoreItems) {
                        setIsLoadingMore(true);
                        loadWardrobeItems(currentOffset + ITEMS_PER_PAGE);
                      }
                    }}
                    disabled={isLoadingMore}
                    className="px-6 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-lg font-medium"
                  >
                    {isLoadingMore ? 'Loading...' : 'Load More Items'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Item detail modal */}
        {selectedItem && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
            onClick={() => setSelectedItem(null)}
          >
            <div 
              className="bg-white rounded-lg max-w-2xl max-h-80vh overflow-y-auto m-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center p-6 border-b">
                <h3 className="text-xl font-semibold">{selectedItem.name}</h3>
                <button 
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                  onClick={() => setSelectedItem(null)}
                >
                  ×
                </button>
              </div>
              
              <div className="p-6">
                <img src={selectedItem.imageUrl} alt={selectedItem.name} className="w-full max-w-sm mx-auto rounded-lg mb-6" />
                
                {selectedItem.analysis && !selectedItem.analysis.error ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold mb-2">Basic Information</h4>
                      <p><strong>Type:</strong> {selectedItem.analysis.type}</p>
                      <p><strong>Brand:</strong> {selectedItem.analysis.brandIdentifiers?.likelyBrand || 'Unidentified'}</p>
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold mb-2">Quality Assessment</h4>
                      <p><strong>Tier:</strong> {selectedItem.analysis.overallAssessment?.tier}</p>
                      <p><strong>Estimated Value:</strong> {selectedItem.analysis.overallAssessment?.estimatedRetail}</p>
                      <p><strong>Authenticity:</strong> {selectedItem.analysis.overallAssessment?.authenticityConfidence}</p>
                    </div>
                    
                    {selectedItem.analysis.fabricAnalysis && (
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-semibold mb-2">Fabric Analysis</h4>
                        <p><strong>Material:</strong> {selectedItem.analysis.fabricAnalysis.weaveStructure}</p>
                        <p><strong>Colors:</strong> {selectedItem.analysis.fabricAnalysis.colors?.join(', ')}</p>
                      </div>
                    )}
                  </div>
                ) : selectedItem.needsAnalysis ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 mb-4">This item needs analysis. Click the analyze button to get detailed information.</p>
                    <button 
                      onClick={() => {
                        setSelectedItem(null);
                        analyzeSingleItem(selectedItem);
                      }}
                      className="btn-primary"
                    >
                      Analyze Now
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-600 mb-4">Analysis failed for this item. Please try re-analyzing.</p>
                    <button 
                      onClick={() => {
                        setSelectedItem(null);
                        reanalyzeSingleItem(selectedItem);
                      }}
                      className="btn-primary"
                    >
                      Re-analyze
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;