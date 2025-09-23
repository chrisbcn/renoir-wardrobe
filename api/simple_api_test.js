// api/analyze.js - Simple Test Version

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Test endpoint
  if (req.method === 'GET') {
    return res.status(200).json({ 
      message: 'API endpoint is working!',
      method: req.method,
      timestamp: new Date().toISOString()
    });
  }

  // Handle POST (your main functionality)
  if (req.method === 'POST') {
    return res.status(200).json({ 
      message: 'POST endpoint working - ready for image analysis',
      received: !!req.body,
      timestamp: new Date().toISOString()
    });
  }

  // Method not allowed
  return res.status(405).json({ error: 'Method not allowed' });
}