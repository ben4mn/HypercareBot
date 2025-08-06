import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import { getDb } from '../models/database.js';
import { logger } from '../utils/logger.js';
import { DocumentProcessor } from './DocumentProcessor.js';
import { EmbeddingService } from './EmbeddingService.js';
import { ChromaDBService } from './ChromaDBService.js';

export class DocumentService {
  static async uploadDocuments(chatbotId, files) {
    const documents = [];
    
    for (const file of files) {
      const doc = await this.createDocument(chatbotId, file);
      documents.push(doc);
      
      // Process document asynchronously
      this.processDocument(doc.id).catch(error => {
        logger.error(`Failed to process document ${doc.id}:`, error);
      });
    }
    
    return documents;
  }

  static async createDocument(chatbotId, file) {
    const db = getDb();
    const id = uuidv4();
    
    const stmt = db.prepare(`
      INSERT INTO documents (
        id, chatbot_id, filename, file_type, file_path, file_size
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      chatbotId,
      file.originalname,
      path.extname(file.originalname).toLowerCase(),
      file.path,
      file.size
    );
    
    return this.getDocumentById(id);
  }

  static getDocumentById(id) {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM documents WHERE id = ?');
    return stmt.get(id);
  }

  static getDocumentsByChatbot(chatbotId) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT * FROM documents 
      WHERE chatbot_id = ? 
      ORDER BY uploaded_at DESC
    `);
    return stmt.all(chatbotId);
  }

  static async processDocument(documentId) {
    const document = this.getDocumentById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }
    
    try {
      // Extract text from document
      const text = await DocumentProcessor.extractText(document.file_path, document.file_type);
      
      // Chunk the text
      const chunks = DocumentProcessor.chunkText(text);
      
      // Generate embeddings
      const embeddings = await EmbeddingService.generateEmbeddings(chunks);
      
      // Store in ChromaDB
      const vectorIds = await ChromaDBService.storeEmbeddings(
        document.chatbot_id,
        documentId,
        chunks,
        embeddings
      );
      
      // Update document record
      const db = getDb();
      const stmt = db.prepare(`
        UPDATE documents 
        SET processed_at = CURRENT_TIMESTAMP, vector_ids = ? 
        WHERE id = ?
      `);
      stmt.run(JSON.stringify(vectorIds), documentId);
      
      logger.info(`Document ${documentId} processed successfully`);
      
      return this.getDocumentById(documentId);
    } catch (error) {
      logger.error(`Error processing document ${documentId}:`, error);
      throw error;
    }
  }

  static async deleteDocument(documentId) {
    const document = this.getDocumentById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }
    
    try {
      // Delete vectors from ChromaDB
      const vectorIds = JSON.parse(document.vector_ids || '[]');
      if (vectorIds.length > 0) {
        await ChromaDBService.deleteVectors(document.chatbot_id, vectorIds);
      }
      
      // Delete file from disk
      await fs.unlink(document.file_path).catch(() => {
        logger.warn(`Failed to delete file: ${document.file_path}`);
      });
      
      // Delete from database
      const db = getDb();
      const stmt = db.prepare('DELETE FROM documents WHERE id = ?');
      stmt.run(documentId);
      
      logger.info(`Document ${documentId} deleted successfully`);
    } catch (error) {
      logger.error(`Error deleting document ${documentId}:`, error);
      throw error;
    }
  }

  static async reprocessDocument(documentId) {
    const document = this.getDocumentById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }
    
    // Delete existing vectors
    const vectorIds = JSON.parse(document.vector_ids || '[]');
    if (vectorIds.length > 0) {
      await ChromaDBService.deleteVectors(document.chatbot_id, vectorIds);
    }
    
    // Reset processing status
    const db = getDb();
    const stmt = db.prepare(`
      UPDATE documents 
      SET processed_at = NULL, vector_ids = '[]' 
      WHERE id = ?
    `);
    stmt.run(documentId);
    
    // Reprocess
    return this.processDocument(documentId);
  }
}