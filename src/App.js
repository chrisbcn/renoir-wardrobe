import React, { useState, useEffect } from 'react';
import { Upload, Package, Sparkles, X, Heart, CheckCircle } from 'lucide-react';
import './App.css';

function App() {
  const [wardrobe, setWardrobe] = useState([]);
  const [inspirationImage, setInspirationImage] = useState(null);
  const [inspirationAnalysis, setInspirationAnalysis] = useState(null);
  const [matchingResults, setMatchingResults] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isProcessingInspiration, setIsProcessingInspiration] = useState(false);
  const [uploadingItems, setUploadingItems] = useState([]);
  const [currentAnalysisStep, setCurrentAnalysisStep] = useState('');

  // Load saved wardrobe items when app starts
  useEffect(() => {
    const loadSavedWardrobe = async () => {
      try {
        const response = await fetch('/api/get-wardrobe');
        const result = await response.json();
        
        if (result.success && result.items?.length > 0) {
          setWardrobe(result.items);
          console.log(`✅ Loaded ${result.items.length} items from database`);
        } else {
          console.log('📦 No saved items found in database');
        }
      } catch (error) {
        console.log('⚠️ Could not load saved items (not critical):', error);
      }
    };

    loadSavedWardrobe();
  }, []);

  // Helper function to save analysis results to database
  const saveToDatabase = async (analysisResult, imageData, category = 'wardrobe') => {
    try {
      console.log('💾 Saving to database...');
      const response = await fetch('/api/save-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisResult,
          imageData,
          category
        })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Successfully saved to database:', result.itemId);
        return result.itemId;
      } else {
        console.warn('⚠️ Failed to save to database:', result.error);
        return null;
      }
    } catch (error) {
      console.warn('⚠️ Database save failed (analysis still works):', error);
      return null;
    }
  };

  const handleWardrobeUpload = async (files) => {
    const newItems = [];
    setIsUploading(true);
    setUploadProgress(0);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const tempId = Date.now() + '_' + i;
      
      setUploadingItems(prev => [...prev, tempId]);
      setCurrentAnalysisStep(`Analyzing ${file.name}...`);
      
      try {
        const base64 = await convertToBase64(file);
        setUploadProgress(((i + 0.5) / files.length) * 100);

        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            image: base64,
            type: 'wardrobe'
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Analysis failed');
        }

        const newItem = {
          id: Date.now() + '_' + i,
          tempId: tempId,
          name: file.name,
          image: base64,
          analysis: data.analysis || data,
          timestamp: new Date().toISOString(),
          isSaved: false
        };

        newItems.push(newItem);
        setWardrobe(prev => [...prev, newItem]);
        
        // Try to save to database in background
        saveToDatabase(data.analysis || data, base64, 'wardrobe').then(itemId => {
          if (itemId) {
            setWardrobe(prev => prev.map(item => 
              item.tempId === tempId ? { ...item, isSaved: true, databaseId: itemId } : item
            ));
          }
        });

      } catch (error) {
        console.error(`Failed to analyze ${file.name}:`, error);
      } finally {
        setUploadingItems(prev => prev.filter(id => id !== tempId));
      }

      setUploadProgress(((i + 1) / files.length) * 100);
    }

    setIsUploading(false);
    setUploadProgress(0);
    setCurrentAnalysisStep('');
    return newItems;
  };

  const handleInspirationUpload = async (file) => {
    setIsProcessingInspiration(true);
    setCurrentAnalysisStep('Analyzing inspiration image...');
    
    try {
      const base64 = await convertToBase64(file);
      setInspirationImage(base64);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image: base64,
          type: 'inspiration'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      setInspirationAnalysis(data.analysis || data);
      
      // Save inspiration to database too
      saveToDatabase(data.analysis || data, base64, 'inspiration');
      
      if (wardrobe.length > 0) {
        findMatches(data.analysis || data);
      }
    } catch (error) {
      console.error('Failed to analyze inspiration:', error);
      alert('Failed to analyze inspiration image. Please try again.');
    } finally {
      setIsProcessingInspiration(false);
      setCurrentAnalysisStep('');
    }
  };

  const findMatches = (inspirationData) => {
    setCurrentAnalysisStep('Finding matches in your wardrobe...');
    
    const matches = wardrobe.map(item => {
      let score = 0;
      
      if (inspirationData.colors && item.analysis?.colors) {
        const commonColors = inspirationData.colors.filter(color => 
          item.analysis.colors?.includes(color)
        ).length;
        score += commonColors * 20;
      }
      
      if (inspirationData.style === item.analysis?.style) {
        score += 30;
      }
      
      if (inspirationData.category === item.analysis?.category) {
        score += 20;
      }
      
      return {
        ...item,
        matchScore: score
      };
    }).filter(item => item.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore);

    setMatchingResults(matches);
  };

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const getQualityBadgeColor = (tier) => {
    const tierLower = (tier || '').toLowerCase();
    if (tierLower.includes('ultra-luxury') || tierLower.includes('haute')) 
      return 'bg-purple-500';
    if (tierLower.includes('luxury') || tierLower.includes('premium')) 
      return 'bg-yellow-500';
    if (tierLower.includes('contemporary') || tierLower.includes('mid')) 
      return 'bg-blue-500';
    return 'bg-gray-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Luxury Wardrobe Analyzer
          </h1>
          <p className="text-gray-600">AI-powered authentication & style curation</p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Wardrobe Upload Section */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center mb-4">
              <Package className="w-6 h-6 text-purple-600 mr-2" />
              <h2 className="text-2xl font-semibold">Your Wardrobe</h2>
              {wardrobe.length > 0 && (
                <span className="ml-auto text-sm text-gray-500">
                  {wardrobe.length} items
                </span>
              )}
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-purple-400 transition-colors">
              <input
                type="file"
                id="wardrobe-upload"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => handleWardrobeUpload(Array.from(e.target.files))}
                disabled={isUploading}
              />
              <label htmlFor="wardrobe-upload" className="cursor-pointer">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-1">Drop wardrobe items here</p>
                <p className="text-sm text-gray-400">or click to browse</p>
              </label>
            </div>

            {/* Upload Progress */}
            {isUploading && (
              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>{currentAnalysisStep}</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Wardrobe Grid */}
            {wardrobe.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mt-6">
                {wardrobe.map((item) => (
                  <div 
                    key={item.id}
                    className="relative group cursor-pointer rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                    onClick={() => setSelectedItem(item)}
                  >
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="w-full h-32 object-cover"
                    />
                    {uploadingItems.includes(item.tempId) && (
                      <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                      <p className="text-white text-xs truncate">
                        {item.analysis?.brand || item.analysis?.brandIdentifiers?.likelyBrand || 'Unknown'}
                      </p>
                    </div>
                    {item.analysis?.estimatedTier && (
                      <div className={`absolute top-2 left-2 w-3 h-3 rounded-full ${getQualityBadgeColor(item.analysis.estimatedTier)}`} />
                    )}
                    {item.isSaved && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle className="w-4 h-4 text-green-500 bg-white rounded-full" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Inspiration Upload Section */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center mb-4">
              <Sparkles className="w-6 h-6 text-pink-600 mr-2" />
              <h2 className="text-2xl font-semibold">Style Inspiration</h2>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-pink-400 transition-colors">
              <input
                type="file"
                id="inspiration-upload"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files[0] && handleInspirationUpload(e.target.files[0])}
                disabled={isProcessingInspiration}
              />
              <label htmlFor="inspiration-upload" className="cursor-pointer">
                <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-1">Upload inspiration image</p>
                <p className="text-sm text-gray-400">Find matching items in your wardrobe</p>
              </label>
            </div>

            {/* Processing Indicator */}
            {isProcessingInspiration && (
              <div className="mt-4 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">{currentAnalysisStep}</p>
              </div>
            )}

            {/* Inspiration Image Display */}
            {inspirationImage && !isProcessingInspiration && (
              <div className="mt-6">
                <img 
                  src={inspirationImage} 
                  alt="Inspiration"
                  className="w-full rounded-lg shadow-md"
                />
                {inspirationAnalysis && (
                  <div className="mt-4 p-4 bg-pink-50 rounded-lg">
                    <h3 className="font-semibold mb-2">Style Analysis</h3>
                    <div className="text-sm space-y-1">
                      <p><span className="font-medium">Style:</span> {inspirationAnalysis.style}</p>
                      <p><span className="font-medium">Colors:</span> {inspirationAnalysis.colors?.join(', ')}</p>
                      <p><span className="font-medium">Vibe:</span> {inspirationAnalysis.vibe}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Matching Results */}
            {matchingResults && matchingResults.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold mb-3">Matching Items</h3>
                <div className="grid grid-cols-3 gap-2">
                  {matchingResults.slice(0, 6).map((item) => (
                    <div 
                      key={item.id}
                      className="relative cursor-pointer rounded-lg overflow-hidden shadow hover:shadow-lg transition-shadow"
                      onClick={() => setSelectedItem(item)}
                    >
                      <img 
                        src={item.image} 
                        alt={item.name}
                        className="w-full h-24 object-cover"
                      />
                      <div className="absolute top-1 right-1 bg-green-500 text-white text-xs px-1 rounded">
                        {item.matchScore}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Selected Item Modal */}
        {selectedItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
                <h2 className="text-2xl font-bold">Item Analysis</h2>
                <button 
                  onClick={() => setSelectedItem(null)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Image */}
                  <div>
                    <img 
                      src={selectedItem.image} 
                      alt={selectedItem.name}
                      className="w-full rounded-lg shadow-md"
                    />
                    {selectedItem.isSaved && (
                      <div className="flex items-center mt-2 text-green-600 text-sm">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Saved to database
                      </div>
                    )}
                  </div>
                  
                  {/* Analysis Details */}
                  <div className="space-y-4">
                    {/* Basic Info */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold mb-2">Basic Information</h3>
                      <div className="text-sm space-y-1">
                        <p><span className="font-medium">Type:</span> {selectedItem.analysis?.itemType || 'Unknown'}</p>
                        <p><span className="font-medium">Category:</span> {selectedItem.analysis?.category || 'Unknown'}</p>
                        <p><span className="font-medium">Estimated Tier:</span> {selectedItem.analysis?.estimatedTier || 'Unknown'}</p>
                      </div>
                    </div>

                    {/* Brand Identifiers */}
                    {selectedItem.analysis?.brandIdentifiers && (
                      <div className="bg-yellow-50 p-4 rounded-lg">
                        <h3 className="font-semibold mb-2">Brand Identifiers</h3>
                        <div className="text-sm space-y-1">
                          {selectedItem.analysis.brandIdentifiers.likelyBrand && (
                            <p><span className="font-medium">Likely Brand:</span> {selectedItem.analysis.brandIdentifiers.likelyBrand} ({selectedItem.analysis.brandIdentifiers.confidence}% confidence)</p>
                          )}
                          {selectedItem.analysis.brandIdentifiers.constructionHouse && (
                            <p><span className="font-medium">Construction House:</span> {selectedItem.analysis.brandIdentifiers.constructionHouse}</p>
                          )}
                          {selectedItem.analysis.brandIdentifiers.visibleLogos && (
                            <p><span className="font-medium">Visible Logos:</span> {selectedItem.analysis.brandIdentifiers.visibleLogos}</p>
                          )}
                          {selectedItem.analysis.brandIdentifiers.hiddenSignatures && (
                            <p><span className="font-medium">Hidden Signatures:</span> {selectedItem.analysis.brandIdentifiers.hiddenSignatures}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Authentication Markers */}
                    {selectedItem.analysis?.authenticationMarkers && (
                      <div className="bg-green-50 p-4 rounded-lg">
                        <h3 className="font-semibold mb-2">Authentication Markers</h3>
                        <div className="text-sm space-y-1">
                          {Object.entries(selectedItem.analysis.authenticationMarkers).map(([key, value]) => (
                            <p key={key}>
                              <span className="font-medium">{key.replace(/([A-Z])/g, ' $1').trim()}:</span> {value}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Construction Signatures */}
                    {selectedItem.analysis?.constructionSignatures && (
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h3 className="font-semibold mb-2">Construction Details</h3>
                        <div className="text-sm space-y-1">
                          {Object.entries(selectedItem.analysis.constructionSignatures).map(([key, value]) => (
                            <p key={key}>
                              <span className="font-medium">{key.replace(/([A-Z])/g, ' $1').trim()}:</span> {value}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Valuation */}
                    {selectedItem.analysis?.valuation && (
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <h3 className="font-semibold mb-2">Estimated Value</h3>
                        <div className="text-sm space-y-1">
                          <p className="text-2xl font-bold text-purple-600">
                            {selectedItem.analysis.valuation.estimatedRetailValue}
                          </p>
                          {selectedItem.analysis.valuation.resaleValue && (
                            <p><span className="font-medium">Resale Value:</span> {selectedItem.analysis.valuation.resaleValue}</p>
                          )}
                          {selectedItem.analysis.valuation.confidence && (
                            <p><span className="font-medium">Confidence:</span> {selectedItem.analysis.valuation.confidence}%</p>
                          )}
                        </div>
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