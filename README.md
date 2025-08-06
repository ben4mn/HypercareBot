# 🚀 Hypercare AI Chatbot Platform

A complete AI-powered chatbot platform with RAG (Retrieval Augmented Generation) capabilities, document processing, and intelligent chat functionality.

## ✨ Features

### 🧠 **AI-Powered Chat**
- **Claude AI Integration**: Intelligent responses powered by Anthropic's Claude
- **RAG (Retrieval Augmented Generation)**: Context-aware responses using uploaded documents
- **Streaming Responses**: Real-time word-by-word response delivery
- **Conversation Memory**: Maintains chat history across sessions

### 📄 **Document Processing**
- **Multi-format Support**: Upload TXT, PDF, Word, Excel files (PDF/Word coming soon)
- **Smart Text Extraction**: Automatic content extraction from various file formats
- **Text Chunking**: Intelligent document segmentation for optimal processing
- **Vector Storage**: Document embeddings stored in ChromaDB for semantic search

### 🏗️ **Enterprise Architecture**
- **PostgreSQL Database**: Persistent data storage for production use
- **Docker Containerized**: Easy deployment and scaling
- **Admin Dashboard**: Web interface for chatbot and document management
- **Multi-Chatbot Support**: Create and manage multiple AI assistants
- **Per-Bot Data Isolation**: Each chatbot has its own document knowledge base

### 🔧 **Technical Stack**
- **Backend**: Node.js + Express + PostgreSQL
- **Frontend**: React + TypeScript + Vite
- **AI**: Anthropic Claude API + Custom RAG Pipeline
- **Vector DB**: ChromaDB for semantic search
- **Deployment**: Docker + Docker Compose

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose installed
- (Optional) Anthropic API key for full AI functionality

### 1. Clone Repository
```bash
git clone <repository-url>
cd hypercare-platform
```

### 2. Environment Setup
Create a `.env` file in the root directory:
```bash
# Required for full AI functionality (optional for testing)
ANTHROPIC_API_KEY=sk-ant-your-api-key-here

# Database (auto-generated if not set)
POSTGRES_PASSWORD=your-secure-password-here

# Admin access (change in production)
ADMIN_PASSWORD=your-admin-password-here
```

### 3. Start the Platform
```bash
# Start all services
docker-compose up -d

# View logs (optional)
docker-compose logs -f
```

### 4. Access the Platform
- **Admin Dashboard**: http://localhost:3051
- **Backend API**: http://localhost:3050
- **PostgreSQL**: localhost:5432
- **ChromaDB**: http://localhost:3052

## 📋 Usage Guide

### Admin Dashboard Access

1. **Login**: Navigate to http://localhost:3051
   - Default password: `change_this_password` (change via ADMIN_PASSWORD env var)

2. **Create Chatbot**:
   - Click "Create New Chatbot"
   - Configure name, system prompt, and welcome message
   - Save to generate unique chatbot URL

3. **Upload Documents**:
   - Select your chatbot
   - Navigate to Documents tab
   - Upload TXT files (PDF/Word/Excel coming soon)
   - Documents are automatically processed and indexed

### Chat Interface

1. **Access Chat**: Use the generated chatbot URL from admin dashboard
2. **Test Conversations**: Ask questions about uploaded documents
3. **View Responses**: Get intelligent, context-aware answers

### API Usage

#### Authentication
```bash
# Get admin token
curl -X POST http://localhost:3050/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password": "your-admin-password"}'
```

#### Create Chatbot
```bash
curl -X POST http://localhost:3050/api/admin/chatbots \
  -H "Authorization: Bearer YOUR-TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Support Bot",
    "system_prompt": "You are a helpful customer support assistant.",
    "welcome_message": "Hello! How can I help you today?"
  }'
```

#### Upload Document
```bash
curl -X POST http://localhost:3050/api/admin/chatbots/CHATBOT-ID/documents/upload \
  -H "Authorization: Bearer YOUR-TOKEN" \
  -F "file=@document.txt"
```

#### Chat API
```bash
curl -X POST http://localhost:3050/api/chat/CHATBOT-SLUG/message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are your business hours?",
    "conversationId": "user-session-123"
  }'
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Claude API key for AI responses | None (fallback mode) |
| `POSTGRES_PASSWORD` | PostgreSQL database password | `hypercare_db_password` |
| `ADMIN_PASSWORD` | Admin dashboard password | `change_this_password` |
| `NODE_ENV` | Environment mode | `development` |

### Docker Services

| Service | Port | Purpose |
|---------|------|---------|
| Frontend | 3051 | Admin dashboard |
| Backend | 3050 | API server |
| PostgreSQL | 5432 | Main database |
| ChromaDB | 3052 | Vector database |
| Nginx | 3053 | Reverse proxy |

## 🗃️ Database Schema

### Key Tables
- **chatbots**: Chatbot configurations and settings
- **documents**: Uploaded files and metadata
- **conversations**: Chat sessions and history
- **messages**: Individual chat messages
- **analytics**: Usage tracking (future)

## 📊 System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Admin UI      │    │   Chat Widget    │    │   API Client    │
│  (React/TS)     │    │   (Future)       │    │   (External)    │
└─────────┬───────┘    └─────────┬────────┘    └─────────┬───────┘
          │                     │                       │
          └─────────────────────┼───────────────────────┘
                                │
                    ┌───────────▼────────────┐
                    │    Backend API         │
                    │   (Node.js/Express)    │
                    └───────────┬────────────┘
                                │
                ┌───────────────┼────────────────┐
                │               │                │
       ┌────────▼────────┐ ┌───▼────┐ ┌─────────▼──────────┐
       │  PostgreSQL     │ │ Claude │ │    ChromaDB        │
       │  (Main Data)    │ │   AI   │ │ (Vector Search)    │
       └─────────────────┘ └────────┘ └────────────────────┘
```

## 🔒 Security Considerations

### Production Deployment
1. **Change Default Passwords**: Update `ADMIN_PASSWORD` and `POSTGRES_PASSWORD`
2. **API Key Security**: Store `ANTHROPIC_API_KEY` securely
3. **Network Security**: Configure firewall rules
4. **SSL/TLS**: Add HTTPS in production
5. **Database Security**: Use strong PostgreSQL credentials

### Data Privacy
- Documents are stored locally in your infrastructure
- No data is sent to third parties (except Claude API for AI responses)
- Full control over data retention and deletion

## 🚨 Troubleshooting

### Common Issues

**Backend won't start**
```bash
# Check PostgreSQL connection
docker-compose logs postgres

# Check backend logs
docker-compose logs backend
```

**Documents not processing**
```bash
# Check ChromaDB status
curl http://localhost:3052/api/v1/heartbeat

# Check backend processing logs
docker-compose logs backend | grep -i "processing"
```

**AI responses not working**
1. Verify `ANTHROPIC_API_KEY` is set correctly
2. Check Claude API status: `curl http://localhost:3050/api/admin/claude/test`
3. System falls back to simple responses without API key

### Data Persistence

- **PostgreSQL data**: Persists in `postgres-data` Docker volume
- **ChromaDB vectors**: Persists in `./data/vectors` directory
- **Uploaded files**: Stored in `./data/uploads` directory

### Backup and Recovery

```bash
# Backup PostgreSQL
docker-compose exec postgres pg_dump -U hypercare hypercare > backup.sql

# Backup ChromaDB vectors
tar -czf vectors-backup.tar.gz ./data/vectors

# Backup uploaded files
tar -czf uploads-backup.tar.gz ./data/uploads
```

## 🔄 Updates and Maintenance

### Updating the Platform
```bash
# Pull latest changes
git pull origin main

# Rebuild containers
docker-compose build --no-cache

# Restart services
docker-compose up -d
```

### Database Migrations
- PostgreSQL schema is automatically created/updated on startup
- No manual migration required for minor updates

## 📈 Monitoring

### Health Checks
```bash
# System health
curl http://localhost:3050/health

# Database status
curl http://localhost:3050/api/admin/claude/test

# ChromaDB status
curl http://localhost:3052/api/v1/heartbeat
```

### Logs
```bash
# All services
docker-compose logs

# Specific service
docker-compose logs backend
docker-compose logs postgres
```

## 🛠️ Development

### Local Development Setup
```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Run in development mode
docker-compose up -d postgres chromadb
cd backend && npm run dev
cd ../frontend && npm run dev
```

### Testing
```bash
# Backend tests
cd backend && npm test

# System integration test
curl http://localhost:3050/health
```

## 📄 License

This project is licensed under the MIT License.

## 🤝 Support

For issues and questions:
1. Check the troubleshooting section
2. Review Docker logs
3. Verify environment configuration
4. Create an issue in the repository

---

**🎉 Ready to build intelligent chatbots with document-aware AI responses!** 

Start with `docker-compose up -d` and access the admin dashboard at http://localhost:3051