import { ChromaClient } from 'chromadb';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

export class ChromaDBService {
  static client = null;
  
  static async getClient() {
    if (!this.client) {
      this.client = new ChromaClient({
        path: process.env.CHROMA_URL || 'http://localhost:3052'
      });
    }
    return this.client;
  }

  static async getCollection(chatbotId) {
    const client = await this.getClient();
    const collectionName = `chatbot_${chatbotId}`;
    
    try {
      // Try to get existing collection first
      const collections = await client.listCollections();
      const exists = collections.some(col => col.name === collectionName);
      
      if (exists) {
        logger.info(`✅ ChromaDB: Using existing collection: ${collectionName}`);
        return await client.getCollection({ name: collectionName });
      } else {
        // Create new collection if it doesn't exist with null embedding function
        // since we provide embeddings directly
        logger.info(`📦 ChromaDB: Creating new collection: ${collectionName}`);
        return await client.createCollection({ 
          name: collectionName,
          metadata: { chatbotId },
          embeddingFunction: null // Explicitly null since we provide embeddings directly
        });
      }
    } catch (error) {
      logger.error(`❌ ChromaDB: Error getting/creating collection ${collectionName}:`, error);
      // If there's an error, try to create or get collection
      try {
        return await client.getOrCreateCollection({ 
          name: collectionName,
          metadata: { chatbotId },
          embeddingFunction: null
        });
      } catch (fallbackError) {
        logger.error(`❌ ChromaDB: Fallback also failed:`, fallbackError);
        throw fallbackError;
      }
    }
  }

  static async storeEmbeddings(chatbotId, documentId, chunks, embeddings) {
    logger.info(`📦 ChromaDB: Storing embeddings for chatbot=${chatbotId}, document=${documentId}`);
    logger.info(`📦 ChromaDB: chunks=${chunks.length}, embeddings=${embeddings.length}`);
    
    const collection = await this.getCollection(chatbotId);
    const ids = chunks.map(() => uuidv4());
    
    logger.info(`📦 ChromaDB: Generated ${ids.length} IDs, adding to collection...`);
    
    await collection.add({
      ids,
      embeddings,
      documents: chunks,
      metadatas: chunks.map((chunk, index) => ({
        documentId,
        chunkIndex: index,
        timestamp: new Date().toISOString()
      }))
    });
    
    logger.info(`✅ ChromaDB: Successfully stored ${chunks.length} embeddings for document ${documentId}`);
    return ids;
  }

  static async searchSimilar(chatbotId, queryEmbedding, limit = 5) {
    logger.info(`🔍 ChromaDB: Searching for similar documents in chatbot ${chatbotId}`);
    
    try {
      const collection = await this.getCollection(chatbotId);
      
      // Check if collection has any documents
      const collectionCount = await collection.count();
      logger.info(`📊 ChromaDB: Collection has ${collectionCount} total documents`);
      
      if (collectionCount === 0) {
        logger.warn(`⚠️ ChromaDB: Collection ${chatbotId} is empty - no documents to search`);
        return [];
      }
      
      logger.info(`🔍 ChromaDB: Querying with embedding length=${queryEmbedding.length}, limit=${limit}`);
      
      const results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: Math.min(limit, collectionCount) // Don't request more than available
      });
      
      logger.info(`📊 ChromaDB: Query results:`, {
        documentsLength: results.documents?.length,
        metadatasLength: results.metadatas?.length,
        distancesLength: results.distances?.length,
        hasDocuments: !!results.documents,
        firstDocumentArray: results.documents?.[0]?.length,
        collectionCount: collectionCount
      });
      
      if (!results.documents || results.documents.length === 0) {
        logger.warn(`❌ ChromaDB: No documents found in results despite collection having ${collectionCount} documents`);
        return [];
      }
      
      if (!results.documents[0] || results.documents[0].length === 0) {
        logger.warn(`❌ ChromaDB: First document array is empty despite collection having ${collectionCount} documents`);
        return [];
      }
      
      logger.info(`✅ ChromaDB: Found ${results.documents[0].length} similar document(s) out of ${collectionCount} total`);
      
      // Format results
      return results.documents[0].map((doc, index) => ({
        content: doc,
        metadata: results.metadatas[0][index],
        distance: results.distances[0][index]
      }));
    } catch (error) {
      logger.error(`❌ ChromaDB: Error searching similar documents:`, error);
      return [];
    }
  }

  static async deleteVectors(chatbotId, vectorIds) {
    const collection = await this.getCollection(chatbotId);
    
    await collection.delete({
      ids: vectorIds
    });
    
    logger.info(`Deleted ${vectorIds.length} vectors from chatbot ${chatbotId}`);
  }

  static async deleteCollection(chatbotId) {
    const client = await this.getClient();
    const collectionName = `chatbot_${chatbotId}`;
    
    try {
      await client.deleteCollection({ name: collectionName });
      logger.info(`Deleted collection for chatbot ${chatbotId}`);
    } catch (error) {
      logger.warn(`Failed to delete collection ${collectionName}:`, error.message);
    }
  }
}