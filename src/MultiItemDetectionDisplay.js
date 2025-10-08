// MultiItemDetectionDisplay.js - Improved UI Component for Multi-Item Detection

import React, { useState } from 'react';

const MultiItemDetectionDisplay = ({ detectionResult, onAddToWardrobe, isProcessing }) => {
  const [hoveredItem, setHoveredItem] = useState(null);
  const [selectedItems, setSelectedItems] = useState(new Set());

  if (!detectionResult || isProcessing) {
    return (
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">Multi-Item Detection</h3>
        {isProcessing ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-600">Detecting clothing items...</span>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">Upload an outfit photo to detect multiple items</p>
          </div>
        )}
      </div>
    );
  }

  const { originalImage, detectedItems, sessionId } = detectionResult;

  const toggleItemSelection = (itemId) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  const handleAddSelectedToWardrobe = () => {
    const itemsToAdd = detectedItems.filter(item => selectedItems.has(item.id));
    onAddToWardrobe(itemsToAdd, sessionId);
    setSelectedItems(new Set()); // Clear selection
  };

  const handleAddAllToWardrobe = () => {
    onAddToWardrobe(detectedItems, sessionId);
  };

  return (
    <div className="bg-white p-6 rounded-lg border">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">
          Multi-Item Detection Results
          <span className="text-sm text-gray-500 ml-2">
            ({detectedItems.length} items found)
          </span>
        </h3>
        <div className="flex gap-2">
          {selectedItems.size > 0 && (
            <button
              onClick={handleAddSelectedToWardrobe}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all"
            >
              Add Selected ({selectedItems.size})
            </button>
          )}
          <button
            onClick={handleAddAllToWardrobe}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-all"
          >
            Add All Items
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side: Original Image with Bounding Boxes */}
        <div className="relative">
          <h4 className="text-md font-medium mb-2">Detected Items</h4>
          <div 
            className="relative inline-block border rounded-lg overflow-hidden"
            style={{ maxWidth: '100%', height: 'auto' }}
          >
            <img
              src={originalImage}
              alt="Outfit with detected items"
              className="w-full h-auto"
              style={{ display: 'block' }}
            />
            
            {/* Bounding Box Overlays */}
            {detectedItems.map((item, index) => {
              const isHovered = hoveredItem === item.id;
              const isSelected = selectedItems.has(item.id);
              
              return (
                <div
                  key={item.id}
                  className={`absolute border-2 cursor-pointer transition-all duration-200 ${
                    isSelected 
                      ? 'border-purple-500 bg-purple-500 bg-opacity-20' 
                      : isHovered 
                        ? 'border-blue-400 bg-blue-400 bg-opacity-10' 
                        : 'border-red-400 bg-red-400 bg-opacity-5'
                  }`}
                  style={{
                    left: `${item.boundingBox.left}%`,
                    top: `${item.boundingBox.top}%`,
                    width: `${item.boundingBox.width}%`,
                    height: `${item.boundingBox.height}%`,
                  }}
                  onMouseEnter={() => setHoveredItem(item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                  onClick={() => toggleItemSelection(item.id)}
                  title={`${item.type} - ${item.confidence}% confidence`}
                >
                  {/* Item Number Badge */}
                  <div 
                    className={`absolute -top-2 -left-2 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center text-white ${
                      isSelected 
                        ? 'bg-purple-500' 
                        : isHovered 
                          ? 'bg-blue-400' 
                          : 'bg-red-400'
                    }`}
                  >
                    {index + 1}
                  </div>
                  
                  {/* Confidence Badge */}
                  {(isHovered || isSelected) && (
                    <div className="absolute bottom-1 right-1 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                      {item.confidence}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="mt-2 text-sm text-gray-600">
            <p>• Click items to select/deselect</p>
            <p>• Hover to see confidence scores</p>
          </div>
        </div>

        {/* Right Side: Item List */}
        <div>
          <h4 className="text-md font-medium mb-2">Detected Items List</h4>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {detectedItems.map((item, index) => {
              const isHovered = hoveredItem === item.id;
              const isSelected = selectedItems.has(item.id);
              
              return (
                <div
                  key={item.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-all ${
                    isSelected 
                      ? 'border-purple-500 bg-purple-50' 
                      : isHovered 
                        ? 'border-blue-400 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onMouseEnter={() => setHoveredItem(item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                  onClick={() => toggleItemSelection(item.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center text-white ${
                          isSelected 
                            ? 'bg-purple-500' 
                            : isHovered 
                              ? 'bg-blue-400' 
                              : 'bg-red-400'
                        }`}>
                          {index + 1}
                        </span>
                        <h5 className="font-medium">{item.type}</h5>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          item.confidence >= 80 
                            ? 'bg-green-100 text-green-800' 
                            : item.confidence >= 60 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-red-100 text-red-800'
                        }`}>
                          {item.confidence}%
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        {item.description && (
                          <p><strong>Description:</strong> {item.description}</p>
                        )}
                        {item.color && (
                          <p><strong>Color:</strong> {item.color}</p>
                        )}
                        {item.brand && (
                          <p><strong>Brand:</strong> {item.brand}</p>
                        )}
                        {item.material && (
                          <p><strong>Material:</strong> {item.material}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToWardrobe([item], sessionId);
                        }}
                        className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded-lg transition-all"
                      >
                        Add to Wardrobe
                      </button>
                      
                      {isSelected && (
                        <div className="text-purple-600 text-xs font-medium">
                          ✓ Selected
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          <strong>Instructions:</strong> Click on items in the image or list to select them. 
          Use "Add Selected" to add only chosen items, or "Add All Items" to add everything to your wardrobe.
          Individual items can be added using the "Add to Wardrobe" button on each item.
        </p>
      </div>
    </div>
  );
};

export default MultiItemDetectionDisplay;