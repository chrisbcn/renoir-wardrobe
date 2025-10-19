// Simple test to check Gemini API response structure
async function testGeminiAPI() {
  try {
    console.log('🧪 Testing Gemini API with simple request...');
    
    // Use a simple text prompt first to see if the API works
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=AIzaSyC14yhuynPqumf2ife-d-D4YoE7kJ...`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: "Hello, can you generate an image of a simple red shirt?" }]
        }],
        generationConfig: {
          temperature: 1.0,
          topK: 32,
          topP: 0.95,
          maxOutputTokens: 32768,
        }
      })
    });

    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', errorText);
      return;
    }

    const result = await response.json();
    console.log("🔍 Response structure:", JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testGeminiAPI();
