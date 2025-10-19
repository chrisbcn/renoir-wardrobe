// api/debug-key.js - Debug API key
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    return res.status(200).json({
      success: true,
      keyLength: apiKey?.length || 0,
      keyPrefix: apiKey?.substring(0, 20) + '...',
      keySuffix: '...' + apiKey?.substring(apiKey?.length - 10),
      hasKey: !!apiKey,
      keyType: typeof apiKey
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
