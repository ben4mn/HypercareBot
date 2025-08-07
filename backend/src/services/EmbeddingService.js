import Anthropic from '@anthropic-ai/sdk';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';

export class EmbeddingService {
  static anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });

  // Simple deterministic embedding generator based on text content
  static generateDeterministicEmbedding(text, dimensions = 1536) {
    // Create a deterministic seed from the text
    const hash = crypto.createHash('sha256').update(text).digest();
    
    // Use the hash bytes to generate consistent pseudo-random numbers
    const embedding = [];
    for (let i = 0; i < dimensions; i++) {
      // Use different parts of the hash for each dimension
      const byteIndex = i % hash.length;
      const byte = hash[byteIndex];
      
      // Generate a value between -1 and 1 based on the byte value
      // Also mix in the position to add more variation
      const value = ((byte / 255.0) * 2 - 1) * Math.cos(i * 0.1);
      embedding.push(value);
    }
    
    // Add some text-based features to make similar texts have similar embeddings
    const words = text.toLowerCase().split(/\s+/);
    const wordFeatures = words.slice(0, 100); // Use first 100 words for features
    
    // Modify embedding based on word presence
    wordFeatures.forEach((word, index) => {
      const wordHash = crypto.createHash('md5').update(word).digest();
      const featureIndex = (wordHash[0] * 256 + wordHash[1]) % dimensions;
      // Add a small consistent modification based on the word
      embedding[featureIndex] += (wordHash[2] / 255.0 - 0.5) * 0.1;
    });
    
    // Normalize the embedding
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      return embedding.map(val => val / magnitude);
    }
    
    return embedding;
  }

  static async generateEmbeddings(texts) {
    try {
      // Note: In production, you should use a real embedding API like OpenAI's
      // This is a deterministic mock for testing that will produce consistent embeddings
      
      logger.info(`Generating deterministic embeddings for ${texts.length} chunks`);
      
      // Generate deterministic embeddings based on text content
      const embeddings = texts.map(text => {
        return this.generateDeterministicEmbedding(text);
      });
      
      logger.info(`✅ Generated ${embeddings.length} deterministic embeddings`);
      return embeddings;
    } catch (error) {
      logger.error('Error generating embeddings:', error);
      throw error;
    }
  }

  static async generateQueryEmbedding(query) {
    const [embedding] = await this.generateEmbeddings([query]);
    return embedding;
  }

  // Alternative: Use OpenAI embeddings if available
  static async generateOpenAIEmbeddings(texts) {
    // This would require OpenAI API setup
    // import OpenAI from 'openai';
    // const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // const response = await openai.embeddings.create({
    //   model: "text-embedding-3-small",
    //   input: texts
    // });
    
    // return response.data.map(item => item.embedding);
    
    throw new Error('OpenAI embeddings not configured');
  }
}