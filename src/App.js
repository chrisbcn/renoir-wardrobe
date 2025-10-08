// Enhanced App.js - Add these features to your existing App.js
// This adds item recreation to your current multi-item detection

import React, { useState, useEffect } from 'react';
import './App.css';

// Add this new component for the recreation workflow
const ItemRecreationWorkflow = ({ detectedItems, originalImage, onApproveItem, onResetRecreation }) => {
  const [recreationStep, setRecreationStep] = useState('review'); // review, recreating, approve
  const [recreatedItems, setRecreatedItems] = useState([]);
  const [isRecreating, setIsRecreating] = useState(false);
  const [recreationProgress, setRecreationProgress] = useState(0);

  const startRecreation = async () => {
    setRecreationStep('recreating');
    setIsRecreating(true);
    setRecreationProgress(0);

    const recreated = [];
    
    for (let i = 0; i < detectedItems.length; i++) {
      const item = detectedItems[i];
      setRecreationProgress(Math.round(((i + 1) / detectedItems.length) * 100));

      try {
        console.log(`🎨 Recreating item ${i + 1}: ${item.type}`);
        
        const response = await fetch('/api/recreate-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            item: item,
            originalImage: originalImage
          })
        });

        if (!response.ok) {
          throw new Error(`Recreation failed: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.success) {
          recreated.push({
            ...item,
            recreatedImage: result.recreatedImage,
            productTitle: result.productTitle,
            productDescription: result.productDescription,
            enhancedDescription: result.enhancedDescription
          });
        } else {
          console.error(`Failed to recreate item ${i + 1}:`, result.error);
          // Add original item without recreation
          recreated.push({
            ...item,
            recreationFailed: true,
            error: result.error
          });
        }
      } catch (error) {
        console.error(`Error recreating item ${i + 1}:`, error);
        recreated.push({
          ...item,
          recreationFailed: true,
          error: error.message
        });
      }
    }

    setRecreatedItems(recreated);
    setIsRecreating(false);
    setRecreationStep('approve');
  };

  if (recreationStep === 'review') {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">🎨 Item Recreation Available</h2>
        
        <div className="mb-4">
          <p className="text-gray-600 mb-2">
            We detected {detectedItems.length} clothing items. Would you like to recreate them as professional product photos?
          </p>
          
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
                <p className="text-xs">more items</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={startRecreation}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            🎨 Recreate as Product Photos
          </button>
          <button
            onClick={() => onApproveItem(detectedItems, 'skip_recreation')}
            className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Skip & Add Current Items
          </button>
        </div>
      </div>
    );
  }

  if (recreationStep === 'recreating') {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">🎨 Creating Professional Product Photos...</h2>
        
        <div className="mb-4">
          <div className="bg-gray-200 rounded-full h-3 mb-2">
            <div 
              className="bg-purple-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${recreationProgress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600">
            Processing item {Math.ceil((recreationProgress / 100) * detectedItems.length)} of {detectedItems.length}
          </p>
        </div>

        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span className="ml-3 text-gray-600">Generating professional product images...</span>
        </div>
      </div>
    );
  }

  if (recreationStep === 'approve') {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">✨ Professional Product Photos</h2>
          <button
            onClick={onResetRecreation}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back to Detection
          </button>
        </div>

        <div className="space-y-6">
          {recreatedItems.map((item, index) => (
            <div key={index} className="border rounded-lg p-4 bg-gray-50">
              {!item.recreationFailed ? (
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Original Detection */}
                  <div>
                    <h3 className="font-medium mb-2 text-gray-700">Original Detection</h3>
                    <div className="bg-white p-3 rounded border">
                      <p className="font-medium">{item.type}</p>
                      <p className="text-sm text-gray-600">{item.description}</p>
                      <div className="flex gap-2 mt-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                          {item.color}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          {Math.round(item.confidence * 100)}% confidence
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Professional Recreation */}
                  <div>
                    <h3 className="font-medium mb-2 text-gray-700">Professional Product Photo</h3>
                    {item.recreatedImage ? (
                      <div className="bg-white rounded border overflow-hidden">
                        <img 
                          src={item.recreatedImage} 
                          alt={item.productTitle}
                          className="w-full h-48 object-cover"
                        />
                        <div className="p-3">
                          <h4 className="font-medium">{item.productTitle}</h4>
                          <p className="text-sm text-gray-600 mt-1">{item.productDescription}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white p-6 rounded border text-center text-gray-500">
                        <div className="text-4xl mb-2">🎨</div>
                        <p>Product photo generated</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="text-red-500 text-xl mb-2">⚠️</div>
                  <p className="text-red-600 font-medium">Recreation failed for {item.type}</p>
                  <p className="text-sm text-gray-600 mt-1">{item.error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-4 flex gap-3 justify-center">
                {!item.recreationFailed && (
                  <>
                    <button
                      onClick={() => onApproveItem([item], 'approve_recreated')}
                      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
                    >
                      ✓ Add to Wardrobe
                    </button>
                    <button
                      className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 transition-colors"
                    >
                      ↻ Regenerate
                    </button>
                  </>
                )}
                <button
                  className="bg-red-100 text-red-700 px-4 py-2 rounded hover:bg-red-200 transition-colors"
                >
                  ✗ Skip this item
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => onApproveItem(recreatedItems.filter(item => !item.recreationFailed), 'approve_all_recreated')}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add All Successfully Recreated Items
          </button>
        </div>
      </div>
    );
  }

  return null;
};

// Add this to your existing App component (enhance your current App.js)
const App = () => {
  // Your existing state variables...
  const [showRecreationWorkflow, setShowRecreationWorkflow] = useState(false);
  const [pendingRecreationItems, setPendingRecreationItems] = useState([]);
  const [recreationOriginalImage, setRecreationOriginalImage] = useState(null);

  // Add this to your existing handleMultiItemUpload success handler
  const handleMultiItemUploadSuccess = (result, originalImageUrl) => {
    // Your existing success logic...
    
    // Add recreation workflow option
    if (result.detectedItems && result.detectedItems.length > 0) {
      setPendingRecreationItems(result.detectedItems);
      setRecreationOriginalImage(originalImageUrl);
      setShowRecreationWorkflow(true);
    }
  };

  // New handler for recreation approval
  const handleApproveRecreatedItems = async (items, approvalType) => {
    console.log('Approving items:', approvalType, items);
    
    try {
      if (approvalType === 'skip_recreation') {
        // Add original detected items without recreation
        for (const item of items) {
          const wardrobeItem = {
            id: Date.now() + Math.random(),
            imageUrl: recreationOriginalImage,
            name: `${item.color} ${item.type}`,
            source: 'multi_item_detection',
            analysis: {
              name: `${item.color} ${item.type}`,
              type: item.type,
              colorAnalysis: { dominantColors: [{ name: item.color, confidence: 0.9 }] },
              overallAssessment: { tier: 'contemporary' }
            }
          };
          
          // Add to your existing wardrobe state
          setWardrobe(prev => [...prev, wardrobeItem]);
        }
      } else {
        // Add recreated items
        for (const item of items) {
          if (!item.recreationFailed) {
            const wardrobeItem = {
              id: Date.now() + Math.random(),
              imageUrl: item.recreatedImage || recreationOriginalImage,
              name: item.productTitle || `${item.color} ${item.type}`,
              source: 'ai_recreation',
              analysis: {
                name: item.productTitle || `${item.color} ${item.type}`,
                type: item.type,
                description: item.productDescription,
                enhancedDescription: item.enhancedDescription,
                colorAnalysis: { dominantColors: [{ name: item.color, confidence: 0.95 }] },
                overallAssessment: { tier: 'premium' },
                isRecreated: true
              }
            };
            
            // Add to your existing wardrobe state
            setWardrobe(prev => [...prev, wardrobeItem]);
          }
        }
      }
      
      // Reset recreation workflow
      setShowRecreationWorkflow(false);
      setPendingRecreationItems([]);
      setRecreationOriginalImage(null);
      setShowMultiItemSection(false);
      
      // Show success message
      const successCount = items.filter(item => !item.recreationFailed).length;
      alert(`Successfully added ${successCount} items to your wardrobe!`);
      
    } catch (error) {
      console.error('Error approving recreated items:', error);
      alert('Error adding items to wardrobe: ' + error.message);
    }
  };

  const handleResetRecreation = () => {
    setShowRecreationWorkflow(false);
    // Keep the original detection results visible
  };

  // In your existing render method, add this after your multi-item detection section:
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Your existing header and content... */}
      
      {/* Add this recreation workflow section */}
      {showRecreationWorkflow && (
        <ItemRecreationWorkflow
          detectedItems={pendingRecreationItems}
          originalImage={recreationOriginalImage}
          onApproveItem={handleApproveRecreatedItems}
          onResetRecreation={handleResetRecreation}
        />
      )}
      
      {/* Your existing multi-item detection display and other components... */}
    </div>
  );
};

export default App;