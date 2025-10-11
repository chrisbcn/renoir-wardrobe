/**
 * Unified Upload API
 * Single endpoint that handles all wardrobe upload methods for mobile app
 */

import { UnifiedWardrobeAnalyzer } from '../../lib/analyzers/unified-analyzer.js';
import { OnboardingSession } from '../../lib/utils/onboarding-session.js';

// In-memory session storage (in production, use Redis or database)
const sessions = new Map();

export default async function handler(req, res) {
  // Set CORS headers for mobile app
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      user_id, 
      input_type, 
      image_data, 
      receipt_data, 
      social_data,
      session_id,
      options = {}
    } = req.body;

    console.log(`📱 Unified Upload: ${input_type} request for user ${user_id}`);

    // Validate required fields
    if (!user_id || !input_type) {
      return res.status(400).json({ 
        error: 'Missing required fields: user_id and input_type are required' 
      });
    }

    // Get or create session
    const session = getOrCreateSession(session_id, user_id);
    
    // Initialize analyzer
    const analyzer = new UnifiedWardrobeAnalyzer();
    
    // Prepare input data
    const inputData = prepareInputData(input_type, {
      image_data,
      receipt_data,
      social_data
    });

    if (!inputData) {
      return res.status(400).json({ 
        error: `Invalid input data for type: ${input_type}` 
      });
    }

    // Add start time for performance tracking
    const startTime = Date.now();
    options.startTime = startTime;

    // Process the input
    console.log(`🔍 Processing ${input_type} input...`);
    const result = await analyzer.analyzeInput(inputData, options);

    if (!result.success) {
      throw new Error(`Analysis failed: ${result.error || 'Unknown error'}`);
    }

    // Add items to session
    const sessionResult = await session.addItems(result.items, input_type);

    // Prepare response
    const response = {
      success: true,
      items: result.items,
      session: sessionResult,
      processing: {
        inputType: input_type,
        processingTime: Date.now() - startTime,
        itemsProcessed: result.items.length,
        totalItemsInSession: sessionResult.totalItems
      }
    };

    // Add source-specific metadata
    if (result.source) {
      response.source = result.source;
    }

    if (result.totalDetected) {
      response.processing.totalDetected = result.totalDetected;
    }

    if (result.successfullyAnalyzed) {
      response.processing.successfullyAnalyzed = result.successfullyAnalyzed;
    }

    console.log(`✅ Unified Upload: Successfully processed ${result.items.length} items in ${Date.now() - startTime}ms`);

    res.status(200).json(response);

  } catch (error) {
    console.error('❌ Unified Upload Error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Upload failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Get existing session or create new one
 */
function getOrCreateSession(sessionId, userId) {
  if (sessionId && sessions.has(sessionId)) {
    return sessions.get(sessionId);
  }
  
  const session = new OnboardingSession(sessionId);
  session.userId = userId;
  sessions.set(session.sessionId, session);
  
  console.log(`📋 Created new session: ${session.sessionId} for user: ${userId}`);
  
  return session;
}

/**
 * Prepare input data based on type
 */
function prepareInputData(inputType, data) {
  switch (inputType) {
    case 'single_image':
      if (!data.image_data) {
        throw new Error('image_data is required for single_image');
      }
      return {
        type: 'single_image',
        data: data.image_data
      };

    case 'outfit_image':
      if (!data.image_data) {
        throw new Error('image_data is required for outfit_image');
      }
      return {
        type: 'outfit_image',
        data: data.image_data
      };

    case 'receipt_image':
      if (!data.image_data) {
        throw new Error('image_data is required for receipt_image');
      }
      return {
        type: 'receipt_image',
        data: data.image_data
      };

    case 'receipt_text':
      if (!data.receipt_data) {
        throw new Error('receipt_data is required for receipt_text');
      }
      return {
        type: 'receipt_text',
        data: data.receipt_data
      };

    case 'social_media':
      if (!data.social_data) {
        throw new Error('social_data is required for social_media');
      }
      return {
        type: 'social_media',
        data: data.social_data
      };

    default:
      throw new Error(`Unsupported input type: ${inputType}`);
  }
}

/**
 * Get session information
 */
export async function getSessionHandler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { session_id } = req.query;

    if (!session_id) {
      return res.status(400).json({ error: 'session_id is required' });
    }

    const session = sessions.get(session_id);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.status(200).json({
      success: true,
      session: session.getProgress()
    });

  } catch (error) {
    console.error('❌ Get Session Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get session',
      message: error.message
    });
  }
}

/**
 * Complete onboarding session
 */
export async function completeSessionHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { session_id } = req.body;

    if (!session_id) {
      return res.status(400).json({ error: 'session_id is required' });
    }

    const session = sessions.get(session_id);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const finalWardrobe = session.completeSession();
    
    // TODO: Save to permanent storage (database)
    // await saveWardrobeToDatabase(finalWardrobe);
    
    // Clean up session
    sessions.delete(session_id);

    res.status(200).json({
      success: true,
      wardrobe: finalWardrobe,
      message: 'Onboarding completed successfully'
    });

  } catch (error) {
    console.error('❌ Complete Session Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete session',
      message: error.message
    });
  }
}
