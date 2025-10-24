// Complete redesigned App.js with side navigation and streamlined UX
import React, { useState, useEffect } from 'react';
import './App.css';
import './MobileApp.css';
import MultiItemDetectionDisplay from './MultiItemDetectionDisplay';
import ItemRecreationWorkflow from './ItemRecreationWorkflow';
import BottomNav from './components/shared/BottomNav';
import DetectedItemCard from './components/shared/DetectedItemCard';
import ItemDetailModal from './components/shared/ItemDetailModal';
import { ReactComponent as InvoiceIcon } from './assets/icons/invoice 1.svg';
import { ReactComponent as HangerIcon } from './assets/icons/hanger 2.svg';
import { ReactComponent as PinterestIcon } from './assets/icons/Social Icons-1.svg';
import { ReactComponent as InstagramIcon } from './assets/icons/Social Icons.svg';
import { ReactComponent as ChevronLeftIcon } from './assets/icons/chevron-left-sm 1.svg';
import { ReactComponent as CloseIcon } from './assets/icons/xclose 1.svg';
import wardrobeBackground from './assets/img/walk-in-wardrobe.png';

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

// Loader quotes and facts - easy to add more!
const LOADER_MESSAGES = [
  {
    type: 'quote',
    text: '"Elegance is not standing out, but being remembered." — Giorgio Armani'
  },
  {
    type: 'fact',
    text: 'A single Hermès Birkin bag requires 18 hours of hand-stitching by one artisan.'
  },
  {
    type: 'quote',
    text: '"Fashion is the armor to survive the reality of everyday life." — Bill Cunningham'
  },
  {
    type: 'fact',
    text: 'In 15th century fashion, designers showcased collections on miniature dolls instead of live models.'
  },
  {
    type: 'quote',
    text: '"Clothes mean nothing until someone lives in them." — Marc Jacobs'
  },
  {
    type: 'fact',
    text: 'Quality and craftsmanship define luxury for over 65% of high-end fashion consumers.'
  }
];

function App() {
  // Navigation state
  const [activeSection, setActiveSection] = useState('multi-item');
  
  // Loader message rotation
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

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
  const [uploadFlowStep, setUploadFlowStep] = useState(0); // 0: home, 1: preview, 2: results

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

  // Rotate loader messages while processing
  useEffect(() => {
    if (!isProcessingMultiItem) return;
    
    const interval = setInterval(() => {
      setCurrentMessageIndex(prev => (prev + 1) % LOADER_MESSAGES.length);
    }, 6000); // Change message every 6 seconds
    
    return () => clearInterval(interval);
  }, [isProcessingMultiItem]);

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
    setUploadFlowStep(1); // Move to preview step
    e.target.value = '';
  };

  // Image compression function - compresses before upload
  const compressImage = async (file, maxWidth = 1920, maxHeight = 1920, quality = 0.85) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions while maintaining aspect ratio
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to base64 with quality compression
          const compressedBase64 = canvas.toDataURL(file.type || 'image/jpeg', quality);
          resolve(compressedBase64.split(',')[1]);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  // Analyze outfit handler - Step 2: Analyze the uploaded image
  const handleAnalyzeOutfit = async () => {
    if (!uploadedImageFile) return;

    setIsProcessingMultiItem(true);

    try {
      const validation = validateImageFile(uploadedImageFile);
      
      // Compress image before upload to avoid payload size errors
      console.log('📦 Compressing image before upload...');
      const base64 = await compressImage(uploadedImageFile);

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
        setUploadFlowStep(2); // Move to results step
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
      
      // Convert blob URL to File object and compress before sending
      if (imageData.startsWith('blob:')) {
        const response = await fetch(imageData);
        const blob = await response.blob();
        const file = new File([blob], 'image.jpg', { type: blob.type || 'image/jpeg' });
        
        console.log('📦 Compressing image for recreation...');
        imageData = await compressImage(file);
      } else if (imageData.startsWith('data:')) {
        imageData = imageData.split(',')[1];
      } else {
        // Already base64
        imageData = imageData;
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

  // Delete item from detection results
  const handleDeleteItem = (item) => {
    setMultiItemDetectionResult(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        detectedItems: prev.detectedItems.filter(i => i.id !== item.id)
      };
    });
    
    // Also remove from recreated items if it was recreated
    setRecreatedItems(prev => {
      const newItems = { ...prev };
      delete newItems[item.id];
      return newItems;
    });
    
    // Remove from recreating set if it was in progress
    setRecreatingItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(item.id);
      return newSet;
    });
  };

  // Retry recreation for an item
  const handleRetryItem = async (item) => {
    // Remove the existing recreation
    setRecreatedItems(prev => {
      const newItems = { ...prev };
      delete newItems[item.id];
      return newItems;
    });
    
    // Recreate the item again
    await handleRecreateItem(item);
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
      // Compress image before upload
      const base64 = await compressImage(file);

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
      {/* Fixed Headers - Outside scrollable content */}
      {activeSection === 'multi-item' && (
        <div className="screen-header">
              <button 
                className="header-button"
                onClick={() => {
                  if (uploadFlowStep > 0) {
                    setUploadFlowStep(uploadFlowStep - 1);
                    if (uploadFlowStep === 1) {
                      // Going back to home
                      setUploadedImagePreview(null);
                      setUploadedImageFile(null);
                    }
                  }
                }}
                style={{ opacity: uploadFlowStep === 0 ? 0 : 1 }}
              >
                {uploadFlowStep > 0 ? 
                  <ChevronLeftIcon style={{ width: '24px', height: '24px' }} /> : 
                  <CloseIcon style={{ width: '24px', height: '24px' }} />
                }
              </button>
              <h1 className="screen-title">
                {uploadFlowStep === 2 ? 'EXTRACTED GARMENTS' : 'WARDROBE UPLOAD'}
              </h1>
              <button 
                className="header-button header-next-button"
                onClick={() => {
                  if (uploadFlowStep < 2 && multiItemDetectionResult) {
                    setUploadFlowStep(uploadFlowStep + 1);
                  }
                }}
                style={{ 
                  opacity: (uploadFlowStep < 2 && multiItemDetectionResult) ? 1 : 0,
                  pointerEvents: (uploadFlowStep < 2 && multiItemDetectionResult) ? 'auto' : 'none'
                }}
              >
                Next
              </button>
        </div>
      )}

      {activeSection === 'wardrobe' && (
        <div className="screen-header">
          <div className="header-button" style={{ opacity: 0 }}></div>
          <h1 className="screen-title">MY WARDROBE</h1>
          <label className="header-button" style={{ cursor: isUploading ? 'not-allowed' : 'pointer' }}>
            <input 
              type="file" 
              multiple 
              accept={ACCEPT_STRING}
              onChange={handleWardrobeUpload}
              className="hidden"
              disabled={isUploading}
            />
            {isUploading ? (
              <div className="spinner" style={{ width: '20px', height: '20px' }}></div>
            ) : (
              <svg style={{ width: '24px', height: '24px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            )}
          </label>
        </div>
      )}

      {/* Scrollable Content */}
      <div className="mobile-content">
        {/* Multi-Item Detection Section */}
        {activeSection === 'multi-item' && (
          <>
            {/* Content Container - applies 24px horizontal padding once */}
            <div className="content-container">
              {/* Steps 0 and 1: Upload and Preview */}
              {(uploadFlowStep === 0 || uploadFlowStep === 1) && (
                <div className="mobile-section">
                {uploadFlowStep === 0 && (
                  <>
                    <h2 className="heading-2 half-header" style={{ marginBottom: '32px', width: '50%' }}>
                      Let's get your wardrobe filled:
                    </h2>
                    
                    {/* Upload Options Grid */}
                    <div className="upload-options-grid">
                      {/* Upload from Receipts */}
                      <button className="upload-option-card" onClick={() => {
                        // Receipt upload handler - to be implemented
                        alert('Receipt upload coming soon!');
                      }}>
                        <div className="upload-option-icon">
                          <InvoiceIcon />
                        </div>
                        <div className="upload-option-label">Upload from<br/>receipts</div>
                      </button>

                      {/* Upload from Camera Roll */}
                      <label className="upload-option-card">
                        <input 
                          type="file" 
                          accept={ACCEPT_STRING}
                          onChange={handleMultiItemUpload}
                          className="hidden"
                        />
                        <div className="upload-option-icon">
                          <HangerIcon />
                        </div>
                        <div className="upload-option-label">Upload from<br/>camera roll</div>
                      </label>

                      {/* Upload from Pinterest */}
                      <button className="upload-option-card" onClick={() => {
                        // Pinterest integration handler - to be implemented
                        alert('Pinterest integration coming soon!');
                      }}>
                        <div className="upload-option-icon">
                          <PinterestIcon />
                        </div>
                        <div className="upload-option-label">Upload from<br/>pinterest</div>
                      </button>

                      {/* Upload from Instagram */}
                      <button className="upload-option-card" onClick={() => {
                        // Instagram integration handler - to be implemented
                        alert('Instagram integration coming soon!');
                      }}>
                        <div className="upload-option-icon">
                          <InstagramIcon />
                        </div>
                        <div className="upload-option-label">Upload from<br/>instagram</div>
                      </button>
                    </div>
                  </>
                )}

                {/* Image Preview + Analyze Button */}
                {uploadFlowStep === 1 && (
                  <div>
                    <div className="mb-2xl image-border" style={{ position: 'relative' }}>
                      <img 
                        src={uploadedImagePreview}
                        alt="Uploaded outfit"
                        className="full-width-image"
                      />
                      
                      {/* MAURA Loader Overlay */}
                      {isProcessingMultiItem && (
                        <div className="maura-loader-overlay">
                          <div className="loader-container">
                            {/* Rotating ring */}
                            <div className="loading-ring"></div>
                            
                            {/* Centered MAURA logo */}
                            <div className="logo-container">
                              <svg className="maura-logo" fill="none" preserveAspectRatio="none" viewBox="0 0 59 11">
                                <g clipPath="url(#clip0_1_34)">
                                  <path d="M48.5234 9.67549L53.1294 0H54.9992L59.6049 9.67549H57.2185L56.3063 7.63073H51.7157L50.8189 9.67549H48.5234ZM53.9655 2.5337L52.4605 5.95642H55.5615L54.0568 2.5337H53.9655Z" fill="white" />
                                  <path d="M39.9161 9.67549H37.7422V0H43.245C44.6587 0 45.5861 0.400059 46.2245 1.05201C46.7411 1.58542 47.0451 2.28181 47.0451 3.0523C47.0451 4.29694 46.2547 5.26002 45.0387 5.77861L47.3643 9.67549H44.8715L42.865 6.11942H39.9161V9.67549ZM43.3209 1.79285H39.9161V4.32655H43.4729C44.2331 4.32655 44.8564 3.79314 44.8564 3.0523C44.8564 2.72632 44.7346 2.42999 44.5067 2.20773C44.1569 1.8373 43.7162 1.79285 43.3209 1.79285Z" fill="white" />
                                  <path d="M32.2925 0H34.4816V6.19349C34.4816 8.60866 32.5664 9.97183 29.9366 9.97183C27.3828 9.97183 25.4219 8.60866 25.4219 6.19349V0H27.6108V6.19349C27.6108 7.46777 28.6596 8.14935 29.9366 8.14935C31.2893 8.14935 32.2925 7.46777 32.2925 6.19349V0Z" fill="white" />
                                  <path d="M12.6797 9.67549L17.2855 0H19.1552L23.7611 9.67549H21.3745L20.4625 7.63073H15.8719L14.975 9.67549H12.6797ZM18.1216 2.5337L16.6167 5.95642H19.7177L18.2128 2.5337H18.1216Z" fill="white" />
                                  <path d="M10.6254 9.6754H8.43653V4.05976H8.36053L5.57878 8.57894H4.97074L2.18901 4.05976H2.113V9.6754H9.62187e-05V-8.54477e-05H2.0826L5.33557 5.30439H5.36598L8.60374 -8.54477e-05H10.6254V9.6754Z" fill="white" />
                                </g>
                                <defs>
                                  <clipPath id="clip0_1_34">
                                    <rect fill="white" height="10.1273" width="58.9581" />
                                  </clipPath>
                                </defs>
                              </svg>
                            </div>
                          </div>
                          
                          {/* Rotating quotes/facts - outside loader-container for more width */}
                          <div className={`loader-text ${LOADER_MESSAGES[currentMessageIndex].type}`}>
                            {LOADER_MESSAGES[currentMessageIndex].text}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={handleAnalyzeOutfit}
                      disabled={isProcessingMultiItem}
                      className="btn btn-primary btn-full mb-lg"
                    >
                      {isProcessingMultiItem ? 'Analyzing...' : 'Analyze Outfit'}
                    </button>

                    {/* <button
                      onClick={() => {
                        setUploadedImagePreview(null);
                        setUploadedImageFile(null);
                      }}
                      className="btn btn-full"
                    >
                      Choose Different Photo
                    </button> */}
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
                </div>
              )}

              {/* Detection Results - 2-Column Grid */}
              {uploadFlowStep === 2 && multiItemDetectionResult && (
                <div className="mobile-section-compact">
                  {/* Title */}
                  <h2 className="heading-2 half-header">
                    Let's get your wardrobe filled:
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
                        onDelete={handleDeleteItem}
                        onRetry={handleRetryItem}
                      />
                    ))}
                  </div>

                  {/* Bottom Actions */}
                  <button
                    onClick={handleRecreateAllItems}
                    className="btn btn-full btn-medium mb-md"
                    disabled={multiItemDetectionResult.detectedItems.every(item => recreatedItems[item.id])}
                  >
                    Recreate all items
                  </button>
                </div>
              )}
            </div>
          </>
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
          <>
            {/* Content Container - 24px padding */}
            <div className="content-container">
              <div className="mobile-section">
                {/* Show MAURA loader while initially loading */}
                {isInitialLoading ? (
                  <div 
                    className="maura-loader-fullscreen"
                    style={{ backgroundImage: `url(${wardrobeBackground})` }}
                  >
                    <div className="loader-container">
                      {/* Rotating ring */}
                      <div className="loading-ring"></div>
                      
                      {/* Centered MAURA logo */}
                      <div className="logo-container">
                        <svg className="maura-logo" fill="none" preserveAspectRatio="none" viewBox="0 0 59 11">
                          <g clipPath="url(#clip0_1_34)">
                            <path d="M48.5234 9.67549L53.1294 0H54.9992L59.6049 9.67549H57.2185L56.3063 7.63073H51.7157L50.8189 9.67549H48.5234ZM53.9655 2.5337L52.4605 5.95642H55.5615L54.0568 2.5337H53.9655Z" fill="white" />
                            <path d="M39.9161 9.67549H37.7422V0H43.245C44.6587 0 45.5861 0.400059 46.2245 1.05201C46.7411 1.58542 47.0451 2.28181 47.0451 3.0523C47.0451 4.29694 46.2547 5.26002 45.0387 5.77861L47.3643 9.67549H44.8715L42.865 6.11942H39.9161V9.67549ZM43.3209 1.79285H39.9161V4.32655H43.4729C44.2331 4.32655 44.8564 3.79314 44.8564 3.0523C44.8564 2.72632 44.7346 2.42999 44.5067 2.20773C44.1569 1.8373 43.7162 1.79285 43.3209 1.79285Z" fill="white" />
                            <path d="M32.2925 0H34.4816V6.19349C34.4816 8.60866 32.5664 9.97183 29.9366 9.97183C27.3828 9.97183 25.4219 8.60866 25.4219 6.19349V0H27.6108V6.19349C27.6108 7.46777 28.6596 8.14935 29.9366 8.14935C31.2893 8.14935 32.2925 7.46777 32.2925 6.19349V0Z" fill="white" />
                            <path d="M12.6797 9.67549L17.2855 0H19.1552L23.7611 9.67549H21.3745L20.4625 7.63073H15.8719L14.975 9.67549H12.6797ZM18.1216 2.5337L16.6167 5.95642H19.7177L18.2128 2.5337H18.1216Z" fill="white" />
                            <path d="M10.6254 9.6754H8.43653V4.05976H8.36053L5.57878 8.57894H4.97074L2.18901 4.05976H2.113V9.6754H9.62187e-05V-8.54477e-05H2.0826L5.33557 5.30439H5.36598L8.60374 -8.54477e-05H10.6254V9.6754Z" fill="white" />
                          </g>
                          <defs>
                            <clipPath id="clip0_1_34">
                              <rect fill="white" height="10.1273" width="58.9581" />
                            </clipPath>
                          </defs>
                        </svg>
                      </div>
                    </div>
                    
                    {/* Loading message */}
                    <div className="loader-message">
                      Loading your wardrobe
                    </div>
                  </div>
                ) : wardrobe.length > 0 ? (
                  /* Wardrobe Grid - 4 columns, accent background, no rounded corners */
                  <div className="wardrobe-grid">
                    {wardrobe.map(item => (
                      <div 
                        key={item.id}
                        className="wardrobe-item"
                        onClick={() => setSelectedItem(item)}
                      >
                        <div className="wardrobe-item-image">
                          <img 
                            src={item.imageUrl} 
                            alt={item.name}
                            loading="lazy"
                          />
                        </div>
                        <div className="wardrobe-item-details">
                          <p className="wardrobe-item-name">{item.name}</p>
                          {item.isRecreated && (
                            <p className="wardrobe-item-badge">Recreated</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="wardrobe-empty">
                    <svg className="wardrobe-empty-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <p className="body-text" style={{ fontWeight: 500 }}>Your wardrobe is empty</p>
                    <p className="body-small text-secondary">Tap + to add images</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

      {/* Wardrobe Item Detail Modal - Using same component as recreation flow */}
      {selectedItem && (
        <ItemDetailModal
          item={{
            id: selectedItem.id,
            type: selectedItem.analysis?.type || selectedItem.name,
            color: selectedItem.analysis?.color || '',
            material: selectedItem.analysis?.material || '',
            description: selectedItem.name,
            imageData: selectedItem.imageUrl
          }}
          recreatedData={{
            [selectedItem.id]: {
              recreatedImageUrl: selectedItem.imageUrl,
              metadata: selectedItem.analysis || {}
            }
          }}
          allRecreatedItems={[{
            id: selectedItem.id,
            type: selectedItem.analysis?.type || selectedItem.name,
            color: selectedItem.analysis?.color || '',
            material: selectedItem.analysis?.material || '',
            description: selectedItem.name,
            imageData: selectedItem.imageUrl
          }]}
          onClose={() => setSelectedItem(null)}
          onAddToWardrobe={() => {
            // Already in wardrobe, just close
            setSelectedItem(null);
          }}
          isWardrobeContext={true}
        />
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