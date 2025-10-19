// Test Gemini API locally
async function testGeminiLocal() {
  try {
    console.log('🧪 Testing Gemini API locally...');
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "Create a simple red shirt in a ghost mannequin style" }
          ]
        }],
        generationConfig: {
          temperature: 1.0,
          topK: 32,
          topP: 0.95,
          maxOutputTokens: 32768,
        },
        responseModalities: ["TEXT", "IMAGE"]
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

    if (result.candidates && result.candidates.length > 0) {
      const candidate = result.candidates[0];
      console.log("🔍 Candidate structure:", JSON.stringify(candidate, null, 2));
      
      if (candidate.content && candidate.content.parts) {
        console.log("🔍 Parts found:", candidate.content.parts.length);
        for (let i = 0; i < candidate.content.parts.length; i++) {
          const part = candidate.content.parts[i];
          console.log(`🔍 Part ${i}:`, JSON.stringify(part, null, 2));
          
          if (part.inlineData && part.inlineData.data) {
            console.log('✅ Found image data!');
            console.log('Data length:', part.inlineData.data.length);
            console.log('MIME type:', part.inlineData.mimeType);
            return;
          }
          if (part.text) {
            console.log('Generated text:', part.text);
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testGeminiLocal();
