# 🚀 AI-Powered Analytics Copilot

> Your personal AI data analyst powered by LangGraph agents and semantic search

An intelligent analytics platform that connects to your data sources (Google Drive, OneDrive, Notion) and provides natural language insights through autonomous AI agents.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)

## ✨ Features

### 🤖 Autonomous AI Agents
- **Router Agent**: Intelligently classifies user intent (query, visualization, summary, analysis)
- **Retriever Agent**: Uses semantic search with OpenAI embeddings to find relevant datasets
- **Analyzer Agent**: Plans and executes data analysis based on user requests
- **Summarizer Agent**: Generates natural language insights and actionable recommendations

### 📊 Data Intelligence
- **Semantic Search**: Vector-based search using 1536-dimensional OpenAI embeddings
- **Multi-Format Support**: CSV, Excel, PDF, Word, JSON parsing
- **Automatic Schema Detection**: Extracts column types, statistics, and structure
- **Real-Time Insights**: Live progress updates as agents work on your query

### 🔗 Data Source Connections
- ✅ **Google Drive** (Active)
- 🚧 **OneDrive** (Planned)
- 🚧 **Notion** (Planned)
- 🚧 **Databricks** (Planned)

### 💬 Natural Language Interface
- Chat with your data using plain English
- Context-aware multi-turn conversations
- Session history persistence
- Real-time agent progress indicators

### 🎨 Beautiful User Interface
- Modern React UI with Tailwind CSS
- Real-time WebSocket updates
- Responsive design
- Dark mode support

## 🏗️ Architecture

```
Frontend (React + TypeScript)
    ↓ REST API + WebSocket
Backend (Node.js + Express)
    ↓ LangGraph Workflow
AI Agents (Router → Retriever → Analyzer → Summarizer)
    ↓ OpenAI API
Vector Search + Storage
    ↓ Elasticsearch
External Data Sources (Google Drive, etc.)
```

**Key Technologies:**
- **AI/ML**: LangChain.js, LangGraph, OpenAI (GPT-4, GPT-3.5, Embeddings)
- **Search**: Elasticsearch with vector search
- **Backend**: Node.js, Express, TypeScript, Socket.IO
- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Auth**: OAuth 2.0 (Google)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Elasticsearch 8.x
- OpenAI API key
- Google Cloud Console project with Drive API enabled

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd googlecloud-ai-accelerate
```

2. **Set up Elasticsearch**
```bash
# Using Docker (recommended)
docker run -d \
  --name elasticsearch \
  -p 9200:9200 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  elasticsearch:8.11.0
```

3. **Configure Backend**
```bash
cd Backend
npm install --legacy-peer-deps

# Create .env file
cat > .env << EOF
PORT=3000
SESSION_SECRET=your-secure-secret
FRONTEND_URL=http://localhost:5173
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
OPENAI_API_KEY=your-openai-api-key
ELASTICSEARCH_NODE=http://localhost:9200
EOF
```

4. **Configure Frontend**
```bash
cd ../Frontend
npm install

# Create .env file
cat > .env << EOF
VITE_BACKEND_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=your-google-client-id
EOF
```

5. **Start the Application**

Terminal 1 (Backend):
```bash
cd Backend
npm run dev
```

Terminal 2 (Frontend):
```bash
cd Frontend
npm run dev
```

6. **Open in Browser**
```
http://localhost:5173
```

## 📖 Documentation

- **[Setup Guide](./SETUP_GUIDE.md)**: Detailed installation and configuration instructions
- **[Architecture](./ARCHITECTURE.md)**: System design, data flow, and technical decisions
- **[API Reference](./ARCHITECTURE.md#-api-reference-summary)**: REST API endpoint documentation

## 🎯 Usage

### 1. Connect Data Source

1. Open the application
2. Click "Connect" next to Google Drive in the sidebar
3. Authorize the OAuth popup
4. Your files will appear in the sidebar

### 2. Ingest Data

The system automatically indexes your files when connected. You can also trigger manual ingestion:

```bash
curl -X POST http://localhost:3000/api/ingest/google-drive/auto \
  -H "Content-Type: application/json" \
  --cookie "connect.sid=your-session-cookie"
```

### 3. Chat with Your Data

Click on the chat interface and ask questions:

**Examples:**
- "Show me sales trends from the last quarter"
- "Analyze revenue growth by region"
- "What are the key insights from my customer data?"
- "Compare Q3 and Q4 performance"
- "Summarize my sales data"

### 4. Watch the Agents Work

The interface shows real-time progress as agents work:
1. 🤖 Router analyzes your intent
2. 🔍 Retriever finds relevant datasets
3. 📊 Analyzer plans the analysis
4. ✍️ Summarizer generates insights

## 🧪 Testing

### Backend Tests

```bash
cd Backend
npm run test:workflow
```

### Manual API Testing

```bash
# Test chat endpoint
curl -X POST http://localhost:3000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{"message": "Show me sales trends"}' \
  --cookie "connect.sid=your-session"

# Check ingestion status
curl http://localhost:3000/api/ingest/jobs \
  --cookie "connect.sid=your-session"
```

## 📊 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/google` | GET | Initiate Google OAuth |
| `/api/auth/status` | GET | Check authentication status |
| `/api/drive/files` | GET | List Google Drive files |
| `/api/ingest/google-drive/auto` | POST | Auto-ingest Drive files |
| `/api/ingest/jobs` | GET | List ingestion jobs |
| `/api/chat/message` | POST | Send chat message |
| `/api/chat/history/:sessionId` | GET | Get chat history |
| `/api/chat/sessions` | GET | List user sessions |

## 🐛 Troubleshooting

### Elasticsearch Connection Issues
```bash
# Verify Elasticsearch is running
curl http://localhost:9200

# Restart if needed
docker restart elasticsearch
```

### OpenAI API Errors
- Verify `OPENAI_API_KEY` in `.env`
- Check API credits and rate limits
- Ensure key has access to GPT-4 and embeddings

### WebSocket Connection Failed
- Ensure backend is running on port 3000
- Check `VITE_BACKEND_URL` in frontend `.env`
- Verify CORS configuration

For more troubleshooting, see [SETUP_GUIDE.md](./SETUP_GUIDE.md#-troubleshooting)

## 🗂️ Project Structure

```
googlecloud-ai-accelerate/
├── Backend/
│   ├── src/
│   │   ├── agents/           # LangGraph agents
│   │   ├── config/           # Configuration files
│   │   ├── langgraph/        # Workflow orchestration
│   │   ├── routes/           # API endpoints
│   │   ├── services/         # Business logic
│   │   └── index.ts          # Server entry point
│   └── package.json
│
├── Frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── contexts/         # React contexts
│   │   ├── hooks/            # Custom hooks
│   │   └── main.tsx          # App entry point
│   └── package.json
│
├── SETUP_GUIDE.md            # Detailed setup instructions
├── ARCHITECTURE.md           # System architecture documentation
└── README.md                 # This file
```

## 🔐 Security

- OAuth 2.0 for secure authentication
- Session-based authentication with secure cookies
- Environment variables for sensitive data
- CORS protection
- HTTPS recommended for production

## 🚧 Roadmap

### Version 1.1 (Planned)
- [ ] Visualizer Agent for automatic chart generation
- [ ] Query Generator Agent for SQL generation
- [ ] Export functionality (PDF, Excel)
- [ ] Advanced analytics (correlation, anomalies)

### Version 1.2 (Future)
- [ ] OneDrive connector
- [ ] Notion connector
- [ ] Databricks connector
- [ ] Multi-user support
- [ ] Custom data transformations
- [ ] Scheduled data refresh

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **LangChain.js** for agent orchestration
- **OpenAI** for GPT-4 and embeddings
- **Elasticsearch** for powerful search capabilities
- **shadcn/ui** for beautiful UI components
- **Recharts** for data visualization

## 📧 Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Documentation**: See [SETUP_GUIDE.md](./SETUP_GUIDE.md) and [ARCHITECTURE.md](./ARCHITECTURE.md)

## 🌟 Show Your Support

Give a ⭐️ if this project helped you!

---

**Built with ❤️ using TypeScript, React, Node.js, LangChain, and OpenAI**
