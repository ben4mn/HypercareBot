import Database from 'better-sqlite3';
import { logger } from '../utils/logger.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let db;

export async function setupDatabase() {
  const dbPath = process.env.DATABASE_PATH || join(__dirname, '../../data/database/hypercare.db');
  
  // Ensure directory exists
  const dbDir = dirname(dbPath);
  await fs.mkdir(dbDir, { recursive: true });
  
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  
  // Create tables
  createTables();
  
  logger.info('Database setup completed');
  return db;
}

function createTables() {
  // Chatbots table
  db.exec(`
    CREATE TABLE IF NOT EXISTS chatbots (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      system_prompt TEXT,
      welcome_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      archived_at DATETIME,
      is_active BOOLEAN DEFAULT 1,
      config_json TEXT DEFAULT '{}'
    )
  `);
  
  // Documents table
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      chatbot_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      file_type TEXT,
      file_path TEXT,
      file_size INTEGER,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      processed_at DATETIME,
      vector_ids TEXT DEFAULT '[]',
      FOREIGN KEY (chatbot_id) REFERENCES chatbots(id) ON DELETE CASCADE
    )
  `);
  
  // Conversations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      chatbot_id TEXT NOT NULL,
      session_id TEXT,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME,
      FOREIGN KEY (chatbot_id) REFERENCES chatbots(id) ON DELETE CASCADE
    )
  `);
  
  // Messages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      tokens_used INTEGER,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    )
  `);
  
  // Analytics table
  db.exec(`
    CREATE TABLE IF NOT EXISTS analytics (
      id TEXT PRIMARY KEY,
      chatbot_id TEXT NOT NULL,
      date DATE NOT NULL,
      total_conversations INTEGER DEFAULT 0,
      total_messages INTEGER DEFAULT 0,
      unique_sessions INTEGER DEFAULT 0,
      avg_conversation_length REAL DEFAULT 0,
      FOREIGN KEY (chatbot_id) REFERENCES chatbots(id) ON DELETE CASCADE,
      UNIQUE(chatbot_id, date)
    )
  `);
  
  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_chatbots_slug ON chatbots(slug);
    CREATE INDEX IF NOT EXISTS idx_documents_chatbot ON documents(chatbot_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_chatbot ON conversations(chatbot_id);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_analytics_chatbot_date ON analytics(chatbot_id, date);
  `);
}

export function getDb() {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

export default { setupDatabase, getDb };