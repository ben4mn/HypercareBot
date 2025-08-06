import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger.js';

export class EmbeddingService {
  static anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });

  static async generateEmbeddings(texts) {
    try {
      // Note: As of my knowledge cutoff, Anthropic doesn't have a dedicated embeddings API
      // In a real implementation, you might use OpenAI's embeddings API or another service
      // For now, we'll simulate embeddings generation
      
      logger.info(`Generating embeddings for ${texts.length} chunks`);
      
      // Simulate embeddings (in production, use actual embedding API)
      const embeddings = texts.map(() => {
        // Generate a random 1536-dimensional vector (OpenAI embedding size)
        return Array.from({ length: 1536 }, () => Math.random() * 2 - 1);
      });
      
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