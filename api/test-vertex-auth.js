// API endpoint to test Vertex AI Authentication
// Access via: /api/test-vertex-auth

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const logs = [];
  const log = (message) => {
    logs.push(message);
    console.log(message);
  };

  try {
    log('🔍 Testing Vertex AI Authentication...\n');
    
    // Step 1: Check environment variables
    log('1️⃣ Checking environment variables:');
    const requiredVars = [
      'GOOGLE_CLOUD_PROJECT_ID',
      'GOOGLE_PRIVATE_KEY',
      'GOOGLE_CLIENT_EMAIL',
      'GOOGLE_CLIENT_ID',
      'GOOGLE_PRIVATE_KEY_ID'
    ];
    
    const envStatus = {};
    let allPresent = true;
    for (const varName of requiredVars) {
      const present = !!process.env[varName];
      const length = process.env[varName]?.length || 0;
      envStatus[varName] = { present, length };
      log(`   ${present ? '✅' : '❌'} ${varName}: ${present ? `Present (${length} chars)` : 'MISSING'}`);
      if (!present) allPresent = false;
    }
    
    if (!allPresent) {
      return res.status(500).json({
        success: false,
        error: 'Missing required environment variables',
        envStatus,
        logs
      });
    }
    
    log('\n2️⃣ Generating OAuth token...');
    const { GoogleAuth } = require('google-auth-library');
    
    const auth = new GoogleAuth({
      credentials: {
        type: 'service_account',
        project_id: process.env.GOOGLE_CLOUD_PROJECT_ID,
        private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_CLIENT_ID,
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
      },
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });

    const tokenResponse = await auth.getAccessToken();
    const accessToken = tokenResponse.token;
    
    log('   ✅ Token generated successfully');
    log(`   Token length: ${accessToken.length} characters`);
    log(`   Token prefix: ${accessToken.substring(0, 20)}...`);
    log(`   Service account: ${process.env.GOOGLE_CLIENT_EMAIL}`);
    
    // Step 3: Test token with a simple API call
    log('\n3️⃣ Testing token with Vertex AI API...');
    
    // Use a simple base64 test image
    const testImage = "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=";
    
    const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/locations/us-central1/publishers/google/models/gemini-2.5-flash-image:generateContent`;
    
    log(`   Project: ${process.env.GOOGLE_CLOUD_PROJECT_ID}`);
    log(`   Endpoint: ${endpoint}`);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [
            { text: "Create a simple red t-shirt" },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: testImage
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.8,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 32768
        }
      })
    });

    log(`   Response status: ${response.status}`);
    log(`   Response status text: ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      log('\n❌ Vertex AI API Error:');
      log(`   Status: ${response.status}`);
      
      let errorDetails = null;
      try {
        errorDetails = JSON.parse(errorText);
        if (errorDetails.error) {
          log(`   Code: ${errorDetails.error.code}`);
          log(`   Message: ${errorDetails.error.message}`);
          log(`   Status: ${errorDetails.error.status}`);
          
          if (errorDetails.error.details && errorDetails.error.details.length > 0) {
            errorDetails.error.details.forEach((detail, i) => {
              log(`   Detail ${i + 1}:`);
              log(`      Reason: ${detail.reason}`);
              if (detail.metadata) {
                log(`      Service: ${detail.metadata.service}`);
                log(`      Method: ${detail.metadata.method}`);
              }
            });
          }
        }
      } catch (e) {
        log(`   Raw error: ${errorText}`);
      }
      
      return res.status(500).json({
        success: false,
        error: 'Vertex AI API call failed',
        vertexError: errorDetails,
        logs,
        troubleshooting: {
          step1: 'Enable Vertex AI API in Google Cloud Console',
          step2: 'Grant "Vertex AI User" role to service account',
          step3: 'Grant "Vertex AI Administrator" role to service account',
          serviceAccount: process.env.GOOGLE_CLIENT_EMAIL,
          projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
        }
      });
    }

    const result = await response.json();
    log('\n✅ SUCCESS! Vertex AI API is working!');
    log(`   Response has candidates: ${result.candidates ? result.candidates.length : 0}`);
    
    return res.status(200).json({
      success: true,
      message: 'Vertex AI authentication is working correctly!',
      details: {
        tokenGenerated: true,
        apiCallSuccessful: true,
        candidatesReturned: result.candidates ? result.candidates.length : 0
      },
      logs
    });
    
  } catch (error) {
    log(`\n❌ Test failed with exception: ${error.message}`);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      logs
    });
  }
}

