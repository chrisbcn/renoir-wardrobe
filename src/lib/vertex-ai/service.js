// src/lib/vertex-ai/service.js - Updated for Vercel deployment
import { PredictionServiceClient } from '@google-cloud/aiplatform';
import { Storage } from '@google-cloud/storage';
import crypto from 'crypto';

class VertexAIService {
  constructor() {
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    this.location = process.env.GOOGLE_CLOUD_REGION || 'us-central1';
    
    // Get credentials from environment variable (Vercel deployment)
    let credentials;
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      try {
        credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
      } catch (error) {
        console.error('Failed to parse credentials JSON:', error);
      }
    }
    
    // Initialize clients
    this.predictionClient = new PredictionServiceClient({
      credentials,
      projectId: this.projectId
    });
    
    this.storage = new Storage({
      credentials,
      projectId: this.projectId
    });
    
    // Models configuration
    this.models = {
      vision: process.env.VERTEX_AI_MODEL_VISION || 'gemini-1.5-pro-vision-001',
      pro: process.env.VERTEX_AI_MODEL_PRO || 'gemini-1.5-pro-001',
      flash: process.env.VERTEX_AI_MODEL_FLASH || 'gemini-1.5-flash-001'
    };
    
    // Storage bucket
    this.bucketName = process.env.VERTEX_AI_STORAGE_BUCKET;
    if (this.bucketName) {
      this.bucket = this.storage.bucket(this.bucketName);
    }
  }

  async testConnection() {
    try {
      console.log('Testing VertexAI connection...');
      
      const endpoint = `projects/${this.projectId}/locations/${this.location}/publishers/google/models/${this.models.pro}`;
      
      const request = {
        endpoint,
        instances: [{
          content: {
            role: 'user',
            parts: [{ text: 'Hello, respond with "VertexAI connection successful"' }]
          }
        }],
        parameters: {
          temperature: 0.1,
          maxOutputTokens: 50
        }
      };

      const [response] = await this.predictionClient.predict(request);
      const result = response.predictions[0];
      
      return {
        success: true,
        message: 'VertexAI connection successful',
        response: result.content.parts[0].text
      };
      
    } catch (error) {
      console.error('VertexAI connection test failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async testStorageConnection() {
    try {
      if (!this.bucket) {
        throw new Error('Storage bucket not configured');
      }
      
      const [exists] = await this.bucket.exists();
      
      if (!exists) {
        throw new Error(`Storage bucket ${this.bucketName} does not exist`);
      }
      
      return {
        success: true,
        message: `Storage bucket ${this.bucketName} accessible`
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async healthCheck() {
    try {
      const tests = {
        configuration: {
          projectId: this.projectId,
          location: this.location,
          bucketName: this.bucketName,
          hasCredentials: !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
        },
        connection: await this.testConnection(),
        storage: await this.testStorageConnection()
      };
      
      const allHealthy = tests.connection.success && tests.storage.success;
      
      return {
        success: allHealthy,
        timestamp: new Date().toISOString(),
        tests
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

export default VertexAIService;
