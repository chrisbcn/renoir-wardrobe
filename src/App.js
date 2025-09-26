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
// Analysis prompt for complete looks/outfits
const getLookAnalysisPrompt = () => {
  return {
    type: "Analyze complete outfit/look",
    
    overallLook: {
      style: "Describe the overall aesthetic (e.g., 'casual chic', 'business formal', 'street luxe')",
      occasion: "When/where this would be worn",
      seasonality: "Fall/Winter/Spring/Summer/Trans-seasonal",
      keyPieces: "List the hero/statement pieces"
    },
    
    itemBreakdown: {
      visible_items: [
        {
          category: "top/bottom/outerwear/shoes/bag/accessories",
          type: "Specific item type (e.g., 'crew neck sweater')",
          color: "Precise color description",
          material: "Visible fabric/material",
          styling: "How it's worn (tucked, layered, cuffed, etc.)",
          distinctiveFeatures: "Unique details that matter for matching"
        }
      ]
    },
    
    colorPalette: {
      primary: "Main color",
      secondary: "Supporting colors",
      accents: "Pop colors or metallic accents",
      neutrals: "Base neutral colors"
    },
    
    proportionsAndFit: {
      silhouette: "Overall shape (oversized, fitted, balanced)",
      proportions: "How pieces relate to each other",
      lengths: "Hem lengths, sleeve lengths that matter"
    },
    
    essentialElements: {
      mustHaves: "Elements crucial to recreating this look",
      niceToHaves: "Elements that enhance but aren't essential",
      avoidables: "What would break this look"
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
  const ITEMS_PER_PAGE = 10;

  const [lookImage, setLookImage] = useState(null);
  const [lookAnalysis, setLookAnalysis] = useState(null);
  const [lookMatches, setLookMatches] = useState(null);
  const [isProcessingLook, setIsProcessingLook] = useState(false);

  // Load saved wardrobe items - now with pagination
  useEffect(() => {
    loadWardrobeItems(0);
  }, []);

  // New function to load items with pagination
  const loadWardrobeItems = async (offset) => {
    if (isLoadingMore) return;
    
    setIsLoadingMore(true);
    if (offset === 0) {
      setIsInitialLoading(true);
    }
    
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
          // Don't auto-analyze database items - let user decide with the buttons
        } else {
          setWardrobe(prev => [...prev, ...formattedItems]);
        }
        
        // Check if there are more items
        setHasMoreItems(data.items.length === ITEMS_PER_PAGE);
        setCurrentOffset(offset);
        
        console.log(`Loaded ${formattedItems.length} items from offset ${offset}`);
        
        // Log how many need analysis
        const needsAnalysisCount = formattedItems.filter(item => item.needsAnalysis).length;
        if (needsAnalysisCount > 0) {
          console.log(`${needsAnalysisCount} items need analysis - use "Analyze All" button or hover over individual items`);
        }
      } else {
        setHasMoreItems(false);
      }
    } catch (err) {
      console.log('Could not load items:', err);
      setHasMoreItems(false);
    }
    setIsLoadingMore(false);
    if (offset === 0) {
      setIsInitialLoading(false);
    }
  };

  // Function to analyze a single item
  const analyzeSingleItem = async (item) => {
    // Check if already analyzing this item
    if (analyzingItems.has(item.id)) {
      return;
    }

    // Add to analyzing set
    setAnalyzingItems(prev => new Set([...prev, item.id]));

    try {
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
          type: 'wardrobe'
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
        await saveToDatabase(analysis, base64, 'wardrobe', item.databaseId);
        
        console.log(`Successfully analyzed item ${item.id}`);
      } else {
        throw new Error(analysis?.error || 'Analysis failed');
      }
    } catch (error) {
      console.error(`Failed to analyze item ${item.id}:`, error);
      alert(`Failed to analyze item: ${error.message}`);
    } finally {
      // Remove from analyzing set
      setAnalyzingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  };
  
// Add these new functions after your existing analyzeSingleItem function (around line 250)

  // Function to delete a single item
  const deleteSingleItem = async (item) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete "${item.name}"? This action cannot be undone.`);
    
    if (!confirmDelete) return;
    
    try {
      // If item has a database ID, delete from database
      if (item.databaseId) {
        console.log(`Deleting item ${item.databaseId} from database...`);
        const response = await fetch('/api/delete-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId: item.databaseId })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
          console.error('Database delete failed:', result);
          alert(`Failed to delete from database: ${result.error || 'Unknown error'}`);
          return; // Don't remove from UI if database delete failed
        }
        
        console.log('Database delete successful:', result);
      }
      
      // Remove from local state
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
  
  // Use the existing analyzeSingleItem function
  await analyzeSingleItem(item);
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
  
  const confirmDelete = window.confirm(`Delete ${selectedItems.size} selected item(s)? This action cannot be undone.`);
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

// Replace the wardrobe grid section in your JSX (around lines 1300-1350)
// This is the improved grid with delete and analyze buttons

{/* Show existing wardrobe items with quality indicators */}
// This version uses inline styles and state-based hover detection

{/* Show existing wardrobe items with hover buttons */}
{wardrobe.map(item => (
  <div 
    key={item.id}
    className="cursor-pointer relative"
    onMouseEnter={() => setHoveredItem(item.id)}
    onMouseLeave={() => setHoveredItem(null)}
    title={item.needsAnalysis ? "Hover for options" : "Click image for details, hover for options"}
  >
    <div className="item-image-container relative">
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
            onMouseOver={(e) => {
              if (!analyzingItems.has(item.id)) {
                e.target.style.backgroundColor = '#059669';
              }
            }}
            onMouseOut={(e) => {
              if (!analyzingItems.has(item.id)) {
                e.target.style.backgroundColor = '#10B981';
              }
            }}
          >
            {analyzingItems.has(item.id) ? (
              <>
                <span 
                  style={{
                    display: 'inline-block',
                    width: '12px',
                    height: '12px',
                    border: '1px solid white',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}
                />
                Analyzing
              </>
            ) : (
              <>
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                {item.needsAnalysis ? 'Analyze' : 'Re-analyze'}
              </>
            )}
          </button>
          
          {/* Delete button */}
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
              deleteSingleItem(item);
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#DC2626';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = '#EF4444';
            }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
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
          item.analysis.overallAssessment.tier === 'haute couture' ? 'bg-gold-100 text-gold-800' :
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
  // Function to analyze all unanalyzed items
  const analyzeAllUnanalyzedItems = async () => {
    const itemsNeedingAnalysis = wardrobe.filter(item => item.needsAnalysis);
    
    if (itemsNeedingAnalysis.length === 0) {
      alert('All items have already been analyzed!');
      return;
    }
    
    const confirmMsg = `This will analyze ${itemsNeedingAnalysis.length} items. This may take a while. Continue?`;
    if (!window.confirm(confirmMsg)) {
      return;
    }
    
    setIsAnalyzingAll(true);
    setCurrentAnalysisStep(`Starting analysis of ${itemsNeedingAnalysis.length} items...`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < itemsNeedingAnalysis.length; i++) {
      const item = itemsNeedingAnalysis[i];
      setCurrentAnalysisStep(`Analyzing item ${i + 1} of ${itemsNeedingAnalysis.length}...`);
      
      try {
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
            type: 'wardrobe'
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
          await saveToDatabase(analysis, base64, 'wardrobe', item.databaseId);
          successCount++;
        } else {
          throw new Error(analysis?.error || 'Analysis failed');
        }
      } catch (error) {
        console.error(`Failed to analyze item ${item.id}:`, error);
        failCount++;
      }
    }
    
    setIsAnalyzingAll(false);
    setCurrentAnalysisStep('');
    
    const message = `Analysis complete! Successfully analyzed ${successCount} items.${failCount > 0 ? ` Failed: ${failCount} items.` : ''}`;
    alert(message);
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

  // Handle wardrobe image uploads - WITH auto-analysis
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

        // Call backend API with luxury analysis - AUTO ANALYSIS FOR NEW UPLOADS
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            image: base64,
            type: 'wardrobe'
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
        
        // Create the item object - already analyzed!
        const item = {
          id: Date.now() + Math.random(),
          imageUrl: `data:image/jpeg;base64,${base64}`,
          name: analysis.name || `${analysis.type || 'Item'} ${i + 1}`,
          source: 'uploaded',
          analysis: analysis,
          needsAnalysis: false // Set to false since we just analyzed it
        };
        
        newItems.push(item);
        
        // Update loading message
        setUploadingItems(prev => prev.map((item, index) => 
          index === i ? { ...item, loadingMessage: 'Saving to wardrobe...' } : item
        ));
        
        // Save to database in background
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

// This version properly detects image format and handles errors better

const handleLookUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  setIsProcessingLook(true);
  setLookAnalysis(null);
  setLookMatches(null);
  
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

    // Detect the actual mime type from the file
    const mimeType = file.type || 'image/jpeg'; // fallback to jpeg if type not detected
    const imageUrl = `data:${mimeType};base64,${base64}`;
    setLookImage(imageUrl);
    
    // Create the look analysis prompt as a text string
    const lookPromptText = `
    Analyze this complete outfit/look and provide a detailed breakdown.
    
    Return a JSON object with this structure:
    {
      "overallLook": {
        "style": "Describe the overall aesthetic (e.g., 'casual chic', 'business formal', 'street luxe')",
        "occasion": "When/where this would be worn",
        "seasonality": "Fall/Winter/Spring/Summer/Trans-seasonal",
        "keyPieces": ["List the hero/statement pieces"]
      },
      
      "itemBreakdown": {
        "visible_items": [
          {
            "category": "top/bottom/outerwear/shoes/bag/accessories",
            "type": "Specific item type (e.g., 'crew neck sweater')",
            "color": "Precise color description",
            "material": "Visible fabric/material",
            "styling": "How it's worn (tucked, layered, cuffed, etc.)",
            "distinctiveFeatures": "Unique details that matter for matching"
          }
        ]
      },
      
      "colorPalette": {
        "primary": "Main color",
        "secondary": ["Supporting colors"],
        "accents": ["Pop colors or metallic accents"],
        "neutrals": ["Base neutral colors"]
      },
      
      "proportionsAndFit": {
        "silhouette": "Overall shape (oversized, fitted, balanced)",
        "proportions": "How pieces relate to each other",
        "lengths": "Hem lengths, sleeve lengths that matter"
      },
      
      "essentialElements": {
        "mustHaves": ["Elements crucial to recreating this look"],
        "niceToHaves": ["Elements that enhance but aren't essential"],
        "avoidables": ["What would break this look"]
      }
    }
    
    Respond ONLY with valid JSON.
    `;

    // Call API with proper parameters
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        image: base64,
        type: 'wardrobe', // Using 'wardrobe' type
        prompt: lookPromptText, // Send custom prompt
        mimeType: mimeType // Send the actual mime type
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('API Error:', errorData);
      throw new Error(errorData?.error || `API error: ${response.status}`);
    }

    const { analysis } = await response.json();
    
    if (analysis && !analysis.error) {
      console.log('Look analysis received:', analysis);
      setLookAnalysis(analysis);
      
      // Check if the response has the expected structure
      if (analysis.itemBreakdown && analysis.itemBreakdown.visible_items) {
        // Now match the look to wardrobe
        const matches = matchLookToWardrobe(analysis, wardrobe);
        setLookMatches(matches);
      } else {
        console.error('Analysis does not have expected structure:', analysis);
        // Try to handle it as a standard wardrobe item analysis
        alert('The analysis format was not as expected. Please try again.');
      }
      
    } else {
      throw new Error(analysis?.error || 'Analysis failed');
    }
    
  } catch (error) {
    console.error('Look upload failed:', error);
    alert(`Failed to analyze look: ${error.message}`);
    setLookAnalysis(null);
    setLookMatches(null);
  } finally {
    setIsProcessingLook(false);
    e.target.value = null; // Reset file input
  }
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
// ADD THESE NEW FUNCTIONS HERE
const matchLookToWardrobe = (lookAnalysis, wardrobe) => {
  const lookItems = lookAnalysis.itemBreakdown.visible_items;
  const matches = {};
  
  lookItems.forEach(lookItem => {
    // Find best matches for each item in the look
    const categoryMatches = wardrobe
      .filter(w => {
        // Must be same category first
        return isSameCategory(lookItem.category, w.analysis?.type);
      })
      .map(w => {
        const score = calculateItemMatchScore(lookItem, w.analysis);
        return { ...w, matchScore: score, matchDetails: score.details };
      })
      .sort((a, b) => b.matchScore.total - a.matchScore.total)
      .slice(0, 3); // Top 3 alternatives for each piece
    
    matches[lookItem.category] = categoryMatches;
  });
  
  // Calculate overall look match percentage
  const overallMatch = calculateOverallLookMatch(matches, lookAnalysis);
  
  return {
    matches,
    overallMatch,
    suggestions: generateStylingTips(matches, lookAnalysis)
  };
};
const calculateOverallLookMatch = (matches, lookAnalysis) => {
  let totalScore = 0;
  let itemCount = 0;
  
  Object.values(matches).forEach(categoryMatches => {
    if (categoryMatches && categoryMatches[0]) {
      totalScore += categoryMatches[0].matchScore?.total || 0;
      itemCount++;
    }
  });
  
  return {
    percentage: itemCount > 0 ? totalScore / itemCount : 0,
    itemsMatched: itemCount,
    totalItems: lookAnalysis.itemBreakdown?.visible_items?.length || 0
  };
};

const generateStylingTips = (matches, lookAnalysis) => {
  const tips = [];
  
  // Check what's missing
  Object.entries(matches).forEach(([category, items]) => {
    if (!items || items.length === 0) {
      tips.push(`Consider adding a ${category} to complete this look`);
    }
  });
  
  return tips;
};
const calculateItemMatchScore = (lookItem, wardrobeItem) => {
  if (!wardrobeItem) return { total: 0, details: {} };
  
  const scores = {
    typeMatch: 0,
    colorMatch: 0,
    materialMatch: 0,
    styleMatch: 0
  };
  
  // Type matching (40% weight)
  if (lookItem.type && wardrobeItem.type) {
    if (lookItem.type.toLowerCase() === wardrobeItem.type?.toLowerCase()) {
      scores.typeMatch = 40;
    } else if (lookItem.type.toLowerCase().includes(wardrobeItem.type?.toLowerCase()) || 
               wardrobeItem.type?.toLowerCase().includes(lookItem.type.toLowerCase())) {
      scores.typeMatch = 25;
    }
  }
  
  // Color matching (30% weight) 
  if (lookItem.color && wardrobeItem.fabricAnalysis?.colors) {
    const lookColor = lookItem.color.toLowerCase();
    const matchingColor = wardrobeItem.fabricAnalysis.colors.some(c => 
      c.toLowerCase().includes(lookColor) || lookColor.includes(c.toLowerCase())
    );
    if (matchingColor) {
      scores.colorMatch = 30;
    }
  }
  
  // Material matching (15% weight)
  if (lookItem.material && wardrobeItem.fabricAnalysis?.weaveStructure) {
    if (lookItem.material.toLowerCase().includes(wardrobeItem.fabricAnalysis.weaveStructure.toLowerCase())) {
      scores.materialMatch = 15;
    }
  }
  
  // Style compatibility (15% weight)
  scores.styleMatch = 10; // Base score for same category
  
  return {
    total: Object.values(scores).reduce((a, b) => a + b, 0),
    details: scores
  };
};

// Helper functions
const isSameCategory = (lookCategory, wardrobeType) => {
  // Map categories - this is a simplified version
  const categoryMap = {
    'top': ['shirt', 'blouse', 'sweater', 'turtleneck', 't-shirt'],
    'bottom': ['trouser', 'pant', 'skirt', 'jean'],
    'outerwear': ['coat', 'jacket', 'blazer'],
    'shoes': ['shoe', 'boot', 'sneaker', 'heel'],
    'bag': ['bag', 'purse', 'clutch'],
    'accessories': ['scarf', 'belt', 'jewelry', 'watch']
  };
  
  // Check if wardrobeType matches the lookCategory
  return categoryMap[lookCategory]?.some(type => 
    wardrobeType?.toLowerCase().includes(type)
  );
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
    <div className="min-h-screen" style={{ backgroundColor: '#FAFAF8' }}>
      <style dangerouslySetInnerHTML={{ __html: `
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap');
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
          
          :root {
            --grid-unit: 8px;
            --color-bg: #FAFAF8;
            --color-white: #FFFFFF;
            --color-black: #1A1A1A;
            --color-gray-dark: #404040;
            --color-gray-medium: #808080;
            --color-gray-light: #E5E5E5;
            --color-border: #E0E0E0;
            --color-accent: #000000;
          }
          
          * {
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            font-weight: 400;
            color: var(--color-black);
            line-height: calc(var(--grid-unit) * 3);
          }
          
          h1, h2, h3, h4, h5, h6 {
            font-family: 'Playfair Display', Georgia, serif;
            font-weight: 500;
            letter-spacing: -0.02em;
            line-height: 1.2;
          }
          
          .container {
            max-width: 1440px;
            margin: 0 auto;
            padding: calc(var(--grid-unit) * 6) calc(var(--grid-unit) * 4);
          }
          
          @media (min-width: 768px) {
            .container {
              padding: calc(var(--grid-unit) * 8) calc(var(--grid-unit) * 6);
            }
          }
          
          @media (min-width: 1024px) {
            .container {
              padding: calc(var(--grid-unit) * 10) calc(var(--grid-unit) * 8);
            }
          }
          
          .header-section {
            margin-bottom: calc(var(--grid-unit) * 8);
            text-align: center;
            border-bottom: 1px solid var(--color-border);
            padding-bottom: calc(var(--grid-unit) * 6);
          }
          
          .main-title {
            font-size: calc(var(--grid-unit) * 6);
            margin-bottom: calc(var(--grid-unit) * 2);
            font-weight: 400;
            letter-spacing: -0.03em;
          }
          
          .subtitle {
            font-family: 'Inter', sans-serif;
            font-size: calc(var(--grid-unit) * 2);
            font-weight: 300;
            color: var(--color-gray-dark);
            letter-spacing: 0.02em;
            text-transform: uppercase;
          }
          
          .section {
            background: var(--color-white);
            border: 1px solid var(--color-border);
            margin-bottom: calc(var(--grid-unit) * 4);
            padding: calc(var(--grid-unit) * 4);
          }
          
          .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: calc(var(--grid-unit) * 4);
            padding-bottom: calc(var(--grid-unit) * 2);
            border-bottom: 1px solid var(--color-border);
          }
          
          .section-title {
            font-size: calc(var(--grid-unit) * 3);
            font-weight: 500;
          }
          
          .item-count {
            font-family: 'Inter', sans-serif;
            font-size: calc(var(--grid-unit) * 1.75);
            color: var(--color-gray-medium);
            font-weight: 400;
            margin-left: calc(var(--grid-unit) * 2);
          }
          
          .btn-primary, .btn-secondary {
            font-family: 'Inter', sans-serif;
            font-size: calc(var(--grid-unit) * 1.75);
            font-weight: 500;
            padding: calc(var(--grid-unit) * 1.5) calc(var(--grid-unit) * 3);
            border: 1px solid var(--color-black);
            background: var(--color-black);
            color: var(--color-white);
            cursor: pointer;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            transition: all 0.2s ease;
            display: inline-block;
          }
          
          .btn-primary:hover {
            background: var(--color-white);
            color: var(--color-black);
          }
          
          .btn-secondary {
            background: var(--color-white);
            color: var(--color-black);
          }
          
          .btn-secondary:hover {
            background: var(--color-black);
            color: var(--color-white);
          }
          
          .wardrobe-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: calc(var(--grid-unit) * 3);
            margin-bottom: calc(var(--grid-unit) * 4);
          }
          
          @media (min-width: 768px) {
            .wardrobe-grid {
              grid-template-columns: repeat(4, 1fr);
              gap: calc(var(--grid-unit) * 4);
            }
          }
          
          @media (min-width: 1280px) {
            .wardrobe-grid {
              grid-template-columns: repeat(4, 1fr);
            }
          }
          
          .wardrobe-item {
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
            background: var(--color-white);
          }
          
          .wardrobe-item:hover .item-image {
            opacity: 0.95;
          }
          
          .wardrobe-item:hover .analyze-button {
            opacity: 1;
            visibility: visible;
          }
          
          .item-image-container {
            position: relative;
            width: 100%;
            aspect-ratio: 3/4;
            overflow: hidden;
            border: 1px solid var(--color-border);
            background: #FAFAFA;
          }
          
          .item-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: opacity 0.3s ease;
          }
          
          .analyze-button {
            position: absolute;
            bottom: calc(var(--grid-unit) * 2);
            left: 50%;
            transform: translateX(-50%);
            background: var(--color-black);
            color: var(--color-white);
            padding: calc(var(--grid-unit) * 1.5) calc(var(--grid-unit) * 2);
            font-size: calc(var(--grid-unit) * 1.5);
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border: none;
            cursor: pointer;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
            white-space: nowrap;
            font-family: 'Inter', sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
          }
          
          .analyze-button:hover {
            background: var(--color-gray-dark);
          }
          
          .item-name {
            margin-top: calc(var(--grid-unit) * 1.5);
            font-size: calc(var(--grid-unit) * 1.75);
            font-weight: 400;
            color: var(--color-black);
            text-align: center;
            line-height: 1.4;
            padding: 0 calc(var(--grid-unit) * 1);
          }
          
          .quality-badge {
            position: absolute;
            top: calc(var(--grid-unit) * 1);
            right: calc(var(--grid-unit) * 1);
            padding: calc(var(--grid-unit) * 0.5) calc(var(--grid-unit) * 1);
            background: var(--color-white);
            border: 1px solid var(--color-black);
            font-size: calc(var(--grid-unit) * 1.5);
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          
          .status-indicator {
            position: absolute;
            top: calc(var(--grid-unit) * 1);
            left: calc(var(--grid-unit) * 1);
            width: calc(var(--grid-unit) * 1);
            height: calc(var(--grid-unit) * 1);
            border-radius: 50%;
          }
          
          .status-saved {
            background: #22C55E;
          }
          
          .status-pending {
            background: #FFC107;
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
          
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          
          .spinner {
            animation: spin 1s linear infinite;
          }
          
          .shimmer {
            background: linear-gradient(90deg, #f8f8f8 25%, #f0f0f0 50%, #f8f8f8 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
          }
          
          .loading-placeholder {
            position: relative;
            background: var(--color-white);
            border: 1px solid var(--color-border);
            aspect-ratio: 3/4;
          }
          
          .loading-content {
            position: absolute;
            inset: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.95);
            padding: calc(var(--grid-unit) * 2);
          }
          
          .loading-spinner {
            width: calc(var(--grid-unit) * 4);
            height: calc(var(--grid-unit) * 4);
            border: 2px solid var(--color-gray-light);
            border-top-color: var(--color-black);
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          
          .loading-text {
            font-size: calc(var(--grid-unit) * 1.5);
            color: var(--color-gray-medium);
            margin-top: calc(var(--grid-unit) * 1);
            text-align: center;
          }
      ` }} />
      
      <div className="container">
        {/* Header */}
        <div className="header-section">
          <h1 className="main-title">Maura</h1>
          <p className="subtitle">
            Luxury Fashion Analysis
            {isAnalyzingInitial && (
              <span style={{ marginLeft: '16px', color: '#808080' }}>
                — Analyzing items...
              </span>
            )}
          </p>
        </div>

        {/* Wardrobe Section */}
       {/* Wardrobe Section */}
<div className="bg-white p-6 mb-6">
  <div className="flex justify-between items-center mb-4">
    <h2 className="text-xl font-semibold">
      Your Wardrobe
      {wardrobe.length > 0 && (
        <span className="text-sm text-gray-500 ml-2">
          ({wardrobe.length} items
          {wardrobe.filter(item => item.needsAnalysis).length > 0 && 
            ` • ${wardrobe.filter(item => item.needsAnalysis).length} need analysis`}
          {wardrobe.filter(item => !item.needsAnalysis).length > 0 && 
            ` • ${wardrobe.filter(item => !item.needsAnalysis).length} analyzed`})
        </span>
      )}
    </h2>
    <div className="flex gap-2">
      {/* Analysis button - always visible when there are unanalyzed items */}
      {wardrobe.length > 0 && wardrobe.filter(item => item.needsAnalysis).length > 0 && (
        <button 
          onClick={analyzeAllUnanalyzedItems}
          disabled={isAnalyzingAll}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          title={`Analyze ${wardrobe.filter(item => item.needsAnalysis).length} unanalyzed items`}
        >
          {isAnalyzingAll ? (
            <span className="flex items-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              Analyzing {wardrobe.filter(item => item.needsAnalysis).length} items...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Analyze {wardrobe.filter(item => item.needsAnalysis).length} Items
            </span>
          )}
        </button>
      )}
      
      {/* Check analysis status button - always visible when there are items */}
      {wardrobe.length > 0 && (
        <button 
          onClick={() => {
            const needsAnalysis = wardrobe.filter(item => item.needsAnalysis).length;
            const analyzed = wardrobe.filter(item => !item.needsAnalysis).length;
            alert(`Wardrobe Status:\n\nTotal Items: ${wardrobe.length}\n✅ Analyzed: ${analyzed}\n⚠️ Need Analysis: ${needsAnalysis}\n\n${needsAnalysis > 0 ? 'Click "Analyze Items" to process unanalyzed items.' : 'All items have been analyzed!'}`);
          }}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-all"
          title="Check analysis status"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      )}
      
      {/* Add images button */}
      <label className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg font-medium cursor-pointer transition-all">
        <input 
          type="file" 
          multiple 
          accept="image/*"
          onChange={handleWardrobeUpload}
          className="hidden"
        />
        <span className="flex items-center gap-2">
          {isUploading ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              Processing...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Images
            </>
          )}
        </span>
      </label>
    </div>
  </div>

  {/* Progress indicators */}
  {(isUploading || isAnalyzingAll) && (
    <div className="mb-4">
      {isUploading && (
        <div className="bg-gray-200 rounded-full h-2 mb-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}
      {currentAnalysisStep && (
        <p className="text-sm text-gray-600 flex items-center gap-2">
          <span className="inline-block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
          {currentAnalysisStep}
        </p>
      )}
    </div>
  )}

  {/* Loading state */}
  {isInitialLoading ? (
    <div className="text-center py-12 bg-gray-50 rounded-lg">
      <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600"></div>
      </div>
      <p className="text-gray-500 font-medium">Refreshing your wardrobe</p>
      <p className="text-sm text-gray-400 mt-1">Loading your saved items...</p>
    </div>
  ) : wardrobe.length === 0 && uploadingItems.length === 0 ? (
    <div className="text-center py-12 bg-gray-50 rounded-lg">
      <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
      <p className="text-gray-500 font-medium">Your wardrobe is empty</p>
      <p className="text-sm text-gray-400 mt-1">Upload clothing photos for AI-powered luxury analysis</p>
      <label className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-black hover:bg-gray-800 text-white rounded-lg font-medium cursor-pointer transition-all">
        <input 
          type="file" 
          multiple 
          accept="image/*"
          onChange={handleWardrobeUpload}
          className="hidden"
        />
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        Upload Your First Items
      </label>
    </div>
  ) : (
    <>
      {/* Wardrobe section header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">
          Your Wardrobe ({wardrobe.length} items)
        </h2>
        {wardrobe.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={selectAll}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all"
            >
              Select All
            </button>
            {selectedItems.size > 0 && (
              <button
                onClick={clearSelection}
                className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-all"
              >
                Clear Selection
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Wardrobe grid */}
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* Show loading placeholders */}
        {uploadingItems.map(item => (
          <div key={item.id} className="relative">
            <div className="item-image-container shimmer">
              <img 
                src={item.imageUrl} 
                alt={item.name}
                className="item-image"
                style={{ opacity: 0.3 }}
              />
              <div className="loading-content">
                <div className="loading-spinner" />
                <p className="loading-text">
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
             className={`cursor-pointer relative border-2 transition-all ${
               selectedItems.has(item.id) 
                 ? 'border-blue-500 bg-blue-50' 
                 : 'border-transparent hover:border-gray-300'
             }`}
             onClick={() => {
               if (analyzingItems.has(item.id)) return;
               toggleItemSelection(item.id);
             }}
             onDoubleClick={() => {
               if (!analyzingItems.has(item.id)) {
                 setSelectedItem(item);
               }
             }}
             title="Click to select, double-click to view details"
           >
             <div className="item-image-container relative">
               <img 
                 src={item.imageUrl} 
                 alt={item.name}
                 className="item-image"
                 style={{ cursor: 'pointer' }}
               />
               
               {/* Selection indicator */}
               {selectedItems.has(item.id) && (
                 <div className="absolute top-2 left-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                   <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                     <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                   </svg>
                 </div>
               )}
               
               {/* Analyzing indicator */}
               {analyzingItems.has(item.id) && (
                 <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                   <div className="bg-white rounded-lg p-3 flex items-center gap-2">
                     <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                     <span className="text-sm font-medium">Analyzing...</span>
                   </div>
                 </div>
               )}
             </div>
             
             {/* Quality tier indicator */}
             {item.analysis?.overallAssessment?.tier && (
               <div 
                 className={`absolute top-1 right-1 px-1 py-0.5 text-xs font-medium rounded ${
                   item.analysis.overallAssessment.tier === 'luxury' ? 'bg-purple-100 text-purple-800' :
                   item.analysis.overallAssessment.tier === 'premium' ? 'bg-blue-100 text-blue-800' :
                   item.analysis.overallAssessment.tier === 'haute couture' ? 'bg-gold-100 text-gold-800' :
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
      
      {/* Selection Action Bar */}
      {selectedItems.size > 0 && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
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
                disabled={Array.from(selectedItems).some(id => analyzingItems.has(id))}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Analyze Selected
              </button>
              
              <button
                onClick={deleteSelectedItems}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Selected
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Load More Button */}
      {hasMoreItems && (
        <div className="mt-6 text-center">
          <button 
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg disabled:opacity-50 font-medium transition-all"
          >
            {isLoadingMore ? (
              <span className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></span>
                Loading...
              </span>
            ) : (
              'Load More Items'
            )}
          </button>
        </div>
      )}
    </>
  )}
</div>
{/* Add this NEW SECTION after the Wardrobe Section closes (after </div>) */}
{/* Look Matching Section */}
<div className="bg-white p-6 mb-6">
  <div className="flex justify-between items-center mb-4">
    <h2 className="text-xl font-semibold">
      Look Matcher
      <span className="text-sm text-gray-500 ml-2">
        Upload a complete outfit to find matches
      </span>
    </h2>
    <label className="btn-primary">
      <input 
        type="file" 
        accept="image/*"
        onChange={handleLookUpload}
        className="hidden"
      />
      {isProcessingLook ? 'Analyzing Look...' : 'Upload Look'}
    </label>
  </div>

  {/* Show uploaded look and matches */}
  {lookImage && (
    <div className="grid grid-cols-2 gap-6">
      {/* Original Look */}
      <div>
        <h3 className="font-semibold mb-2">Target Look</h3>
        <img 
          src={lookImage} 
          alt="Target look" 
          className="w-full rounded-lg border"
        />
        {lookAnalysis && (
          <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
            <p><strong>Style:</strong> {lookAnalysis.overallLook?.style}</p>
            <p><strong>Occasion:</strong> {lookAnalysis.overallLook?.occasion}</p>
            <p><strong>Season:</strong> {lookAnalysis.overallLook?.seasonality}</p>
          </div>
        )}
      </div>

      {/* Wardrobe Matches */}
      <div>
        <h3 className="font-semibold mb-2">Your Wardrobe Matches</h3>
        {lookMatches ? (
          <div className="space-y-3">
            <div className="text-lg font-medium text-green-600">
              Overall Match: {Math.round(lookMatches.overallMatch?.percentage || 0)}%
            </div>
            {Object.entries(lookMatches.matches).map(([category, items]) => (
              <div key={category} className="border rounded p-2">
                <p className="font-medium capitalize">{category}</p>
                {items && items[0] ? (
                  <div className="flex items-center gap-2 mt-1">
                    <img 
                      src={items[0].imageUrl} 
                      alt={items[0].name}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div className="text-sm">
                      <p>{items[0].name}</p>
                      <p className="text-green-600">
                        {Math.round(items[0].matchScore?.total || 0)}% match
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">No match found</p>
                )}
              </div>
            ))}
          </div>
        ) : isProcessingLook ? (
          <div className="flex justify-center py-8">
            <div className="loading-spinner" />
          </div>
        ) : lookAnalysis ? (
          <p className="text-gray-500">Processing matches...</p>
        ) : null}
      </div>
    </div>
  )}

  {!lookImage && (
    <div className="text-center py-12 bg-gray-50 rounded-lg">
      <p className="text-gray-500">No look uploaded yet</p>
      <p className="text-sm text-gray-400 mt-1">
        Upload a full outfit photo to find matching items from your wardrobe
      </p>
    </div>
  )}
</div>
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