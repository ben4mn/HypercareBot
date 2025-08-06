import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import { getDb } from '../models/database.js';
import { logger } from '../utils/logger.js';
import { authMiddleware } from '../middleware/auth.js';
import { ChatbotService } from '../services/ChatbotService.js';
import { DocumentService } from '../services/DocumentService.js';
import { AnalyticsService } from '../services/AnalyticsService.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_PATH || './data/uploads');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.docx', '.pptx', '.xlsx', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Apply auth middleware to all admin routes
router.use(authMiddleware);

// Chatbot management routes
router.get('/chatbots', async (req, res, next) => {
  try {
    const chatbots = await ChatbotService.getAllChatbots();
    res.json(chatbots);
  } catch (error) {
    next(error);
  }
});

router.post('/chatbots', async (req, res, next) => {
  try {
    const chatbot = await ChatbotService.createChatbot(req.body);
    res.status(201).json(chatbot);
  } catch (error) {
    next(error);
  }
});

router.get('/chatbots/:id', async (req, res, next) => {
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

router.put('/chatbots/:id', async (req, res, next) => {
  try {
    const chatbot = await ChatbotService.updateChatbot(req.params.id, req.body);
    res.json(chatbot);
  } catch (error) {
    next(error);
  }
});

router.delete('/chatbots/:id', async (req, res, next) => {
  try {
    await ChatbotService.archiveChatbot(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.post('/chatbots/:id/activate', async (req, res, next) => {
  try {
    const chatbot = await ChatbotService.activateChatbot(req.params.id);
    res.json(chatbot);
  } catch (error) {
    next(error);
  }
});

router.post('/chatbots/:id/deactivate', async (req, res, next) => {
  try {
    const chatbot = await ChatbotService.deactivateChatbot(req.params.id);
    res.json(chatbot);
  } catch (error) {
    next(error);
  }
});

// Document management routes
router.post('/chatbots/:id/documents', upload.array('files', 10), async (req, res, next) => {
  try {
    const documents = await DocumentService.uploadDocuments(req.params.id, req.files);
    res.status(201).json(documents);
  } catch (error) {
    next(error);
  }
});

router.get('/chatbots/:id/documents', async (req, res, next) => {
  try {
    const documents = await DocumentService.getDocumentsByChatbot(req.params.id);
    res.json(documents);
  } catch (error) {
    next(error);
  }
});

router.delete('/documents/:docId', async (req, res, next) => {
  try {
    await DocumentService.deleteDocument(req.params.docId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.post('/documents/:docId/reprocess', async (req, res, next) => {
  try {
    const document = await DocumentService.reprocessDocument(req.params.docId);
    res.json(document);
  } catch (error) {
    next(error);
  }
});

// Analytics routes
router.get('/chatbots/:id/analytics', async (req, res, next) => {
  try {
    const analytics = await AnalyticsService.getChatbotAnalytics(
      req.params.id,
      req.query.startDate,
      req.query.endDate
    );
    res.json(analytics);
  } catch (error) {
    next(error);
  }
});

router.get('/chatbots/:id/conversations', async (req, res, next) => {
  try {
    const conversations = await AnalyticsService.getChatbotConversations(
      req.params.id,
      req.query.limit || 50,
      req.query.offset || 0
    );
    res.json(conversations);
  } catch (error) {
    next(error);
  }
});

router.get('/conversations/:id/messages', async (req, res, next) => {
  try {
    const messages = await AnalyticsService.getConversationMessages(req.params.id);
    res.json(messages);
  } catch (error) {
    next(error);
  }
});

export default router;