/**
 * Method Selector Component
 * Mobile-first onboarding method selection screen
 */

import React from 'react';
import { Camera, Instagram, FileText, Users, ArrowRight } from 'lucide-react';

export const MethodSelector = ({ onMethodSelect, progress, isLoading = false }) => {
  const methods = [
    {
      id: 'camera',
      title: 'Camera Roll',
      subtitle: 'Upload photos from your phone',
      icon: Camera,
      color: 'bg-blue-500',
      description: 'Take new photos or select from your gallery'
    },
    {
      id: 'social',
      title: 'Social Media',
      subtitle: 'Connect Instagram & Pinterest',
      icon: Users,
      color: 'bg-purple-500',
      description: 'Import outfits from your social posts'
    },
    {
      id: 'receipt',
      title: 'Receipts',
      subtitle: 'Upload shopping receipts',
      icon: FileText,
      color: 'bg-green-500',
      description: 'Add items from your purchase history'
    }
  ];

  const progressPercentage = Math.min((progress.itemCount / progress.targetItems) * 100, 100);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Build Your Digital Wardrobe
        </h1>
        <p className="text-gray-600 text-lg">
          Choose how you'd like to add your first items
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">
            Progress
          </span>
          <span className="text-sm font-medium text-blue-600">
            {progress.itemCount}/{progress.targetItems} items
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        {progress.itemCount > 0 && (
          <p className="text-xs text-gray-500 mt-1 text-center">
            Great start! Add {progress.targetItems - progress.itemCount} more to continue
          </p>
        )}
      </div>

      {/* Method Cards */}
      <div className="space-y-4 mb-8">
        {methods.map((method) => (
          <button
            key={method.id}
            onClick={() => onMethodSelect(method.id)}
            disabled={isLoading}
            className="w-full p-6 bg-white rounded-xl shadow-sm border border-gray-200 flex items-center space-x-4 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {/* Icon */}
            <div className={`p-4 rounded-full ${method.color} text-white flex-shrink-0`}>
              <method.icon size={28} />
            </div>
            
            {/* Content */}
            <div className="flex-1 text-left">
              <h3 className="font-semibold text-gray-900 text-lg mb-1">
                {method.title}
              </h3>
              <p className="text-gray-600 text-sm mb-2">
                {method.subtitle}
              </p>
              <p className="text-gray-500 text-xs">
                {method.description}
              </p>
            </div>
            
            {/* Arrow */}
            <div className="text-gray-400 flex-shrink-0">
              <ArrowRight size={20} />
            </div>
          </button>
        ))}
      </div>

      {/* Continue Button (shown when minimum items reached) */}
      {progress.canProceed && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="font-semibold text-green-800">
              Ready to Continue!
            </h3>
          </div>
          <p className="text-green-700 text-sm mb-4">
            You've added {progress.itemCount} items. You can continue adding more or complete your setup.
          </p>
          <button 
            onClick={() => onMethodSelect('complete')}
            className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
          >
            Complete Setup
          </button>
        </div>
      )}

      {/* Help Text */}
      <div className="mt-8 text-center">
        <p className="text-gray-500 text-sm">
          You can switch between methods anytime
        </p>
        <p className="text-gray-400 text-xs mt-1">
          All methods work together to build your complete wardrobe
        </p>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-700 font-medium">Processing your items...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MethodSelector;
