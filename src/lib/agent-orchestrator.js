// src/lib/agent-orchestrator.js
// Master orchestrator for the agentic approach

import StyleAnalystAgent from './style-analyst-agent.js';
import ClothingSearchAgent from './clothing-search-agent.js';
import OutfitMatcherAgent from './outfit-matcher-agent.js';
import FashionpediaEnhancedAgent from './fashionpedia-enhanced-agent.js';

class AgentOrchestrator {
  constructor() {
    this.styleAnalyst = StyleAnalystAgent;
    this.clothingSearch = ClothingSearchAgent;
    this.outfitMatcher = OutfitMatcherAgent;
    this.fashionpediaEnhanced = FashionpediaEnhancedAgent;
  }

  // Main analysis workflow using the agentic approach
  async analyzeImage(imageData, analysisType = 'wardrobe') {
    try {
      console.log(`Starting agentic analysis workflow for type: ${analysisType}`);

      // Step 1: Fashionpedia-Enhanced Agent - Analyze the image with full Fashionpedia integration
      console.log('Step 1: Fashionpedia-Enhanced Agent analyzing image...');
      const styleAnalysis = await this.fashionpediaEnhanced.analyzeImage(imageData, analysisType);
      
      if (!styleAnalysis.success) {
        throw new Error(`Fashionpedia-Enhanced Agent failed: ${styleAnalysis.error}`);
      }

      // Step 2: ClothingSearch Agent - Generate optimized queries
      console.log('Step 2: ClothingSearch generating queries...');
      const clothingElements = styleAnalysis.result.clothing_components || [];
      const searchQueries = await this.clothingSearch.generateQueriesForElements(clothingElements);

      // Step 3: Prepare enhanced response
      const enhancedResponse = {
        ...styleAnalysis.result,
        search_queries: searchQueries,
        agent_analysis: {
          style_analyst: {
            success: styleAnalysis.success,
            confidence: styleAnalysis.confidence,
            needs_review: styleAnalysis.needsReview
          },
          clothing_search: {
            total_queries: searchQueries.length,
            successful_queries: searchQueries.filter(q => q.success).length,
            failed_queries: searchQueries.filter(q => !q.success).length
          }
        }
      };

      return {
        success: true,
        analysisType,
        result: enhancedResponse,
        confidence: styleAnalysis.confidence,
        needsReview: styleAnalysis.needsReview,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Agent orchestrator error:', error);
      return {
        success: false,
        error: error.message,
        confidence: 0,
        needsReview: true
      };
    }
  }

  // Match outfit using the agentic approach
  async matchOutfit(originalOutfit, searchResults) {
    try {
      console.log('Starting outfit matching with OutfitMatcher agent...');

      // Use OutfitMatcher Agent for intelligent matching
      const matchingResult = await this.outfitMatcher.matchOutfit(originalOutfit, searchResults);

      return {
        success: matchingResult.success,
        matches: matchingResult.matches,
        confidence: matchingResult.confidence,
        timestamp: matchingResult.timestamp
      };

    } catch (error) {
      console.error('Outfit matching error:', error);
      return {
        success: false,
        error: error.message,
        matches: [],
        confidence: 0
      };
    }
  }

  // Generate search queries for clothing elements
  async generateSearchQueries(clothingElements) {
    try {
      console.log('Generating search queries for clothing elements...');
      
      const queries = await this.clothingSearch.generateQueriesForElements(clothingElements);
      
      return {
        success: true,
        queries: queries,
        total_queries: queries.length,
        successful_queries: queries.filter(q => q.success).length,
        failed_queries: queries.filter(q => !q.success).length
      };

    } catch (error) {
      console.error('Query generation error:', error);
      return {
        success: false,
        error: error.message,
        queries: []
      };
    }
  }

  // Get agent status and capabilities
  getAgentStatus() {
    return {
      fashionpediaEnhanced: {
        available: true,
        capabilities: [
          'Fashionpedia vocabulary integration',
          '294 fine-grained attributes',
          '27 main categories validation',
          '19 parts analysis',
          'Component detection',
          'Enhanced embellishment detection',
          'Structural element analysis',
          'Brand identification',
          'Fashionpedia coverage calculation'
        ]
      },
      styleAnalyst: {
        available: true,
        capabilities: [
          'Image analysis',
          'Component detection',
          'Embellishment detection',
          'Structural element analysis',
          'Brand identification'
        ]
      },
      clothingSearch: {
        available: true,
        capabilities: [
          'Query optimization',
          'Color simplification',
          'Type mapping',
          'Vector database optimization',
          'Priority-based query generation'
        ]
      },
      outfitMatcher: {
        available: true,
        capabilities: [
          'Intelligent matching',
          'Priority-based selection',
          'Exact match detection',
          'Quality analysis',
          'Substitution logic'
        ]
      }
    };
  }

  // Test all agents
  async testAgents() {
    console.log('Testing all agents...');
    
    const results = {
      styleAnalyst: { success: false, error: null },
      clothingSearch: { success: false, error: null },
      outfitMatcher: { success: false, error: null }
    };

    // Test StyleAnalyst
    try {
      const testElement = {
        name: 'Test Dress',
        type: 'dress',
        color: 'blue',
        brand: 'Test Brand',
        attributes: ['sequined', 'metallic', 'shiny'],
        description: 'A beautiful sequined dress with metallic details'
      };
      
      // Test query generation
      const query = await this.clothingSearch.generateQuery(testElement);
      results.clothingSearch = { success: true, query: query };
    } catch (error) {
      results.clothingSearch = { success: false, error: error.message };
    }

    // Test OutfitMatcher
    try {
      const testOutfit = {
        description: 'Test outfit with sequined dress'
      };
      
      const testSearchResults = [{
        element: {
          name: 'Test Dress',
          description: 'Sequined dress',
          color: 'blue',
          attributes: ['sequined']
        },
        matches: [{
          id: 1,
          classification: 'dress',
          brand: 'Test Brand',
          similarity: 0.9,
          content: 'Blue sequined dress'
        }]
      }];
      
      const matchResult = await this.outfitMatcher.matchOutfit(testOutfit, testSearchResults);
      results.outfitMatcher = { success: matchResult.success, matches: matchResult.matches };
    } catch (error) {
      results.outfitMatcher = { success: false, error: error.message };
    }

    return results;
  }
}

export default new AgentOrchestrator();
