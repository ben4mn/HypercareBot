import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../utils/logger.js';

export class ClaudeService {
  static client = null;
  
  static getClient() {
    if (!this.client) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY environment variable is required');
      }
      
      this.client = new Anthropic({
        apiKey: apiKey
      });
    }
    return this.client;
  }

  static async generateResponse(systemPrompt, userMessage, conversationHistory = [], documentContext = null) {
    try {
      const client = this.getClient();
      
      // Build the conversation context
      let contextualSystemPrompt = systemPrompt;
      
      if (documentContext && documentContext.length > 0) {
        const contextText = documentContext.map(doc => doc.content).join('\n\n');
        contextualSystemPrompt += `\n\nRELEVANT DOCUMENTS:\n${contextText}\n\nPlease use this information to help answer the user's question. If the information is relevant, reference it naturally in your response.`;
      }
      
      // Build messages array
      const messages = [
        ...conversationHistory,
        {
          role: 'user',
          content: userMessage
        }
      ];
      
      logger.info(`Generating Claude response for message: "${userMessage.substring(0, 50)}..."`);
      
      const response = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        temperature: 0.7,
        system: contextualSystemPrompt,
        messages: messages
      });
      
      const responseText = response.content[0]?.text || 'I apologize, but I was unable to generate a response.';
      
      logger.info(`Claude response generated: ${responseText.length} characters`);
      return responseText;
      
    } catch (error) {
      logger.error('Error generating Claude response:', error);
      throw error;
    }
  }

  static async generateStreamingResponse(systemPrompt, userMessage, conversationHistory = [], documentContext = null) {
    try {
      const client = this.getClient();
      
      // Build the conversation context
      let contextualSystemPrompt = systemPrompt;
      
      if (documentContext && documentContext.length > 0) {
        const contextText = documentContext.map(doc => doc.content).join('\n\n');
        contextualSystemPrompt += `\n\nRELEVANT DOCUMENTS:\n${contextText}\n\nPlease use this information to help answer the user's question. If the information is relevant, reference it naturally in your response.`;
      }
      
      // Build messages array
      const messages = [
        ...conversationHistory,
        {
          role: 'user',
          content: userMessage
        }
      ];
      
      logger.info(`Generating streaming Claude response for message: "${userMessage.substring(0, 50)}..."`);
      
      const stream = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        temperature: 0.7,
        system: contextualSystemPrompt,
        messages: messages,
        stream: true
      });
      
      return stream;
      
    } catch (error) {
      logger.error('Error generating streaming Claude response:', error);
      throw error;
    }
  }

  static async testConnection() {
    try {
      const client = this.getClient();
      
      const response = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 50,
        messages: [
          {
            role: 'user',
            content: 'Hello, this is a connection test. Please respond with "Connection successful".'
          }
        ]
      });
      
      return response.content[0]?.text || 'No response';
    } catch (error) {
      logger.error('Claude connection test failed:', error);
      throw error;
    }
  }
}