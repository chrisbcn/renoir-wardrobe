// api/test-env.js - Test environment variables
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const envCheck = {
      ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
      GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
      NODE_ENV: process.env.NODE_ENV
    };

    const missingVars = Object.entries(envCheck)
      .filter(([key, value]) => !value && key !== 'NODE_ENV')
      .map(([key]) => key);

    return res.status(200).json({
      success: missingVars.length === 0,
      environment: envCheck,
      missing: missingVars,
      message: missingVars.length === 0 
        ? 'All required environment variables are set!' 
        : `Missing variables: ${missingVars.join(', ')}`
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
