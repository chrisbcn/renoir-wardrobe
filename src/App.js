// App.js - Complete version with pagination and detailed analysis

import React, { useState, useEffect } from 'react';
import './App.css';

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
  
  // New states for pagination and auto-analysis
  const [hasMoreItems, setHasMoreItems] = useState(true);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isAnalyzingInitial, setIsAnalyzingInitial] = useState(false);
  const ITEMS_PER_PAGE = 10;

  // Load saved wardrobe items - now with pagination
  useEffect(() => {
    loadWardrobeItems(0);
  }, []);

  // New function to load items with pagination
  const loadWardrobeItems = async (offset) => {
    try {
      const response = await fetch(`/api/get-wardrobe?limit=${ITEMS_PER_PAGE}&offset=${offset}`);
      const data = await response.json();
      
      if (data.success && data.items?.length > 0) {
        const formattedItems = data.items.map(item => ({
          id: item.id,
          imageUrl: item.image_url,
          name: item.item_name || item.garment_type || 'Item',
          source: 'database',
          analysis: item.analysis_data || {},
          databaseId: item.id,
          needsAnalysis: !item.analysis_data || Object.keys(item.analysis_data).length === 0
        }));

        if (offset === 0) {
          setWardrobe(formattedItems);
          // Auto-analyze first 5 items if they need it
          analyzeInitialItems(formattedItems.slice(0, 5));
        } else {
          setWardrobe(prev => [...prev, ...formattedItems]);
        }
        
        // Check if there are more items
        setHasMoreItems(data.items.length === ITEMS_PER_PAGE);
        setCurrentOffset(offset);
        
        console.log(`Loaded ${formattedItems.length} items from offset ${offset}`);
      } else {
        setHasMoreItems(false);
      }
    } catch (err) {
      console.log('Could not load items:', err);
      setHasMoreItems(false);
    }
    setIsLoadingMore(false);
  };

  // New function to analyze initial items
  const analyzeInitialItems = async (items) => {
    const itemsNeedingAnalysis = items.filter(item => item.needsAnalysis);
    
    if (itemsNeedingAnalysis.length === 0) return;
    
    setIsAnalyzingInitial(true);
    console.log(`Auto-analyzing ${itemsNeedingAnalysis.length} items...`);
    
    for (const item of itemsNeedingAnalysis) {
      try {
        // Extract base64 from URL or fetch if needed
        let base64;
        if (item.imageUrl.startsWith('data:')) {
          base64 = item.imageUrl.split(',')[1];
        } else {
          // For Supabase URLs, fetch and convert
          const response = await fetch(item.imageUrl);
          const blob = await response.blob();
          base64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              resolve(reader.result.split(',')[1]);
            };
            reader.readAsDataURL(blob);
          });
        }

        // Call API with luxury prompt
        const analysisResponse = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            image: base64,
            type: 'wardrobe',
            prompt: getLuxuryAnalysisPrompt()
          })
        });

        const { analysis } = await analysisResponse.json();
        
        if (analysis && !analysis.error) {
          // Update the item with analysis
          setWardrobe(prev => prev.map(w => 
            w.id === item.id ? { 
              ...w, 
              analysis, 
              name: analysis.name || analysis.type || w.name,
              needsAnalysis: false 
            } : w
          ));
          
          // Save to database
          await saveToDatabase(analysis, base64, 'wardrobe', item.id);
        }
      } catch (error) {
        console.error(`Failed to auto-analyze item ${item.id}:`, error);
      }
    }
    
    setIsAnalyzingInitial(false);
  };

  // Load more button handler
  const handleLoadMore = () => {
    if (!isLoadingMore && hasMoreItems) {
      setIsLoadingMore(true);
      loadWardrobeItems(currentOffset + ITEMS_PER_PAGE);
    }
  };

  // Updated saveToDatabase to handle updates
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
        return result.itemId || itemId;
      } else {
        console.warn('Failed to save to database:', result.error);
        return null;
      }
    } catch (error) {
      console.warn('Database save failed (analysis still works):', error);
      return null;
    }
  };

  // Handle wardrobe image uploads - updated with luxury prompt
  const handleWardrobeUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setIsUploading(true);
    setUploadProgress(0);
    
    // Create placeholder items for loading state
    const placeholders = files.map((file, index) => ({
      id: `placeholder-${Date.now()}-${index}`,
      imageUrl: URL.createObjectURL(file),
      name: file.name,
      isLoading: true,
      loadingMessage: 'Preparing image...'
    }));
    
    setUploadingItems(placeholders);
    
    const newItems = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      
      // Update loading message for current item
      setUploadingItems(prev => prev.map((item, index) => 
        index === i ? { ...item, loadingMessage: 'Analyzing luxury details...' } : item
      ));
      setCurrentAnalysisStep(`Analyzing item ${i + 1} of ${files.length}: ${file.name}`);
      
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

        // Update loading message
        setUploadingItems(prev => prev.map((item, index) => 
          index === i ? { ...item, loadingMessage: 'AI analyzing construction & authenticity...' } : item
        ));

        // Call backend API with luxury analysis
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            image: base64,
            type: 'wardrobe',
            prompt: getLuxuryAnalysisPrompt() // Use detailed prompt
          })
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`API error: ${response.status} - ${error}`);
        }

        const { analysis } = await response.json();
        
        // Check for errors in analysis
        if (analysis.error) {
          throw new Error(analysis.error);
        }
        
        // Create the item object
        const item = {
          id: Date.now() + Math.random(),
          imageUrl: `data:image/jpeg;base64,${base64}`,
          name: analysis.name || `${analysis.type || 'Item'} ${i + 1}`,
          source: 'uploaded',
          analysis: analysis
        };
        
        newItems.push(item);
        
        // Save to database in background (don't wait for it)
        setUploadingItems(prev => prev.map((item, index) => 
          index === i ? { ...item, loadingMessage: 'Saving to wardrobe...' } : item
        ));
        
        saveToDatabase(analysis, base64, 'wardrobe').then(itemId => {
          if (itemId) {
            // Update the item with database ID if saved successfully
            setWardrobe(prev => prev.map(wardrobeItem => 
              wardrobeItem.id === item.id 
                ? { ...wardrobeItem, databaseId: itemId }
                : wardrobeItem
            ));
          }
        });
        
        // Remove processed placeholder
        setUploadingItems(prev => prev.filter((_, index) => index !== i));
        
      } catch (error) {
        console.error(`Failed to analyze ${file.name}:`, error);
        alert(`Failed to analyze ${file.name}: ${error.message}`);
        
        // Remove failed placeholder
        setUploadingItems(prev => prev.filter((_, index) => index !== i));
      }
    }
    
    setWardrobe(prev => [...prev, ...newItems]);
    setIsUploading(false);
    setUploadingItems([]);
    setCurrentAnalysisStep('');
    e.target.value = null;
  };

  // Handle inspiration image upload
  const handleInspirationUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsProcessingInspiration(true);
    setCurrentAnalysisStep('Preparing inspiration image...');
    
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

      const imageUrl = `data:image/jpeg;base64,${base64}`;
      setInspirationImage(imageUrl);
      
      // Update loading message
      setCurrentAnalysisStep('Analyzing fashion items with luxury detail...');

      // Call backend API with luxury analysis
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image: base64,
          type: 'inspiration',
          prompt: getLuxuryAnalysisPrompt() // Use detailed prompt
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
      
      // Save inspiration to database in background
      setCurrentAnalysisStep('Saving inspiration...');
      saveToDatabase(analysis, base64, 'inspiration').then(itemId => {
        if (itemId) {
          console.log('Inspiration saved to database:', itemId);
        }
      });
      
      // Update loading message
      setCurrentAnalysisStep('Matching with your wardrobe...');
      
      // Generate matches
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
    
    // Type match (30% - reduced to make room for quality matching)
    if (inspiration.type === wardrobe.type) {
      score += 30;
      factors.push(`Same garment type (${wardrobe.type})`);
    }
    
    // Quality tier match (20% - new)
    if (inspiration.overallAssessment?.tier === wardrobe.overallAssessment?.tier) {
      score += 20;
      factors.push(`Same quality tier (${wardrobe.overallAssessment?.tier})`);
    }
    
    // Construction style match (15% - new)
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

  // Add ESC key handler for modal
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && selectedItem) {
        setSelectedItem(null);
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [selectedItem]);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          
          .spinner {
            animation: spin 1s linear infinite;
          }
          
          .shimmer {
            background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
          }
        `}
      </style>
      
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Maura - Luxury Fashion Analysis</h1>
          <p className="text-gray-600">
            Collector-grade garment analysis with authentication markers and construction details
            {isAnalyzingInitial && (
              <span className="ml-2 text-sm text-blue-600">
                (Auto-analyzing first 5 items for better display...)
              </span>
            )}
          </p>
        </div>

        {/* Wardrobe Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              Your Wardrobe
              {wardrobe.length > 0 && (
                <span className="text-sm text-gray-500 ml-2">
                  ({wardrobe.length} items loaded)
                </span>
              )}
            </h2>
            <label className="btn-primary">
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

          {isUploading && (
            <div className="mb-4">
              <div className="bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {currentAnalysisStep || `Analyzing with luxury detail... ${uploadProgress}%`}
              </p>
            </div>
          )}

          {wardrobe.length === 0 && uploadingItems.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-500">No items in wardrobe yet</p>
              <p className="text-sm text-gray-400 mt-1">Upload clothing photos for detailed luxury analysis</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
                {/* Show loading placeholders */}
                {uploadingItems.map(item => (
                  <div key={item.id} className="relative">
                    <div className="w-full h-24 md:h-28 lg:h-32 rounded-lg border-2 border-gray-200 overflow-hidden relative shimmer">
                      <img 
                        src={item.imageUrl} 
                        alt={item.name}
                        className="w-full h-full object-cover opacity-30"
                      />
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white bg-opacity-90 p-2">
                        <div className="w-8 h-8 border-3 border-gray-200 border-t-blue-500 rounded-full spinner" />
                        <p className="text-xs text-gray-600 mt-1 text-center">
                          {item.loadingMessage}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Show existing wardrobe items with quality indicators */}
                {wardrobe.map(item => (
                  <div 
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className="cursor-pointer hover:scale-105 transition-transform relative"
                    title="Click to view luxury analysis"
                  >
                    <img 
                      src={item.imageUrl} 
                      alt={item.name}
                      className="w-full h-24 md:h-28 lg:h-32 object-cover rounded-lg border-2 border-gray-200 hover:border-blue-400"
                    />
                    {/* Quality tier indicator */}
                    {item.analysis?.overallAssessment?.tier && (
                      <div className={`absolute top-1 right-1 px-1 py-0.5 text-xs font-medium rounded ${
                        item.analysis.overallAssessment.tier === 'luxury' ? 'bg-purple-100 text-purple-800' :
                        item.analysis.overallAssessment.tier === 'premium' ? 'bg-blue-100 text-blue-800' :
                        item.analysis.overallAssessment.tier === 'haute couture' ? 'bg-gold-100 text-gold-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {item.analysis.overallAssessment.tier}
                      </div>
                    )}
                    {/* Database save indicator */}
                    {item.databaseId && (
                      <div className="absolute top-1 left-1 w-2 h-2 bg-green-500 rounded-full" 
                           title="Saved to database"/>
                    )}
                    {/* Needs analysis indicator */}
                    {item.needsAnalysis && (
                      <div className="absolute top-1 left-1 w-2 h-2 bg-yellow-500 rounded-full animate-pulse" 
                           title="Analysis pending"/>
                    )}
                    <p className="text-xs text-center mt-1 truncate">{item.name}</p>
                  </div>
                ))}
              </div>
              
              {/* Load More Button */}
              {hasMoreItems && (
                <div className="mt-4 text-center">
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

        {/* Inspiration Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Inspiration Look</h2>
            <label className="btn-secondary">
              <input 
                type="file" 
                accept="image/*"
                onChange={handleInspirationUpload}
                className="hidden"
              />
              {isProcessingInspiration ? 'Analyzing...' : 'Upload Inspiration'}
            </label>
          </div>

          {inspirationImage ? (
            <div className="flex gap-4">
              <div className="relative">
                <img 
                  src={inspirationImage} 
                  alt="Inspiration"
                  className={`w-48 h-48 object-cover rounded-lg transition-opacity ${
                    isProcessingInspiration ? 'opacity-50' : 'opacity-100'
                  }`}
                />
                {isProcessingInspiration && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white bg-opacity-80 rounded-lg">
                    <div className="w-12 h-12 border-3 border-gray-200 border-t-blue-500 rounded-full spinner" />
                    <p className="text-sm text-gray-600 mt-2 text-center px-2">
                      {currentAnalysisStep || 'Processing...'}
                    </p>
                  </div>
                )}
              </div>
              {inspirationAnalysis && !isProcessingInspiration && (
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Luxury Analysis:</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Type:</span> {inspirationAnalysis.type}</p>
                    <p><span className="font-medium">Quality Tier:</span> {inspirationAnalysis.overallAssessment?.tier}</p>
                    <p><span className="font-medium">Construction:</span> {inspirationAnalysis.brandIdentifiers?.constructionHouse}</p>
                    {inspirationAnalysis.brandIdentifiers?.likelyBrand && (
                      <p><span className="font-medium">Likely Brand:</span> {inspirationAnalysis.brandIdentifiers.likelyBrand} ({inspirationAnalysis.brandIdentifiers.confidence}% confidence)</p>
                    )}
                    {inspirationAnalysis.overallAssessment?.estimatedRetail && (
                      <p><span className="font-medium">Est. Value:</span> {inspirationAnalysis.overallAssessment.estimatedRetail}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-500">No inspiration image uploaded</p>
              <p className="text-sm text-gray-400 mt-1">Upload a look for luxury-level matching</p>
            </div>
          )}
        </div>

        {/* Matching Results */}
        {matchingResults && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Best Matches from Your Wardrobe</h2>
            <div className="space-y-4">
              {matchingResults.map((item, idx) => (
                <div key={item.id} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                  <img 
                    src={item.imageUrl} 
                    alt={item.name}
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{item.name}</h3>
                        {item.analysis?.brandIdentifiers?.likelyBrand && (
                          <p className="text-sm text-gray-600">
                            {item.analysis.brandIdentifiers.likelyBrand} • {item.analysis.overallAssessment?.tier}
                          </p>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded text-sm font-medium ${
                        item.similarity.score >= 70 ? 'bg-green-100 text-green-800' :
                        item.similarity.score >= 50 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {item.similarity.score}% Match
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{item.similarity.reasoning}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Enhanced Item Details Modal with Luxury Analysis */}
        {selectedItem && (
          <div 
            className="fixed inset-0 bg-black z-50 overflow-y-auto"
            onClick={() => setSelectedItem(null)}
          >
            <div 
              className="min-h-screen px-4 py-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white rounded-lg max-w-4xl mx-auto">
                <div className="flex justify-between items-center p-4 border-b">
                  <h2 className="text-xl font-semibold">{selectedItem.name}</h2>
                  <button 
                    onClick={() => setSelectedItem(null)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>
                <div className="p-6 max-h-[80vh] overflow-y-auto">
                  <div className="grid grid-cols-3 gap-6">
                    <img 
                      src={selectedItem.imageUrl} 
                      alt={selectedItem.name}
                      className="col-span-1 w-full h-auto rounded-lg sticky top-0"
                    />
                    <div className="col-span-2 space-y-4">
                      {selectedItem.analysis?.error ? (
                        <p className="text-red-500">Analysis failed: {selectedItem.analysis.error}</p>
                      ) : (
                        <>
                          {/* Overall Assessment */}
                          {selectedItem.analysis?.overallAssessment && (
                            <div className="bg-purple-50 p-3 rounded">
                              <h3 className="font-semibold mb-2">Overall Assessment</h3>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <p><span className="font-medium">Tier:</span> {selectedItem.analysis.overallAssessment.tier}</p>
                                <p><span className="font-medium">Est. Retail:</span> {selectedItem.analysis.overallAssessment.estimatedRetail}</p>
                                <p><span className="font-medium">Condition:</span> {selectedItem.analysis.overallAssessment.condition}</p>
                                <p><span className="font-medium">Age:</span> {selectedItem.analysis.overallAssessment.estimatedAge}</p>
                                <p className="col-span-2"><span className="font-medium">Authenticity:</span> {selectedItem.analysis.overallAssessment.authenticityConfidence}</p>
                              </div>
                            </div>
                          )}
                          
                          {/* Hardware & Fastenings */}
                          {selectedItem.analysis?.hardwareFastenings && (
                            <div className="bg-gray-50 p-3 rounded">
                              <h3 className="font-semibold mb-2">Hardware & Fastenings</h3>
                              <div className="text-sm space-y-2">
                                {selectedItem.analysis.hardwareFastenings.buttons && (
                                  <div>
                                    <p className="font-medium">Buttons:</p>
                                    <ul className="ml-4 text-xs space-y-1">
                                      <li>Material: {selectedItem.analysis.hardwareFastenings.buttons.material}</li>
                                      {selectedItem.analysis.hardwareFastenings.buttons.logoEngraving && (
                                        <li>Engraving: {selectedItem.analysis.hardwareFastenings.buttons.logoEngraving}</li>
                                      )}
                                      <li>Construction: {selectedItem.analysis.hardwareFastenings.buttons.construction}</li>
                                    </ul>
                                  </div>
                                )}
                                {selectedItem.analysis.hardwareFastenings.zippers && (
                                  <div>
                                    <p className="font-medium">Zippers:</p>
                                    <ul className="ml-4 text-xs">
                                      <li>Brand: {selectedItem.analysis.hardwareFastenings.zippers.brand}</li>
                                      <li>Type: {selectedItem.analysis.hardwareFastenings.zippers.type}</li>
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Construction Signatures */}
                          {selectedItem.analysis?.constructionSignatures && (
                            <div className="bg-blue-50 p-3 rounded">
                              <h3 className="font-semibold mb-2">Construction Signatures</h3>
                              <div className="text-sm grid grid-cols-2 gap-2">
                                {selectedItem.analysis.constructionSignatures.pickStitching && (
                                  <p><span className="font-medium">Pick Stitching:</span> {selectedItem.analysis.constructionSignatures.pickStitching}</p>
                                )}
                                {selectedItem.analysis.constructionSignatures.shoulderConstruction && (
                                  <p><span className="font-medium">Shoulder:</span> {selectedItem.analysis.constructionSignatures.shoulderConstruction}</p>
                                )}
                                {selectedItem.analysis.constructionSignatures.seamConstruction && (
                                  <p><span className="font-medium">Seams:</span> {selectedItem.analysis.constructionSignatures.seamConstruction}</p>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Fabric Analysis */}
                          {selectedItem.analysis?.fabricAnalysis && (
                            <div className="bg-green-50 p-3 rounded">
                              <h3 className="font-semibold mb-2">Fabric Analysis</h3>
                              <div className="text-sm grid grid-cols-2 gap-2">
                                <p><span className="font-medium">Weave:</span> {selectedItem.analysis.fabricAnalysis.weaveStructure}</p>
                                <p><span className="font-medium">Quality:</span> {selectedItem.analysis.fabricAnalysis.yarnQuality}</p>
                                <p><span className="font-medium">Weight:</span> {selectedItem.analysis.fabricAnalysis.weight}</p>
                                <p><span className="font-medium">Pattern Match:</span> {selectedItem.analysis.fabricAnalysis.patternMatching}</p>
                              </div>
                            </div>
                          )}
                          
                          {/* Brand Identifiers */}
                          {selectedItem.analysis?.brandIdentifiers && (
                            <div className="bg-yellow-50 p-3 rounded">
                              <h3 className="font-semibold mb-2">Brand Identifiers</h3>
                              <div className="text-sm space-y-1">
                                {selectedItem.analysis.brandIdentifiers.likelyBrand && (
                                  <p><span className="font-medium">Likely Brand:</span> {selectedItem.analysis.brandIdentifiers.likelyBrand} ({selectedItem.analysis.brandIdentifiers.confidence}% confidence)</p>
                                )}
                                <p><span className="font-medium">Construction House:</span> {selectedItem.analysis.brandIdentifiers.constructionHouse}</p>
                                {selectedItem.analysis.brandIdentifiers.visibleLogos && (
                                  <p><span className="font-medium">Visible Logos:</span> {selectedItem.analysis.brandIdentifiers.visibleLogos}</p>
                                )}
                                {selectedItem.analysis.brandIdentifiers.hiddenSignatures && (
                                  <p><span className="font-medium">Hidden Signatures:</span> {selectedItem.analysis.brandIdentifiers.hiddenSignatures}</p>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Quality Indicators */}
                          {selectedItem.analysis?.qualityIndicators && (
                            <div className="bg-red-50 p-3 rounded">
                              <h3 className="font-semibold mb-2">Quality Indicators</h3>
                              <div className="text-sm">
                                {selectedItem.analysis.qualityIndicators.handworkEvidence?.length > 0 && (
                                  <div className="mb-2">
                                    <p className="font-medium">Handwork Evidence:</p>
                                    <ul className="ml-4 list-disc text-xs">
                                      {selectedItem.analysis.qualityIndicators.handworkEvidence.map((evidence, idx) => (
                                        <li key={idx}>{evidence}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {selectedItem.analysis.qualityIndicators.luxuryMarkers?.length > 0 && (
                                  <div className="mb-2">
                                    <p className="font-medium">Luxury Markers:</p>
                                    <ul className="ml-4 list-disc text-xs">
                                      {selectedItem.analysis.qualityIndicators.luxuryMarkers.map((marker, idx) => (
                                        <li key={idx}>{marker}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {selectedItem.analysis.qualityIndicators.authenticityMarkers?.length > 0 && (
                                  <div>
                                    <p className="font-medium">Authenticity Markers:</p>
                                    <ul className="ml-4 list-disc text-xs">
                                      {selectedItem.analysis.qualityIndicators.authenticityMarkers.map((marker, idx) => (
                                        <li key={idx}>{marker}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      )}
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