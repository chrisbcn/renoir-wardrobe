// src/App.js
import React, { useState, useEffect } from 'react';
import './App.css';
import MultiItemDetectionDisplay from './MultiItemDetectionDisplay';

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
  // Core state
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
  const [showMultiItemSection, setShowMultiItemSection] = useState(false);
  const [imageFormatError, setImageFormatError] = useState(null);

  // Recreation workflow state
  const [showRecreationWorkflow, setShowRecreationWorkflow] = useState(false);
  const [recreationOriginalImage, setRecreationOriginalImage] = useState(null);
  const [recreationSelectedItem, setRecreationSelectedItem] = useState(null);

  // Load wardrobe items on component mount
  useEffect(() => {
    loadWardrobeItems();
  }, []);

  // Load wardrobe items function
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

  // Save to database function
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

  // Upload handler
  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Validate all files
    for (const file of files) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        setImageFormatError({
          error: validation.error,
          fileName: validation.fileName
        });
        e.target.value = '';
        return;
      }
    }

    setImageFormatError(null);
    setIsUploading(true);
    setUploadProgress(0);

    const newUploadingItems = files.map((file, index) => ({
      id: `uploading-${Date.now()}-${index}`,
      file,
      preview: URL.createObjectURL(file),
      name: file.name.split('.')[0],
      status: 'uploading'
    }));

    setUploadingItems(newUploadingItems);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uploadingItem = newUploadingItems[i];

        setCurrentAnalysisStep(`Analyzing ${file.name}...`);
        setUploadProgress(((i + 0.5) / files.length) * 100);

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
          setCurrentAnalysisStep(`Saving ${file.name}...`);
          
          const databaseId = await saveToDatabase(analysis, base64, 'wardrobe');
          
          const wardrobeItem = {
            id: `wardrobe_${Date.now()}_${i}`,
            imageUrl: uploadingItem.preview,
            name: analysis.name || analysis.type || file.name.split('.')[0],
            analysis,
            needsAnalysis: false,
            databaseId
          };

          setWardrobe(prev => [wardrobeItem, ...prev]);
        } else {
          console.error('Analysis failed for', file.name, analysis?.error);
        }

        setUploadProgress(((i + 1) / files.length) * 100);
      }

      setCurrentAnalysisStep('');
      setUploadingItems([]);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Multi-item upload handler
// Replace your handleMultiItemUpload function in App.js with this fixed version:

  const handleMultiItemUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file format
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
    setIsProcessingMultiItem(true);
    setShowMultiItemSection(true);

    try {
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(file);
      });

      console.log('Sending multi-item upload request...');

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
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('API result:', result);
      console.log('Detected items count:', result.detectedItems?.length);
      console.log('Items:', result.detectedItems);

      // FIX: Check for the correct property names from your API response
      if (result.success && result.detectedItems && result.detectedItems.length > 0) {
        const detectionResult = {
          originalImage: URL.createObjectURL(file),
          items: result.detectedItems.map(item => ({
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
        console.log('Detection result set:', detectionResult);
      } else {
        throw new Error(result.error || 'No items detected');
      }
    } catch (error) {
      console.error('Multi-item detection error:', error);
      alert(`Multi-item detection failed: ${error.message}`);
      setShowMultiItemSection(false);
    } finally {
      setIsProcessingMultiItem(false);
      e.target.value = '';
    }
  };

  // Handle adding detected items to wardrobe
  const handleAddDetectedItemsToWardrobe = async (items, sessionId) => {
    if (!items || items.length === 0) return;

    try {
      setIsUploading(true);
      
      const newWardrobeItems = [];
      
      for (const item of items) {
        const wardrobeItem = {
          id: `wardrobe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          imageUrl: multiItemDetectionResult.originalImage,
          name: item.analysis?.name || item.type || 'Detected Item',
          analysis: item.analysis,
          needsAnalysis: !item.analysis,
          databaseId: null,
          detectionSessionId: sessionId,
          boundingBox: item.boundingBox,
          detectionConfidence: item.confidence / 100
        };

        if (item.analysis) {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            await new Promise((resolve) => {
              img.onload = resolve;
              img.src = multiItemDetectionResult.originalImage;
            });
            
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
            
            const databaseId = await saveToDatabase(item.analysis, base64, 'wardrobe');
            if (databaseId) {
              wardrobeItem.databaseId = databaseId;
              wardrobeItem.needsAnalysis = false;
            }
          } catch (error) {
            console.error('Failed to save item to database:', error);
          }
        }

        newWardrobeItems.push(wardrobeItem);
      }

      setWardrobe(prev => [...newWardrobeItems, ...prev]);
      alert(`Successfully added ${newWardrobeItems.length} items to your wardrobe!`);
      
    } catch (error) {
      console.error('Error adding items to wardrobe:', error);
      alert('Failed to add items to wardrobe. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Analyze single item
  const analyzeSingleItem = async (item) => {
    if (!item.imageUrl || analyzingItems.has(item.id)) return;

    setAnalyzingItems(prev => new Set([...prev, item.id]));

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.crossOrigin = 'anonymous';
        img.src = item.imageUrl;
      });
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
      
      const response = await fetch('/api/analyze-wardrobe-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: base64 })
      });

      const analysis = await response.json();
      
      if (analysis && !analysis.error) {
        setWardrobe(prev => prev.map(w => 
          w.id === item.id 
            ? { 
                ...w, 
                analysis, 
                name: analysis.name || analysis.type || w.name,
                needsAnalysis: false 
              } : w
        ));
        
        await saveToDatabase(analysis, base64, 'wardrobe', item.databaseId);
      } else {
        throw new Error(analysis?.error || 'Analysis failed');
      }
    } catch (error) {
      console.error(`Failed to analyze item ${item.id}:`, error);
      alert('Analysis failed. Please try again.');
    } finally {
      setAnalyzingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  };

  // Toggle item selection
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

  // Clear selection
  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  // Delete selected items
  const deleteSelectedItems = async () => {
    if (selectedItems.size === 0) return;

    const confirmed = window.confirm(`Delete ${selectedItems.size} selected items?`);
    if (!confirmed) return;

    try {
      for (const itemId of selectedItems) {
        const item = wardrobe.find(w => w.id === itemId);
        if (item?.databaseId) {
          await fetch('/api/delete-item', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId: item.databaseId })
          });
        }
      }

      setWardrobe(prev => prev.filter(item => !selectedItems.has(item.id)));
      setSelectedItems(new Set());
      alert('Selected items deleted successfully');
    } catch (error) {
      console.error('Failed to delete items:', error);
      alert('Failed to delete some items. Please try again.');
    }
  };

  // Look upload handler
  const handleLookUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file format
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

  // Find wardrobe matches
  const findWardrobeMatches = (lookAnalysis, wardrobeItems) => {
    if (!lookAnalysis?.items || !Array.isArray(lookAnalysis.items)) return [];

    return lookAnalysis.items.map(lookItem => {
      const matches = wardrobeItems
        .filter(wardrobeItem => wardrobeItem.analysis && !wardrobeItem.analysis.error)
        .map(wardrobeItem => {
          const similarity = calculateSimilarity(lookItem, wardrobeItem.analysis);
          return { ...wardrobeItem, similarity };
        })
        .filter(match => match.similarity.score > 20)
        .sort((a, b) => b.similarity.score - a.similarity.score)
        .slice(0, 3);

      return {
        lookItem,
        matches
      };
    });
  };

  // Calculate similarity between items
  const calculateSimilarity = (lookItem, wardrobeItem) => {
    if (!wardrobeItem || wardrobeItem.error) {
      return { score: 0, reasoning: "Unable to analyze this item" };
    }

    let score = 0;
    const reasons = [];

    // Type match
    if (lookItem.type === wardrobeItem.type) {
      score += 30;
      reasons.push(`Same garment type (${wardrobeItem.type})`);
    }

    // Quality tier match
    if (lookItem.overallAssessment?.tier === wardrobeItem.overallAssessment?.tier) {
      score += 20;
      reasons.push(`Same quality tier (${wardrobeItem.overallAssessment?.tier})`);
    }

    // Construction style match
    if (lookItem.brandIdentifiers?.constructionHouse === wardrobeItem.brandIdentifiers?.constructionHouse) {
      score += 15;
      reasons.push(`Similar construction style (${wardrobeItem.brandIdentifiers?.constructionHouse})`);
    }

    // Color matching
    if (lookItem.colorPalette?.primary && wardrobeItem.colorPalette?.primary) {
      const colorSimilarity = calculateColorSimilarity(
        lookItem.colorPalette.primary,
        wardrobeItem.colorPalette.primary
      );
      score += colorSimilarity * 25;
      if (colorSimilarity > 0.6) {
        reasons.push(`Similar primary color`);
      }
    }

    // Style match
    if (lookItem.styleNotes?.includes(wardrobeItem.styleNotes)) {
      score += 10;
      reasons.push(`Compatible style notes`);
    }

    return {
      score: Math.min(100, Math.round(score)),
      reasoning: reasons.length > 0 ? reasons.join(', ') : "Basic compatibility"
    };
  };

  // Simple color similarity calculation
  const calculateColorSimilarity = (color1, color2) => {
    const c1 = color1.toLowerCase();
    const c2 = color2.toLowerCase();
    
    if (c1 === c2) return 1.0;
    
    const colorFamilies = {
      'red': ['red', 'crimson', 'scarlet', 'burgundy'],
      'blue': ['blue', 'navy', 'azure', 'cobalt'],
      'green': ['green', 'emerald', 'forest', 'sage'],
      'black': ['black', 'charcoal', 'ebony'],
      'white': ['white', 'ivory', 'cream'],
      'gray': ['gray', 'grey', 'silver'],
      'brown': ['brown', 'tan', 'beige', 'camel']
    };
    
    for (const [family, colors] of Object.entries(colorFamilies)) {
      if (colors.includes(c1) && colors.includes(c2)) {
        return 0.8;
      }
    }
    
    return 0.0;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">My Wardrobe</h1>
          <p className="text-gray-600">Upload, analyze, and manage your clothing collection</p>
        </div>

        {/* Image Format Error Display */}
        {imageFormatError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-red-500 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-red-800 font-medium">Invalid Image Format</h3>
                <p className="text-red-700 text-sm mt-1">
                  {imageFormatError.error}
                </p>
                {imageFormatError.fileName && (
                  <p className="text-red-600 text-xs mt-1">
                    File: {imageFormatError.fileName}
                  </p>
                )}
              </div>
              <button
                onClick={() => setImageFormatError(null)}
                className="ml-auto text-red-500 hover:text-red-700"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Multi-Item Detection Section */}
        {showMultiItemSection && (
          <div className="mb-6 p-6 bg-white rounded-lg shadow-sm border">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                Multi-Item Detection
                <span className="text-sm text-gray-500 ml-2">
                  Detect multiple clothing items from one photo
                </span>
              </h2>
              <div className="flex gap-3">
                <label className="btn-primary">
                  <input 
                    type="file" 
                    accept={ACCEPT_STRING}
                    onChange={handleMultiItemUpload}
                    className="hidden"
                  />
                  {isProcessingMultiItem ? (
                    <span className="flex items-center gap-2">
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Processing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Upload Outfit Photo
                    </span>
                  )}
                </label>
                {multiItemDetectionResult && (
                  <button
                    onClick={() => {
                      setShowMultiItemSection(false);
                      setMultiItemDetectionResult(null);
                    }}
                    className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-all"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>

            <MultiItemDetectionDisplay 
              detectionResult={multiItemDetectionResult}
              onAddToWardrobe={handleAddDetectedItemsToWardrobe}
              isProcessing={isProcessingMultiItem}
            />
          </div>
        )}

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
                accept={ACCEPT_STRING}
                onChange={handleLookUpload}
                className="hidden"
              />
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
            </label>
          </div>

          {lookImage && (
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
          )}
        </div>

        {/* Main Wardrobe Section */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-semibold">Your Wardrobe</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditMode(!isEditMode)}
                    className={`px-3 py-1 rounded text-sm transition-all ${
                      isEditMode 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {isEditMode ? 'Exit Edit' : 'Edit Mode'}
                  </button>
                  {!showMultiItemSection && (
                    <button
                      onClick={() => setShowMultiItemSection(true)}
                      className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-sm transition-all"
                    >
                      Multi-Item Detection
                    </button>
                  )}
                </div>
              </div>
              
              <label className="btn-primary">
                <input 
                  type="file" 
                  multiple 
                  accept={ACCEPT_STRING}
                  onChange={handleUpload}
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
          </div>

          {/* Action Bar for Selected Items - only in edit mode */}
          {isEditMode && selectedItems.size > 0 && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-blue-900">
                    {selectedItems.size} item{selectedItems.size > 1 ? 's' : ''} selected
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={clearSelection}
                    className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm transition-all"
                  >
                    Clear Selection
                  </button>
                  <button
                    onClick={deleteSelectedItems}
                    className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm transition-all"
                  >
                    Delete Selected
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Wardrobe Content */}
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
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <p className="text-gray-500 font-medium">Your wardrobe is empty</p>
              <p className="text-sm text-gray-400 mt-1">Upload some images to get started</p>
            </div>
          ) : (
            <div className="p-6">
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
                  {currentAnalysisStep && (
                    <p className="text-sm text-blue-700 mt-2">{currentAnalysisStep}</p>
                  )}
                </div>
              )}

              {/* Uploading items */}
              {uploadingItems.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-3">Uploading...</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {uploadingItems.map(item => (
                      <div key={item.id} className="relative">
                        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                          <img 
                            src={item.preview} 
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-1 truncate">{item.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Wardrobe grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {wardrobe.map(item => (
                  <div 
                    key={item.id}
                    className={`relative group cursor-pointer transition-all ${
                      selectedItems.has(item.id) ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => isEditMode ? toggleItemSelection(item.id) : setSelectedItem(item)}
                    onMouseEnter={() => setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    {/* Selection checkbox in edit mode */}
                    {isEditMode && (
                      <div className="absolute top-2 left-2 z-10">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item.id)}
                          onChange={() => toggleItemSelection(item.id)}
                          className="w-5 h-5 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    )}

                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      <img 
                        src={item.imageUrl} 
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        loading="lazy"
                      />
                      
                      {/* Analysis button overlay */}
                      {!isEditMode && item.needsAnalysis && hoveredItem === item.id && (
                        <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              analyzeSingleItem(item);
                            }}
                            disabled={analyzingItems.has(item.id)}
                            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-all disabled:opacity-50"
                          >
                            {analyzingItems.has(item.id) ? 'Analyzing...' : 'Analyze'}
                          </button>
                        </div>
                      )}

                      {/* Loading overlay for analyzing items */}
                      {analyzingItems.has(item.id) && (
                        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                        </div>
                      )}
                    </div>

                    <div className="mt-2">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                      {item.needsAnalysis ? (
                        <p className="text-xs text-yellow-600">Needs analysis</p>
                      ) : (
                        <p className="text-xs text-green-600">Analyzed</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Load more button */}
              {hasMoreItems && (
                <div className="text-center mt-6">
                  <button
                    onClick={() => loadWardrobeItems(currentOffset + ITEMS_PER_PAGE)}
                    disabled={isLoadingMore}
                    className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-all disabled:opacity-50"
                  >
                    {isLoadingMore ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

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
                            {selectedItem.analysis.brand && (
                              <p><span className="font-medium">Brand:</span> {selectedItem.analysis.brand}</p>
                            )}
                            {selectedItem.analysis.color && (
                              <p><span className="font-medium">Color:</span> {selectedItem.analysis.color}</p>
                            )}
                            {selectedItem.analysis.material && (
                              <p><span className="font-medium">Material:</span> {selectedItem.analysis.material}</p>
                            )}
                          </div>
                        </div>

                        {selectedItem.analysis.overallAssessment && (
                          <div>
                            <h3 className="font-semibold mb-2">Quality Assessment</h3>
                            <div className="space-y-2 text-sm">
                              <p><span className="font-medium">Tier:</span> {selectedItem.analysis.overallAssessment.tier}</p>
                              <p><span className="font-medium">Score:</span> {selectedItem.analysis.overallAssessment.score}/10</p>
                              {selectedItem.analysis.overallAssessment.reasoning && (
                                <p><span className="font-medium">Assessment:</span> {selectedItem.analysis.overallAssessment.reasoning}</p>
                              )}
                            </div>
                          </div>
                        )}

                        {selectedItem.analysis.styleNotes && (
                          <div>
                            <h3 className="font-semibold mb-2">Style Notes</h3>
                            <p className="text-sm">{selectedItem.analysis.styleNotes}</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
                        <p className="text-yellow-800">No analysis available for this item.</p>
                        <p className="text-sm text-yellow-600 mt-1">Select this item in Edit Mode and click "Analyze Selected" to get a detailed analysis.</p>
                      </div>
                    )}
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