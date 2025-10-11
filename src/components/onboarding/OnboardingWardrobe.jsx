/**
 * Onboarding Wardrobe Component
 * Displays and manages items during onboarding process
 */

import React, { useState } from 'react';
import { Plus, Edit3, Trash2, ArrowLeft, Check } from 'lucide-react';

export const OnboardingWardrobe = ({ 
  items = [], 
  progress, 
  onAddMore, 
  onEditItem, 
  onDeleteItem, 
  onComplete,
  onBack 
}) => {
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [isEditing, setIsEditing] = useState(false);

  const handleItemSelect = (itemId) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleDeleteSelected = () => {
    selectedItems.forEach(itemId => {
      onDeleteItem(itemId);
    });
    setSelectedItems(new Set());
    setIsEditing(false);
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'shirt': '👕',
      'pants': '👖',
      'dress': '👗',
      'jacket': '🧥',
      'blazer': '🤵',
      'sweater': '🧥',
      'vest': '🦺',
      'shoes': '👟',
      'handbag': '👜',
      'skirt': '👗',
      'shorts': '🩳'
    };
    return icons[category] || '👕';
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
          
          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-900">Your Wardrobe</h1>
            <p className="text-sm text-gray-600">
              {items.length} items • {progress.itemCount}/{progress.targetItems} minimum
            </p>
          </div>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            {isEditing ? 'Done' : 'Edit'}
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm font-medium text-blue-600">
              {Math.min(progress.itemCount, progress.targetItems)}/{progress.targetItems}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${Math.min((progress.itemCount / progress.targetItems) * 100, 100)}%` 
              }}
            />
          </div>
        </div>
      </div>

      {/* Items Grid */}
      <div className="p-6">
        {items.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No items yet</h3>
            <p className="text-gray-600 mb-6">Start by adding some items to your wardrobe</p>
            <button
              onClick={onAddMore}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
            >
              Add Your First Item
            </button>
          </div>
        ) : (
          <>
            {/* Items Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`bg-white rounded-xl shadow-sm border-2 transition-all duration-200 ${
                    selectedItems.has(item.id) 
                      ? 'border-blue-500 shadow-md' 
                      : 'border-gray-200 hover:shadow-md'
                  } ${isEditing ? 'cursor-pointer' : ''}`}
                  onClick={() => isEditing && handleItemSelect(item.id)}
                >
                  {/* Image */}
                  <div className="aspect-square rounded-t-xl overflow-hidden bg-gray-100 relative">
                    {item.standardizedImage ? (
                      <img
                        src={item.standardizedImage}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-4xl">{getCategoryIcon(item.category)}</span>
                      </div>
                    )}
                    
                    {/* Selection Indicator */}
                    {isEditing && selectedItems.has(item.id) && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <Check size={16} className="text-white" />
                      </div>
                    )}

                    {/* Confidence Badge */}
                    <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(item.confidence)}`}>
                      {Math.round(item.confidence * 100)}%
                    </div>
                  </div>

                  {/* Item Info */}
                  <div className="p-3">
                    <h3 className="font-medium text-gray-900 text-sm mb-1 line-clamp-2">
                      {item.name}
                    </h3>
                    <p className="text-xs text-gray-600 mb-2 capitalize">
                      {item.category}
                    </p>
                    
                    {/* Colors */}
                    {item.colors && item.colors.length > 0 && (
                      <div className="flex space-x-1 mb-2">
                        {item.colors.slice(0, 3).map((color, index) => (
                          <div
                            key={index}
                            className="w-3 h-3 rounded-full border border-gray-300"
                            style={{ backgroundColor: color.toLowerCase() }}
                            title={color}
                          />
                        ))}
                        {item.colors.length > 3 && (
                          <span className="text-xs text-gray-500">+{item.colors.length - 3}</span>
                        )}
                      </div>
                    )}

                    {/* Brand */}
                    {item.brand && item.brand !== 'Unknown' && (
                      <p className="text-xs text-gray-500 truncate">
                        {item.brand}
                      </p>
                    )}
                  </div>

                  {/* Edit Button (when not in edit mode) */}
                  {!isEditing && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditItem(item.id);
                      }}
                      className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full shadow-sm flex items-center justify-center hover:bg-gray-50"
                    >
                      <Edit3 size={14} className="text-gray-600" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Edit Actions */}
            {isEditing && selectedItems.size > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Trash2 size={20} className="text-red-600" />
                    <span className="text-red-800 font-medium">
                      {selectedItems.size} item{selectedItems.size > 1 ? 's' : ''} selected
                    </span>
                  </div>
                  <button
                    onClick={handleDeleteSelected}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700"
                  >
                    Delete Selected
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={onAddMore}
                className="w-full py-4 bg-white border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center space-x-2 text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
              >
                <Plus size={20} />
                <span className="font-medium">Add More Items</span>
              </button>

              {progress.canProceed && (
                <button
                  onClick={onComplete}
                  className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                >
                  Complete Setup ({items.length} items)
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OnboardingWardrobe;
