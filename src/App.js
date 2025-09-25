// App.js - Complete version with pagination and detailed analysis

import React, { useState, useEffect } from 'react';
import './App.css';
import './Maura.css'; // Import the luxury styles

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

  // Function to analyze a single item
  const analyzeSingleItem = async (item) => {
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
      console.error(`Failed to analyze item ${item.id}:`, error);
      alert('Failed to analyze item. Please try again.');
    }
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
          
          .empty-state {
            text-align: center;
            padding: calc(var(--grid-unit) * 10) calc(var(--grid-unit) * 4);
          }
          
          .empty-state-text {
            font-size: calc(var(--grid-unit) * 2.25);
            color: var(--color-gray-medium);
            margin-bottom: calc(var(--grid-unit) * 1);
          }
          
          .empty-state-subtext {
            font-size: calc(var(--grid-unit) * 1.75);
            color: var(--color-gray-medium);
            margin-bottom: calc(var(--grid-unit) * 4);
          }
          
          .load-more-btn {
            width: 100%;
            text-align: center;
            padding: calc(var(--grid-unit) * 2);
            background: var(--color-white);
            border: 1px solid var(--color-border);
            font-size: calc(var(--grid-unit) * 1.75);
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            cursor: pointer;
            transition: all 0.2s ease;
            margin-top: calc(var(--grid-unit) * 4);
          }
          
          .load-more-btn:hover:not(:disabled) {
            background: var(--color-black);
            color: var(--color-white);
            border-color: var(--color-black);
          }
          
          .load-more-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
          
          .progress-bar {
            height: calc(var(--grid-unit) * 0.5);
            background: var(--color-gray-light);
            margin-bottom: calc(var(--grid-unit) * 1);
          }
          
          .progress-fill {
            height: 100%;
            background: var(--color-black);
            transition: width 0.3s ease;
          }
          
          .progress-text {
            font-size: calc(var(--grid-unit) * 1.75);
            color: var(--color-gray-medium);
            text-align: center;
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
        <div className="bg-white p-6 mb-6">
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
                    className="cursor-pointer relative wardrobe-item"
                    title="Click to view luxury analysis"
                  >
                    <div className="item-image-container">
                      <img 
                        src={item.imageUrl} 
                        alt={item.name}
                        className="item-image"
                        onClick={() => setSelectedItem(item)}
                      />
                      {/* Run Analysis button for items that need it */}
                      {item.needsAnalysis && (
                        <button
                          className="analyze-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            analyzeSingleItem(item);
                          }}
                        >
                          Run Analysis
                        </button>
                      )}
                    </div>
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
                    <p className="text-s mt-1">{item.name}</p>
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

        {/* Rest of the component continues with Inspiration Section and Modal... */}
      </div>
    </div>
  );
}

export default App;