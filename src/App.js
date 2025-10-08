// FIXES FOR MULTI-ITEM UPLOAD ISSUES
// Replace your handleMultiItemUpload function with this improved version:

const handleMultiItemUpload = async (e) => {
  const files = e.target.files;
  if (!files || files.length === 0) return;
  
  const file = files[0]; // Take the first file
  if (!file) return;

  setIsProcessingMultiItem(true);
  setShowMultiItemSection(true);
  setMultiItemDetectionResult(null);

  try {
    // Convert image to base64
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

    console.log('Sending multi-item upload request...'); // Debug log

    const response = await fetch('/api/multi-item-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageData: base64,
        fileName: file.name
      })
    });

    console.log('Response status:', response.status); // Debug log

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('API result:', result); // Debug log

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
      console.log('Detection result set:', detectionResult); // Debug log
    } else {
      throw new Error(result.error || 'No items detected');
    }
  } catch (error) {
    console.error('Multi-item detection error:', error);
    alert(`Multi-item detection failed: ${error.message}`);
    setShowMultiItemSection(false);
  } finally {
    setIsProcessingMultiItem(false);
    // Reset the file input
    e.target.value = '';
  }
};

// ALSO UPDATE the button onClick handlers to be more robust:
// Replace your Multi-Item Upload button JSX with this:

<label className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium cursor-pointer transition-all">
  <input 
    type="file" 
    accept="image/*"
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

// API ENDPOINT CHECK - Make sure your /api/multi-item-upload.js file has proper error handling:
// The endpoint should return something like this structure:

/* Expected API response format:
{
  success: true,
  detectedItems: [
    {
      type: "shirt",
      description: "Blue button-up shirt", 
      color: "blue",
      brand: "Unknown",
      material: "cotton",
      confidence: 0.85,
      boundingBox: {
        left: 10,
        top: 15, 
        width: 40,
        height: 50
      },
      analysis: { ... } // Optional full analysis object
    }
  ],
  sessionId: "unique-session-id"
}
*/

// DEBUGGING STEPS:
// 1. Check the browser console for the debug logs I added
// 2. Check if your /api/multi-item-upload.js file exists and is working
// 3. Verify the API returns the expected JSON structure
// 4. Make sure the bounding box coordinates are valid percentages (0-100)