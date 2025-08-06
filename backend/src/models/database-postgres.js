import pg from 'pg';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

let pool;

export async function setupDatabase() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  
  pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
  
  // Test connection
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    logger.info('PostgreSQL connection established');
  } catch (error) {
    logger.error('Failed to connect to PostgreSQL:', error);
    throw error;
  }
  
  // Create tables if they don't exist
  await createTables();
  
  return pool;
}

async function createTables() {
  const client = await pool.connect();
  
  try {
    // Enable UUID extension
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    
    // Chatbots table
    await client.query(`
      CREATE TABLE IF NOT EXISTS chatbots (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        system_prompt TEXT,
        welcome_message TEXT,
        config_json JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        archived_at TIMESTAMP
      )
    `);
    
    // Documents table
    await client.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        chatbot_id UUID REFERENCES chatbots(id) ON DELETE CASCADE,
        filename VARCHAR(255) NOT NULL,
        file_type VARCHAR(50),
        file_path TEXT,
        file_size INTEGER,
        vector_ids JSONB DEFAULT '[]',
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP
      )
    `);
    
    // Conversations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        chatbot_id UUID REFERENCES chatbots(id) ON DELETE CASCADE,
        session_id VARCHAR(255),
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP,
        metadata JSONB DEFAULT '{}'
      )
    `);
    
    // Messages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        tokens_used INTEGER DEFAULT 0,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Analytics table
    await client.query(`
      CREATE TABLE IF NOT EXISTS analytics (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        chatbot_id UUID REFERENCES chatbots(id) ON DELETE CASCADE,
        event_type VARCHAR(100),
        event_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_documents_chatbot ON documents(chatbot_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_conversations_chatbot ON conversations(chatbot_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_chatbots_slug ON chatbots(slug)`);
    
    logger.info('PostgreSQL tables created/verified');
  } catch (error) {
    logger.error('Failed to create tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

export function getDb() {
  if (!pool) {
    throw new Error('Database not initialized');
  }
  
  // Return a wrapper that mimics the better-sqlite3 API
  return {
    prepare(sql) {
      return {
        async run(...params) {
          const client = await pool.connect();
          try {
            const query = convertPlaceholders(sql);
            const result = await client.query(query, params);
            return { changes: result.rowCount };
          } finally {
            client.release();
          }
        },
        
        async get(...params) {
          const client = await pool.connect();
          try {
            const query = convertPlaceholders(sql);
            const result = await client.query(query, params);
            return result.rows[0] || null;
          } finally {
            client.release();
          }
        },
        
        async all(...params) {
          const client = await pool.connect();
          try {
            const query = convertPlaceholders(sql);
            const result = await client.query(query, params);
            return result.rows;
          } finally {
            client.release();
          }
        }
      };
    },
    
    exec(sql) {
      // For schema creation, just log
      logger.info('Schema SQL (handled by createTables):', sql.substring(0, 50));
    },
    
    pragma(setting) {
      // PostgreSQL doesn't use pragma
      logger.info('Pragma setting ignored (PostgreSQL):', setting);
    }
  };
}

// Convert SQLite ? placeholders to PostgreSQL $1, $2, etc.
function convertPlaceholders(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

export default { setupDatabase, getDb };