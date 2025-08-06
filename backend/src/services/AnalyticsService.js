import { getDb } from '../models/database-postgres.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

export class AnalyticsService {
  static async trackEvent(chatbotId, eventType, eventData = {}) {
    try {
      const db = getDb();
      const id = uuidv4();
      
      await db.prepare(`
        INSERT INTO analytics (id, chatbot_id, event_type, event_data)
        VALUES (?, ?, ?, ?)
      `).run(id, chatbotId, eventType, JSON.stringify(eventData));
      
      logger.info(`📊 Analytics: ${eventType} tracked for chatbot ${chatbotId}`);
      return id;
    } catch (error) {
      logger.error('Error tracking analytics event:', error);
    }
  }

  static async getChatbotAnalytics(chatbotId, days = 30) {
    try {
      const db = getDb();
      
      // Get basic stats
      const stats = await db.prepare(`
        SELECT 
          COUNT(*) as total_events,
          COUNT(DISTINCT DATE(created_at)) as active_days,
          COUNT(CASE WHEN event_type = 'message_sent' THEN 1 END) as total_messages,
          COUNT(CASE WHEN event_type = 'conversation_started' THEN 1 END) as total_conversations,
          COUNT(CASE WHEN event_type = 'document_queried' THEN 1 END) as document_queries
        FROM analytics 
        WHERE chatbot_id = ? 
        AND created_at >= NOW() - INTERVAL '${days} days'
      `).get(chatbotId);

      // Get daily activity
      const dailyActivity = await db.prepare(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as events,
          COUNT(CASE WHEN event_type = 'message_sent' THEN 1 END) as messages,
          COUNT(CASE WHEN event_type = 'conversation_started' THEN 1 END) as conversations
        FROM analytics 
        WHERE chatbot_id = ? 
        AND created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `).all(chatbotId);

      // Get event type breakdown
      const eventTypes = await db.prepare(`
        SELECT 
          event_type,
          COUNT(*) as count,
          COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage
        FROM analytics 
        WHERE chatbot_id = ? 
        AND created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY event_type
        ORDER BY count DESC
      `).all(chatbotId);

      // Get recent events
      const recentEvents = await db.prepare(`
        SELECT 
          event_type,
          event_data,
          created_at
        FROM analytics 
        WHERE chatbot_id = ? 
        ORDER BY created_at DESC
        LIMIT 50
      `).all(chatbotId);

      return {
        stats: stats || {
          total_events: 0,
          active_days: 0,
          total_messages: 0,
          total_conversations: 0,
          document_queries: 0
        },
        dailyActivity: dailyActivity || [],
        eventTypes: eventTypes || [],
        recentEvents: recentEvents || []
      };
    } catch (error) {
      logger.error('Error getting chatbot analytics:', error);
      return {
        stats: { total_events: 0, active_days: 0, total_messages: 0, total_conversations: 0, document_queries: 0 },
        dailyActivity: [],
        eventTypes: [],
        recentEvents: []
      };
    }
  }

  static async getAllChatbotsAnalytics(days = 30) {
    try {
      const db = getDb();
      
      const stats = await db.prepare(`
        SELECT 
          c.id,
          c.name,
          c.slug,
          COUNT(a.id) as total_events,
          COUNT(CASE WHEN a.event_type = 'message_sent' THEN 1 END) as total_messages,
          COUNT(CASE WHEN a.event_type = 'conversation_started' THEN 1 END) as total_conversations,
          MAX(a.created_at) as last_activity
        FROM chatbots c
        LEFT JOIN analytics a ON c.id = a.chatbot_id 
          AND a.created_at >= NOW() - INTERVAL '${days} days'
        WHERE c.archived_at IS NULL
        GROUP BY c.id, c.name, c.slug
        ORDER BY total_events DESC
      `).all();

      return stats || [];
    } catch (error) {
      logger.error('Error getting all chatbots analytics:', error);
      return [];
    }
  }

  // Event type constants
  static EVENTS = {
    CONVERSATION_STARTED: 'conversation_started',
    MESSAGE_SENT: 'message_sent',
    MESSAGE_RECEIVED: 'message_received',
    DOCUMENT_UPLOADED: 'document_uploaded',
    DOCUMENT_QUERIED: 'document_queried',
    DOCUMENT_DELETED: 'document_deleted',
    CHAT_SESSION_STARTED: 'chat_session_started',
    CHAT_SESSION_ENDED: 'chat_session_ended',
    ERROR_OCCURRED: 'error_occurred'
  };
}