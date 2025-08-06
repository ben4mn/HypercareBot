import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test utilities
let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    testsPassed++;
  } catch (error) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${error.message}`);
    testsFailed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

console.log('Running Unit Tests...\n');

// Test Database Schema
console.log('Database Schema Tests:');
const testDb = new Database(':memory:');

// Create tables schema (copied from database.js)
testDb.exec(`
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

testDb.exec(`
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

testDb.exec(`
  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    chatbot_id TEXT NOT NULL,
    session_id TEXT,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    FOREIGN KEY (chatbot_id) REFERENCES chatbots(id) ON DELETE CASCADE
  )
`);

testDb.exec(`
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

test('Database tables created successfully', () => {
  const tables = testDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  assert(tables.length === 4, `Expected 4 tables, got ${tables.length}`);
});

test('Can insert and retrieve chatbot', () => {
  const id = uuidv4();
  const stmt = testDb.prepare(`
    INSERT INTO chatbots (id, name, slug)
    VALUES (?, ?, ?)
  `);
  stmt.run(id, 'Test Bot', 'test-bot-123');
  
  const chatbot = testDb.prepare('SELECT * FROM chatbots WHERE id = ?').get(id);
  assert(chatbot.name === 'Test Bot', 'Chatbot name mismatch');
  assert(chatbot.slug === 'test-bot-123', 'Chatbot slug mismatch');
  assert(chatbot.is_active === 1, 'Chatbot should be active by default');
});

test('Can create conversation and messages', () => {
  // First create a chatbot
  const chatbotId = uuidv4();
  testDb.prepare('INSERT INTO chatbots (id, name, slug) VALUES (?, ?, ?)').run(
    chatbotId, 'Chat Bot', 'chat-bot-456'
  );
  
  // Create conversation
  const convId = uuidv4();
  testDb.prepare('INSERT INTO conversations (id, chatbot_id, session_id) VALUES (?, ?, ?)').run(
    convId, chatbotId, 'session-123'
  );
  
  // Add messages
  const msgId1 = uuidv4();
  const msgId2 = uuidv4();
  
  testDb.prepare('INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)').run(
    msgId1, convId, 'user', 'Hello'
  );
  
  testDb.prepare('INSERT INTO messages (id, conversation_id, role, content, tokens_used) VALUES (?, ?, ?, ?, ?)').run(
    msgId2, convId, 'assistant', 'Hi there!', 5
  );
  
  const messages = testDb.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp').all(convId);
  assert(messages.length === 2, 'Should have 2 messages');
  assert(messages[0].role === 'user', 'First message should be from user');
  assert(messages[1].role === 'assistant', 'Second message should be from assistant');
});

// Test Document Processing
console.log('\nDocument Processing Tests:');
import { DocumentProcessor } from '../src/services/DocumentProcessor.js';

test('Text chunking works correctly', () => {
  const text = 'This is a test. '.repeat(100);
  const chunks = DocumentProcessor.chunkText(text, { maxChunkSize: 100 });
  
  assert(chunks.length > 1, 'Should create multiple chunks');
  assert(chunks.every(chunk => chunk.length <= 100), 'All chunks should be under max size');
});

test('Token estimation', () => {
  const text = 'Hello world!';
  const tokens = DocumentProcessor.estimateTokens(text);
  assert(tokens === 3, `Expected 3 tokens, got ${tokens}`);
});

// Test Utilities
console.log('\nUtility Tests:');

test('UUID generation', () => {
  const id1 = uuidv4();
  const id2 = uuidv4();
  assert(id1 !== id2, 'UUIDs should be unique');
  assert(id1.length === 36, 'UUID should be 36 characters');
});

test('Slug generation', () => {
  function generateSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
  
  const slug = generateSlug('Test Chatbot!');
  assert(slug === 'test-chatbot', `Expected 'test-chatbot', got '${slug}'`);
});

// Summary
console.log(`\n${testsPassed} passed, ${testsFailed} failed`);

testDb.close();
process.exit(testsFailed > 0 ? 1 : 0);