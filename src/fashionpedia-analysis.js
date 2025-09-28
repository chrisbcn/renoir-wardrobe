// api/fashionpedia-analysis.js
import { spawn } from 'child_process';
import fs from 'fs/promises';

export default async function handler(req, res) {
  try {
    // Save image temporarily
    const imageBuffer = Buffer.from(req.body.image.split(',')[1], 'base64');
    const tempImagePath = `/tmp/analysis_${Date.now()}.jpg`;
    await fs.writeFile(tempImagePath, imageBuffer);

    // Run Fashionpedia model
    const pythonProcess = spawn('python', ['./python/fashionpedia_analyzer.py', tempImagePath]);
    
    let result = '';
    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });

    pythonProcess.on('close', async (code) => {
      if (code === 0) {
        const fashionpediaResults = JSON.parse(result);
        
        // Enhance with luxury analysis
        const enhancedResults = await enhanceWithLuxuryAnalysis(
          req.body.image, 
          fashionpediaResults
        );
        
        res.json({ success: true, ...enhancedResults });
      } else {
        res.status(500).json({ success: false, error: 'Fashionpedia analysis failed' });
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}