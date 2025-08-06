import { ChromaDBService } from './ChromaDBService.js';
import { EmbeddingService } from './EmbeddingService.js';
import { ClaudeService } from './ClaudeService.js';
import { logger } from '../utils/logger.js';

export class RAGService {
  static async searchRelevantDocuments(chatbotId, query, limit = 5) {
    try {
      logger.info(`🔍 RAG: Searching for documents relevant to: "${query.substring(0, 50)}..."`);
      logger.info(`🔍 RAG: ChatbotId=${chatbotId}, limit=${limit}`);
      
      // Generate embedding for the user query
      logger.info(`🧠 RAG: Generating query embedding...`);
      const queryEmbedding = await EmbeddingService.generateEmbeddings([query]);
      
      if (!queryEmbedding || queryEmbedding.length === 0) {
        logger.warn('❌ RAG: Failed to generate query embedding');
        return [];
      }
      
      logger.info(`✅ RAG: Query embedding generated, length=${queryEmbedding[0]?.length}`);
      
      // Search for similar documents using ChromaDB
      logger.info(`🔍 RAG: Searching ChromaDB for similar documents...`);
      const results = await ChromaDBService.searchSimilar(chatbotId, queryEmbedding[0], limit);
      
      logger.info(`📊 RAG: ChromaDB returned ${results.length} raw results`);
      
      if (results.length > 0) {
        logger.info(`📄 RAG: Sample result - content length: ${results[0].content?.length}, distance: ${results[0].distance}`);
      }
      
      // Format results for context injection
      const formattedResults = results.map(result => {
        // ChromaDB uses cosine distance (0 = identical, higher = more different)
        // Convert to similarity score (higher = more similar)
        const distance = result.distance || 0;
        // For cosine distance, similarity = 1 - (distance / max_possible_distance)
        // But since we don't know max distance, let's use 1/(1+distance) for now
        const relevanceScore = distance === 0 ? 1.0 : 1.0 / (1 + distance);
        
        return {
          content: result.content,
          metadata: result.metadata,
          relevanceScore: relevanceScore,
          rawDistance: distance // Keep original for debugging
        };
      });
      
      logger.info(`✅ RAG: Formatted ${formattedResults.length} relevant document chunks`);
      
      return formattedResults;
      
    } catch (error) {
      logger.error('❌ RAG: Error searching relevant documents:', error);
      return [];
    }
  }

  static async generateContextualResponse(chatbot, userMessage, conversationHistory = []) {
    try {
      // Search for relevant documents
      const relevantDocs = await this.searchRelevantDocuments(chatbot.id, userMessage, 3);
      
      // Filter documents by relevance threshold (lowered due to high distances)  
      const highRelevanceDocs = relevantDocs.filter(doc => doc.relevanceScore > 0.0005);
      
      logger.info(`Using ${highRelevanceDocs.length} high-relevance documents for context`);
      
      // Generate response with Claude
      const response = await ClaudeService.generateResponse(
        chatbot.system_prompt,
        userMessage,
        conversationHistory,
        highRelevanceDocs
      );
      
      return {
        response,
        documentsUsed: highRelevanceDocs.length,
        relevantDocuments: highRelevanceDocs.map(doc => ({
          content: doc.content.substring(0, 200) + '...',
          relevanceScore: doc.relevanceScore,
          metadata: doc.metadata
        }))
      };
      
    } catch (error) {
      logger.error('Error generating contextual response:', error);
      throw error;
    }
  }

  static async generateStreamingContextualResponse(chatbot, userMessage, conversationHistory = []) {
    try {
      logger.info(`🤖 RAG: Starting streaming contextual response generation`);
      logger.info(`🤖 RAG: ChatbotId=${chatbot.id}, message="${userMessage.substring(0, 50)}..."`);
      
      // Search for relevant documents
      const relevantDocs = await this.searchRelevantDocuments(chatbot.id, userMessage, 3);
      
      logger.info(`📚 RAG: Retrieved ${relevantDocs.length} relevant documents`);
      
      // Log relevance scores
      if (relevantDocs.length > 0) {
        relevantDocs.forEach((doc, index) => {
          logger.info(`📄 RAG: Doc ${index + 1}: relevance=${doc.relevanceScore.toFixed(3)}, content length=${doc.content.length}`);
        });
      }
      
      // Filter documents by relevance threshold (lowered due to high distances)
      const highRelevanceDocs = relevantDocs.filter(doc => doc.relevanceScore > 0.0005);
      
      logger.info(`🎯 RAG: Filtered to ${highRelevanceDocs.length} high-relevance documents (threshold > 0.0005)`);
      
      if (highRelevanceDocs.length === 0) {
        logger.warn(`⚠️ RAG: No high-relevance documents found! Using fallback response.`);
        // Log the actual scores for debugging
        relevantDocs.forEach((doc, index) => {
          logger.info(`🔍 RAG: Doc ${index + 1} details: relevance=${doc.relevanceScore.toFixed(6)}, rawDistance=${doc.rawDistance}`);
        });
      } else {
        logger.info(`🎉 RAG: Found ${highRelevanceDocs.length} documents above threshold!`);
      }
      
      // Generate streaming response with Claude
      const stream = await ClaudeService.generateStreamingResponse(
        chatbot.system_prompt,
        userMessage,
        conversationHistory,
        highRelevanceDocs
      );
      
      return {
        stream,
        documentsUsed: highRelevanceDocs.length,
        relevantDocuments: highRelevanceDocs.map(doc => ({
          content: doc.content.substring(0, 200) + '...',
          relevanceScore: doc.relevanceScore,
          metadata: doc.metadata
        }))
      };
      
    } catch (error) {
      logger.error('❌ RAG: Error generating streaming contextual response:', error);
      throw error;
    }
  }

  static async fallbackResponse(chatbot, userMessage, documents = []) {
    // Fallback for when Claude API is not available
    const docInfo = documents.length > 0 
      ? ` I have access to ${documents.length} document(s) in my knowledge base.`
      : ' No documents are currently available in my knowledge base.';
    
    return `I understand you're asking about: "${userMessage}".${docInfo} However, I'm currently running in fallback mode as the AI service is not available. Please try again later or contact support if this issue persists.`;
  }
}