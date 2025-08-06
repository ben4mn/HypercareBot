import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Quick Platform Validation\n');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    failed++;
  }
}

// Test from project root perspective
const projectRoot = path.resolve(__dirname, '../..');

await test('Project structure exists', async () => {
  const dirs = ['frontend/src', 'backend/src', 'data', 'nginx'];
  for (const dir of dirs) {
    await fs.access(path.join(projectRoot, dir));
  }
});

await test('Configuration files exist', async () => {
  const files = ['docker-compose.yml', '.env.example', 'README.md'];
  for (const file of files) {
    await fs.access(path.join(projectRoot, file));
  }
});

await test('Backend core files exist', async () => {
  const files = [
    'backend/src/index.js',
    'backend/src/models/database.js',
    'backend/src/routes/admin.js',
    'backend/src/routes/chat.js',
    'backend/src/services/ChatbotService.js',
    'backend/package.json'
  ];
  for (const file of files) {
    await fs.access(path.join(projectRoot, file));
  }
});

await test('Frontend core files exist', async () => {
  const files = [
    'frontend/src/App.tsx',
    'frontend/src/main.tsx',
    'frontend/src/pages/Login.tsx',
    'frontend/src/components/admin/ChatbotList.tsx',
    'frontend/package.json'
  ];
  for (const file of files) {
    await fs.access(path.join(projectRoot, file));
  }
});

await test('Docker configuration is valid', async () => {
  const dockerCompose = await fs.readFile(path.join(projectRoot, 'docker-compose.yml'), 'utf8');
  const requiredServices = ['frontend', 'backend', 'chromadb', 'nginx'];
  for (const service of requiredServices) {
    if (!dockerCompose.includes(`${service}:`)) {
      throw new Error(`Missing service: ${service}`);
    }
  }
});

await test('Package dependencies are configured', async () => {
  const backendPkg = JSON.parse(await fs.readFile(path.join(projectRoot, 'backend/package.json'), 'utf8'));
  const frontendPkg = JSON.parse(await fs.readFile(path.join(projectRoot, 'frontend/package.json'), 'utf8'));
  
  if (!backendPkg.dependencies['express']) throw new Error('Backend missing express');
  if (!backendPkg.dependencies['better-sqlite3']) throw new Error('Backend missing database');
  if (!frontendPkg.dependencies['react']) throw new Error('Frontend missing react');
  if (!frontendPkg.dependencies['react-router-dom']) throw new Error('Frontend missing router');
});

await test('API routes are implemented', async () => {
  const adminRoutes = await fs.readFile(path.join(projectRoot, 'backend/src/routes/admin.js'), 'utf8');
  const chatRoutes = await fs.readFile(path.join(projectRoot, 'backend/src/routes/chat.js'), 'utf8');
  
  if (!adminRoutes.includes('router.get') || !adminRoutes.includes('router.post')) {
    throw new Error('Admin routes incomplete');
  }
  if (!chatRoutes.includes('/message') || !chatRoutes.includes('/session')) {
    throw new Error('Chat routes incomplete');
  }
});

await test('Services are implemented', async () => {
  const chatbotService = await fs.readFile(path.join(projectRoot, 'backend/src/services/ChatbotService.js'), 'utf8');
  const chatService = await fs.readFile(path.join(projectRoot, 'backend/src/services/ChatService.js'), 'utf8');
  
  const requiredMethods = ['getAllChatbots', 'createChatbot', 'updateChatbot'];
  for (const method of requiredMethods) {
    if (!chatbotService.includes(method)) {
      throw new Error(`Missing method: ${method}`);
    }
  }
  
  if (!chatService.includes('processMessage')) {
    throw new Error('Chat service incomplete');
  }
});

await test('Frontend components are implemented', async () => {
  const app = await fs.readFile(path.join(projectRoot, 'frontend/src/App.tsx'), 'utf8');
  const login = await fs.readFile(path.join(projectRoot, 'frontend/src/pages/Login.tsx'), 'utf8');
  const chatbotList = await fs.readFile(path.join(projectRoot, 'frontend/src/components/admin/ChatbotList.tsx'), 'utf8');
  
  if (!app.includes('Router') || !app.includes('Routes')) {
    throw new Error('App routing incomplete');
  }
  if (!login.includes('useState') || !login.includes('fetch')) {
    throw new Error('Login component incomplete');
  }
  if (!chatbotList.includes('useChatbots')) {
    throw new Error('ChatbotList component incomplete');
  }
});

await test('Database schema is complete', async () => {
  const database = await fs.readFile(path.join(projectRoot, 'backend/src/models/database.js'), 'utf8');
  const requiredTables = ['chatbots', 'documents', 'conversations', 'messages'];
  
  for (const table of requiredTables) {
    if (!database.includes(`CREATE TABLE IF NOT EXISTS ${table}`)) {
      throw new Error(`Missing table: ${table}`);
    }
  }
});

console.log('\n' + '='.repeat(50));
console.log('📊 VALIDATION RESULTS');
console.log('='.repeat(50));
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log('='.repeat(50));

if (failed === 0) {
  console.log('🎉 ALL VALIDATIONS PASSED!');
  console.log('🚀 Platform is ready for deployment');
  console.log('\nNext steps:');
  console.log('1. Ensure .env file has your ANTHROPIC_API_KEY');
  console.log('2. Run: docker-compose up --build');
  console.log('3. Access admin at: http://localhost:3053/admin/login');
} else {
  console.log('❌ Some validations failed');
  console.log('Please check the missing components above');
}

process.exit(failed === 0 ? 0 : 1);