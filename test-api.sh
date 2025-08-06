#!/bin/bash

echo "Starting Hypercare Platform tests..."

# Start services in detached mode
echo "Starting Docker services..."
docker-compose up -d

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 10

# Check if backend is healthy
echo "Checking backend health..."
curl -f http://localhost:3050/health || { echo "Backend not ready"; exit 1; }

# Run tests
echo "Running API tests..."
docker-compose exec backend node tests/api.test.js

# Capture test result
TEST_RESULT=$?

# Show logs if tests failed
if [ $TEST_RESULT -ne 0 ]; then
  echo "Tests failed. Showing backend logs:"
  docker-compose logs backend
fi

# Stop services
echo "Stopping Docker services..."
docker-compose down

exit $TEST_RESULT