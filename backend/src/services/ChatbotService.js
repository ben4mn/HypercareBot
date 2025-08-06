import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../models/database.js';
import { logger } from '../utils/logger.js';

export class ChatbotService {
  static getAllChatbots() {
    const db = getDb();
    const stmt = db.prepare(`
      SELECT * FROM chatbots 
      WHERE archived_at IS NULL 
      ORDER BY created_at DESC
    `);
    return stmt.all();
  }

  static getChatbotById(id) {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM chatbots WHERE id = ?');
    return stmt.get(id);
  }

  static getChatbotBySlug(slug) {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM chatbots WHERE slug = ?');
    return stmt.get(slug);
  }

  static createChatbot(data) {
    const db = getDb();
    const id = uuidv4();
    const slug = data.slug || this.generateSlug(data.name);
    
    const stmt = db.prepare(`
      INSERT INTO chatbots (
        id, name, slug, system_prompt, welcome_message, config_json
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      data.name,
      slug,
      data.system_prompt || 'You are a helpful assistant.',
      data.welcome_message || 'Hello! How can I help you today?',
      JSON.stringify(data.config || {})
    );
    
    return this.getChatbotById(id);
  }

  static updateChatbot(id, data) {
    const db = getDb();
    const updates = [];
    const values = [];
    
    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.system_prompt !== undefined) {
      updates.push('system_prompt = ?');
      values.push(data.system_prompt);
    }
    if (data.welcome_message !== undefined) {
      updates.push('welcome_message = ?');
      values.push(data.welcome_message);
    }
    if (data.config !== undefined) {
      updates.push('config_json = ?');
      values.push(JSON.stringify(data.config));
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    const stmt = db.prepare(`
      UPDATE chatbots 
      SET ${updates.join(', ')} 
      WHERE id = ?
    `);
    
    stmt.run(...values);
    return this.getChatbotById(id);
  }

  static archiveChatbot(id) {
    const db = getDb();
    const stmt = db.prepare(`
      UPDATE chatbots 
      SET archived_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    stmt.run(id);
  }

  // Alias for archiveChatbot for API consistency
  static deleteChatbot(id) {
    return this.archiveChatbot(id);
  }

  static activateChatbot(id) {
    const db = getDb();
    const stmt = db.prepare(`
      UPDATE chatbots 
      SET is_active = 1 
      WHERE id = ?
    `);
    stmt.run(id);
    return this.getChatbotById(id);
  }

  static deactivateChatbot(id) {
    const db = getDb();
    const stmt = db.prepare(`
      UPDATE chatbots 
      SET is_active = 0 
      WHERE id = ?
    `);
    stmt.run(id);
    return this.getChatbotById(id);
  }

  static generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      + '-' + Date.now().toString(36);
  }
}