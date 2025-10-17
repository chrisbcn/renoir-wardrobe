// src/components/EnhancedWardrobeUpload.jsx
import React, { useState, useEffect } from 'react';
import { useVertexAI } from '../hooks/useVertexAI';

const EnhancedWardrobeUpload = ({ onItemAdded, wardrobe, setWardrobe }) => {
  const [selectedProvider, setSelectedProvider] = useState('vertexai');
  const [uploadPreview, setUploadPreview] = useState(null);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [showTestPanel, setShowTestPanel] = useState(false);
  
  const { 
    isAnalyzing, 
    analysisResults, 
    error, 
    testResults,
    testConnection, 
    analyzeImage, 
    compareProviders,
    clearError 
  } = useVertexAI();

  // Test connection on component mount (only when deployed)
  useEffect(() => {
    if (selectedProvider === 'vertexai' && !testResults) {
      // Only test if we're likely deployed (not localhost)
      if (window.location.hostname !== 'localhost') {
        testConnection().catch(console.error);
      }
    }
  }, [selectedProvider, testConnection, testResults]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    clearError();

    try {
      // Create preview
      const previewUrl = URL.createObjectURL(file);
      setUploadPreview(previewUrl);

      // Convert to base64
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64String = reader.result.split(',')[1];
          resolve(base64String);
        };
        reader.readAsDataURL(file);
      });

      let result;
      
      // Analyze based on selected mode
      if (comparisonMode) {
        result = await compareProviders(base64, 'wardrobe');
      } else if (selectedProvider === 'vertexai') {
        result = await analyzeImage(base64, 'wardrobe');
      } else {
        // Use Claude (existing functionality)
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64, type: 'wardrobe' })
        });
        
        if (!response.ok) {
          throw new Error(`Claude analysis failed: ${response.status}`);
        }
        
        result = await response.json();
      }

      // Process successful result and add to wardrobe
      if (result && result.analysis) {
        const analysisData = comparisonMode ? result.vertex?.analysis : result.analysis;
        if (analysisData) {
          const newItem = {
            id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            imageUrl: previewUrl,
            name: analysisData.name || analysisData.type || 'Fashion Item',
            analysis: analysisData,
            provider: comparisonMode ? 'comparison' : selectedProvider,
            needsAnalysis: false
          };
          
          // Add to wardrobe state
          setWardrobe(prev => [newItem, ...prev]);
          
          // Call callback if provided
          if (onItemAdded) {
            onItemAdded(newItem);
          }
        }
      }

    } catch (error) {
      console.error('Upload failed:', error);
    }

    // Clear file input
    e.target.value = '';
  };

  const ProviderSelector = () => (
    <div className="provider-selector mb-6">
      <label className="text-sm font-medium text-gray-700 mb-2 block">
        AI Analysis Provider
      </label>
      
      <div className="grid grid-cols-1 gap-2">
        <label className={`
          flex items-center p-3 border rounded-lg cursor-pointer transition-all hover:bg-gray-50
          ${selectedProvider === 'vertexai' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
        `}>
          <input
            type="radio"
            name="provider"
            value="vertexai"
            checked={selectedProvider === 'vertexai'}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="sr-only"
          />
          <span className="text-lg mr-3">🔬</span>
          <div className="flex-1">
            <div className="font-medium text-gray-900">VertexAI (Gemini)</div>
            <div className="text-sm text-gray-500">Google's latest Gemini models</div>
            {testResults && selectedProvider === 'vertexai' && (
              <div className={`text-xs mt-1 ${testResults.success ? 'text-green-600' : 'text-red-600'}`}>
                {testResults.success ? '✅ Connected' : '❌ Connection failed'}
              </div>
            )}
          </div>
          {selectedProvider === 'vertexai' && (
            <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
          )}
        </label>

        <label className={`
          flex items-center p-3 border rounded-lg cursor-pointer transition-all hover:bg-gray-50
          ${selectedProvider === 'claude' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
        `}>
          <input
            type="radio"
            name="provider"
            value="claude"
            checked={selectedProvider === 'claude'}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="sr-only"
          />
          <span className="text-lg mr-3">🎭</span>
          <div className="flex-1">
            <div className="font-medium text-gray-900">Claude (Anthropic)</div>
            <div className="text-sm text-gray-500">Luxury fashion expertise</div>
          </div>
          {selectedProvider === 'claude' && (
            <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
          )}
        </label>
      </div>

      <div className="mt-3">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={comparisonMode}
            onChange={(e) => setComparisonMode(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-700">
            Comparison Mode (analyze with both providers)
          </span>
        </label>
      </div>
    </div>
  );

  const TestPanel = () => (
    <div className="test-panel mb-6 p-4 bg-gray-50 rounded-lg">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-medium text-gray-900">VertexAI Connection Test</h3>
        <button
          onClick={() => setShowTestPanel(!showTestPanel)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {showTestPanel ? 'Hide' : 'Show'} Details
        </button>
      </div>

      {showTestPanel && (
        <div className="space-y-2 text-sm">
          {testResults ? (
            <div>
              <div className={`${testResults.success ? 'text-green-600' : 'text-red-600'}`}>
                <strong>Status:</strong> {testResults.success ? '✅ Working' : '❌ Failed'}
              </div>
              {testResults.tests && (
                <div className="mt-2 space-y-1">
                  <div><strong>Project:</strong> {testResults.tests.configuration?.projectId}</div>
                  <div><strong>Region:</strong> {testResults.tests.configuration?.location}</div>
                  <div><strong>Credentials:</strong> {testResults.tests.configuration?.hasCredentials ? '✅' : '❌'}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500">
              {window.location.hostname === 'localhost' 
                ? 'Testing available after deployment' 
                : 'No test results yet'}
            </div>
          )}

          <button
            onClick={testConnection}
            disabled={window.location.hostname === 'localhost'}
            className={`mt-2 px-3 py-1 rounded text-sm ${
              window.location.hostname === 'localhost'
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {window.location.hostname === 'localhost' ? 'Deploy to Test' : 'Test Connection'}
          </button>
        </div>
      )}
    </div>
  );

  const UploadSection = () => (
    <div className="upload-section">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Upload Fashion Item
      </label>
      
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
          id="fashion-upload"
          disabled={isAnalyzing}
        />
        
        <label 
          htmlFor="fashion-upload" 
          className={`cursor-pointer inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
            isAnalyzing 
              ? 'bg-gray-400 text-white cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isAnalyzing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Analyzing...
            </>
          ) : (
            <>
              📷 Select Image
            </>
          )}
        </label>
        
        <p className="text-sm text-gray-500 mt-2">
          {comparisonMode 
            ? 'Upload will be analyzed by both VertexAI and Claude for comparison'
            : `Upload will be analyzed by ${selectedProvider === 'vertexai' ? 'Google VertexAI' : 'Anthropic Claude'}`
          }
        </p>
      </div>
    </div>
  );

  const ResultsDisplay = () => {
    if (!analysisResults) return null;

    if (comparisonMode && analysisResults.comparison) {
      return (
        <div className="results-display mt-6 space-y-4">
          <h3 className="font-medium text-gray-900">Analysis Comparison</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="vertex-result p-4 border rounded-lg">
              <h4 className="font-medium text-blue-600 mb-2">VertexAI Result</h4>
              {analysisResults.vertex?.analysis ? (
                <div className="space-y-1 text-sm">
                  <div><strong>Brand:</strong> {analysisResults.vertex.analysis.brandIdentifiers?.likelyBrand}</div>
                  <div><strong>Type:</strong> {analysisResults.vertex.analysis.type}</div>
                  <div><strong>Tier:</strong> {analysisResults.vertex.analysis.overallAssessment?.tier}</div>
                </div>
              ) : (
                <div className="text-red-600 text-sm">Analysis failed</div>
              )}
            </div>
            
            <div className="claude-result p-4 border rounded-lg">
              <h4 className="font-medium text-purple-600 mb-2">Claude Result</h4>
              {analysisResults.claude?.analysis ? (
                <div className="space-y-1 text-sm">
                  <div><strong>Brand:</strong> {analysisResults.claude.analysis.brandIdentifiers?.likelyBrand}</div>
                  <div><strong>Type:</strong> {analysisResults.claude.analysis.type}</div>
                  <div><strong>Tier:</strong> {analysisResults.claude.analysis.overallAssessment?.tier}</div>
                </div>
              ) : (
                <div className="text-red-600 text-sm">Analysis failed</div>
              )}
            </div>
          </div>
          
          <div className="comparison-summary p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2">Comparison Summary</h4>
            <div className="text-sm space-y-1">
              <div>Brand Agreement: {analysisResults.comparison.brandAgreement ? '✅' : '❌'}</div>
              <div>Tier Agreement: {analysisResults.comparison.tierAgreement ? '✅' : '❌'}</div>
              <div>Recommendation: {analysisResults.comparison.recommendation}</div>
            </div>
          </div>
        </div>
      );
    }

    // Single provider result
    const analysis = analysisResults.analysis;
    if (!analysis) return null;

    return (
      <div className="results-display mt-6 p-4 border rounded-lg bg-white">
        <h3 className="font-medium text-gray-900 mb-3">Analysis Result</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><strong>Item:</strong> {analysis.name}</div>
          <div><strong>Type:</strong> {analysis.type}</div>
          <div><strong>Brand:</strong> {analysis.brandIdentifiers?.likelyBrand}</div>
          <div><strong>Tier:</strong> {analysis.overallAssessment?.tier}</div>
          <div><strong>Provider:</strong> {analysisResults.provider}</div>
          {analysisResults.model && <div><strong>Model:</strong> {analysisResults.model}</div>}
        </div>
        
        {analysis.summary && (
          <div className="mt-3 pt-3 border-t">
            <strong>Summary:</strong>
            <p className="text-sm text-gray-600 mt-1">{analysis.summary}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="enhanced-wardrobe-upload max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Enhanced Wardrobe Upload</h2>
      
      {/* Provider Selection */}
      <ProviderSelector />
      
      {/* Test Panel (only for VertexAI) */}
      {selectedProvider === 'vertexai' && <TestPanel />}
      
      {/* Error Display */}
      {error && (
        <div className="error-message mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {/* Upload Section */}
      <UploadSection />
      
      {/* Image Preview */}
      {uploadPreview && (
        <div className="image-preview mt-6">
          <img 
            src={uploadPreview} 
            alt="Upload preview" 
            className="max-w-full h-64 object-contain mx-auto border rounded-lg"
          />
        </div>
      )}
      
      {/* Results Display */}
      <ResultsDisplay />
    </div>
  );
};

export default EnhancedWardrobeUpload;