console.log('Testing imports...\n');

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

// Test basic Node.js modules
test('Basic Node.js modules', async () => {
  const fs = await import('fs');
  const path = await import('path');
  const { v4: uuidv4 } = await import('uuid');
  
  console.log('  ✓ fs, path, uuid imported');
});

// Test database
test('Database module', async () => {
  const Database = (await import('better-sqlite3')).default;
  const db = new Database(':memory:');
  db.close();
  console.log('  ✓ better-sqlite3 working');
});

// Test Express
test('Express framework', async () => {
  const express = (await import('express')).default;
  const app = express();
  console.log('  ✓ Express imported');
});

// Test Anthropic (will fail if API key not set, but import should work)
test('Anthropic SDK', async () => {
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  console.log('  ✓ Anthropic SDK imported');
});

// Test document processing dependencies
test('Document processing dependencies', async () => {
  try {
    const pdfParse = (await import('pdf-parse')).default;
    const mammoth = await import('mammoth');
    const xlsx = await import('xlsx');
    console.log('  ✓ Document processing modules imported');
  } catch (error) {
    console.log('  ⚠ Some document processing modules may not be available');
  }
});

// Run tests
async function runTests() {
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      await test.fn();
      console.log(`✓ ${test.name}`);
      passed++;
    } catch (error) {
      console.log(`✗ ${test.name}`);
      console.log(`  Error: ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n${passed} passed, ${failed} failed`);
  return failed === 0;
}

runTests().then(success => {
  process.exit(success ? 0 : 1);
});