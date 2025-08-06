import { logger } from '../utils/logger.js';

// In-memory database implementation for local testing
class MemoryDatabase {
  constructor() {
    this.tables = {
      chatbots: new Map(),
      documents: new Map(),
      conversations: new Map(),
      messages: new Map(),
      analytics: new Map()
    };
    this.sequences = {
      chatbots: 0,
      documents: 0,
      conversations: 0,
      messages: 0,
      analytics: 0
    };
  }

  // Simulate SQL prepare/run interface
  prepare(sql) {
    return {
      run: (...params) => this.executeQuery(sql, params),
      get: (...params) => this.executeQuery(sql, params, true),
      all: (...params) => this.executeQuery(sql, params, false, true)
    };
  }

  exec(sql) {
    // For CREATE TABLE statements, just log them
    if (sql.includes('CREATE TABLE')) {
      logger.info('Creating table (in-memory):', sql.substring(0, 50) + '...');
      return;
    }
    // For other exec statements, ignore
  }

  pragma(setting) {
    logger.info('Setting pragma (in-memory):', setting);
  }

  executeQuery(sql, params = [], returnFirst = false, returnAll = false) {
    const sqlLower = sql.toLowerCase().trim();
    
    try {
      if (sqlLower.startsWith('insert into chatbots')) {
        return this.insertChatbot(params);
      } else if (sqlLower.startsWith('select * from chatbots where id')) {
        return this.getChatbotById(params[0], returnFirst);
      } else if (sqlLower.startsWith('select * from chatbots where slug')) {
        return this.getChatbotBySlug(params[0], returnFirst);
      } else if (sqlLower.includes('select * from chatbots') && sqlLower.includes('where archived_at is null')) {
        return this.getAllChatbots(returnAll);
      } else if (sqlLower.startsWith('update chatbots')) {
        return this.updateChatbot(sql, params);
      } else if (sqlLower.startsWith('update documents')) {
        return this.updateDocument(sql, params);
      } else if (sqlLower.startsWith('insert into documents')) {
        return this.insertDocument(params);
      } else if (sqlLower.startsWith('select * from documents where id')) {
        return this.getDocumentById(params[0], returnFirst);
      } else if (sqlLower.includes('select * from documents') && sqlLower.includes('where chatbot_id')) {
        return this.getDocumentsByChatbot(params[0], returnAll);
      } else if (sqlLower.startsWith('insert into conversations')) {
        return this.insertConversation(params);
      } else if (sqlLower.startsWith('insert into messages')) {
        return this.insertMessage(params);
      } else if (sqlLower.includes('select role, content from messages')) {
        return this.getConversationMessages(params[0], returnAll);
      } else {
        // Default fallback
        if (returnFirst) return null;
        if (returnAll) return [];
        return { changes: 0 };
      }
    } catch (error) {
      logger.error('Memory DB query error:', error.message);
      if (returnFirst) return null;
      if (returnAll) return [];
      return { changes: 0 };
    }
  }

  insertChatbot(params) {
    const [id, name, slug, system_prompt, welcome_message, config_json] = params;
    const chatbot = {
      id,
      name,
      slug,
      system_prompt,
      welcome_message,
      config_json: config_json || '{}',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      archived_at: null,
      is_active: 1
    };
    
    this.tables.chatbots.set(id, chatbot);
    return { changes: 1 };
  }

  getChatbotById(id, returnFirst = false) {
    const chatbot = this.tables.chatbots.get(id);
    return returnFirst ? chatbot || null : chatbot;
  }

  getChatbotBySlug(slug, returnFirst = false) {
    for (const chatbot of this.tables.chatbots.values()) {
      if (chatbot.slug === slug) {
        return returnFirst ? chatbot : chatbot;
      }
    }
    return returnFirst ? null : undefined;
  }

  getAllChatbots(returnAll = false) {
    const chatbots = Array.from(this.tables.chatbots.values())
      .filter(c => !c.archived_at)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    return returnAll ? chatbots : chatbots;
  }

  updateChatbot(sql, params) {
    const id = params[params.length - 1]; // ID is last parameter
    const chatbot = this.tables.chatbots.get(id);
    
    if (chatbot) {
      // Simple update logic - this is just for testing
      if (sql.includes('archived_at')) {
        chatbot.archived_at = new Date().toISOString();
      }
      if (sql.includes('is_active = 1')) {
        chatbot.is_active = 1;
      }
      if (sql.includes('is_active = 0')) {
        chatbot.is_active = 0;
      }
      chatbot.updated_at = new Date().toISOString();
      
      this.tables.chatbots.set(id, chatbot);
      return { changes: 1 };
    }
    return { changes: 0 };
  }

  updateDocument(sql, params) {
    const id = params[params.length - 1]; // ID is last parameter
    const document = this.tables.documents.get(id);
    
    if (document) {
      // Simple update logic for document processing
      if (sql.includes('processed_at')) {
        document.processed_at = new Date().toISOString();
      }
      if (sql.includes('vector_ids')) {
        document.vector_ids = params[0]; // First parameter is vector_ids
      }
      
      this.tables.documents.set(id, document);
      return { changes: 1 };
    }
    return { changes: 0 };
  }

  insertDocument(params) {
    const [id, chatbot_id, filename, file_type, file_path, file_size] = params;
    const document = {
      id,
      chatbot_id,
      filename,
      file_type,
      file_path,
      file_size,
      uploaded_at: new Date().toISOString(),
      processed_at: null,
      vector_ids: '[]'
    };
    
    this.tables.documents.set(id, document);
    return { changes: 1 };
  }

  getDocumentById(id, returnFirst = false) {
    const document = this.tables.documents.get(id);
    return returnFirst ? document || null : document;
  }

  getDocumentsByChatbot(chatbotId, returnAll = false) {
    const documents = Array.from(this.tables.documents.values())
      .filter(d => d.chatbot_id === chatbotId)
      .sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));
    
    return returnAll ? documents : documents;
  }

  insertConversation(params) {
    const [id, chatbot_id, session_id] = params;
    const conversation = {
      id,
      chatbot_id,
      session_id,
      started_at: new Date().toISOString(),
      ended_at: null
    };
    
    this.tables.conversations.set(id, conversation);
    return { changes: 1 };
  }

  insertMessage(params) {
    const [id, conversation_id, role, content, tokens_used] = params;
    const message = {
      id,
      conversation_id,
      role,
      content,
      timestamp: new Date().toISOString(),
      tokens_used
    };
    
    this.tables.messages.set(id, message);
    return { changes: 1 };
  }

  getConversationMessages(conversationId, returnAll = false) {
    const messages = Array.from(this.tables.messages.values())
      .filter(m => m.conversation_id === conversationId)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .map(m => ({ role: m.role, content: m.content }));
    
    return returnAll ? messages : messages;
  }
}

let db;

export async function setupDatabase() {
  db = new MemoryDatabase();
  
  // Simulate table creation
  db.exec(`CREATE TABLE IF NOT EXISTS chatbots (...)`);
  db.exec(`CREATE TABLE IF NOT EXISTS documents (...)`);
  db.exec(`CREATE TABLE IF NOT EXISTS conversations (...)`);
  db.exec(`CREATE TABLE IF NOT EXISTS messages (...)`);
  db.exec(`CREATE TABLE IF NOT EXISTS analytics (...)`);
  
  logger.info('In-memory database setup completed');
  return db;
}

export function getDb() {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

export default { setupDatabase, getDb };