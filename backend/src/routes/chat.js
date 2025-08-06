import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { chatRateLimiter } from '../middleware/rateLimiter.js';
import { ChatService } from '../services/ChatService.js';
import { ChatbotService } from '../services/ChatbotService.js';
import { AnalyticsService } from '../services/AnalyticsService.js';

const router = express.Router();

// Get chatbot configuration
router.get('/:slug/config', async (req, res, next) => {
  try {
    const chatbot = await ChatbotService.getChatbotBySlug(req.params.slug);
    if (!chatbot || !chatbot.is_active) {
      return res.status(404).json({ error: 'Chatbot not found' });
    }
    
    res.json({
      id: chatbot.id,
      name: chatbot.name,
      welcome_message: chatbot.welcome_message,
      config: JSON.parse(chatbot.config_json || '{}')
    });
  } catch (error) {
    next(error);
  }
});

// Initialize chat session
router.get('/:slug/session', async (req, res, next) => {
  try {
    const chatbot = await ChatbotService.getChatbotBySlug(req.params.slug);
    if (!chatbot || !chatbot.is_active) {
      return res.status(404).json({ error: 'Chatbot not found' });
    }
    
    const sessionId = uuidv4();
    const conversationId = await ChatService.createConversation(chatbot.id, sessionId);
    
    res.json({
      sessionId,
      conversationId,
      chatbotId: chatbot.id
    });
  } catch (error) {
    next(error);
  }
});

// Send message to chatbot
router.post('/:slug/message', chatRateLimiter, async (req, res, next) => {
  try {
    const { message, conversationId, sessionId } = req.body;
    
    if (!message || !conversationId) {
      return res.status(400).json({ error: 'Message and conversationId are required' });
    }
    
    const chatbot = await ChatbotService.getChatbotBySlug(req.params.slug);
    if (!chatbot || !chatbot.is_active) {
      return res.status(404).json({ error: 'Chatbot not found' });
    }
    
    // Set up SSE for streaming response
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Process message and stream response
    await ChatService.processMessage(
      chatbot,
      conversationId,
      message,
      (chunk) => {
        res.write(`data: ${JSON.stringify({ type: 'content', content: chunk })}\n\n`);
      },
      (error) => {
        res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
      },
      (metadata) => {
        res.write(`data: ${JSON.stringify({ type: 'metadata', ...metadata })}\n\n`);
      }
    );
    
    // Send completion signal
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
    
    // Update analytics
    await AnalyticsService.trackMessage(chatbot.id, conversationId);
    
  } catch (error) {
    next(error);
  }
});

export default router;