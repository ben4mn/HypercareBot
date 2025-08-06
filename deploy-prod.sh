#!/bin/bash

# Production deployment script for Hypercare Platform

echo "🚀 Starting production deployment..."

# Stop existing containers
echo "📦 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down

# Pull latest images and rebuild
echo "🔨 Building containers..."
docker-compose -f docker-compose.prod.yml build --no-cache

# Copy production nginx config
echo "🌐 Setting up nginx config..."
cp nginx/nginx.prod.conf nginx/nginx.conf

# Start services
echo "▶️  Starting production services..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to start
echo "⏳ Waiting for services to initialize..."
sleep 30

# Check service health
echo "🩺 Checking service health..."
docker-compose -f docker-compose.prod.yml ps

# Test the health endpoint
echo "✅ Testing health endpoint..."
curl -f http://localhost:3050/health || echo "❌ Backend health check failed"

echo "🎉 Deployment complete!"
echo "📋 Services running:"
echo "   - Frontend: http://localhost:3051 (direct)"
echo "   - Backend API: http://localhost:3050 (direct)"
echo "   - Nginx Proxy: http://localhost:9876 (main app)"
echo "   - Database: PostgreSQL on port 5432"
echo "   - ChromaDB: http://localhost:3052"
echo ""
echo "🌐 For your domain to work, you need to:"
echo "   1. Configure your reverse proxy (port 80) to forward to localhost:9876"
echo "   2. OR access directly at: http://hypercare.zyroi.com:9876"
echo ""
echo "📝 To check logs:"
echo "   docker-compose -f docker-compose.prod.yml logs -f [service_name]"
echo ""
echo "🛑 To stop services:"
echo "   docker-compose -f docker-compose.prod.yml down"