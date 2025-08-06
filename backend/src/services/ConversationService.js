import { getDb } from '../models/database-postgres.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

export class ConversationService {
  static async createConversation(chatbotId, sessionId) {
    const db = getDb();
    const id = uuidv4();
    
    await db.prepare(`
      INSERT INTO conversations (
        id, chatbot_id, session_id
      ) VALUES (?, ?, ?)
    `).run(id, chatbotId, sessionId);
    
    logger.info(`Created conversation ${id} for chatbot ${chatbotId}`);
    return id;
  }

  static async addMessage(conversationId, role, content, tokensUsed = 0) {
    const db = getDb();
    const id = uuidv4();
    
    await db.prepare(`
      INSERT INTO messages (
        id, conversation_id, role, content, tokens_used
      ) VALUES (?, ?, ?, ?, ?)
    `).run(id, conversationId, role, content, tokensUsed);
    
    logger.info(`Added ${role} message to conversation ${conversationId}`);
    return id;
  }

  static async getConversationHistory(conversationId, limit = 10) {
    const db = getDb();
    
    const messages = await db.prepare(`
      SELECT role, content FROM messages 
      WHERE conversation_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `).all(conversationId, limit);
    
    // Reverse to get chronological order and format for Claude API
    return messages.reverse().map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  static async getOrCreateConversation(chatbotId, conversationId, sessionId) {
    // For local testing, we'll just use the conversationId as-is
    // In production, you'd want to validate it exists
    if (!conversationId || conversationId.startsWith('conv-')) {
      // Create new conversation
      return await this.createConversation(chatbotId, sessionId || 'session-' + Date.now());
    }
    return conversationId;
  }

  static async endConversation(conversationId) {
    const db = getDb();
    
    await db.prepare(`
      UPDATE conversations 
      SET ended_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(conversationId);
    
    logger.info(`Ended conversation ${conversationId}`);
  }

  static async getConversationStats(chatbotId, days = 7) {
    const db = getDb();
    
    const stats = await db.prepare(`
      SELECT 
        COUNT(DISTINCT c.id) as total_conversations,
        COUNT(m.id) as total_messages,
        AVG(m.tokens_used) as avg_tokens_per_message
      FROM conversations c
      LEFT JOIN messages m ON c.id = m.conversation_id
      WHERE c.chatbot_id = ?
      AND c.started_at >= NOW() - INTERVAL '${days} days'
    `).get(chatbotId);
    
    return stats || { total_conversations: 0, total_messages: 0, avg_tokens_per_message: 0 };
  }
}