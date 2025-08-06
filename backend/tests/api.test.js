import { expect } from 'chai';
import request from 'supertest';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Simple test runner since we're in Docker environment
const API_URL = 'http://localhost:3050';
let authToken = '';

const tests = [];

function describe(name, fn) {
  console.log(`\n${name}`);
  fn();
}

function it(name, fn) {
  tests.push({ name, fn });
}

async function runTests() {
  console.log('Starting API tests...\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      await test.fn();
      console.log(`  ✓ ${test.name}`);
      passed++;
    } catch (error) {
      console.log(`  ✗ ${test.name}`);
      console.log(`    Error: ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n${passed} passed, ${failed} failed`);
  return failed === 0;
}

// Tests
describe('Health Check', () => {
  it('should return health status', async () => {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();
    
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    if (!data.status) throw new Error('Missing status field');
  });
});

describe('Authentication', () => {
  it('should login with correct password', async () => {
    const response = await fetch(`${API_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'change_this_password' })
    });
    
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    
    const data = await response.json();
    if (!data.token) throw new Error('Missing token');
    
    authToken = data.token;
  });
  
  it('should reject invalid password', async () => {
    const response = await fetch(`${API_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'wrong_password' })
    });
    
    if (response.status !== 401) throw new Error(`Expected 401, got ${response.status}`);
  });
});

describe('Chatbot Management', () => {
  let chatbotId;
  
  it('should create a new chatbot', async () => {
    const response = await fetch(`${API_URL}/api/admin/chatbots`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        name: 'Test Chatbot',
        system_prompt: 'You are a test assistant.',
        welcome_message: 'Welcome to the test chatbot!'
      })
    });
    
    if (response.status !== 201) throw new Error(`Expected 201, got ${response.status}`);
    
    const chatbot = await response.json();
    if (!chatbot.id) throw new Error('Missing chatbot ID');
    if (chatbot.name !== 'Test Chatbot') throw new Error('Incorrect chatbot name');
    
    chatbotId = chatbot.id;
  });
  
  it('should list all chatbots', async () => {
    const response = await fetch(`${API_URL}/api/admin/chatbots`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    
    const chatbots = await response.json();
    if (!Array.isArray(chatbots)) throw new Error('Expected array of chatbots');
    if (chatbots.length === 0) throw new Error('No chatbots found');
  });
  
  it('should get chatbot by ID', async () => {
    const response = await fetch(`${API_URL}/api/admin/chatbots/${chatbotId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    
    const chatbot = await response.json();
    if (chatbot.id !== chatbotId) throw new Error('Incorrect chatbot ID');
  });
  
  it('should update chatbot', async () => {
    const response = await fetch(`${API_URL}/api/admin/chatbots/${chatbotId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        name: 'Updated Test Chatbot'
      })
    });
    
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    
    const chatbot = await response.json();
    if (chatbot.name !== 'Updated Test Chatbot') throw new Error('Chatbot not updated');
  });
  
  it('should deactivate chatbot', async () => {
    const response = await fetch(`${API_URL}/api/admin/chatbots/${chatbotId}/deactivate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    
    const chatbot = await response.json();
    if (chatbot.is_active !== 0) throw new Error('Chatbot not deactivated');
  });
  
  it('should activate chatbot', async () => {
    const response = await fetch(`${API_URL}/api/admin/chatbots/${chatbotId}/activate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    
    const chatbot = await response.json();
    if (chatbot.is_active !== 1) throw new Error('Chatbot not activated');
  });
});

describe('Public Chat API', () => {
  it('should get chatbot config by slug', async () => {
    // First get the chatbot to find its slug
    const chatbotsResponse = await fetch(`${API_URL}/api/admin/chatbots`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const chatbots = await chatbotsResponse.json();
    const chatbot = chatbots[0];
    
    const response = await fetch(`${API_URL}/api/chat/${chatbot.slug}/config`);
    
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    
    const config = await response.json();
    if (!config.id) throw new Error('Missing chatbot ID in config');
    if (!config.name) throw new Error('Missing chatbot name in config');
  });
  
  it('should initialize chat session', async () => {
    const chatbotsResponse = await fetch(`${API_URL}/api/admin/chatbots`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const chatbots = await chatbotsResponse.json();
    const chatbot = chatbots[0];
    
    const response = await fetch(`${API_URL}/api/chat/${chatbot.slug}/session`);
    
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
    
    const session = await response.json();
    if (!session.sessionId) throw new Error('Missing session ID');
    if (!session.conversationId) throw new Error('Missing conversation ID');
  });
});

// Run tests
runTests().then(success => {
  process.exit(success ? 0 : 1);
});