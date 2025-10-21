// Complete redesigned App.js with side navigation and streamlined UX
import React, { useState, useEffect } from 'react';
import './App.css';
import './MobileApp.css';
import MultiItemDetectionDisplay from './MultiItemDetectionDisplay';
import ItemRecreationWorkflow from './ItemRecreationWorkflow';
import BottomNav from './components/shared/BottomNav';
import DetectedItemCard from './components/shared/DetectedItemCard';
import ItemDetailModal from './components/shared/ItemDetailModal';

// Image format validation
const SUPPORTED_FORMATS = ['image/jpeg', 'image/png'];
const ACCEPT_STRING = 'image/jpeg,image/png';

const validateImageFile = (file) => {
  if (!file) return { valid: false, error: 'No file provided' };
  
  const mimeType = file.type.toLowerCase();
  if (!SUPPORTED_FORMATS.includes(mimeType)) {
    return {
      valid: false,
      error: `Unsupported format: ${file.type || 'unknown'}. Please use JPG or PNG files.`,
      fileName: file.name,
      mimeType
    };
  }
  
  return { valid: true, mimeType };
};

const ITEMS_PER_PAGE = 20;

function App() {
  // Navigation state
  const [activeSection, setActiveSection] = useState('multi-item');

  // Core state (keep all existing state)
  const [wardrobe, setWardrobe] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingItems, setUploadingItems] = useState([]);
  const [isAnalyzingAll, setIsAnalyzingAll] = useState(false);
  const [analyzingItems, setAnalyzingItems] = useState(new Set());
  const [currentAnalysisStep, setCurrentAnalysisStep] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [hoveredItem, setHoveredItem] = useState(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [hasMoreItems, setHasMoreItems] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Look matching state
  const [lookImage, setLookImage] = useState(null);
  const [lookAnalysis, setLookAnalysis] = useState(null);
  const [lookMatches, setLookMatches] = useState([]);
  const [isProcessingLook, setIsProcessingLook] = useState(false);

  // Multi-item detection state
  const [multiItemDetectionResult, setMultiItemDetectionResult] = useState(null);
  const [isProcessingMultiItem, setIsProcessingMultiItem] = useState(false);
  const [imageFormatError, setImageFormatError] = useState(null);
  const [uploadedImagePreview, setUploadedImagePreview] = useState(null);
  const [uploadedImageFile, setUploadedImageFile] = useState(null);

  // Recreation workflow state
  const [showRecreationWorkflow, setShowRecreationWorkflow] = useState(false);
  const [recreationOriginalImage, setRecreationOriginalImage] = useState(null);
  const [recreationSelectedItem, setRecreationSelectedItem] = useState(null);
  const [recreatingItems, setRecreatingItems] = useState(new Set());
  const [recreatedItems, setRecreatedItems] = useState({});
  const [detailViewItem, setDetailViewItem] = useState(null); // For full-screen detail view

  // Keep all existing functions (loadWardrobeItems, saveToDatabase, etc.)
  useEffect(() => {
    loadWardrobeItems();
  }, []);

  const loadWardrobeItems = async (offset = 0) => {
    try {
      if (offset === 0) setIsInitialLoading(true);
      
      const response = await fetch(`/api/get-wardrobe?offset=${offset}&limit=${ITEMS_PER_PAGE}`);
      const result = await response.json();
      
      if (result.success) {
        const items = result.items || [];
        
        if (offset === 0) {
          setWardrobe(items);
        } else {
          setWardrobe(prev => [...prev, ...items]);
        }
        
        setCurrentOffset(offset);
        setHasMoreItems(items.length === ITEMS_PER_PAGE);
      }
    } catch (error) {
      console.error('Failed to load wardrobe:', error);
    } finally {
      setIsInitialLoading(false);
      setIsLoadingMore(false);
    }
  };

  const saveToDatabase = async (analysisResult, imageData, category = 'wardrobe', itemId = null) => {
    try {
      const endpoint = itemId ? '/api/update-wardrobe-item' : '/api/save-wardrobe-item';
      
      const requestBody = itemId 
        ? { itemId, analysis: analysisResult }
        : {
            analysis: analysisResult,
            imageData,
            category
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const result = await response.json();
        return result.itemId || result.id || itemId;
      }
    } catch (error) {
      console.error('Database save failed:', error);
    }
    return null;
  };

  // Multi-item upload handler - Step 1: Select file and show preview
  const handleMultiItemUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setImageFormatError({
        error: validation.error,
        fileName: validation.fileName
      });
      e.target.value = '';
      return;
    }

    setImageFormatError(null);
    setUploadedImageFile(file);
    setUploadedImagePreview(URL.createObjectURL(file));
    setMultiItemDetectionResult(null); // Clear previous results
    e.target.value = '';
  };

  // Analyze outfit handler - Step 2: Analyze the uploaded image
  const handleAnalyzeOutfit = async () => {
    if (!uploadedImageFile) return;

    setIsProcessingMultiItem(true);

    try {
      const validation = validateImageFile(uploadedImageFile);
      
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(uploadedImageFile);
      });

      const response = await fetch('/api/multi-item-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData: base64,
          mimeType: validation.mimeType,
          userId: "00000000-0000-0000-0000-000000000001"
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const result = await response.json();

      if (result.success && result.detectedItems && result.detectedItems.length > 0) {
        const detectionResult = {
          originalImage: uploadedImagePreview,
          detectedItems: result.detectedItems.map(item => ({
            id: `detected_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: item.type || 'Unknown Item',
            confidence: typeof item.confidence === 'number' ? 
              Math.round(item.confidence * 100) : 50,
            boundingBox: {
              left: item.boundingBox?.left || 0,
              top: item.boundingBox?.top || 0,
              width: item.boundingBox?.width || 50,
              height: item.boundingBox?.height || 50
            },
            analysis: item.analysis,
            description: item.description,
            color: item.color,
            material: item.material
          })),
          sessionId: result.sessionId || `session_${Date.now()}`
        };

        setMultiItemDetectionResult(detectionResult);
        setRecreationOriginalImage(uploadedImagePreview);
      } else {
        throw new Error(result.error || 'No items detected');
      }
    } catch (error) {
      console.error('Multi-item detection error:', error);
      alert(`Multi-item detection failed: ${error.message}`);
    } finally {
      setIsProcessingMultiItem(false);
    }
  };

  // Individual item recreation
  const handleRecreateItem = async (item) => {
    setRecreatingItems(prev => new Set([...prev, item.id]));

    try {
      let imageData = recreationOriginalImage;
      if (imageData.startsWith('blob:')) {
        const response = await fetch(imageData);
        const blob = await response.blob();
        imageData = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(',')[1]);
          reader.readAsDataURL(blob);
        });
      } else {
        imageData = imageData.split(',')[1];
      }

      const response = await fetch('/api/recreate-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalImageData: imageData,
          detectedItem: item,
          userId: "demo_user"
        })
      });

      if (!response.ok) {
        throw new Error(`Recreation failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setRecreatedItems(prev => ({
          ...prev,
          [item.id]: {
            originalItem: item,
            recreatedImageUrl: result.recreatedImageUrl,
            description: result.description,
            timestamp: result.metadata.timestamp
          }
        }));
      } else {
        throw new Error(result.message || 'Recreation failed');
      }

    } catch (error) {
      console.error('Recreation error:', error);
      alert(`Failed to recreate ${item.type}: ${error.message}`);
    } finally {
      setRecreatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  };

  // Recreate all items
  const handleRecreateAllItems = async () => {
    if (!multiItemDetectionResult?.detectedItems) return;
    
    for (const item of multiItemDetectionResult.detectedItems) {
      if (!recreatedItems[item.id] && !recreatingItems.has(item.id)) {
        await handleRecreateItem(item);
      }
    }
  };

  // Add item to wardrobe
  const handleAddToWardrobe = async (item, useRecreated = false) => {
    try {
      const itemToAdd = {
        ...item,
        imageUrl: useRecreated && recreatedItems[item.id] ? 
          recreatedItems[item.id].recreatedImageUrl : 
          recreationOriginalImage,
        name: item.analysis?.name || item.type,
        isRecreated: useRecreated,
        originalImageUrl: useRecreated ? recreationOriginalImage : undefined
      };

      // If this is a recreated item, save to database
      if (useRecreated && recreatedItems[item.id]) {
        console.log('💾 Saving recreated item to database...');
        
        // Check payload size
        const payload = {
          detectedItem: item,
          originalImageUrl: recreationOriginalImage,
          recreatedImageUrl: recreatedItems[item.id].recreatedImageUrl,
          recreationMetadata: recreatedItems[item.id]
        };
        
        const payloadSize = JSON.stringify(payload).length;
        const payloadSizeMB = (payloadSize / 1024 / 1024).toFixed(2);
        console.log(`📦 Payload size: ${payloadSizeMB} MB (${payloadSize} bytes)`);
        
        if (payloadSize > 4500000) { // 4.5MB limit
          console.error('❌ Payload too large! Vercel limit is 4.5MB');
          alert('Images are too large to save. Try with smaller images.');
          return;
        }
        
        try {
          const response = await fetch('/api/save-recreated-item', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          const result = await response.json();
          
          if (result.success) {
            console.log('✅ Recreated item saved to database:', result.itemId);
            // Add the database ID to the item
            itemToAdd.id = result.itemId;
            itemToAdd.savedToDb = true;
          } else {
            console.error('❌ Database save failed:', result.message);
            console.error('   Error details:', result);
            console.warn('⚠️ Failed to save to database, adding to local state only');
          }
        } catch (dbError) {
          console.error('❌ Error calling save API:', dbError);
          console.warn('⚠️ Failed to save to database, adding to local state only');
        }
      }

      setWardrobe(prev => [itemToAdd, ...prev]);
      alert(`${itemToAdd.name} added to wardrobe!`);
    } catch (error) {
      console.error('Error adding to wardrobe:', error);
      alert('Failed to add item to wardrobe.');
    }
  };

  // Look matching functions (keep existing)
  const handleLookUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setImageFormatError({
        error: validation.error,
        fileName: validation.fileName
      });
      e.target.value = '';
      return;
    }

    setIsProcessingLook(true);
    setLookImage(URL.createObjectURL(file));
    setLookAnalysis(null);
    setLookMatches([]);

    try {
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(file);
      });

      const response = await fetch('/api/analyze-wardrobe-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: base64 })
      });

      const analysis = await response.json();

      if (analysis && !analysis.error) {
        setLookAnalysis(analysis);
        const matches = findWardrobeMatches(analysis, wardrobe);
        setLookMatches(matches);
      }
    } catch (error) {
      console.error('Look analysis failed:', error);
    } finally {
      setIsProcessingLook(false);
      e.target.value = '';
    }
  };

  const findWardrobeMatches = (lookAnalysis, wardrobeItems) => {
    // Keep existing implementation
    return [];
  };

  // Wardrobe upload handler (simplified)
 // REPLACE ONLY the handleWardrobeUpload function in your App.js with this:

// FRONTEND FIX: Update the wardrobe upload functions to use the correct API endpoint

// Replace the handleWardrobeUpload function in src/App.js with this:

const handleWardrobeUpload = async (e) => {
  const files = Array.from(e.target.files);
  if (!files.length) return;

  // Validate all files first
  const invalidFiles = [];
  const validFiles = [];
  
  for (const file of files) {
    const validation = validateImageFile(file);
    if (!validation.valid) {
      invalidFiles.push({ file, validation });
    } else {
      validFiles.push({ file, validation });
    }
  }

  // Show error for first invalid file
  if (invalidFiles.length > 0) {
    const first = invalidFiles[0];
    setImageFormatError({
      error: first.validation.error,
      fileName: first.validation.fileName
    });
    
    if (validFiles.length === 0) {
      e.target.value = '';
      return;
    }
    
    alert(`Skipping ${invalidFiles.length} unsupported file(s). Processing ${validFiles.length} valid files.`);
  }

  setIsUploading(true);
  setUploadProgress(0);
  
  const filesToProcess = validFiles.map(item => item.file);

  const placeholders = filesToProcess.map((file, index) => ({
    id: `placeholder-${Date.now()}-${index}`,
    imageUrl: URL.createObjectURL(file),
    name: file.name,
    isLoading: true,
    loadingMessage: 'Preparing image...'
  }));
  
  setUploadingItems(placeholders);
  
  const newItems = [];
  
  for (let i = 0; i < filesToProcess.length; i++) {
    const file = filesToProcess[i];
    setUploadProgress(Math.round(((i + 1) / filesToProcess.length) * 100));
    
    setUploadingItems(prev => prev.map((item, index) => 
      index === i ? { 
        ...item, 
        loadingMessage: 'Analyzing luxury details...' 
      } : item
    ));

    try {
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result.split(',')[1];
          resolve(result);
        };
        reader.readAsDataURL(file);
      });

      setUploadingItems(prev => prev.map((item, index) => 
        index === i ? { 
          ...item, 
          loadingMessage: 'AI analyzing construction & authenticity...' 
        } : item
      ));

      // FIXED: Use the correct API endpoint and format
      const response = await fetch('/api/analyze-wardrobe-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis_type: 'wardrobe_image',
          user_id: 'default_user',
          image_data: {
            base64: base64,
            filename: file.name,
            type: file.type
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      if (result.success && result.result?.items?.length > 0) {
        const analysisItem = result.result.items[0];
        
        const newItem = {
          id: Date.now() + Math.random(),
          imageUrl: `data:image/jpeg;base64,${base64}`,
          name: analysisItem.name || `Item ${i + 1}`,
          source: 'uploaded',
          analysis: {
            name: analysisItem.name,
            type: analysisItem.category,
            colors: analysisItem.colors,
            fabrics: analysisItem.fabrics,
            patterns: analysisItem.patterns,
            styles: analysisItem.styles,
            confidence: analysisItem.confidence_score,
            details: analysisItem.details,
            // Map the detailed analysis for display - FIXED
            overallAssessment: {
              tier: analysisItem.brand_tier || 'unknown',
              score: Math.round((analysisItem.confidence_score || 0.8) * 10) // Convert confidence to 1-10 scale
            },
            fabricAnalysis: {
              colors: analysisItem.colors,
              weaveStructure: analysisItem.fabrics?.[0] || 'unknown'
            },
            // Add additional fields for better display
            color: analysisItem.colors?.[0] || 'unknown',
            material: analysisItem.fabrics?.[0] || 'unknown'
          }
        };

        newItems.push(newItem);
        
        // Save to database
        await saveToDatabase(newItem.analysis, base64, 'wardrobe');
        
      } else {
        throw new Error(result.error || 'Analysis failed');
      }

      // Remove this item from uploading state
      setUploadingItems(prev => prev.filter((_, index) => index !== i));

    } catch (error) {
      console.error(`Failed to analyze ${file.name}:`, error);
      alert(`Failed to analyze ${file.name}: ${error.message}`);
      setUploadingItems(prev => prev.filter((_, index) => index !== i));
    }
  }

  // Add new items to wardrobe
  setWardrobe(prev => [...prev, ...newItems]);
  setIsUploading(false);
  setUploadingItems([]);
  setUploadProgress(0);
  e.target.value = null;
};

// Also update the analyzeSingleItem function to use the new API:

const analyzeSingleItem = async (item) => {
  if (analyzingItems.has(item.id)) {
    return;
  }

  setAnalyzingItems(prev => new Set([...prev, item.id]));

  try {
    let base64;
    if (item.imageUrl.startsWith('data:')) {
      base64 = item.imageUrl.split(',')[1];
    } else {
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

    // FIXED: Use the correct API endpoint and format
    const analysisResponse = await fetch('/api/analyze-wardrobe-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        analysis_type: 'wardrobe_image',
        user_id: 'default_user',
        image_data: {
          base64: base64,
          filename: item.name || 'item.jpg',
          type: 'image/jpeg'
        }
      })
    });

    const result = await analysisResponse.json();
    
    if (result.success && result.result?.items?.length > 0) {
      const analysisItem = result.result.items[0];
      
      const analysis = {
        name: analysisItem.name,
        type: analysisItem.category,
        colors: analysisItem.colors,
        fabrics: analysisItem.fabrics,
        patterns: analysisItem.patterns,
        styles: analysisItem.styles,
        confidence: analysisItem.confidence_score,
        details: analysisItem.details,
        overallAssessment: {
          tier: analysisItem.brand_tier || 'unknown',
          score: Math.round((analysisItem.confidence_score || 0.8) * 10) // Convert confidence to 1-10 scale
        },
        fabricAnalysis: {
          colors: analysisItem.colors,
          weaveStructure: analysisItem.fabrics?.[0] || 'unknown'
        },
        // Add additional fields for better display
        color: analysisItem.colors?.[0] || 'unknown',
        material: analysisItem.fabrics?.[0] || 'unknown'
      };

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
      
    } else {
      throw new Error(result.error || 'Analysis failed');
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

  return (
    <div className="mobile-app">
      {/* Main Content */}
      <div className="mobile-content">
        {/* Multi-Item Detection Section */}
        {activeSection === 'multi-item' && (
          <div className="mobile-container">
            <div className="mobile-section">
              <h2 className="heading-2 mb-md">Upload Outfit</h2>
              <p className="body-text mb-2xl text-secondary">
                Upload a photo to detect and recreate individual items
              </p>
              
              {/* Upload Button */}
              {!uploadedImagePreview && (
                <label className="btn btn-full">
                  <input 
                    type="file" 
                    accept={ACCEPT_STRING}
                    onChange={handleMultiItemUpload}
                    className="hidden"
                  />
                  📷 Choose Photo
                </label>
              )}

              {/* Image Preview + Analyze Button */}
              {uploadedImagePreview && !multiItemDetectionResult && (
                <div>
                  <div className="mb-2xl image-border">
                    <img 
                      src={uploadedImagePreview}
                      alt="Uploaded outfit"
                      className="full-width-image"
                    />
                  </div>
                  
                  <button
                    onClick={handleAnalyzeOutfit}
                    disabled={isProcessingMultiItem}
                    className="btn btn-primary btn-full mb-lg"
                  >
                    {isProcessingMultiItem ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="spinner spinner-white"></span>
                        Analyzing...
                      </span>
                    ) : (
                      '🔍 Analyze Outfit'
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setUploadedImagePreview(null);
                      setUploadedImageFile(null);
                    }}
                    className="btn btn-full"
                  >
                    Choose Different Photo
                  </button>
                </div>
              )}

            {/* Error Display */}
            {imageFormatError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-red-500 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h3 className="text-red-800 font-medium">Invalid Image Format</h3>
                    <p className="text-red-700 text-sm mt-1">{imageFormatError.error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Detection Results - 2-Column Grid */}
            {multiItemDetectionResult && (
              <div className="mobile-section-compact">
                {/* Header */}
                <h2 className="heading-2 section-header">
                  Extracted garments
                </h2>
                
                {/* 2-Column Grid of Items */}
                <div className="items-grid section-content">
                  {multiItemDetectionResult.detectedItems.map((item, index) => (
                    <DetectedItemCard
                      key={item.id}
                      item={item}
                      index={index}
                      isRecreating={recreatingItems.has(item.id)}
                      isRecreated={!!recreatedItems[item.id]}
                      recreatedData={recreatedItems[item.id]}
                      onRecreate={handleRecreateItem}
                      onViewRecreation={() => setDetailViewItem(item)}
                    />
                  ))}
                </div>

                {/* Bottom Actions */}
                <button
                  onClick={handleRecreateAllItems}
                  className="btn btn-full btn-medium mb-md"
                  disabled={multiItemDetectionResult.detectedItems.every(item => recreatedItems[item.id])}
                >
                  🎨 Recreate all items
                </button>

                <button 
                  onClick={() => {
                    // Find the first recreated item, or the first item if none are recreated
                    const firstRecreatedItem = multiItemDetectionResult.detectedItems.find(item => recreatedItems[item.id]);
                    if (firstRecreatedItem) {
                      setDetailViewItem(firstRecreatedItem);
                    } else {
                      // If no items are recreated yet, alert user
                      alert('Please recreate at least one item first');
                    }
                  }}
                  className="btn btn-full btn-medium"
                  disabled={!multiItemDetectionResult.detectedItems.some(item => recreatedItems[item.id])}
                >
                  View each item
                </button>
              </div>
            )}
            </div>
          </div>
        )}

        {/* Look Matcher Section */}
        {activeSection === 'look-matcher' && (
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-800">Look Matcher</h2>
                <p className="text-gray-600 mt-1">Upload a complete outfit to find matches in your wardrobe</p>
              </div>
              
              <label className="btn-primary">
                <input 
                  type="file" 
                  accept={ACCEPT_STRING}
                  onChange={handleLookUpload}
                  className="hidden"
                />
                <span className="flex items-center gap-2">
                  {isProcessingLook ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Upload Look
                    </>
                  )}
                </span>
              </label>
            </div>

            {lookImage ? (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium mb-2">Uploaded Look</h3>
                    <img 
                      src={lookImage} 
                      alt="Look to match" 
                      className="w-full h-64 object-cover rounded border"
                    />
                  </div>
                  
                  {lookMatches.length > 0 && (
                    <div>
                      <h3 className="font-medium mb-2">Wardrobe Matches</h3>
                      <div className="space-y-4 max-h-64 overflow-y-auto">
                        {lookMatches.map((matchGroup, groupIndex) => (
                          <div key={groupIndex} className="border rounded p-3">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">
                              For: {matchGroup.lookItem.type}
                            </h4>
                            <div className="grid grid-cols-3 gap-2">
                              {matchGroup.matches.map((match, matchIndex) => (
                                <div key={matchIndex} className="text-center">
                                  <img 
                                    src={match.imageUrl} 
                                    alt={match.name}
                                    className="w-full h-16 object-cover rounded mb-1"
                                  />
                                  <p className="text-xs text-gray-600">{match.name}</p>
                                  <p className="text-xs text-blue-600">{match.similarity.score}% match</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-lg border">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-gray-500 font-medium">Upload a look to find matches</p>
                <p className="text-sm text-gray-400 mt-1">We'll find similar items in your wardrobe</p>
              </div>
            )}
          </div>
        )}

        {/* Wardrobe Section */}
        {activeSection === 'wardrobe' && (
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-800">My Wardrobe</h2>
                <p className="text-gray-600 mt-1">Manage your clothing collection</p>
              </div>
              
              <label className="btn-primary">
                <input 
                  type="file" 
                  multiple 
                  accept={ACCEPT_STRING}
                  onChange={handleWardrobeUpload}
                  className="hidden"
                  disabled={isUploading}
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

            {/* Progress indicator */}
            {isUploading && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-900">Processing Images</span>
                  <span className="text-sm text-blue-700">{Math.round(uploadProgress)}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Wardrobe Grid */}
            {wardrobe.length > 0 ? (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {wardrobe.map(item => (
                    <div 
                      key={item.id}
                      className="group cursor-pointer"
                      onClick={() => setSelectedItem(item)}
                    >
                      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                        <img 
                          src={item.imageUrl} 
                          alt={item.name}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          loading="lazy"
                        />
                      </div>
                      <div className="mt-2">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                        {item.isRecreated && (
                          <p className="text-xs text-purple-600">✨ Recreated</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-lg border">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <p className="text-gray-500 font-medium">Your wardrobe is empty</p>
                <p className="text-sm text-gray-400 mt-1">Upload some images to get started</p>
              </div>
            )}
          </div>
        )}

      {/* Item Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold">{selectedItem.name}</h2>
                <button
                  onClick={() => setSelectedItem(null)}
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
                    src={selectedItem.imageUrl} 
                    alt={selectedItem.name}
                    className="w-full h-96 object-cover rounded-lg"
                  />
                </div>

                <div className="space-y-4">
                  {selectedItem.analysis && !selectedItem.analysis.error ? (
                    <>
                      <div>
                        <h3 className="font-semibold mb-2">Item Details</h3>
                        <div className="space-y-2 text-sm">
                          <p><span className="font-medium">Type:</span> {selectedItem.analysis.type}</p>
                          {selectedItem.analysis.brand && selectedItem.analysis.brand !== 'Unknown' && (
                            <p><span className="font-medium">Brand:</span> {selectedItem.analysis.brand}</p>
                          )}
                          {selectedItem.analysis.color && (
                            <p><span className="font-medium">Color:</span> {selectedItem.analysis.color}</p>
                          )}
                          {selectedItem.analysis.material && (
                            <p><span className="font-medium">Material:</span> {selectedItem.analysis.material}</p>
                          )}
                          {selectedItem.analysis.colors && selectedItem.analysis.colors.length > 1 && (
                            <p><span className="font-medium">All Colors:</span> {selectedItem.analysis.colors.join(', ')}</p>
                          )}
                          {selectedItem.analysis.fabrics && selectedItem.analysis.fabrics.length > 1 && (
                            <p><span className="font-medium">All Materials:</span> {selectedItem.analysis.fabrics.join(', ')}</p>
                          )}
                        </div>
                      </div>

                      {selectedItem.analysis.overallAssessment && (
                        <div>
                          <h3 className="font-semibold mb-2">Quality Assessment</h3>
                          <div className="space-y-2 text-sm">
                            <p><span className="font-medium">Tier:</span> {selectedItem.analysis.overallAssessment.tier}</p>
                            <p><span className="font-medium">Score:</span> {selectedItem.analysis.overallAssessment.score}/10</p>
                          </div>
                        </div>
                      )}

                      {selectedItem.analysis.details && (
                        <div>
                          <h3 className="font-semibold mb-2">Detailed Analysis</h3>
                          <div className="text-sm text-gray-700 max-h-64 overflow-y-auto bg-gray-50 p-3 rounded border">
                            <pre className="whitespace-pre-wrap font-sans">{selectedItem.analysis.details}</pre>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
                      <p className="text-yellow-800">No analysis available for this item.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Item Detail Modal - Full screen view of recreated items */}
      {detailViewItem && (
        <ItemDetailModal
          item={detailViewItem}
          recreatedData={recreatedItems}
          allRecreatedItems={multiItemDetectionResult?.detectedItems.filter(item => recreatedItems[item.id])}
          onClose={() => setDetailViewItem(null)}
          onAddToWardrobe={handleAddToWardrobe}
          onSkip={() => console.log('Skipped')}
        />
      )}

      {/* Bottom Navigation */}
      <BottomNav 
        activeSection={activeSection}
        onNavigate={setActiveSection}
      />
    </div>
  );
}

export default App;