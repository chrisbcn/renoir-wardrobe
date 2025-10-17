// src/hooks/useVertexAI.js - React hook for VertexAI integration
import { useState, useCallback } from 'react';

export const useVertexAI = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [error, setError] = useState(null);
  const [testResults, setTestResults] = useState(null);

  // Test VertexAI connection (will work once deployed)
  const testConnection = useCallback(async () => {
    try {
      setError(null);
      console.log('Testing VertexAI connection...');
      
      const response = await fetch('/api/vertex-ai/test', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();
      setTestResults(result);
      
      if (!result.success) {
        throw new Error(result.error || 'Connection test failed');
      }
      
      console.log('VertexAI connection test successful');
      return result;
      
    } catch (err) {
      setError(err.message);
      console.error('VertexAI connection test failed:', err);
      throw err;
    }
  }, []);

  // Analyze image with VertexAI
  const analyzeImage = useCallback(async (imageData, analysisType = 'wardrobe') => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      console.log(`Starting VertexAI analysis (${analysisType})`);
      
      const response = await fetch('/api/vertex-ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image: imageData, 
          type: analysisType 
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Analysis failed: ${response.status}`);
      }

      const result = await response.json();
      setAnalysisResults(result);
      
      console.log('VertexAI analysis complete:', result.provider);
      return result;
      
    } catch (err) {
      setError(err.message);
      console.error('VertexAI analysis error:', err);
      throw err;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // Compare with Claude analysis
  const compareProviders = useCallback(async (imageData, analysisType = 'wardrobe') => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      console.log('Running comparison: VertexAI vs Claude');
      
      // Run both analyses in parallel
      const [vertexPromise, claudePromise] = [
        fetch('/api/vertex-ai/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imageData, type: analysisType })
        }),
        fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imageData, type: analysisType })
        })
      ];

      const [vertexResponse, claudeResponse] = await Promise.allSettled([
        vertexPromise,
        claudePromise
      ]);

      const results = {
        vertex: null,
        claude: null,
        comparison: null
      };

      // Process VertexAI result
      if (vertexResponse.status === 'fulfilled' && vertexResponse.value.ok) {
        results.vertex = await vertexResponse.value.json();
      } else {
        console.warn('VertexAI analysis failed');
        results.vertex = { error: 'VertexAI analysis failed' };
      }

      // Process Claude result
      if (claudeResponse.status === 'fulfilled' && claudeResponse.value.ok) {
        results.claude = await claudeResponse.value.json();
      } else {
        console.warn('Claude analysis failed');
        results.claude = { error: 'Claude analysis failed' };
      }

      // Generate comparison
      results.comparison = generateComparison(results.vertex, results.claude);
      
      setAnalysisResults(results);
      console.log('Comparison analysis complete');
      return results;
      
    } catch (err) {
      setError(err.message);
      console.error('Comparison analysis error:', err);
      throw err;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  return {
    isAnalyzing,
    analysisResults,
    error,
    testResults,
    testConnection,
    analyzeImage,
    compareProviders,
    clearError: () => setError(null),
    clearResults: () => setAnalysisResults(null)
  };
};

// Helper function to generate comparison between providers
function generateComparison(vertexResult, claudeResult) {
  if (!vertexResult?.analysis || !claudeResult?.analysis) {
    return {
      status: 'incomplete',
      message: 'One or both analyses failed'
    };
  }

  const vertex = vertexResult.analysis;
  const claude = claudeResult.analysis;

  return {
    status: 'complete',
    brandAgreement: vertex.brandIdentifiers?.likelyBrand === claude.brandIdentifiers?.likelyBrand,
    tierAgreement: vertex.overallAssessment?.tier === claude.overallAssessment?.tier,
    typeAgreement: vertex.type === claude.type,
    
    strengths: {
      vertex: [
        'Google integration',
        'Multi-item detection',
        'Fast processing'
      ],
      claude: [
        'Luxury expertise', 
        'Construction details',
        'Authentication focus'
      ]
    },
    
    differences: {
      brand: {
        vertex: vertex.brandIdentifiers?.likelyBrand || 'Unknown',
        claude: claude.brandIdentifiers?.likelyBrand || 'Unknown'
      },
      tier: {
        vertex: vertex.overallAssessment?.tier || 'Unknown',
        claude: claude.overallAssessment?.tier || 'Unknown'
      },
      confidence: {
        vertex: vertex.brandIdentifiers?.confidence || 0,
        claude: claude.brandIdentifiers?.confidence || 0
      }
    },
    
    recommendation: vertex.brandIdentifiers?.confidence > claude.brandIdentifiers?.confidence 
      ? 'Use VertexAI result' 
      : 'Use Claude result'
  };
}

export default useVertexAI;