import { v4 as uuidv4 } from 'uuid';
import Anthropic from '@anthropic-ai/sdk';
import { getDb } from '../models/database.js';
import { ChromaDBService } from './ChromaDBService.js';
import { EmbeddingService } from './EmbeddingService.js';
import { logger } from '../utils/logger.js';

export class ChatService {
  static anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });

  static async createConversation(chatbotId, sessionId) {
    const db = getDb();
    const id = uuidv4();
    
    const stmt = db.prepare(`
      INSERT INTO conversations (id, chatbot_id, session_id)
      VALUES (?, ?, ?)
    `);
    
    stmt.run(id, chatbotId, sessionId);
    return id;
  }

  static async processMessage(chatbot, conversationId, message, onChunk, onError, onMetadata) {
    try {
      // Save user message
      await this.saveMessage(conversationId, 'user', message);
      
      // Generate embedding for the query
      const queryEmbedding = await EmbeddingService.generateQueryEmbedding(message);
      
      // Search for relevant context
      const relevantChunks = await ChromaDBService.searchSimilar(
        chatbot.id,
        queryEmbedding,
        5
      );
      
      // Build context
      const context = relevantChunks
        .map(chunk => chunk.content)
        .join('\n\n---\n\n');
      
      // Prepare messages for Claude
      const messages = await this.getConversationHistory(conversationId);
      
      const systemPrompt = this.buildSystemPrompt(chatbot, context);
      
      // Stream response from Claude
      const stream = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        temperature: 0.7,
        system: systemPrompt,
        messages: [
          ...messages.slice(-10), // Last 10 messages for context
          { role: 'user', content: message }
        ],
        stream: true
      });
      
      let fullResponse = '';
      let tokensUsed = 0;
      
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta') {
          const text = chunk.delta.text;
          fullResponse += text;
          onChunk(text);
        } else if (chunk.type === 'message_delta') {
          tokensUsed = chunk.usage?.output_tokens || 0;
        }
      }
      
      // Save assistant response
      await this.saveMessage(conversationId, 'assistant', fullResponse, tokensUsed);
      
      // Send metadata
      onMetadata({
        tokensUsed,
        contextChunks: relevantChunks.length,
        sources: relevantChunks.map(chunk => chunk.metadata)
      });
      
    } catch (error) {
      logger.error('Error processing message:', error);
      onError(error);
      throw error;
    }
  }

  static buildSystemPrompt(chatbot, context) {
    let prompt = chatbot.system_prompt || 'You are a helpful assistant.';
    
    if (context) {
      prompt += `\n\nUse the following context to answer questions:\n\n${context}`;
    }
    
    prompt += '\n\nAlways be helpful, accurate, and provide clear answers based on the available context.';
    
    return prompt;
  }

  static async saveMessage(conversationId, role, content, tokensUsed = null) {
    const db = getDb();
    const id = uuidv4();
    
    const stmt = db.prepare(`
      INSERT INTO messages (id, conversation_id, role, content, tokens_used)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, conversationId, role, content, tokensUsed);
  }

  static async getConversationHistory(conversationId) {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT role, content FROM messages
      WHERE conversation_id = ?
      ORDER BY timestamp ASC
    `);
    
    const messages = stmt.all(conversationId);
    
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  static async endConversation(conversationId) {
    const db = getDb();
    const stmt = db.prepare(`
      UPDATE conversations
      SET ended_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    stmt.run(conversationId);
  }
}