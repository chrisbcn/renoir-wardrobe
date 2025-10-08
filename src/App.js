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
        return result.itemId || itemId;
      } else {
        console.warn('Failed to save to database:', result.error);
        return null;
      }
    } catch (error) {
      console.warn('Database save failed:', error);
      return null;
    }
  };

  // Handle wardrobe image uploads
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
      
      // If ALL files are invalid, stop here
      if (validFiles.length === 0) {
        e.target.value = '';
        return;
      }
      
      // Otherwise continue with valid files only
      alert(`Skipping ${invalidFiles.length} unsupported file(s). Processing ${validFiles.length} valid files.`);
    }

    setIsUploading(true);
    setUploadProgress(0);
    
    // Continue with valid files only
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
        index === i ? { ...item, loadingMessage: 'Analyzing with AI...' } : item
      ));

      try {
        const base64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64String = reader.result.split(',')[1];
            resolve(base64String);
          };
          reader.readAsDataURL(file);
        });

        const analysisResponse = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageData: base64 })
        });

        const analysis = await analysisResponse.json();

        if (analysis && !analysis.error) {
          const databaseId = await saveToDatabase(analysis, base64, 'wardrobe');
          
          const newItem = {
            id: `wardrobe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            imageUrl: URL.createObjectURL(file),
            name: analysis.name || analysis.type || file.name,
            analysis,
            needsAnalysis: false,
            databaseId
          };

          newItems.push(newItem);
        } else {
          const newItem = {
            id: `wardrobe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            imageUrl: URL.createObjectURL(file),
            name: file.name,
            needsAnalysis: true,
            databaseId: null
          };
          newItems.push(newItem);
        }
      } catch (error) {
        console.error('Upload failed for file:', file.name, error);
        const newItem = {
          id: `wardrobe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          imageUrl: URL.createObjectURL(file),
          name: file.name,
          needsAnalysis: true,
          databaseId: null
        };
        newItems.push(newItem);
      }
    }

    setWardrobe(prev => [...newItems, ...prev]);
    setUploadingItems([]);
    setIsUploading(false);
    setUploadProgress(0);
    e.target.value = '';
  };

  // Handle multi-item detection upload
  const handleMultiItemUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
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

    setIsProcessingMultiItem(true);
    setShowMultiItemSection(true);
    setMultiItemDetectionResult(null);

    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const base64String = reader.result.split(',')[1];
            resolve(base64String);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      console.log('Sending multi-item upload request...');

      // Pass the MIME type to the backend
      const response = await fetch('/api/multi-item-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData: base64,
          mimeType: validation.mimeType,
          userId: "00000000-0000-0000-0000-000000000001" 
        })
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('API result:', result);

      if (result.success && result.detectedItems && result.detectedItems.length > 0) {
        const detectionResult = {
          originalImage: URL.createObjectURL(file),
          detectedItems: result.detectedItems.map((item, index) => ({
            id: `item_${index}`,
            type: item.type || 'Unknown Item',
            description: item.description || 'No description',
            color: item.color || 'Unknown',
            brand: item.brand || 'Unknown',
            material: item.material || 'Unknown',
            confidence: item.confidence ? Math.round(item.confidence * 100) : 50,
            boundingBox: {
              left: item.boundingBox?.left || 0,
              top: item.boundingBox?.top || 0,
              width: item.boundingBox?.width || 50,
              height: item.boundingBox?.height || 50
            },
            analysis: item.analysis
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

    const matches = [];

    lookAnalysis.items.forEach(lookItem => {
      wardrobeItems.forEach(wardrobeItem => {
        if (!wardrobeItem.analysis) return;

        const score = calculateMatchScore(lookItem, wardrobeItem);
        if (score.total > 40) {
          matches.push({
            lookItem,
            wardrobeItem,
            score: score.total,
            details: score.details
          });
        }
      });
    });

    return matches.sort((a, b) => b.score - a.score);
  };

  // Calculate match score
  const calculateMatchScore = (lookItem, wardrobeItem) => {
    const scores = {
      categoryMatch: 0,
      colorMatch: 0,
      materialMatch: 0,
      styleMatch: 0
    };

    if (isSameCategory(lookItem.category, wardrobeItem.analysis.type)) {
      scores.categoryMatch = 40;
    }

    if (lookItem.color && wardrobeItem.analysis.colorAnalysis?.dominantColors) {
      const matchingColor = wardrobeItem.analysis.colorAnalysis.dominantColors.find(color =>
        lookItem.color.toLowerCase().includes(color.name.toLowerCase())
      );
      if (matchingColor) {
        scores.colorMatch = 30;
      }
    }

    if (lookItem.material && wardrobeItem.analysis.fabricAnalysis?.weaveStructure) {
      if (lookItem.material.toLowerCase().includes(wardrobeItem.analysis.fabricAnalysis.weaveStructure.toLowerCase())) {
        scores.materialMatch = 15;
      }
    }

    scores.styleMatch = 10;

    return {
      total: Object.values(scores).reduce((a, b) => a + b, 0),
      details: scores
    };
  };

  // Helper function to check same category
  const isSameCategory = (lookCategory, wardrobeType) => {
    const categoryMap = {
      'top': ['shirt', 'blouse', 'sweater', 'turtleneck', 't-shirt'],
      'bottom': ['trouser', 'pant', 'skirt', 'jean'],
      'outerwear': ['coat', 'jacket', 'blazer'],
      'shoes': ['shoe', 'boot', 'sneaker', 'heel'],
      'bag': ['bag', 'purse', 'clutch'],
      'accessories': ['scarf', 'belt', 'jewelry', 'watch']
    };

    return categoryMap[lookCategory]?.some(type => 
      wardrobeType?.toLowerCase().includes(type)
    );
  };

  // Analyze single item
  const analyzeSingleItem = async (item) => {
    if (analyzingItems.has(item.id)) return;

    setAnalyzingItems(prev => new Set([...prev, item.id]));

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = item.imageUrl;
      });
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: base64 })
      });

      const analysis = await response.json();

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

  // Load more button handler
  const handleLoadMore = () => {
    if (!isLoadingMore && hasMoreItems) {
      setIsLoadingMore(true);
      loadWardrobeItems(currentOffset + ITEMS_PER_PAGE);
    }
  };

  // ESC key handler for modal
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
    <div className="min-h-screen">
      {/* Error Dialog */}
      {imageFormatError && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '400px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <svg 
                style={{ width: '24px', height: '24px', marginRight: '12px', color: '#EF4444' }}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
              <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
                Unsupported Image Format
              </h3>
            </div>
            
            {imageFormatError.fileName && (
              <p style={{ 
                fontSize: '14px', 
                color: '#6B7280', 
                marginBottom: '12px',
                wordBreak: 'break-word'
              }}>
                <strong>File:</strong> {imageFormatError.fileName}
              </p>
            )}
            
            <p style={{ fontSize: '14px', color: '#374151', marginBottom: '16px' }}>
              {imageFormatError.error}
            </p>
            
            <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '20px' }}>
              <strong>Supported formats:</strong> JPG, JPEG, PNG
            </p>
            
            <button
              onClick={() => setImageFormatError(null)}
              style={{
                width: '100%',
                padding: '10px 16px',
                backgroundColor: '#000',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      <div className="container">
        {/* Header */}
        <div className="header-section">
          <h1 className="main-title">Maura</h1>
        </div>

        {/* Wardrobe Section */}
        <div className="bg-white p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-3xl">
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
            <div className="flex gap-2 controls">
              {/* Edit Mode Toggle */}
              <button
                onClick={() => {
                  setIsEditMode(!isEditMode);
                  if (isEditMode) {
                    clearSelection();
                  }
                }}
                className={`px-4 py-2 font-medium transition-all ${
                  isEditMode 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : ''
                }`}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  {isEditMode ? 'Exit Edit' : 'Edit Mode'}
                </span>
              </button>
              
              {/* Multi-Item Upload Button */}
              <label className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium cursor-pointer transition-all">
                <input 
                  type="file" 
                  accept={ACCEPT_STRING}
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleMultiItemUpload(e);
                      if (!showMultiItemSection) {
                        setShowMultiItemSection(true);
                      }
                    }
                  }}
                  className="hidden"
                />
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Multi-Item Upload
                </span>
              </label>
              
              {/* Add images button */}
              <label className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg font-medium cursor-pointer transition-all">
                <input 
                  type="file" 
                  multiple 
                  accept={ACCEPT_STRING}
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
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="text-gray-500 font-medium">Your wardrobe is empty</p>
              <p className="text-sm text-gray-400 mt-1">Upload clothing photos for AI-powered luxury analysis</p>
            </div>
          ) : (
            <>
              {/* Wardrobe grid */}
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
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
                
                {/* Show existing wardrobe items */}
                {wardrobe.map(item => (
                  <div 
                    key={item.id}
                    className={`cursor-pointer relative transition-all ${
                      isEditMode && selectedItems.has(item.id) 
                        ? 'ring-2 ring-blue-500 ring-offset-2' 
                        : ''
                    }`}
                    onClick={() => {
                      if (analyzingItems.has(item.id)) return;
                      
                      if (isEditMode) {
                        toggleItemSelection(item.id);
                      } else {
                        setSelectedItem(item);
                      }
                    }}
                    onMouseEnter={() => setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                    title={isEditMode ? "Click to select/deselect" : "Click image for details, hover for options"}
                  >
                    <div className="item-image-container relative">
                      <img 
                        src={item.imageUrl} 
                        alt={item.name}
                        className="item-image"
                        style={{ cursor: 'pointer' }}
                      />
                      
                      {/* Hover overlay with buttons */}
                      {hoveredItem === item.id && !isEditMode && (
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
                                analyzeSingleItem(item);
                              }
                            }}
                            disabled={analyzingItems.has(item.id)}
                          >
                            {analyzingItems.has(item.id) ? (
                              <>
                                <span className="inline-block w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></span>
                                Analyzing
                              </>
                            ) : item.needsAnalysis ? (
                              'Analyze'
                            ) : (
                              'Re-analyze'
                            )}
                          </button>
                        </div>
                      )}
                      
                      {/* Analysis status overlay */}
                      {analyzingItems.has(item.id) && (
                        <div className="analyzing-overlay">
                          <div className="loading-spinner" />
                          <p className="text-xs text-white mt-1">Analyzing...</p>
                        </div>
                      )}
                      
                      {/* Tier badge */}
                      {item.analysis?.overallAssessment?.tier && (
                        <div 
                          className={`absolute top-2 right-2 px-2 py-1 text-xs font-semibold rounded ${
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
                      
                      <p className="text-m mt-3 text-center">{item.name}</p>
                    </div>
                  </div>
                ))}
              </div>
              
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

        {/* Multi-Item Detection Section */}
        {showMultiItemSection && (
          <div className="bg-white p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                Multi-Item Detection
                <span className="text-sm text-gray-500 ml-2">
                  Detect multiple clothing items from a single photo
                </span>
              </h2>
              <div className="flex gap-2">
                <label className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium cursor-pointer transition-all">
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
                <span className="flex items-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Processing...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Upload Look
                </span>
              )}
            </label>
          </div>

          {lookImage && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Uploaded Look</h4>
                <img src={lookImage} alt="Uploaded look" className="w-full h-64 object-cover rounded-lg" />
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Wardrobe Matches</h4>
                {isProcessingLook ? (
                  <div className="flex justify-center py-8">
                    <div className="loading-spinner" />
                  </div>
                ) : lookMatches.length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {lookMatches.slice(0, 5).map((match, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                        <img 
                          src={match.wardrobeItem.imageUrl} 
                          alt={match.wardrobeItem.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{match.wardrobeItem.name}</p>
                          <p className="text-xs text-gray-500">Match: {match.score}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : lookAnalysis ? (
                  <p className="text-gray-500">No matches found in your wardrobe</p>
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

        {/* Enhanced Item Details Modal */}
        {selectedItem && (
          <div 
            className="fixed inset-0 bg-black z-50 overflow-y-auto"
            onClick={() => setSelectedItem(null)}
          >
            <div 
              className="min-h-screen"
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
                      ) : selectedItem.analysis ? (
                        <div className="bg-gray-50 p-3 rounded">
                          <h3 className="font-semibold mb-2">Analysis Complete</h3>
                          <p className="text-sm text-gray-600">
                            This item has been analyzed with AI. View the detailed results above.
                          </p>
                        </div>
                      ) : (
                        <div className="bg-yellow-50 p-3 rounded">
                          <h3 className="font-semibold mb-2">Analysis Needed</h3>
                          <p className="text-sm text-gray-600 mb-3">
                            This item hasn't been analyzed yet. Click the button below to start analysis.
                          </p>
                          <button
                            onClick={() => {
                              setSelectedItem(null);
                              analyzeSingleItem(selectedItem);
                            }}
                            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-all"
                          >
                            Analyze Item
                          </button>
                        </div>
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