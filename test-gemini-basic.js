// Test basic Gemini API with text generation
async function testGeminiBasic() {
  try {
    console.log('🧪 Testing basic Gemini API...');
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: "Hello, can you tell me what you are?" }]
        }]
      })
    });

    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', errorText);
      return;
    }

    const result = await response.json();
    console.log("🔍 Response:", JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testGeminiBasic();
