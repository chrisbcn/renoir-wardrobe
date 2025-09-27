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

  // New function to load items with pagination - FIXED VERSION
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

  // Updated saveToDatabase to return the database ID - FIXED VERSION
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

  // Handle wardrobe image uploads - FIXED VERSION
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

  // Analyze unanalyzed items function
  const analyzeUnanalyzedItems = async (items) => {
    let successCount = 0;
    let failCount = 0;
    
    for (const item of items) {
      try {
        await analyzeSingleItem(item);
        successCount++;
      } catch (error) {
        console.error(`Failed to analyze ${item.name}:`, error);
        failCount++;
      }
    }
    
    setIsAnalyzingInitial(false);
    const message = `Analysis complete!\nSuccessfully analyzed ${successCount} items.${failCount > 0 ? ` Failed: ${failCount} items.` : ''}`;
    alert(message);
  };

  // Load more button handler
  const handleLoadMore = () => {
    if (!isLoadingMore && hasMoreItems) {
      setIsLoadingMore(true);
      loadWardrobeItems(currentOffset + ITEMS_PER_PAGE);
    }
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

  // Look upload handler
  const handleLookUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsProcessingLook(true);
    setLookAnalysis(null);
    setLookMatches(null);
    
    try {
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64String = reader.result.split(',')[1];
          resolve(base64String);
        };
        reader.readAsDataURL(file);
      });

      const mimeType = file.type || 'image/jpeg';
      const imageUrl = `data:${mimeType};base64,${base64}`;
      setLookImage(imageUrl);
      
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

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image: base64,
          type: 'wardrobe',
          prompt: lookPromptText,
          mimeType: mimeType
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
        
        if (analysis.itemBreakdown && analysis.itemBreakdown.visible_items) {
          const matches = matchLookToWardrobe(analysis, wardrobe);
          setLookMatches(matches);
        } else {
          console.error('Analysis does not have expected structure:', analysis);
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
      e.target.value = null;
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

  // Look matching function
  const matchLookToWardrobe = (lookAnalysis, wardrobeItems) => {
    if (!lookAnalysis.itemBreakdown?.visible_items) {
      return null;
    }

    const matches = {};
    let totalScore = 0;
    let itemCount = 0;

    lookAnalysis.itemBreakdown.visible_items.forEach(lookItem => {
      const category = lookItem.category;
      const categoryItems = wardrobeItems
        .filter(item => isSameCategory(category, item.analysis?.type))
        .map(item => ({
          ...item,
          matchScore: calculateItemMatchScore(lookItem, item.analysis)
        }))
        .sort((a, b) => b.matchScore.total - a.matchScore.total);

      matches[category] = categoryItems.slice(0, 3);
      
      if (categoryItems.length > 0) {
        totalScore += categoryItems[0].matchScore.total;
        itemCount++;
      }
    });

    return {
      matches,
      overallMatch: {
        percentage: itemCount > 0 ? totalScore / itemCount : 0,
        itemsMatched: itemCount,
        totalItems: lookAnalysis.itemBreakdown?.visible_items?.length || 0
      }
    };
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
    const categoryMap = {
      'top': ['shirt', 'blouse', 'sweater', 'turtleneck', 't-shirt'],
      'bottom': ['trouser', 'pant', 'skirt', 'jean'],
      'outerwear': ['coat', 'jacket', 'blazer'],
      'shoes': ['shoe', 'boot', 'sneaker', 'heel'],
      'bag': ['bag', 'purse', 'clutch'],
      'accessories': ['scarf', 'belt', 'jewelry', 'watch']
    };
    
    const categoryItems = categoryMap[lookCategory] || [];
    return categoryItems.some(item => 
      wardrobeType?.toLowerCase().includes(item) || 
      item.includes(wardrobeType?.toLowerCase())
    );
  };

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <h1 className="title">Maura</h1>
          <p className="subtitle">Luxury Wardrobe Management & Style Matching</p>
        </header>

        <div className="tabs">
          <div className="tab-buttons">
            <button 
              className={`tab-button ${!lookImage ? 'active' : ''}`}
              onClick={() => {
                setLookImage(null);
                setLookAnalysis(null);
                setLookMatches(null);
              }}
            >
              Inspiration Matching
            </button>
            <button 
              className={`tab-button ${lookImage ? 'active' : ''}`}
              onClick={() => {
                setInspirationImage(null);
                setInspirationAnalysis(null);
                setMatchingResults(null);
              }}
            >
              Look Matcher
            </button>
          </div>

          {/* Inspiration Matching Tab */}
          {!lookImage && (
            <div className="tab-content">
              <div className="upload-section">
                <h2>Upload Inspiration Image</h2>
                <p className="section-description">
                  Upload a fashion image to find similar luxury pieces in your wardrobe
                </p>
                
                <label className="upload-button">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleInspirationUpload}
                    disabled={isProcessingInspiration}
                    className="hidden-input"
                  />
                  {isProcessingInspiration ? 'Analyzing...' : 'Choose Inspiration Image'}
                </label>
                
                {currentAnalysisStep && (
                  <div className="analysis-step">
                    {currentAnalysisStep}
                  </div>
                )}
              </div>

              {inspirationImage && (
                <div className="results-section">
                  <div className="inspiration-display">
                    <h3>Inspiration</h3>
                    <img src={inspirationImage} alt="Fashion inspiration" className="inspiration-image" />
                    
                    {inspirationAnalysis && (
                      <div className="analysis-summary">
                        <h4>Analysis</h4>
                        <div className="analysis-item">
                          <strong>Type:</strong> {inspirationAnalysis.type}
                        </div>
                        <div className="analysis-item">
                          <strong>Brand:</strong> {inspirationAnalysis.brandIdentifiers?.likelyBrand || 'Unidentified'}
                        </div>
                        <div className="analysis-item">
                          <strong>Tier:</strong> {inspirationAnalysis.overallAssessment?.tier}
                        </div>
                        <div className="analysis-item">
                          <strong>Colors:</strong> {inspirationAnalysis.fabricAnalysis?.colors?.join(', ')}
                        </div>
                      </div>
                    )}
                  </div>

                  {matchingResults && (
                    <div className="matching-results">
                      <h3>Your Wardrobe Matches</h3>
                      <div className="matches-grid">
                        {matchingResults.map(match => (
                          <div key={match.id} className="match-item">
                            <img src={match.imageUrl} alt={match.name} className="match-image" />
                            <div className="match-info">
                              <div className="match-name">{match.name}</div>
                              <div className="match-score">{Math.round(match.similarity.score)}% match</div>
                              <div className="match-reasoning">{match.similarity.reasoning}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Look Matcher Tab */}
          {lookImage && (
            <div className="tab-content">
              <div className="upload-section">
                <h2>Upload Complete Look</h2>
                <p className="section-description">
                  Upload a complete outfit to find matching pieces in your wardrobe
                </p>
                
                <label className="upload-button">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleLookUpload}
                    disabled={isProcessingLook}
                    className="hidden-input"
                  />
                  {isProcessingLook ? 'Analyzing Look...' : 'Upload Look'}
                </label>
              </div>

              {lookImage && (
                <div className="grid grid-cols-2 gap-6">
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
            </div>
          )}
        </div>

        <div className="wardrobe-section">
          <div className="section-header">
            <h2>Your Wardrobe ({wardrobe.length} items)</h2>
            
            <div className="wardrobe-controls">
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  isEditMode 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  {isEditMode ? 'Exit Edit' : 'Edit Mode'}
                </span>
              </button>
              
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
                    onClick={() => {
                      const selectedItemsArray = wardrobe.filter(item => selectedItems.has(item.id));
                      const needsAnalysis = selectedItemsArray.filter(item => item.needsAnalysis);
                      const alreadyAnalyzed = selectedItemsArray.filter(item => !item.needsAnalysis);
                      
                      if (needsAnalysis.length > 0 && alreadyAnalyzed.length > 0) {
                        const confirmMsg = `You have selected ${needsAnalysis.length} items that need analysis and ${alreadyAnalyzed.length} items that are already analyzed.\n\nThis will:\n- Analyze the ${needsAnalysis.length} unanalyzed items\n- Re-analyze the ${alreadyAnalyzed.length} already analyzed items\n\nContinue?`;
                        if (window.confirm(confirmMsg)) {
                          analyzeSelectedItems();
                        }
                      } else {
                        analyzeSelectedItems();
                      }
                    }}
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

          {/* Show uploading items */}
          {uploadingItems.length > 0 && (
            <div className="uploading-items">
              <h3>Uploading Items...</h3>
              <div className="upload-progress">
                Progress: {uploadProgress}%
              </div>
              <div className="uploading-grid">
                {uploadingItems.map(item => (
                  <div key={item.id} className="uploading-item">
                    <img src={item.imageUrl} alt={item.name} className="uploading-image" />
                    <div className="uploading-status">
                      <div className="loading-spinner"></div>
                      <p>{item.loadingMessage}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Loading state */}
          {isInitialLoading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading your wardrobe...</p>
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
                              console.log('Delete clicked for item:', {
                                id: item.id,
                                databaseId: item.databaseId,
                                name: item.name
                              });
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
              </div>

              {/* Load more button */}
              {hasMoreItems && (
                <div className="text-center mt-6">
                  <button
                    onClick={handleLoadMore}
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
          <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{selectedItem.name}</h3>
                <button className="modal-close" onClick={() => setSelectedItem(null)}>×</button>
              </div>
              
              <div className="modal-body">
                <img src={selectedItem.imageUrl} alt={selectedItem.name} className="modal-image" />
                
                {selectedItem.analysis && !selectedItem.analysis.error ? (
                  <div className="analysis-details">
                    <div className="analysis-section">
                      <h4>Basic Information</h4>
                      <p><strong>Type:</strong> {selectedItem.analysis.type}</p>
                      <p><strong>Brand:</strong> {selectedItem.analysis.brandIdentifiers?.likelyBrand || 'Unidentified'}</p>
                    </div>
                    
                    <div className="analysis-section">
                      <h4>Quality Assessment</h4>
                      <p><strong>Tier:</strong> {selectedItem.analysis.overallAssessment?.tier}</p>
                      <p><strong>Estimated Value:</strong> {selectedItem.analysis.overallAssessment?.estimatedRetail}</p>
                      <p><strong>Authenticity:</strong> {selectedItem.analysis.overallAssessment?.authenticityConfidence}</p>
                    </div>
                    
                    {selectedItem.analysis.fabricAnalysis && (
                      <div className="analysis-section">
                        <h4>Fabric Analysis</h4>
                        <p><strong>Material:</strong> {selectedItem.analysis.fabricAnalysis.weaveStructure}</p>
                        <p><strong>Colors:</strong> {selectedItem.analysis.fabricAnalysis.colors?.join(', ')}</p>
                      </div>
                    )}
                    
                    {selectedItem.analysis.qualityIndicators && (
                      <div className="analysis-section">
                        <h4>Quality Indicators</h4>
                        {selectedItem.analysis.qualityIndicators.luxuryMarkers && (
                          <div>
                            <strong>Luxury Markers:</strong>
                            <ul>
                              {selectedItem.analysis.qualityIndicators.luxuryMarkers.map((marker, index) => (
                                <li key={index}>{marker}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : selectedItem.needsAnalysis ? (
                  <div className="analysis-needed">
                    <p>This item needs analysis. Click the analyze button to get detailed information.</p>
                    <button 
                      onClick={() => {
                        setSelectedItem(null);
                        analyzeSingleItem(selectedItem);
                      }}
                      className="analyze-button"
                    >
                      Analyze Now
                    </button>
                  </div>
                ) : (
                  <div className="analysis-error">
                    <p>Analysis failed for this item. Please try re-analyzing.</p>
                    <button 
                      onClick={() => {
                        setSelectedItem(null);
                        reanalyzeSingleItem(selectedItem);
                      }}
                      className="analyze-button"
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
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .app {
          min-height: 100vh;
          background-color: #f8f9fa;
          font-family: 'Inter', sans-serif;
        }
        
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .header {
          text-align: center;
          margin-bottom: 40px;
        }
        
        .title {
          font-family: 'Playfair Display', serif;
          font-size: 3rem;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 8px;
        }
        
        .subtitle {
          color: #666;
          font-size: 1.1rem;
          font-weight: 400;
        }
        
        .tabs {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          margin-bottom: 40px;
        }
        
        .tab-buttons {
          display: flex;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .tab-button {
          flex: 1;
          padding: 16px 24px;
          background: none;
          border: none;
          font-size: 1rem;
          font-weight: 500;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .tab-button.active {
          color: #1f2937;
          border-bottom: 2px solid #000;
        }
        
        .tab-button:hover {
          color: #1f2937;
        }
        
        .tab-content {
          padding: 24px;
        }
        
        .upload-section {
          text-align: center;
          margin-bottom: 32px;
        }
        
        .upload-section h2 {
          font-size: 1.5rem;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 8px;
        }
        
        .section-description {
          color: #6b7280;
          margin-bottom: 24px;
        }
        
        .upload-button {
          display: inline-block;
          padding: 12px 24px;
          background-color: #000;
          color: white;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .upload-button:hover {
          background-color: #374151;
        }
        
        .hidden-input {
          display: none;
        }
        
        .analysis-step {
          margin-top: 16px;
          padding: 12px;
          background-color: #f3f4f6;
          border-radius: 6px;
          color: #374151;
          font-weight: 500;
        }
        
        .results-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
        }
        
        .inspiration-display h3,
        .matching-results h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 16px;
          color: #1f2937;
        }
        
        .inspiration-image {
          width: 100%;
          max-width: 400px;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .analysis-summary {
          margin-top: 16px;
          padding: 16px;
          background-color: #f9fafb;
          border-radius: 8px;
        }
        
        .analysis-summary h4 {
          font-weight: 600;
          margin-bottom: 12px;
          color: #1f2937;
        }
        
        .analysis-item {
          margin-bottom: 8px;
          color: #374151;
        }
        
        .matches-grid {
          display: grid;
          gap: 16px;
        }
        
        .match-item {
          display: flex;
          gap: 12px;
          padding: 12px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .match-image {
          width: 80px;
          height: 80px;
          object-fit: cover;
          border-radius: 6px;
        }
        
        .match-info {
          flex: 1;
        }
        
        .match-name {
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 4px;
        }
        
        .match-score {
          color: #059669;
          font-weight: 600;
          margin-bottom: 4px;
        }
        
        .match-reasoning {
          color: #6b7280;
          font-size: 0.875rem;
        }
        
        .wardrobe-section {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          padding: 24px;
        }
        
        .section-header {
          display: flex;
          justify-content: between;
          align-items: center;
          margin-bottom: 24px;
        }
        
        .section-header h2 {
          font-size: 1.5rem;
          font-weight: 600;
          color: #1f2937;
        }
        
        .wardrobe-controls {
          display: flex;
          gap: 12px;
        }
        
        .loading-state {
          text-align: center;
          padding: 48px;
          color: #6b7280;
        }
        
        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e5e7eb;
          border-top: 3px solid #3b82f6;
          border-radius: 50%;
          margin: 0 auto 16px;
          animation: spin 1s linear infinite;
        }
        
        .uploading-items {
          margin-bottom: 32px;
          padding: 20px;
          background-color: #f3f4f6;
          border-radius: 8px;
        }
        
        .upload-progress {
          margin-bottom: 16px;
          font-weight: 600;
          color: #374151;
        }
        
        .uploading-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 16px;
        }
        
        .uploading-item {
          text-align: center;
        }
        
        .uploading-image {
          width: 100%;
          height: 150px;
          object-fit: cover;
          border-radius: 8px;
          margin-bottom: 8px;
        }
        
        .uploading-status {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        
        .uploading-status .loading-spinner {
          width: 20px;
          height: 20px;
          border-width: 2px;
          margin: 0;
        }
        
        .uploading-status p {
          font-size: 0.875rem;
          color: #6b7280;
        }
        
        .wardrobe-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
        }
        
        .item-image-container {
          position: relative;
          aspect-ratio: 1;
          overflow: hidden;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .item-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.2s;
        }
        
        .item-image:hover {
          transform: scale(1.02);
        }
        
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.75);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .modal-content {
          background: white;
          border-radius: 12px;
          max-width: 800px;
          max-height: 90vh;
          overflow-y: auto;
          margin: 20px;
          box-shadow: 0 20px 25px rgba(0, 0, 0, 0.25);
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .modal-header h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
        }
        
        .modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          color: #6b7280;
          cursor: pointer;
          padding: 4px;
        }
        
        .modal-close:hover {
          color: #374151;
        }
        
        .modal-body {
          padding: 24px;
        }
        
        .modal-image {
          width: 100%;
          max-width: 300px;
          border-radius: 8px;
          margin-bottom: 24px;
        }
        
        .analysis-details {
          display: grid;
          gap: 20px;
        }
        
        .analysis-section {
          padding: 16px;
          background-color: #f9fafb;
          border-radius: 8px;
        }
        
        .analysis-section h4 {
          font-weight: 600;
          margin-bottom: 12px;
          color: #1f2937;
        }
        
        .analysis-section p {
          margin-bottom: 8px;
          color: #374151;
        }
        
        .analysis-section ul {
          margin-left: 20px;
          color: #374151;
        }
        
        .analysis-section li {
          margin-bottom: 4px;
        }
        
        .analysis-needed,
        .analysis-error {
          text-align: center;
          padding: 32px;
          color: #6b7280;
        }
        
        .analyze-button {
          margin-top: 16px;
          padding: 12px 24px;
          background-color: #059669;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .analyze-button:hover {
          background-color: #047857;
        }
        
        @media (max-width: 768px) {
          .results-section {
            grid-template-columns: 1fr;
          }
          
          .wardrobe-grid {
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          }
          
          .section-header {
            flex-direction: column;
            gap: 16px;
            align-items: stretch;
          }
          
          .wardrobe-controls {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}

export default App;