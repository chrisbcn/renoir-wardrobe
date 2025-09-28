// api/analyze-receipt.js - NEW FILE TO CREATE

import receiptAnalyzer from '../src/lib/receipt-analyzer.js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image, type, mimeType } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    console.log('📄 Starting receipt analysis...');

    // Convert base64 to File-like object
    const imageFile = base64ToFile(image, 'receipt.jpg', mimeType || 'image/jpeg');
    
    // Use receipt analyzer
    const result = await receiptAnalyzer.analyzeReceipt(imageFile, 'image');
    
    console.log(`✅ Receipt analysis complete. Found ${result.items.length} items`);

    res.status(200).json(result);

  } catch (error) {
    console.error('❌ Receipt analysis failed:', error);
    res.status(500).json({
      error: 'Receipt analysis failed',
      details: error.message
    });
  }
}

function base64ToFile(base64String, filename, mimeType) {
  const byteCharacters = atob(base64String);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });
  
  // Add File-like properties
  blob.name = filename;
  blob.lastModified = Date.now();
  blob.size = byteArray.length;
  blob.type = mimeType;
  
  return blob;
}