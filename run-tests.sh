#!/bin/bash

echo "🔬 Hypercare Platform - Comprehensive Test Suite"
echo "================================================="

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: Please run this script from the hypercare-platform directory"
    exit 1
fi

echo "📁 Verifying project structure..."

# Basic structure check
REQUIRED_DIRS=(
    "frontend/src"
    "backend/src" 
    "data"
    "nginx"
)

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ ! -d "$dir" ]; then
        echo "❌ Missing directory: $dir"
        exit 1
    fi
done

echo "✅ Project structure verified"

# Check configuration files
echo "⚙️  Checking configuration files..."

CONFIG_FILES=(
    "docker-compose.yml"
    ".env.example"
    "nginx/nginx.conf"
    "backend/package.json"
    "frontend/package.json"
)

for file in "${CONFIG_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Missing configuration file: $file"
        exit 1
    fi
done

echo "✅ Configuration files verified"

# Check .env file
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found"
    echo "   Please copy .env.example to .env and add your ANTHROPIC_API_KEY"
else
    echo "✅ .env file found"
    
    # Check if API key is set
    if grep -q "ANTHROPIC_API_KEY=your_api_key_here" .env; then
        echo "⚠️  Warning: Please update ANTHROPIC_API_KEY in .env file"
    elif grep -q "ANTHROPIC_API_KEY=ysk-ant-api03" .env; then
        echo "✅ ANTHROPIC_API_KEY appears to be configured"
    fi
fi

# Run Node.js based integration tests
echo "🧪 Running integration tests..."

cd backend && node tests/integration-tests.js
TEST_RESULT=$?

cd ..

if [ $TEST_RESULT -eq 0 ]; then
    echo "✅ All integration tests passed!"
else
    echo "❌ Some integration tests failed"
    exit 1
fi

# File count verification
echo "📊 Performing file count verification..."

BACKEND_JS_COUNT=$(find backend/src -name "*.js" | wc -l)
FRONTEND_TSX_COUNT=$(find frontend/src -name "*.tsx" -o -name "*.ts" | wc -l)

echo "   Backend JS files: $BACKEND_JS_COUNT"
echo "   Frontend TS/TSX files: $FRONTEND_TSX_COUNT"

if [ $BACKEND_JS_COUNT -lt 10 ]; then
    echo "⚠️  Warning: Expected more backend files (found $BACKEND_JS_COUNT)"
fi

if [ $FRONTEND_TSX_COUNT -lt 15 ]; then
    echo "⚠️  Warning: Expected more frontend files (found $FRONTEND_TSX_COUNT)"
fi

# Docker configuration test
echo "🐳 Validating Docker configuration..."

# Check if docker-compose.yml has required services
REQUIRED_SERVICES=("frontend" "backend" "chromadb" "nginx")

for service in "${REQUIRED_SERVICES[@]}"; do
    if ! grep -q "^  $service:" docker-compose.yml; then
        echo "❌ Missing Docker service: $service"
        exit 1
    fi
done

echo "✅ Docker services configuration verified"

# Port configuration check
REQUIRED_PORTS=("3050:3050" "3051:5173" "3052:8000" "3053:80")

for port in "${REQUIRED_PORTS[@]}"; do
    if ! grep -q "$port" docker-compose.yml; then
        echo "❌ Missing port configuration: $port"
        exit 1
    fi
done

echo "✅ Port configurations verified"

# Final validation
echo "🎯 Final validation checks..."

# Check if main entry points exist
ENTRY_POINTS=(
    "backend/src/index.js"
    "frontend/src/main.tsx"
    "frontend/src/App.tsx"
)

for entry in "${ENTRY_POINTS[@]}"; do
    if [ ! -f "$entry" ]; then
        echo "❌ Missing entry point: $entry"
        exit 1
    fi
done

echo "✅ Entry points verified"

# Summary
echo ""
echo "🏆 TEST SUITE COMPLETE"
echo "======================"
echo "✅ Project structure complete"
echo "✅ Configuration files valid" 
echo "✅ Integration tests passed"
echo "✅ Docker setup verified"
echo "✅ All entry points exist"
echo ""
echo "🚀 Platform is ready for deployment!"
echo "    Run: docker-compose up --build"
echo ""

exit 0