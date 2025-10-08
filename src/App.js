// =============================================================================
// COMPLETE ADDITIONS FOR MULTI-ITEM DETECTION
// Copy and paste these pieces into your existing App.js file
// =============================================================================

// 1. ADD THIS IMPORT AT THE TOP (after your existing imports)
// =============================================================================
import MultiItemDetectionDisplay from './MultiItemDetectionDisplay';

// 2. ADD THESE STATE VARIABLES (add to your existing useState declarations)
// =============================================================================
const [multiItemDetectionResult, setMultiItemDetectionResult] = useState(null);
const [isProcessingMultiItem, setIsProcessingMultiItem] = useState(false);
const [showMultiItemSection, setShowMultiItemSection] = useState(false);

// 3. ADD THESE TWO FUNCTIONS (add anywhere with your other functions)
// =============================================================================

// Handle multi-item detection upload
const handleMultiItemUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  setIsProcessingMultiItem(true);
  setShowMultiItemSection(true);
  setMultiItemDetectionResult(null);

  try {
    const base64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      };
      reader.readAsDataURL(file);
    });

    const response = await fetch('/api/multi-item-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageData: base64,
        fileName: file.name
      })
    });

    const result = await response.json();

    if (result.success) {
      const detectionResult = {
        originalImage: URL.createObjectURL(file),
        detectedItems: result.detectedItems.map((item, index) => ({
          id: `item_${index}`,
          type: item.type,
          description: item.description,
          color: item.color,
          brand: item.brand,
          material: item.material,
          confidence: Math.round(item.confidence * 100),
          boundingBox: {
            left: item.boundingBox.left,
            top: item.boundingBox.top,
            width: item.boundingBox.width,
            height: item.boundingBox.height
          },
          analysis: item.analysis
        })),
        sessionId: result.sessionId
      };

      setMultiItemDetectionResult(detectionResult);
    } else {
      alert('Multi-item detection failed: ' + result.error);
      setShowMultiItemSection(false);
    }
  } catch (error) {
    console.error('Multi-item detection error:', error);
    alert('Multi-item detection failed. Please try again.');
    setShowMultiItemSection(false);
  } finally {
    setIsProcessingMultiItem(false);
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
          
          // Use your existing saveToDatabase function
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

    // Use your existing setWardrobe function
    setWardrobe(prev => [...newWardrobeItems, ...prev]);
    alert(`Successfully added ${newWardrobeItems.length} items to your wardrobe!`);
    
  } catch (error) {
    console.error('Error adding items to wardrobe:', error);
    alert('Failed to add items to wardrobe. Please try again.');
  } finally {
    setIsUploading(false);
  }
};

// 4. ADD THIS BUTTON IN YOUR CONTROLS SECTION (next to your existing "Add Images" button)
// =============================================================================
// Find the section with your existing buttons and add this new one:

<label className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium cursor-pointer transition-all">
  <input 
    type="file" 
    accept="image/*"
    onChange={(e) => {
      handleMultiItemUpload(e);
      setShowMultiItemSection(true);
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

// 5. ADD THIS JSX SECTION IN YOUR RENDER (wherever you want the feature to appear)
// =============================================================================
// Add this section in your main render function, after your wardrobe section or wherever you want it:

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
            accept="image/*"
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

// =============================================================================
// INSTALLATION SUMMARY:
// =============================================================================
// 
// 1. Create MultiItemDetectionDisplay.js file (from first artifact)
// 2. Add the import at the top of your App.js
// 3. Add the 3 state variables with your other useState declarations
// 4. Add the 2 functions anywhere with your other functions
// 5. Add the purple button in your controls section
// 6. Add the JSX section in your render where you want it to appear
//
// That's it! Your existing code stays exactly the same.
// This only adds the multi-item detection feature without breaking anything.
// =============================================================================