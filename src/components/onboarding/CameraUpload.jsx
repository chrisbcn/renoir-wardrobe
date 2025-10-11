/**
 * Camera Upload Component
 * Mobile-first camera and gallery upload interface
 */

import React, { useState, useRef } from 'react';
import { Camera, Image, X, Upload, AlertCircle } from 'lucide-react';

export const CameraUpload = ({ 
  onUpload, 
  onBack, 
  isLoading = false, 
  uploadType = 'single' // 'single' or 'outfit'
}) => {
  const [selectedImages, setSelectedImages] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    setError(null);

    if (files.length === 0) return;

    // Validate file types
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const invalidFiles = files.filter(file => !validTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      setError(`Invalid file types: ${invalidFiles.map(f => f.name).join(', ')}`);
      return;
    }

    // Validate file sizes (max 10MB per file)
    const maxSize = 10 * 1024 * 1024; // 10MB
    const oversizedFiles = files.filter(file => file.size > maxSize);
    
    if (oversizedFiles.length > 0) {
      setError(`Files too large: ${oversizedFiles.map(f => f.name).join(', ')}`);
      return;
    }

    // Limit number of files for outfit uploads
    if (uploadType === 'outfit' && files.length > 5) {
      setError('Maximum 5 images allowed for outfit uploads');
      return;
    }

    setSelectedImages(files);
    createPreviews(files);
  };

  const createPreviews = (files) => {
    const previews = files.map(file => ({
      file,
      url: URL.createObjectURL(file),
      name: file.name,
      size: file.size
    }));
    setPreviewImages(previews);
  };

  const removeImage = (index) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    const newPreviews = previewImages.filter((_, i) => i !== index);
    
    // Revoke object URL to prevent memory leaks
    URL.revokeObjectURL(previewImages[index].url);
    
    setSelectedImages(newImages);
    setPreviewImages(newPreviews);
  };

  const handleUpload = async () => {
    if (selectedImages.length === 0) {
      setError('Please select at least one image');
      return;
    }

    try {
      setError(null);
      
      // Convert files to base64
      const base64Images = await Promise.all(
        selectedImages.map(file => fileToBase64(file))
      );

      // Call upload handler
      await onUpload({
        type: uploadType === 'outfit' ? 'outfit_image' : 'single_image',
        images: base64Images,
        metadata: {
          fileNames: selectedImages.map(f => f.name),
          fileSizes: selectedImages.map(f => f.size),
          uploadType: uploadType
        }
      });

      // Clear selections after successful upload
      setSelectedImages([]);
      setPreviewImages([]);
      
    } catch (error) {
      setError(`Upload failed: ${error.message}`);
    }
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
            <X size={20} />
            <span>Cancel</span>
          </button>
          
          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-900">
              {uploadType === 'outfit' ? 'Upload Outfit' : 'Upload Item'}
            </h1>
            <p className="text-sm text-gray-600">
              {uploadType === 'outfit' 
                ? 'Take or select photos of your outfit' 
                : 'Take or select a photo of your item'
              }
            </p>
          </div>

          <div className="w-16" /> {/* Spacer for centering */}
        </div>
      </div>

      <div className="p-6">
        {/* Upload Options */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="p-6 bg-white rounded-xl shadow-sm border-2 border-dashed border-gray-300 flex flex-col items-center space-y-3 hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50"
          >
            <Image size={32} className="text-gray-400" />
            <span className="font-medium text-gray-700">Gallery</span>
            <span className="text-xs text-gray-500 text-center">
              Select from photos
            </span>
          </button>

          <button
            onClick={() => {/* TODO: Implement camera capture */}}
            disabled={isLoading}
            className="p-6 bg-white rounded-xl shadow-sm border-2 border-dashed border-gray-300 flex flex-col items-center space-y-3 hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50"
          >
            <Camera size={32} className="text-gray-400" />
            <span className="font-medium text-gray-700">Camera</span>
            <span className="text-xs text-gray-500 text-center">
              Take new photo
            </span>
          </button>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple={uploadType === 'outfit'}
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-800">Upload Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Image Previews */}
        {previewImages.length > 0 && (
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-3">
              Selected Images ({previewImages.length})
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {previewImages.map((preview, index) => (
                <div key={index} className="relative">
                  <div className="aspect-square rounded-xl overflow-hidden bg-gray-100">
                    <img
                      src={preview.url}
                      alt={preview.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Remove button */}
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                  >
                    <X size={14} />
                  </button>
                  
                  {/* File info */}
                  <div className="mt-2">
                    <p className="text-xs text-gray-600 truncate" title={preview.name}>
                      {preview.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(preview.size)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Button */}
        {selectedImages.length > 0 && (
          <button
            onClick={handleUpload}
            disabled={isLoading}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold flex items-center justify-center space-x-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Upload size={20} />
                <span>
                  Upload {selectedImages.length} image{selectedImages.length > 1 ? 's' : ''}
                </span>
              </>
            )}
          </button>
        )}

        {/* Tips */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="font-medium text-blue-800 mb-2">Tips for best results:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Use good lighting and avoid shadows</li>
            <li>• Take photos against a plain background when possible</li>
            <li>• For outfits, capture the full look</li>
            <li>• For single items, focus on the garment details</li>
          </ul>
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-700 font-medium">Analyzing your image{selectedImages.length > 1 ? 's' : ''}...</p>
            <p className="text-gray-500 text-sm text-center">
              This may take a few moments
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraUpload;
