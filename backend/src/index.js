import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { setupDatabase } from './models/database-postgres.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimiter } from './middleware/rateLimiter.js';

// Load environment variables
dotenv.config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 3050;

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
app.use('/api/', rateLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mode: 'local-testing',
    database: 'postgresql',
    claudeApi: process.env.ANTHROPIC_API_KEY ? 'configured' : 'not-configured'
  });
});

// Simple auth endpoint for testing
app.post('/api/admin/auth/login', (req, res) => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD || 'change_this_password';
  
  if (password === adminPassword) {
    // Simple token for testing
    const token = 'test-admin-token-' + Date.now();
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Simple auth middleware
const simpleAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer test-admin-token')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Claude API test endpoint
app.get('/api/admin/claude/test', simpleAuth, async (req, res, next) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.json({ 
        status: 'not-configured',
        message: 'ANTHROPIC_API_KEY environment variable not set'
      });
    }
    
    const testResult = await ClaudeService.testConnection();
    res.json({ 
      status: 'success',
      message: 'Claude API connection successful',
      testResponse: testResult
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: 'Claude API connection failed',
      error: error.message
    });
  }
});

// Import services (but simplified)
import { getDb } from './models/database-postgres.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
// Import document processing services
import { DocumentProcessor } from './services/DocumentProcessor.js';
import { EmbeddingService } from './services/EmbeddingService.js';
import { ChromaDBService } from './services/ChromaDBService.js';
import { ClaudeService } from './services/ClaudeService.js';
import { RAGService } from './services/RAGService.js';
import { ConversationService } from './services/ConversationService.js';
import { AnalyticsService } from './services/AnalyticsService.js';
import multer from 'multer';
import path from 'path';

// Setup upload directory
const uploadDir = process.env.UPLOAD_PATH || './uploads';

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: function (req, file, cb) {
    logger.info(`🔍 File filter check: originalname="${file.originalname}", mimetype="${file.mimetype}"`);
    
    const allowedTypes = ['.pdf', '.docx', '.xlsx', '.xls', '.txt', '.doc'];
    const fileExt = path.extname(file.originalname || '').toLowerCase();
    
    logger.info(`📁 Extracted file extension: "${fileExt}"`);
    
    if (allowedTypes.includes(fileExt)) {
      logger.info(`✅ File type allowed: ${fileExt}`);
      cb(null, true);
    } else {
      logger.warn(`❌ File type rejected: "${fileExt}" not in ${allowedTypes.join(', ')}`);
      cb(new Error(`File type "${fileExt}" not supported. Allowed types: ${allowedTypes.join(', ')}`));
    }
  }
});

// Simple ChatbotService for PostgreSQL
const ChatbotService = {
  async getAllChatbots() {
    const db = getDb();
    return await db.prepare('SELECT * FROM chatbots WHERE archived_at IS NULL ORDER BY created_at DESC').all();
  },
  
  async getChatbotById(id) {
    const db = getDb();
    return await db.prepare('SELECT * FROM chatbots WHERE id = ?').get(id);
  },
  
  async getChatbotBySlug(slug) {  
    const db = getDb();
    return await db.prepare('SELECT * FROM chatbots WHERE slug = ?').get(slug);
  },
  
  async createChatbot(data) {
    const db = getDb();
    const id = uuidv4();
    const slug = data.slug || this.generateSlug(data.name);
    
    await db.prepare(`
      INSERT INTO chatbots (
        id, name, slug, system_prompt, welcome_message, config_json
      ) VALUES (?, ?, ?, ?, ?, ?::jsonb)
    `).run(
      id,
      data.name,
      slug,
      data.system_prompt || 'You are a helpful assistant.',
      data.welcome_message || 'Hello! How can I help you today?',
      JSON.stringify(data.config || {})
    );
    
    return await this.getChatbotById(id);
  },
  
  generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      + '-' + Date.now().toString(36);
  }
};

// Simple DocumentService for local testing
const DocumentService = {
  async createDocument(chatbotId, file) {
    const db = getDb();
    const id = uuidv4();
    const fileType = path.extname(file.originalname).toLowerCase();
    
    // Create document record
    await db.prepare(`
      INSERT INTO documents (
        id, chatbot_id, filename, file_type, file_path, file_size
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      chatbotId,
      file.originalname,
      fileType,
      file.path,
      file.size
    );
    
    // Process the document with full pipeline
    try {
      logger.info(`Processing file document "${file.originalname}" for chatbot ${chatbotId}`);
      
      // Extract text from file
      const text = await DocumentProcessor.extractText(file.path, fileType);
      logger.info(`Extracted ${text.length} characters from file`);
      
      // Chunk the text
      const chunks = DocumentProcessor.chunkText(text);
      logger.info(`Text chunked into ${chunks.length} pieces`);
      
      // Generate embeddings
      const embeddings = await EmbeddingService.generateEmbeddings(chunks);
      logger.info(`Generated ${embeddings.length} embeddings`);
      
      // Store in ChromaDB
      const vectorIds = await ChromaDBService.storeEmbeddings(chatbotId, id, chunks, embeddings);
      logger.info(`Stored ${vectorIds.length} vectors in ChromaDB`);
      
      // Update document with vector IDs
      await db.prepare(`
        UPDATE documents 
        SET processed_at = CURRENT_TIMESTAMP, vector_ids = ?::jsonb 
        WHERE id = ?
      `).run(JSON.stringify(vectorIds), id);
      
      logger.info(`✅ File document "${file.originalname}" fully processed and stored for chatbot ${chatbotId}`);
    } catch (error) {
      logger.error(`❌ Error processing file document "${file.originalname}":`, error);
      // Still mark as processed but without vectors
      await db.prepare(`
        UPDATE documents 
        SET processed_at = CURRENT_TIMESTAMP, vector_ids = ?::jsonb 
        WHERE id = ?
      `).run('[]', id);
    }
    
    return this.getDocumentById(id);
  },
  
  async getDocumentById(id) {
    const db = getDb();
    return await db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
  },
  
  async getDocumentsByChatbot(chatbotId) {
    const db = getDb();
    return await db.prepare(`
      SELECT * FROM documents 
      WHERE chatbot_id = ? 
      ORDER BY uploaded_at DESC
    `).all(chatbotId);
  },
  
  async deleteDocument(documentId) {
    const document = await this.getDocumentById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }
    
    // Delete vectors from ChromaDB if they exist (will implement later)
    // const vectorIds = JSON.parse(document.vector_ids || '[]');
    // if (vectorIds.length > 0) {
    //   try {
    //     await ChromaDBService.deleteVectors(document.chatbot_id, vectorIds);
    //   } catch (error) {
    //     logger.warn(`Failed to delete vectors for document ${documentId}:`, error.message);
    //   }
    // }
    
    // Delete file from disk (would be used with actual file uploads)
    // try {
    //   await fs.unlink(document.file_path);
    // } catch (error) {
    //   logger.warn(`Failed to delete file: ${document.file_path}`);
    // }
    
    // Delete from database
    const db = getDb();
    await db.prepare('DELETE FROM documents WHERE id = ?').run(documentId);
    
    logger.info(`Document ${documentId} deleted successfully`);
  },

  // Method to add text content directly for testing
  async addTextDocument(chatbotId, title, content) {
    const db = getDb();
    const id = uuidv4();
    
    // Create document record
    await db.prepare(`
      INSERT INTO documents (
        id, chatbot_id, filename, file_type, file_path, file_size
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      chatbotId,
      title,
      '.txt',
      'text-content', // placeholder since we're not using files
      content.length
    );
    
    // Process the text content with full pipeline
    try {
      logger.info(`Processing text document "${title}" for chatbot ${chatbotId}`);
      
      // Chunk the text
      const chunks = DocumentProcessor.chunkText(content);
      logger.info(`Text chunked into ${chunks.length} pieces`);
      
      // Generate embeddings
      const embeddings = await EmbeddingService.generateEmbeddings(chunks);
      logger.info(`Generated ${embeddings.length} embeddings`);
      
      // Store in ChromaDB
      const vectorIds = await ChromaDBService.storeEmbeddings(chatbotId, id, chunks, embeddings);
      logger.info(`Stored ${vectorIds.length} vectors in ChromaDB`);
      
      // Update document with vector IDs
      await db.prepare(`
        UPDATE documents 
        SET processed_at = CURRENT_TIMESTAMP, vector_ids = ?::jsonb 
        WHERE id = ?
      `).run(JSON.stringify(vectorIds), id);
      
      logger.info(`✅ Text document "${title}" fully processed and stored for chatbot ${chatbotId}`);
    } catch (error) {
      logger.error(`❌ Error processing text document "${title}":`, error);
      // Still mark as processed but without vectors
      await db.prepare(`
        UPDATE documents 
        SET processed_at = CURRENT_TIMESTAMP, vector_ids = ?::jsonb 
        WHERE id = ?
      `).run('[]', id);
    }
    
    return this.getDocumentById(id);
  }
};

// Simplified admin routes
app.get('/api/admin/chatbots', simpleAuth, async (req, res, next) => {
  try {
    const chatbots = await ChatbotService.getAllChatbots();
    res.json(chatbots);
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/chatbots', simpleAuth, async (req, res, next) => {
  try {
    const chatbot = await ChatbotService.createChatbot(req.body);
    res.status(201).json(chatbot);
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/chatbots/:id', simpleAuth, async (req, res, next) => {
  try {
    const chatbot = await ChatbotService.getChatbotById(req.params.id);
    if (!chatbot) {
      return res.status(404).json({ error: 'Chatbot not found' });
    }
    res.json(chatbot);
  } catch (error) {
    next(error);
  }
});

// Document management routes
// For now, we'll use text-based document creation for testing
app.post('/api/admin/chatbots/:id/documents/text', simpleAuth, async (req, res, next) => {
  try {
    const chatbotId = req.params.id;
    const { title, content } = req.body;
    
    logger.info(`Document creation request: chatbotId=${chatbotId}, title=${title}, content length=${content?.length}`);
    
    // Verify chatbot exists
    const chatbot = await ChatbotService.getChatbotById(chatbotId);
    if (!chatbot) {
      return res.status(404).json({ error: 'Chatbot not found' });
    }
    
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    
    const document = await DocumentService.addTextDocument(chatbotId, title, content);
    res.status(201).json({ document });
  } catch (error) {
    next(error);
  }
});

// File upload route with multer
app.post('/api/admin/chatbots/:id/documents/upload', simpleAuth, upload.single('file'), async (req, res, next) => {
  try {
    const chatbotId = req.params.id;
    const file = req.file;
    
    logger.info(`📤 Upload request received: chatbotId=${chatbotId}, hasFile=${!!file}, authHeader=${!!req.headers.authorization}`);
    
    if (!file) {
      logger.warn('❌ Upload failed: No file provided');
      return res.status(400).json({ error: 'No file provided' });
    }
    
    logger.info(`📄 File upload request: chatbotId=${chatbotId}, filename=${file.originalname}, size=${file.size}`);
    
    // Verify chatbot exists
    const chatbot = await ChatbotService.getChatbotById(chatbotId);
    if (!chatbot) {
      // Clean up uploaded file
      await fs.unlink(file.path).catch(() => {});
      return res.status(404).json({ error: 'Chatbot not found' });
    }
    
    const document = await DocumentService.createDocument(chatbotId, file);
    logger.info(`✅ Upload completed successfully: documentId=${document.id}`);
    
    // Track analytics
    await AnalyticsService.trackEvent(chatbotId, AnalyticsService.EVENTS.DOCUMENT_UPLOADED, {
      documentId: document.id,
      filename: file.originalname,
      fileSize: file.size,
      fileType: path.extname(file.originalname)
    });
    
    res.status(201).json({ document });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    next(error);
  }
});

app.get('/api/admin/chatbots/:id/documents', simpleAuth, async (req, res, next) => {
  try {
    const chatbotId = req.params.id;
    
    // Verify chatbot exists
    const chatbot = await ChatbotService.getChatbotById(chatbotId);
    if (!chatbot) {
      return res.status(404).json({ error: 'Chatbot not found' });
    }
    
    const documents = await DocumentService.getDocumentsByChatbot(chatbotId);
    res.json(documents);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/admin/documents/:docId', simpleAuth, async (req, res, next) => {
  try {
    const documentId = req.params.docId;
    const document = await DocumentService.getDocumentById(documentId);
    if (document) {
      // Track analytics before deletion
      await AnalyticsService.trackEvent(document.chatbot_id, AnalyticsService.EVENTS.DOCUMENT_DELETED, {
        documentId,
        filename: document.filename
      });
    }
    
    await DocumentService.deleteDocument(documentId);
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    if (error.message === 'Document not found') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

// Analytics endpoints
app.get('/api/admin/chatbots/:id/analytics', simpleAuth, async (req, res, next) => {
  try {
    const chatbotId = req.params.id;
    const days = parseInt(req.query.days) || 30;
    
    const analytics = await AnalyticsService.getChatbotAnalytics(chatbotId, days);
    res.json(analytics);
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/analytics/overview', simpleAuth, async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    
    const analytics = await AnalyticsService.getAllChatbotsAnalytics(days);
    res.json(analytics);
  } catch (error) {
    next(error);
  }
});

// Simple chat routes (without Claude integration for now)
app.get('/api/chat/:slug/config', async (req, res, next) => {
  try {
    const chatbot = await ChatbotService.getChatbotBySlug(req.params.slug);
    if (!chatbot || !chatbot.is_active) {
      return res.status(404).json({ error: 'Chatbot not found' });
    }
    
    res.json({
      id: chatbot.id,
      name: chatbot.name,
      welcome_message: chatbot.welcome_message,
      config: typeof chatbot.config_json === 'string' 
        ? JSON.parse(chatbot.config_json) 
        : chatbot.config_json || {}
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/chat/:slug/session', async (req, res, next) => {
  try {
    const chatbot = await ChatbotService.getChatbotBySlug(req.params.slug);
    if (!chatbot || !chatbot.is_active) {
      return res.status(404).json({ error: 'Chatbot not found' });
    }
    
    const sessionId = 'session-' + Date.now();
    const conversationId = 'conv-' + Date.now();
    
    // Track analytics
    await AnalyticsService.trackEvent(chatbot.id, AnalyticsService.EVENTS.CHAT_SESSION_STARTED, {
      sessionId,
      conversationId,
      userAgent: req.headers['user-agent'],
      ip: req.ip
    });
    
    res.json({
      sessionId,
      conversationId,
      chatbotId: chatbot.id
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/chat/:slug/message', async (req, res, next) => {
  try {
    const { message, conversationId } = req.body;
    const chatbot = await ChatbotService.getChatbotBySlug(req.params.slug);
    
    if (!chatbot || !chatbot.is_active) {
      return res.status(404).json({ error: 'Chatbot not found' });
    }
    
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Get or create conversation
    const actualConversationId = await ConversationService.getOrCreateConversation(
      chatbot.id, 
      conversationId, 
      req.sessionId
    );
    
    try {
      // Add user message to conversation history
      await ConversationService.addMessage(actualConversationId, 'user', message);
      
      // Track analytics for message sent
      await AnalyticsService.trackEvent(chatbot.id, AnalyticsService.EVENTS.MESSAGE_SENT, {
        conversationId: actualConversationId,
        messageLength: message.length,
        timestamp: new Date().toISOString()
      });
      
      // Get conversation history for context
      const conversationHistory = await ConversationService.getConversationHistory(actualConversationId, 10);
      
      // Check if Claude API is available
      const claudeAvailable = process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.length > 0;
      
      if (claudeAvailable) {
        try {
          // Use RAG service for intelligent response
          const ragResult = await RAGService.generateStreamingContextualResponse(
            chatbot, 
            message, 
            conversationHistory.slice(0, -1) // Exclude the current message
          );
          
          // Stream Claude response
          let fullResponse = '';
          for await (const chunk of ragResult.stream) {
            if (chunk.type === 'content_block_delta') {
              const content = chunk.delta?.text || '';
              if (content) {
                fullResponse += content;
                res.write(`data: ${JSON.stringify({ type: 'content', content })}\n\n`);
              }
            }
          }
          
          // Add assistant response to conversation history
          await ConversationService.addMessage(actualConversationId, 'assistant', fullResponse);
          
          // Track document query analytics
          if (ragResult.documentsUsed > 0) {
            await AnalyticsService.trackEvent(chatbot.id, AnalyticsService.EVENTS.DOCUMENT_QUERIED, {
              conversationId: actualConversationId,
              documentsUsed: ragResult.documentsUsed,
              query: message.substring(0, 100), // First 100 chars for privacy
              relevantDocuments: ragResult.relevantDocuments.length
            });
          }
          
          // Send metadata about documents used
          if (ragResult.documentsUsed > 0) {
            res.write(`data: ${JSON.stringify({ 
              type: 'metadata', 
              documentsUsed: ragResult.documentsUsed,
              relevantDocuments: ragResult.relevantDocuments 
            })}\n\n`);
          }
          
          res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
          res.end();
          
          logger.info(`✅ Claude response generated for chatbot ${chatbot.id}, using ${ragResult.documentsUsed} documents`);
          
        } catch (claudeError) {
          logger.error('Claude API error, falling back:', claudeError);
          await streamFallbackResponse(message, chatbot, res);
        }
      } else {
        logger.warn('Claude API not configured, using fallback response');
        await streamFallbackResponse(message, chatbot, res);
      }
      
    } catch (error) {
      logger.error('Error in chat processing:', error);
      await streamFallbackResponse(message, chatbot, res, 'There was an error processing your request.');
    }
    
  } catch (error) {
    next(error);
  }
});

// Helper function for fallback responses
async function streamFallbackResponse(message, chatbot, res, errorMsg = null) {
  const documents = await DocumentService.getDocumentsByChatbot(chatbot.id);
  
  let response;
  if (errorMsg) {
    response = `${errorMsg} However, I can see you asked: "${message}". I have access to ${documents.length} document(s) in my knowledge base.`;
  } else {
    response = await RAGService.fallbackResponse(chatbot, message, documents);
  }
  
  // Stream word by word
  const words = response.split(' ');
  for (let i = 0; i < words.length; i++) {
    res.write(`data: ${JSON.stringify({ type: 'content', content: words[i] + ' ' })}\n\n`);
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
  res.end();
}

// Error handling
app.use(errorHandler);

// Initialize database and start server
async function startServer() {
  try {
    // Ensure upload directory exists
    await fs.mkdir(uploadDir, { recursive: true });
    logger.info(`Upload directory created: ${uploadDir}`);
    
    await setupDatabase();
    logger.info('PostgreSQL database initialized');
    
    // Create a sample chatbot for testing
    const existingChatbots = await ChatbotService.getAllChatbots();
    if (existingChatbots.length === 0) {
      await ChatbotService.createChatbot({
      name: 'Test Chatbot',
      system_prompt: 'You are a helpful test assistant.',
      welcome_message: 'Hello! This is a test chatbot running with PostgreSQL.',
      config: { max_tokens: 4096, temperature: 0.7 }
      });
      logger.info('Sample chatbot created');
    }
    
    app.listen(PORT, () => {
      logger.info(`🚀 Local Hypercare Backend running on port ${PORT}`);
      logger.info(`📋 Mode: Production (PostgreSQL Database)`);
      logger.info(`🔗 Health Check: http://localhost:${PORT}/health`);
      logger.info(`👤 Admin API: http://localhost:${PORT}/api/admin/chatbots`);
      logger.info(`💬 Chat API: http://localhost:${PORT}/api/chat/test-chatbot-*/config`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();