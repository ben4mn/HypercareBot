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
      // Try to get existing collection
      return await client.getCollection({ name: collectionName });
    } catch (error) {
      // Create new collection if it doesn't exist with null embedding function
      // since we provide embeddings directly
      logger.info(`Creating new ChromaDB collection: ${collectionName}`);
      return await client.createCollection({ 
        name: collectionName,
        metadata: { chatbotId },
        embeddingFunction: null // Explicitly null since we provide embeddings directly
      });
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
    logger.info(`🔍 ChromaDB: Getting collection for chatbot ${chatbotId}`);
    const collection = await this.getCollection(chatbotId);
    
    logger.info(`🔍 ChromaDB: Collection retrieved, querying with embedding length=${queryEmbedding.length}`);
    
    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: limit
    });
    
    logger.info(`📊 ChromaDB: Query results:`, {
      documentsLength: results.documents?.length,
      metadatasLength: results.metadatas?.length,
      distancesLength: results.distances?.length,
      hasDocuments: !!results.documents,
      firstDocumentArray: results.documents?.[0]?.length
    });
    
    if (!results.documents || results.documents.length === 0) {
      logger.warn(`❌ ChromaDB: No documents found in results`);
      return [];
    }
    
    if (!results.documents[0] || results.documents[0].length === 0) {
      logger.warn(`❌ ChromaDB: First document array is empty`);
      return [];
    }
    
    logger.info(`✅ ChromaDB: Found ${results.documents[0].length} document(s) in collection`);
    
    // Format results
    return results.documents[0].map((doc, index) => ({
      content: doc,
      metadata: results.metadatas[0][index],
      distance: results.distances[0][index]
    }));
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