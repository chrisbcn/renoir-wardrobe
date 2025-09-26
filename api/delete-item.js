export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
  
    // For now, just return success
    // You can add database deletion later
    return res.status(200).json({ 
      success: true,
      message: 'Item deleted successfully' 
    });
  }