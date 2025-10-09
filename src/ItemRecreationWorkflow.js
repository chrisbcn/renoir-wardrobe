// ItemRecreationWorkflow.js - Component for recreating individual clothing items
import React, { useState } from 'react';

const ItemRecreationWorkflow = ({ 
  detectedItems, 
  originalImage, 
  onApproveItem, 
  onResetRecreation,
  showRecreationWorkflow,
  setShowRecreationWorkflow 
}) => {
  const [recreationStep, setRecreationStep] = useState('review'); // review, recreating, approve
  const [recreatedItems, setRecreatedItems] = useState({});
  const [recreationProgress, setRecreationProgress] = useState({});
  const [recreationSelectedItem, setRecreationSelectedItem] = useState(null);

  const handleStartRecreation = async (item) => {
    setRecreationSelectedItem(item);
    setRecreationStep('recreating');
    setRecreationProgress({ ...recreationProgress, [item.id]: 0 });
    // Don't compress the image - send full quality
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    await new Promise((resolve) => {
      img.onload = resolve;
      img.src = originalImage;
    });

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

// Use maximum quality
imageData = canvas.toDataURL('image/png').split(',')[1];

    try {
      // Convert originalImage to base64 if it's a blob URL
      let imageData;
      if (originalImage.startsWith('blob:')) {
        const response = await fetch(originalImage);
        const blob = await response.blob();
        imageData = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(',')[1]);
          reader.readAsDataURL(blob);
        });
      } else {
        imageData = originalImage.split(',')[1];
      }

      setRecreationProgress({ ...recreationProgress, [item.id]: 30 });

      const response = await fetch('/api/recreate-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalImageData: imageData,
          detectedItem: item,
          userId: "demo_user"
        })
      });

      setRecreationProgress({ ...recreationProgress, [item.id]: 70 });

      if (!response.ok) {
        throw new Error(`Recreation failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setRecreatedItems({
          ...recreatedItems,
          [item.id]: {
            originalItem: item,
            recreatedImageUrl: result.recreatedImageUrl,
            description: result.description,
            timestamp: result.metadata.timestamp
          }
        });
        setRecreationProgress({ ...recreationProgress, [item.id]: 100 });
        setRecreationStep('approve');
      } else {
        throw new Error(result.message || 'Recreation failed');
      }

    } catch (error) {
      console.error('Recreation error:', error);
      alert(`Failed to recreate ${item.type}: ${error.message}`);
      setRecreationStep('review');
      setRecreationProgress({ ...recreationProgress, [item.id]: 0 });
    }
  };

  const handleApproveRecreation = async (item) => {
    const recreatedItem = recreatedItems[item.id];
    if (recreatedItem) {
      // Create wardrobe item with recreated image
      const wardrobeItem = {
        ...item,
        imageUrl: recreatedItem.recreatedImageUrl,
        name: item.analysis?.name || item.type,
        isRecreated: true,
        originalImageUrl: originalImage,
        recreationTimestamp: recreatedItem.timestamp
      };
      
      onApproveItem(wardrobeItem);
      
      // Remove from recreation state
      const newRecreatedItems = { ...recreatedItems };
      delete newRecreatedItems[item.id];
      setRecreatedItems(newRecreatedItems);
    }
  };

  const handleRejectRecreation = (item) => {
    // Remove from recreation state and return to review
    const newRecreatedItems = { ...recreatedItems };
    delete newRecreatedItems[item.id];
    setRecreatedItems(newRecreatedItems);
    setRecreationStep('review');
    setRecreationSelectedItem(null);
  };

  if (!showRecreationWorkflow) return null;

  if (recreationStep === 'review') {
    return (
      <div className="bg-white p-6 mb-6 rounded-lg shadow-sm border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            🎨 Item Recreation Available
            <span className="text-sm text-gray-500 ml-2">
              We detected {detectedItems.length} clothing items. Would you like to recreate them as professional product photos?
            </span>
          </h2>
          <button
            onClick={onResetRecreation}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-all"
          >
            Close
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {detectedItems.slice(0, 4).map((item, index) => (
            <div key={index} className="text-center p-2 border rounded">
              <div className="text-2xl mb-1">👕</div>
              <p className="text-xs font-medium">{item.type}</p>
              <p className="text-xs text-gray-500">{item.color}</p>
            </div>
          ))}
          {detectedItems.length > 4 && (
            <div className="text-center p-2 border rounded bg-gray-50">
              <div className="text-lg mb-1">+{detectedItems.length - 4}</div>
              <p className="text-xs text-gray-500">more items</p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setRecreationStep('recreating')}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all"
          >
            Recreate All Items
          </button>
          <button
            onClick={() => setShowRecreationWorkflow(false)}
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-all"
          >
            Skip Recreation
          </button>
        </div>
      </div>
    );
  }

  if (recreationStep === 'recreating') {
    return (
      <div className="bg-white p-6 mb-6 rounded-lg shadow-sm border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            🎨 Creating Professional Product Photos
            <span className="text-sm text-gray-500 ml-2">
              Using AI to isolate and recreate each item
            </span>
          </h2>
        </div>

        <div className="space-y-4">
          {detectedItems.map((item, index) => {
            const progress = recreationProgress[item.id] || 0;
            const isRecreated = recreatedItems[item.id];
            const isActive = recreationSelectedItem?.id === item.id;

            return (
              <div key={item.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">
                      {isRecreated ? '✅' : isActive ? '🎨' : '⏳'}
                    </span>
                    <div>
                      <h3 className="font-medium">{item.type}</h3>
                      <p className="text-sm text-gray-500">{item.color} • {item.material}</p>
                    </div>
                  </div>
                  
                  {!isRecreated && !isActive && (
                    <button
                      onClick={() => handleStartRecreation(item)}
                      className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-all"
                    >
                      Recreate
                    </button>
                  )}
                </div>

                {(isActive || isRecreated) && (
                  <div className="mt-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span>{isRecreated ? 'Complete' : 'Processing...'}</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {Object.keys(recreatedItems).length > 0 && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => setRecreationStep('approve')}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all"
            >
              Review Recreated Items ({Object.keys(recreatedItems).length})
            </button>
          </div>
        )}
      </div>
    );
  }

  if (recreationStep === 'approve') {
    const currentItemId = recreationSelectedItem?.id || Object.keys(recreatedItems)[0];
    const currentRecreation = recreatedItems[currentItemId];
    const currentItem = detectedItems.find(item => item.id === currentItemId);

    if (!currentRecreation || !currentItem) {
      return (
        <div className="bg-white p-6 mb-6 rounded-lg shadow-sm border">
          <p>No items to review.</p>
        </div>
      );
    }

    return (
      <div className="bg-white p-6 mb-6 rounded-lg shadow-sm border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            ✨ Item Recreation Complete
            <span className="text-sm text-gray-500 ml-2">
              Review and approve your recreated items
            </span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Before */}
          <div>
            <h3 className="font-medium mb-2">🔍 Detected Item</h3>
            <div className="relative border rounded-lg overflow-hidden">
              <img 
                src={originalImage} 
                alt="Original"
                className="w-full h-64 object-cover"
              />
              <div 
                className="absolute border-2 border-red-400 bg-red-400 bg-opacity-20"
                style={{
                  left: `${currentItem.boundingBox.left}%`,
                  top: `${currentItem.boundingBox.top}%`,
                  width: `${currentItem.boundingBox.width}%`,
                  height: `${currentItem.boundingBox.height}%`,
                }}
              >
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              <p><strong>Type:</strong> {currentItem.type}</p>
              <p><strong>Color:</strong> {currentItem.color}</p>
              <p><strong>Confidence:</strong> {currentItem.confidence}%</p>
            </div>
          </div>

          {/* After */}
          <div>
            <h3 className="font-medium mb-2">✨ Recreated Product Photo</h3>
            <div className="border rounded-lg overflow-hidden">
              <img 
                src={currentRecreation.recreatedImageUrl} 
                alt="Recreated"
                className="w-full h-64 object-cover"
              />
            </div>
            <div className="mt-2 text-sm text-gray-600">
              <p><strong>Status:</strong> ✅ Professional product photo</p>
              <p><strong>Generated:</strong> {new Date(currentRecreation.timestamp).toLocaleTimeString()}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => handleApproveRecreation(currentItem)}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all"
          >
            ✅ Approve & Add to Wardrobe
          </button>
          <button
            onClick={() => handleRejectRecreation(currentItem)}
            className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all"
          >
            ❌ Recreate Again
          </button>
          <button
            onClick={() => setRecreationStep('review')}
            className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-all"
          >
            Back to Review
          </button>
        </div>

        {Object.keys(recreatedItems).length > 1 && (
          <div className="mt-4 text-center text-sm text-gray-500">
            Reviewing {Object.keys(recreatedItems).findIndex(id => id === currentItemId) + 1} of {Object.keys(recreatedItems).length} recreated items
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default ItemRecreationWorkflow;