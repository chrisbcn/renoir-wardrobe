// import React, { useState, useEffect } from 'react';
// import './App.css';

// function App() {
//   const [wardrobe, setWardrobe] = useState([]);
//   const [testMessage, setTestMessage] = useState('App is loading...');
//   const [inspirationImage, setInspirationImage] = useState(null);
//   const [inspirationAnalysis, setInspirationAnalysis] = useState(null);
//   const [matchingResults, setMatchingResults] = useState(null);
//   const [isUploading, setIsUploading] = useState(false);
//   const [uploadProgress, setUploadProgress] = useState(0);
//   const [selectedItem, setSelectedItem] = useState(null);
//   const [isProcessingInspiration, setIsProcessingInspiration] = useState(false);
//   const [uploadingItems, setUploadingItems] = useState([]);
//   const [currentAnalysisStep, setCurrentAnalysisStep] = useState('');

//   // Load saved wardrobe items when app starts
//   useEffect(() => {
//     fetch('/api/get-wardrobe')
//       .then(res => res.json())
//       .then(data => {  // This names the parsed JSON as 'data'
//         if (data.success && data.items?.length > 0) {
//           const formattedItems = data.items.map(item => ({
//             id: item.id,
//             name: item.item_name || 'Item',
//             imageUrl: item.image_url,
//             analysis: item.analysis_data,
//             isSaved: true
//           }));
//           setWardrobe(formattedItems);
//           console.log(`Loaded ${formattedItems.length} saved items`);
//         }
//       })
//       .catch(err => console.log('Could not load saved items:', err));
//   }, []);// This closes the useEffect

//   // Handle wardrobe image uploads
//   const handleWardrobeUpload = async (e) => {
//     const files = Array.from(e.target.files);
//     if (!files.length) return;

//     setIsUploading(true);
//     setUploadProgress(0);

//     // Create placeholder items for loading state
//     const placeholders = files.map((file, index) => ({
//       id: `placeholder-${Date.now()}-${index}`,
//       imageUrl: URL.createObjectURL(file),
//       name: file.name,
//       isLoading: true,
//       loadingMessage: 'Preparing image...'
//     }));
    
//     setUploadingItems(placeholders);
    
//     const newItems = [];
    
//     for (let i = 0; i < files.length; i++) {
//       const file = files[i];
//       setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      
//       // Update loading message for current item
//       setUploadingItems(prev => prev.map((item, index) => 
//         index === i ? { ...item, loadingMessage: 'Analyzing luxury details...' } : item
//       ));
//       setCurrentAnalysisStep(`Analyzing item ${i + 1} of ${files.length}: ${file.name}`);
      
//       try {
//         // Convert to base64
//         const base64 = await new Promise((resolve) => {
//           const reader = new FileReader();
//           reader.onload = () => {
//             const base64String = reader.result.split(',')[1];
//             resolve(base64String);
//           };
//           reader.readAsDataURL(file);
//         });

//         // Update loading message
//         setUploadingItems(prev => prev.map((item, index) => 
//           index === i ? { ...item, loadingMessage: 'AI analyzing construction & authenticity...' } : item
//         ));

//         // Call backend API with luxury analysis
//         const response = await fetch('/api/analyze', {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({ 
//             image: base64,
//             type: 'wardrobe'
//           })
//         });

//         if (!response.ok) {
//           const error = await response.text();
//           throw new Error(`API error: ${response.status} - ${error}`);
//         }

//         const { analysis } = await response.json();
        
//         // Check for errors in analysis
//         if (analysis.error) {
//           throw new Error(analysis.error);
//         }
        
//         const item = {
//           id: Date.now() + Math.random(),
//           imageUrl: `data:image/jpeg;base64,${base64}`,
//           name: analysis.name || `${analysis.type || 'Item'} ${i + 1}`,
//           source: 'uploaded',
//           analysis: analysis,
//           isSaved: false
//         };

//         // Save to database in background
//         fetch('/api/save-item', {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({
//             analysisResult: analysis,
//             imageData: base64,
//             category: 'wardrobe'
//           })
//         })
//         .then(res => res.json())
//         .then(result => {
//           if (result.success) {
//             console.log('Saved to database:', result.itemId);
//             // Update the item to show it's saved
//             setWardrobe(prev => prev.map(w => 
//               w.id === item.id ? { ...w, isSaved: true } : w
//             ));
//           }
//         })
//         .catch(err => console.log('Save failed (but analysis worked):', err));
        
//         newItems.push(item);
        
//         // Remove processed placeholder
//         setUploadingItems(prev => prev.filter((_, index) => index !== i));
        
//       } catch (error) {
//         console.error(`Failed to analyze ${file.name}:`, error);
//         alert(`Failed to analyze ${file.name}: ${error.message}`);
        
//         // Remove failed placeholder
//         setUploadingItems(prev => prev.filter((_, index) => index !== i));
//       }
//     }
    
//     setWardrobe(prev => [...prev, ...newItems]);
//     setIsUploading(false);
//     setUploadingItems([]);
//     setCurrentAnalysisStep('');
//     e.target.value = null;
//   };

//   // Handle inspiration image upload
//   const handleInspirationUpload = async (e) => {
//     const file = e.target.files[0];
//     if (!file) return;

//     setIsProcessingInspiration(true);
//     setCurrentAnalysisStep('Preparing inspiration image...');
    
//     try {
//       // Convert to base64
//       const base64 = await new Promise((resolve) => {
//         const reader = new FileReader();
//         reader.onload = () => {
//           const base64String = reader.result.split(',')[1];
//           resolve(base64String);
//         };
//         reader.readAsDataURL(file);
//       });

//       const imageUrl = `data:image/jpeg;base64,${base64}`;
//       setInspirationImage(imageUrl);
      
//       // Update loading message
//       setCurrentAnalysisStep('Analyzing fashion items with luxury detail...');

//       // Call backend API with luxury analysis
//       const response = await fetch('/api/analyze', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ 
//           image: base64,
//           type: 'inspiration'
//         })
//       });

//       if (!response.ok) {
//         const error = await response.text();
//         throw new Error(`API error: ${response.status} - ${error}`);
//       }

//       const { analysis } = await response.json();
      
//       if (analysis.error) {
//         throw new Error(analysis.error);
//       }
      
//       setInspirationAnalysis(analysis);
      
//       // Update loading message
//       setCurrentAnalysisStep('Matching with your wardrobe...');
      
//       // Generate matches
//       generateMatches(analysis);
      
//       setCurrentAnalysisStep('');
      
//     } catch (error) {
//       console.error('Failed to analyze inspiration:', error);
//       alert(`Failed to analyze inspiration image: ${error.message}`);
//       setCurrentAnalysisStep('');
//     }
    
//     setIsProcessingInspiration(false);
//   };

//   // Generate matching results with enhanced luxury matching
//   const generateMatches = (inspirationData) => {
//     const matches = wardrobe.map(item => {
//       const similarity = calculateLuxurySimilarity(inspirationData, item.analysis);
//       return { ...item, similarity };
//     });
    
//     matches.sort((a, b) => b.similarity.score - a.similarity.score);
//     setMatchingResults(matches.slice(0, 5));
//   };

//   // Enhanced similarity calculation for luxury items
//   const calculateLuxurySimilarity = (inspiration, wardrobe) => {
//     if (!wardrobe || wardrobe.error) {
//       return { score: 0, reasoning: 'Unable to analyze this item' };
//     }

//     let score = 0;
//     const factors = [];
    
//     // Type match (30% - reduced to make room for quality matching)
//     if (inspiration.type === wardrobe.type) {
//       score += 30;
//       factors.push(`Same garment type (${wardrobe.type})`);
//     }
    
//     // Quality tier match (20% - new)
//     if (inspiration.overallAssessment?.tier === wardrobe.overallAssessment?.tier) {
//       score += 20;
//       factors.push(`Same quality tier (${wardrobe.overallAssessment?.tier})`);
//     }
    
//     // Construction style match (15% - new)
//     if (inspiration.brandIdentifiers?.constructionHouse === wardrobe.brandIdentifiers?.constructionHouse) {
//       score += 15;
//       factors.push(`Similar construction style (${wardrobe.brandIdentifiers?.constructionHouse})`);
//     }
    
//     // Color match (15%)
//     const colorMatch = inspiration.fabricAnalysis?.colors?.some(c1 => 
//       wardrobe.fabricAnalysis?.colors?.some(c2 => 
//         c1.toLowerCase().includes(c2.toLowerCase()) || 
//         c2.toLowerCase().includes(c1.toLowerCase())
//       )
//     );
//     if (colorMatch) {
//       score += 15;
//       factors.push('Color match found');
//     }
    
//     // Material match (10%)
//     if (inspiration.fabricAnalysis?.weaveStructure === wardrobe.fabricAnalysis?.weaveStructure) {
//       score += 10;
//       factors.push(`Same fabric type (${wardrobe.fabricAnalysis?.weaveStructure})`);
//     }
    
//     // Detail match (10%)
//     if (inspiration.lapelCollarArchitecture?.style === wardrobe.lapelCollarArchitecture?.style) {
//       score += 10;
//       factors.push(`Similar collar/lapel style`);
//     }
    
//     return {
//       score: Math.min(score, 95),
//       reasoning: factors.join(', ') || 'No significant matches'
//     };
//   };

//   // Add ESC key handler for modal
//   useEffect(() => {
//     const handleEsc = (e) => {
//       if (e.key === 'Escape' && selectedItem) {
//         setSelectedItem(null);
//       }
//     };
//     document.addEventListener('keydown', handleEsc);
//     return () => document.removeEventListener('keydown', handleEsc);
//   }, [selectedItem]);

//   return (
//     <div className="min-h-screen bg-gray-50 p-4">
//       <style>{`
//         @keyframes spin {
//           from { transform: rotate(0deg); }
//           to { transform: rotate(360deg); }
//         }
        
//         @keyframes shimmer {
//           0% { background-position: -200% 0; }
//           100% { background-position: 200% 0; }
//         }
        
//         .spinner {
//           animation: spin 1s linear infinite;
//         }
        
//         .shimmer {
//           background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
//           background-size: 200% 100%;
//           animation: shimmer 1.5s infinite;
//         }
//       `}</style>
//     </div>
//   );
// }
// export default App;
import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [wardrobe, setWardrobe] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Load saved items on startup
  useEffect(() => {
    fetch('/api/get-wardrobe')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.items?.length > 0) {
          const formattedItems = data.items.map(item => ({
            id: item.id,
            name: item.item_name || 'Item',
            imageUrl: item.image_url,
            analysis: item.analysis_data,
            isSaved: true
          }));
          setWardrobe(formattedItems);
          console.log(`Loaded ${formattedItems.length} saved items`);
        }
      })
      .catch(err => console.log('Could not load saved items:', err));
  }, []);

  const handleWardrobeUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setIsUploading(true);
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        // Convert to base64
        const base64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64String = reader.result.split(',')[1];
            resolve(base64String);
          };
          reader.readAsDataURL(file);
        });

        // Call API
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            image: base64,
            type: 'wardrobe'
          })
        });

        const { analysis } = await response.json();
        
        const item = {
          id: Date.now() + Math.random(),
          imageUrl: `data:image/jpeg;base64,${base64}`,
          name: analysis.name || `Item ${i + 1}`,
          analysis: analysis,
          isSaved: false
        };
        
        setWardrobe(prev => [...prev, item]);

        // Save to database in background
        fetch('/api/save-item', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            analysisResult: analysis,
            imageData: base64,
            category: 'wardrobe'
          })
        })
        .then(res => res.json())
        .then(result => {
          if (result.success) {
            console.log('Saved to database:', result.itemId);
            setWardrobe(prev => prev.map(w => 
              w.id === item.id ? { ...w, isSaved: true } : w
            ));
          }
        })
        .catch(err => console.log('Save failed:', err));
        
      } catch (error) {
        console.error(`Failed to analyze ${file.name}:`, error);
      }
    }
    
    setIsUploading(false);
    e.target.value = null;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Renoir - Luxury Fashion Analysis</h1>
          <p className="text-gray-600">Upload images to analyze</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Your Wardrobe</h2>
            <label className="px-4 py-2 bg-blue-500 text-white rounded cursor-pointer">
              <input 
                type="file" 
                multiple 
                accept="image/*"
                onChange={handleWardrobeUpload}
                className="hidden"
              />
              {isUploading ? 'Processing...' : 'Add Images'}
            </label>
          </div>

          {wardrobe.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-500">No items in wardrobe yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {wardrobe.map(item => (
                <div 
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="cursor-pointer hover:opacity-80 relative"
                >
                  <img 
                    src={item.imageUrl} 
                    alt={item.name}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  {item.isSaved && (
                    <div className="absolute top-1 left-1 w-2 h-2 bg-green-500 rounded-full" />
                  )}
                  <p className="text-xs text-center mt-1">{item.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal for item details */}
        {selectedItem && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedItem(null)}
          >
            <div 
              className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center p-4 border-b">
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
                    {selectedItem.analysis?.overallAssessment && (
                      <div className="bg-purple-50 p-3 rounded">
                        <h3 className="font-semibold mb-2">Overall Assessment</h3>
                        <div className="text-sm space-y-1">
                          <p><span className="font-medium">Tier:</span> {selectedItem.analysis.overallAssessment.tier}</p>
                          <p><span className="font-medium">Est. Retail:</span> {selectedItem.analysis.overallAssessment.estimatedRetail}</p>
                          <p><span className="font-medium">Condition:</span> {selectedItem.analysis.overallAssessment.condition}</p>
                          <p><span className="font-medium">Authenticity:</span> {selectedItem.analysis.overallAssessment.authenticityConfidence}</p>
                        </div>
                      </div>
                    )}
                    
                    {selectedItem.analysis?.brandIdentifiers && (
                      <div className="bg-yellow-50 p-3 rounded">
                        <h3 className="font-semibold mb-2">Brand Identifiers</h3>
                        <div className="text-sm space-y-1">
                          {selectedItem.analysis.brandIdentifiers.likelyBrand && (
                            <p><span className="font-medium">Likely Brand:</span> {selectedItem.analysis.brandIdentifiers.likelyBrand} ({selectedItem.analysis.brandIdentifiers.confidence}%)</p>
                          )}
                          <p><span className="font-medium">Construction:</span> {selectedItem.analysis.brandIdentifiers.constructionHouse}</p>
                        </div>
                      </div>
                    )}

                    {selectedItem.analysis?.fabricAnalysis && (
                      <div className="bg-green-50 p-3 rounded">
                        <h3 className="font-semibold mb-2">Fabric Analysis</h3>
                        <div className="text-sm space-y-1">
                          <p><span className="font-medium">Weave:</span> {selectedItem.analysis.fabricAnalysis.weaveStructure}</p>
                          <p><span className="font-medium">Quality:</span> {selectedItem.analysis.fabricAnalysis.yarnQuality}</p>
                          <p><span className="font-medium">Weight:</span> {selectedItem.analysis.fabricAnalysis.weight}</p>
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