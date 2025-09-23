// test-claude.js - Simple Claude API test

const ANTHROPIC_API_KEY = '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'; // Replace with your actual key

async function testClaude() {
  console.log('Testing Claude API connection...');
  
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: 'Hello! Just testing the API connection. Please respond with "API working!"'
          }
        ]
      })
    });

    console.log('Response Status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error Response:', errorText);
      return;
    }

    const data = await response.json();
    console.log('Claude Response:', data.content[0].text);
    console.log('✅ Claude API is working!');
    
  } catch (error) {
    console.error('❌ Claude API Test Failed:', error.message);
  }
}

testClaude();