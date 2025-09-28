// Simplified App.js - Core functionality only
import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [wardrobe, setWardrobe] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentAnalysisStep, setCurrentAnalysisStep] = useState('');

  // Load saved wardrobe items on component mount
  useEffect(() => {
    loadWardrobeItems();
  }, []);

  const loadWardrobeItems = async () => {
    try {
      const response = await fetch('/api/get-wardrobe');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.items) {
          const formattedItems = data.items.map(item => ({
            id: `db-${item.id}`,
            imageUrl: item.image_url,
            name: item.item_name || 'Fashion Item',
            analysis: item.analysis_data || null,
            databaseId: item.id
          }));
          setWardrobe(formattedItems);
        }
      } else {
        console.log('No saved items found or API not available');
      }
    } catch (error) {
      console.log('Loading from local storage or starting fresh');
      // Could load from localStorage here as fallback
    }
  };

  const handleWardrobeUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setIsUploading(true);
    setUploadProgress(0);

    const newItems = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      setCurrentAnalysisStep(`Analyzing item ${i + 1} of ${files.length}: ${file.name}`);

      try {
        // Convert to base64
        const base64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            resolve(reader.result.split(',')[1]);
          };
          reader.readAsDataURL(file);
        });

        // Call enhanced API
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            image: base64,
            type: 'wardrobe'
          })
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const { analysis } = await response.json();

        // Create item object
        const item = {
          id: Date.now() + Math.random(),
          imageUrl: `data:image/jpeg;base64,${base64}`,
          name: analysis.name || `Item ${i + 1}`,
          analysis: analysis
        };

        newItems.push(item);

        // Save to database in background
        saveToDatabase(analysis, base64).then(itemId => {
          if (itemId) {
            setWardrobe(prev => prev.map(wardrobeItem => 
              wardrobeItem.id === item.id 
                ? { ...wardrobeItem, databaseId: itemId }
                : wardrobeItem
            ));
          }
        });

      } catch (error) {
        console.error(`Failed to analyze ${file.name}:`, error);
        alert(`Failed to analyze ${file.name}: ${error.message}`);
      }
    }

    setWardrobe(prev => [...prev, ...newItems]);
    setIsUploading(false);
    setCurrentAnalysisStep('');
    e.target.value = null;
  };

  const saveToDatabase = async (analysisResult, imageData) => {
    try {
      const response = await fetch('/api/save-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisResult,
          imageData,
          category: 'wardrobe'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('Successfully saved to database:', result.itemId);
        return result.itemId;
      } else {
        console.warn('Failed to save to database:', result.error);
        return null;
      }
    } catch (error) {
      console.warn('Database save failed (analysis still works):', error);
      return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Maura</h1>
          <p className="text-gray-600">AI-Powered Luxury Fashion Analysis</p>
        </div>

        {/* Wardrobe Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">
              Your Wardrobe
              {wardrobe.length > 0 && (
                <span className="text-sm text-gray-500 ml-2">
                  ({wardrobe.length} items)
                </span>
              )}
            </h2>
            <label className="px-6 py-3 bg-black hover:bg-gray-800 text-white rounded-lg font-medium cursor-pointer transition-all">
              <input 
                type="file" 
                multiple 
                accept="image/*"
                onChange={handleWardrobeUpload}
                className="hidden"
              />
              {isUploading ? 'Processing...' : 'Add Items'}
            </label>
          </div>

          {/* Progress indicator */}
          {isUploading && (
            <div className="mb-6">
              <div className="bg-gray-200 rounded-full h-2 mb-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              {currentAnalysisStep && (
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
                  {currentAnalysisStep}
                </p>
              )}
            </div>
          )}

          {/* Wardrobe Grid */}
          {wardrobe.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="text-gray-500 font-medium">Your wardrobe is empty</p>
              <p className="text-sm text-gray-400 mt-1">Upload clothing photos for AI-powered luxury analysis</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {wardrobe.map(item => (
                <div 
                  key={item.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="relative aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden">
                    <img 
                      src={item.imageUrl} 
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Status indicators */}
                    {item.databaseId && (
                      <div 
                        className="absolute top-2 left-2 w-3 h-3 bg-green-500 rounded-full border-2 border-white" 
                        title="Saved to database"
                      />
                    )}
                    
                    {/* Quality indicator */}
                    {item.analysis?.tier && (
                      <div 
                        className={`absolute top-2 right-2 px-2 py-1 text-xs font-medium rounded ${
                          item.analysis.tier === 'luxury' ? 'bg-purple-100 text-purple-800' :
                          item.analysis.tier === 'premium' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {item.analysis.tier}
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-sm font-medium text-gray-900 truncate">{item.name}</p>
                  {item.analysis?.brand && (
                    <p className="text-xs text-gray-500">{item.analysis.brand}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Item Details Modal */}
        {selectedItem && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedItem(null)}
          >
            <div 
              className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center p-6 border-b">
                <h2 className="text-xl font-semibold">{selectedItem.name}</h2>
                <button 
                  onClick={() => setSelectedItem(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <img 
                    src={selectedItem.imageUrl} 
                    alt={selectedItem.name}
                    className="w-full rounded-lg"
                  />
                  <div className="space-y-4">
                    {selectedItem.analysis ? (
                      <>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h3 className="font-semibold mb-2">Analysis Results</h3>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <p><strong>Type:</strong> {selectedItem.analysis.type || 'Unknown'}</p>
                            <p><strong>Brand:</strong> {selectedItem.analysis.brand || 'Unknown'}</p>
                            <p><strong>Tier:</strong> {selectedItem.analysis.tier || 'Unknown'}</p>
                            <p><strong>Value:</strong> {selectedItem.analysis.estimatedValue || 'Unknown'}</p>
                            <p><strong>Quality:</strong> {selectedItem.analysis.qualityScore || 'N/A'}/10</p>
                            <p><strong>Condition:</strong> {selectedItem.analysis.condition || 'Unknown'}</p>
                          </div>
                          {selectedItem.analysis.summary && (
                            <div className="mt-3">
                              <p className="font-medium">Summary:</p>
                              <p className="text-sm text-gray-700">{selectedItem.analysis.summary}</p>
                            </div>
                          )}
                          {selectedItem.analysis.keyFeatures && (
                            <div className="mt-3">
                              <p className="font-medium">Key Features:</p>
                              <ul className="text-sm text-gray-700 list-disc list-inside">
                                {selectedItem.analysis.keyFeatures.map((feature, idx) => (
                                  <li key={idx}>{feature}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
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
    </div>
  );
}

export default App;