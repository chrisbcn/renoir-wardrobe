// Test Vertex AI Authentication
// Run locally: node test-vertex-auth.js

async function testVertexAuth() {
  try {
    console.log('🔍 Testing Vertex AI Authentication...\n');
    
    // Step 1: Check environment variables
    console.log('1️⃣ Checking environment variables:');
    const requiredVars = [
      'GOOGLE_CLOUD_PROJECT_ID',
      'GOOGLE_PRIVATE_KEY',
      'GOOGLE_CLIENT_EMAIL',
      'GOOGLE_CLIENT_ID',
      'GOOGLE_PRIVATE_KEY_ID'
    ];
    
    let allPresent = true;
    for (const varName of requiredVars) {
      const present = !!process.env[varName];
      console.log(`   ${present ? '✅' : '❌'} ${varName}: ${present ? 'Present' : 'MISSING'}`);
      if (!present) allPresent = false;
    }
    
    if (!allPresent) {
      console.error('\n❌ Missing required environment variables');
      return;
    }
    
    console.log('\n2️⃣ Generating OAuth token...');
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
    
    console.log('   ✅ Token generated successfully');
    console.log(`   Token length: ${accessToken.length} characters`);
    console.log(`   Token prefix: ${accessToken.substring(0, 20)}...`);
    
    // Step 3: Test token with a simple API call
    console.log('\n3️⃣ Testing token with Vertex AI API...');
    
    // Use a simple base64 test image
    const testImage = "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=";
    
    const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/locations/us-central1/publishers/google/models/gemini-2.5-flash-image:generateContent`;
    
    console.log(`   Endpoint: ${endpoint}`);
    
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

    console.log(`   Response status: ${response.status}`);
    console.log(`   Response status text: ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('\n❌ Vertex AI API Error:');
      console.error('   Status:', response.status);
      console.error('   Response:', errorText);
      
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error) {
          console.error('\n📋 Error Details:');
          console.error('   Code:', errorJson.error.code);
          console.error('   Message:', errorJson.error.message);
          console.error('   Status:', errorJson.error.status);
          
          if (errorJson.error.details && errorJson.error.details.length > 0) {
            console.error('\n📋 Additional Details:');
            errorJson.error.details.forEach((detail, i) => {
              console.error(`   Detail ${i + 1}:`);
              console.error('      Type:', detail['@type']);
              console.error('      Reason:', detail.reason);
              if (detail.metadata) {
                console.error('      Metadata:', JSON.stringify(detail.metadata, null, 8));
              }
            });
          }
          
          // Provide specific fix suggestions
          console.error('\n💡 Troubleshooting:');
          if (errorJson.error.code === 401) {
            console.error('   - Check if Vertex AI API is enabled in Google Cloud Console');
            console.error('   - Verify service account has "Vertex AI User" role');
            console.error('   - Verify service account has "Vertex AI Administrator" role');
            console.error('   - Check if service account email matches GOOGLE_CLIENT_EMAIL');
          } else if (errorJson.error.code === 403) {
            console.error('   - Service account lacks required permissions');
            console.error('   - Grant "Vertex AI User" or "Vertex AI Administrator" role');
          } else if (errorJson.error.code === 404) {
            console.error('   - Model not available in your region (us-central1)');
            console.error('   - Or Vertex AI API not enabled');
          }
        }
      } catch (e) {
        // Error text is not JSON
      }
      
      return;
    }

    const result = await response.json();
    console.log('\n✅ SUCCESS! Vertex AI API is working!');
    console.log('   Response has candidates:', result.candidates ? result.candidates.length : 0);
    
  } catch (error) {
    console.error('\n❌ Test failed with exception:');
    console.error('   Error:', error.message);
    console.error('   Stack:', error.stack);
  }
}

// Run the test
testVertexAuth();

