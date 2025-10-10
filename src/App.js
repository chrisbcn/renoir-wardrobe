// Complete redesigned App.js with side navigation and streamlined UX
import React, { useState, useEffect } from 'react';
import './App.css';
import MultiItemDetectionDisplay from './MultiItemDetectionDisplay';
import ItemRecreationWorkflow from './ItemRecreationWorkflow';

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

  // Recreation workflow state
  const [showRecreationWorkflow, setShowRecreationWorkflow] = useState(false);
  const [recreationOriginalImage, setRecreationOriginalImage] = useState(null);
  const [recreationSelectedItem, setRecreationSelectedItem] = useState(null);
  const [recreatingItems, setRecreatingItems] = useState(new Set());
  const [recreatedItems, setRecreatedItems] = useState({});

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

  // Multi-item upload handler
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
    setIsProcessingMultiItem(true);
    setMultiItemDetectionResult(null);

    try {
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(file);
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
          originalImage: URL.createObjectURL(file),
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
        setRecreationOriginalImage(URL.createObjectURL(file));
      } else {
        throw new Error(result.error || 'No items detected');
      }
    } catch (error) {
      console.error('Multi-item detection error:', error);
      alert(`Multi-item detection failed: ${error.message}`);
    } finally {
      setIsProcessingMultiItem(false);
      e.target.value = '';
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
      index === i ? 
        { ...item, loadingMessage: 'AI analyzing construction & authenticity...' } : item
    ));
    setCurrentAnalysisStep(`Analyzing item ${i + 1} of ${filesToProcess.length}: ${file.name}`);

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

      setUploadingItems(prev => prev.map((item, index) => 
        index === i ? 
          { ...item, loadingMessage: 'AI analyzing construction & authenticity...' } : item
      ));

      // FIXED: Call the correct API endpoint with correct parameters
      const response = await fetch('/api/analyze-wardrobe-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis_type: 'wardrobe_image',  // FIXED: Required field
          user_id: 'default_user',          // FIXED: Required field
          brand_id: null,                   // Optional
          image_data: {                     // FIXED: Correct structure
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
      
      if (result.error) {
        throw new Error(result.error);
      }

      // FIXED: Extract analysis from the correct response structure
      const analysis = result.result?.items?.[0] || result.analysis;
      
      if (!analysis) {
        throw new Error('No analysis data received');
      }

      // Create wardrobe item with analysis
      const item = {
        id: Date.now() + Math.random(),
        imageUrl: `data:image/jpeg;base64,${base64}`,
        name: analysis.name || `${analysis.category || 'Item'} ${i + 1}`,
        source: 'uploaded',
        analysis: {
          // Map the response to expected structure
          type: analysis.category,
          name: analysis.name,
          brand: analysis.brand || 'Unknown',
          qualityScore: Math.round((analysis.confidence_score || 0) * 100),
          tier: analysis.brand_tier || 'Unknown',
          estimatedValue: analysis.price_range || 'Unknown',
          authenticityConfidence: analysis.confidence_score >= 0.8 ? 'high' : 'medium',
          condition: 'excellent',
          summary: `${analysis.category || 'Item'}`,
          fabricAnalysis: {
            colors: analysis.colors || [],
            materials: analysis.fabrics || []
          },
          constructionSignatures: analysis.details || {},
          brandIdentifiers: { brand: analysis.brand },
          qualityIndicators: { tier: analysis.brand_tier }
        }
      };

      newItems.push(item);

      // Remove processed placeholder
      setUploadingItems(prev => prev.filter((_, index) => index !== i));
      
    } catch (error) {
      console.error(`Failed to analyze ${file.name}:`, error);
      alert(`Failed to analyze ${file.name}: ${error.message}`);
      
      // Remove failed placeholder
      setUploadingItems(prev => prev.filter((_, index) => index !== i));
    }
  }
  
  // Add new items to wardrobe
  setWardrobe(prev => [...prev, ...newItems]);
  setIsUploading(false);
  setUploadingItems([]);
  setCurrentAnalysisStep('');
  e.target.value = null;
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex">
      {/* Side Navigation */}
      <div className="w-64 bg-white shadow-lg border-r">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-8">My Wardrobe</h1>
          
          <nav className="space-y-2">
            <button
              onClick={() => setActiveSection('multi-item')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                activeSection === 'multi-item'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              🔍 Multi-Item Detection
            </button>
            
            <button
              onClick={() => setActiveSection('look-matcher')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                activeSection === 'look-matcher'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              👗 Look Matcher
            </button>
            
            <button
              onClick={() => setActiveSection('wardrobe')}
              className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                activeSection === 'wardrobe'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              👚 My Wardrobe
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        {/* Multi-Item Detection Section */}
        {activeSection === 'multi-item' && (
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-800">Multi-Item Detection</h2>
                <p className="text-gray-600 mt-1">Upload an outfit photo to detect and recreate individual items</p>
              </div>
              
              <label className="btn-primary">
                <input 
                  type="file" 
                  accept={ACCEPT_STRING}
                  onChange={handleMultiItemUpload}
                  className="hidden"
                />
                <span className="flex items-center gap-2">
                  {isProcessingMultiItem ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Upload Outfit Photo
                    </>
                  )}
                </span>
              </label>
            </div>

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

            {/* Detection Results */}
            {multiItemDetectionResult && (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-6 border-b">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-semibold">
                      Detection Results ({multiItemDetectionResult.detectedItems.length} items found)
                    </h3>
                    
                    <button
                      onClick={handleRecreateAllItems}
                      className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all"
                    >
                      🎨 Recreate All Items
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid lg:grid-cols-2 gap-8">
                    {/* Original Image */}
                    <div>
                      <h4 className="font-medium mb-3">Original Photo</h4>
                      <div className="relative border rounded-lg overflow-hidden">
                        <img
                          src={multiItemDetectionResult.originalImage}
                          alt="Original outfit"
                          className="w-full h-auto"
                        />
                        
                        {/* Bounding boxes */}
                        {multiItemDetectionResult.detectedItems.map((item, index) => (
                          <div
                            key={item.id}
                            className="absolute border-2 border-red-400 bg-red-400 bg-opacity-20"
                            style={{
                              left: `${item.boundingBox.left}%`,
                              top: `${item.boundingBox.top}%`,
                              width: `${item.boundingBox.width}%`,
                              height: `${item.boundingBox.height}%`,
                            }}
                          >
                            <div className="absolute -top-2 -left-2 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                              {index + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Items List */}
                    <div>
                      <h4 className="font-medium mb-3">Detected Items</h4>
                      <div className="space-y-4">
                        {multiItemDetectionResult.detectedItems.map((item, index) => (
                          <div key={item.id} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <span className="w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                  {index + 1}
                                </span>
                                <div>
                                  <h5 className="font-medium">{item.type}</h5>
                                  <p className="text-sm text-gray-500">{item.color} • {item.confidence}% confidence</p>
                                </div>
                              </div>
                            </div>
                            
                            {item.description && (
                              <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                            )}

                            {/* Recreation Results */}
                            {recreatedItems[item.id] && (
                              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                                <div className="flex items-center gap-3">
                                  <img 
                                    src={recreatedItems[item.id].recreatedImageUrl}
                                    alt="Recreated"
                                    className="w-16 h-16 object-cover rounded border"
                                  />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-green-800">✅ Recreation Complete</p>
                                    <p className="text-xs text-green-600">
                                      Generated: {new Date(recreatedItems[item.id].timestamp).toLocaleTimeString()}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => handleRecreateItem(item)}
                                disabled={recreatingItems.has(item.id) || recreatedItems[item.id]}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-all"
                              >
                                {recreatingItems.has(item.id) ? (
                                  <>
                                    <span className="inline-block w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                                    Recreating...
                                  </>
                                ) : recreatedItems[item.id] ? (
                                  '✅ Recreated'
                                ) : (
                                  '🎨 Recreate'
                                )}
                              </button>
                              
                              <button
                                onClick={() => handleAddToWardrobe(item, false)}
                                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-all"
                              >
                                Add Original
                              </button>
                              
                              {recreatedItems[item.id] && (
                                <button
                                  onClick={() => handleAddToWardrobe(item, true)}
                                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-all"
                                >
                                  Add Recreated
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* No Results State */}
            {!multiItemDetectionResult && !isProcessingMultiItem && (
              <div className="text-center py-12 bg-white rounded-lg border">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-500 font-medium">Upload an outfit photo to get started</p>
                <p className="text-sm text-gray-400 mt-1">We'll detect individual clothing items and recreate them as product photos</p>
              </div>
            )}
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
      </div>

      {/* Item Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black flex items-center justify-center p-4 z-50">
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
  );
}

export default App;