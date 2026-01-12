# 🚀 Tableau AI Copilot

> Your intelligent AI assistant for Tableau Cloud - powered by Google Gemini and LangGraph agents

An AI-powered analytics platform that transforms how you interact with Tableau Cloud. Chat with your dashboards, discover visualizations through natural language, and get instant insights from your data using Google Gemini AI.

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Visit_App-blue?style=for-the-badge)](https://ai-insights-copilot.vercel.app/)
[![GitHub](https://img.shields.io/badge/💻_GitHub-Source_Code-black?style=for-the-badge)](https://github.com/shalwin04/ai-insights-copilot)
[![YouTube](https://img.shields.io/badge/🎥_Demo_Video-Watch_Now-red?style=for-the-badge)](https://youtu.be/n80pcvHKyI4)

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Tableau](https://img.shields.io/badge/Tableau-Cloud-orange.svg)
![Gemini](https://img.shields.io/badge/Gemini-Pro-purple.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)

---

## 🔗 Quick Links

- 🌐 **Live Demo**: https://ai-insights-copilot.vercel.app/
- 💻 **GitHub Repository**: https://github.com/shalwin04/ai-insights-copilot
- 📡 **Backend API**: https://tableau-copilot-backend.onrender.com
- 🎥 **Demo Video**: https://youtu.be/n80pcvHKyI4
- 📚 **Documentation**: [Setup Guide](./SETUP_GUIDE.md) | [Architecture](./ARCHITECTURE.md)

## 🎯 What Makes This Special?

Tableau AI Copilot bridges the gap between Tableau's powerful visualizations and natural language interaction. Instead of browsing through workbooks and views manually, simply ask questions and let AI find, display, and explain your dashboards.

**Key Innovation:**

- 🤖 **AI-Powered Discovery**: Semantic search across all your Tableau workbooks, views, and data sources
- 💬 **Natural Language Chat**: "Show me sales dashboard" → Instantly displays the right Tableau visualization
- 🎨 **Embedded Visualizations**: View and interact with Tableau dashboards directly in the chat interface
- 🔒 **Secure Authentication**: JWT-based authentication using Tableau Connected Apps

## ✨ Features

### 📊 Tableau Integration

- **Connected Apps JWT Authentication**: Secure, server-side authentication with Tableau Cloud
- **Semantic Workbook Discovery**: AI-powered search across workbooks, views, and data sources
- **Embedded Tableau Embedding API v3**: Interactive dashboards rendered directly in the chat
- **Real-Time Indexing**: Automatic workbook metadata indexing for instant discovery
- **Multi-Project Support**: Search across all your Tableau projects and folders

### 🤖 Intelligent AI Agents (LangGraph)

- **Router Agent**: Classifies user intent (Tableau discovery, data analysis, visualization)
- **Tableau Discovery Agent**: Semantic search for Tableau content with OpenAI embeddings
- **Data Retriever Agent**: Finds relevant datasets from Google Drive and other sources
- **Analyzer Agent**: Plans and executes data analysis workflows
- **Summarizer Agent**: Generates natural language insights and recommendations

### 📈 Data Analytics

- **Multi-Source Data Integration**: Google Drive, CSV uploads, Excel files
- **Semantic Search**: Vector-based search using OpenAI embeddings
- **Automated Workflows**: Create pipelines from data ingestion to insights
- **Real-Time Insights**: Live progress updates as agents analyze your data

### 💬 Natural Language Interface

- Chat with Tableau dashboards using plain English
- Context-aware conversations with memory
- Real-time agent progress indicators
- Session history persistence

### 🎨 Beautiful User Interface

- Modern React UI with Tailwind CSS and shadcn/ui
- Responsive design with dark mode support
- Real-time WebSocket updates
- Interactive data canvas for pinning insights

## 🏗️ Architecture

```
Frontend (React + TypeScript)
    ↓ REST API + WebSocket
Backend (Node.js + Express)
    ↓ LangGraph Multi-Agent Workflow
AI Agents (Router → Tableau Discovery → Analyzer → Summarizer)
    ↓ Google Gemini Pro + OpenAI Embeddings
Tableau Cloud (REST API v3.22 + Embedding API v3)
    ↓ Connected Apps JWT Auth
Vector Search (ChromaDB - Optional)
External Data Sources (Google Drive, Files)
```

**Key Technologies:**

- **AI/ML**: LangChain.js, LangGraph, Google Gemini Pro, OpenAI Embeddings
- **Tableau**: REST API v3.22, Embedding API v3, Connected Apps (Direct Trust)
- **Backend**: Node.js, Express, TypeScript, Socket.IO
- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion
- **Auth**: OAuth 2.0 (Google), Tableau JWT (Connected Apps)
- **Vector DB**: ChromaDB (optional for enhanced search)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- OpenAI API key (for embeddings)
- Google Gemini API key
- Tableau Cloud account with Connected Apps enabled
- Google Cloud Console project (for Google Drive integration)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd googlecloud-ai-accelerate
```

### 2. Configure Backend

```bash
cd Backend
npm install

# Create .env file with Tableau credentials
cat > .env << EOF
# Server
PORT=3000
SESSION_SECRET=your-secure-random-secret
FRONTEND_URL=

# AI Services
OPENAI_API_KEY=your-openai-api-key
GOOGLE_AI_API_KEY=your-gemini-api-key

# Tableau Cloud Connected Apps (Direct Trust)
TABLEAU_SERVER_URL=
TABLEAU_SITE_NAME=your-site-name
TABLEAU_USERNAME=your-tableau-username
TABLEAU_CLIENT_ID=your-connected-app-client-id
TABLEAU_SECRET_ID=your-connected-app-secret-id
TABLEAU_CLIENT_SECRET=your-connected-app-secret-value

# Optional: ChromaDB (for enhanced vector search)
CHROMA_ENABLED=false
CHROMA_URL=http://localhost:8000
EOF
```

#### Setting Up Tableau Connected Apps

1. Go to Tableau Cloud → Settings → Connected Apps
2. Create a new Connected App with **Direct Trust**
3. Enable scopes: `tableau:content:read`, `tableau:workbooks:read`, `tableau:views:embed`
4. Copy the **Client ID**, **Secret ID**, and **Secret Value** to your `.env` file

### 3. Configure Frontend

```bash
cd ../Frontend
npm install

# Create .env file
cat > .env << EOF
VITE_API_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=your-google-client-id
EOF
```

### 4. Start the Application

**Terminal 1 (Backend):**

```bash
cd Backend
npm run dev
```

**Terminal 2 (Frontend):**

```bash
cd Frontend
npm run dev
```

### 5. Open in Browser

```
http://localhost:5173
```

## 🎯 Usage

### 1. Connect to Tableau Cloud

1. Open the application
2. Navigate to the Tableau page (sidebar)
3. Click "Connect to Tableau Cloud"
4. Your workbooks will be automatically indexed

### 2. Browse Tableau Workbooks

- View all your workbooks organized by project
- Expand workbooks to see individual views
- Click "Show Visualization" to embed dashboards
- Interact with visualizations directly in the browser

### 3. Chat with Your Tableau Data

Ask natural language questions:

**Tableau Discovery:**

- "Show me the sales dashboard"
- "Find visualizations about revenue"
- "What Tableau reports do I have for Q4?"
- "Display the executive summary workbook"

**Data Analysis:**

- "Analyze trends in my sales data"
- "What are the key insights from Q4?"
- "Compare revenue across regions"
- "Summarize my customer data"

### 4. Watch the AI Agents Work

The interface shows real-time progress:

1. 🤖 **Router** analyzes your intent
2. 📊 **Tableau Discovery** searches for relevant dashboards
3. 🔍 **Retriever** finds additional data if needed
4. 📈 **Analyzer** generates insights
5. ✍️ **Summarizer** creates natural language summaries

## 📖 Documentation

- **[Setup Guide](./SETUP_GUIDE.md)**: Detailed installation and configuration
- **[Architecture](./ARCHITECTURE.md)**: System design and technical decisions
- **[Tableau Setup](./Backend/TABLEAU_SETUP.md)**: Tableau Connected Apps configuration

## 📊 API Endpoints

### Tableau Endpoints

| Endpoint                            | Method | Description                          |
| ----------------------------------- | ------ | ------------------------------------ |
| `/api/tableau/auth/connect`         | POST   | Connect with server-side credentials |
| `/api/tableau/auth/status`          | GET    | Check Tableau authentication status  |
| `/api/tableau/auth/embedding-token` | GET    | Get JWT token for embedding          |
| `/api/tableau/workbooks`            | GET    | List all workbooks                   |
| `/api/tableau/views`                | GET    | List all views                       |
| `/api/tableau/views/:id/embed-url`  | GET    | Get embed URL for a view             |

### Core Endpoints

| Endpoint            | Method | Description                    |
| ------------------- | ------ | ------------------------------ |
| `/api/auth/google`  | GET    | Initiate Google OAuth          |
| `/api/drive/files`  | GET    | List Google Drive files        |
| `/api/chat/message` | POST   | Send chat message to AI agents |
| `/api/workflows`    | GET    | List automated workflows       |

## 🧪 Testing

### Test Tableau Integration

```bash
cd Backend
npm run test:tableau
```

### Test AI Workflow

```bash
npm run test:workflow
```

### Manual Testing

```bash
# Connect to Tableau
curl -X POST http://localhost:3000/api/tableau/auth/connect

# Get workbooks
curl http://localhost:3000/api/tableau/workbooks \
  --cookie "connect.sid=your-session"

# Chat with Tableau
curl -X POST http://localhost:3000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{"message": "Show me sales dashboard"}' \
  --cookie "connect.sid=your-session"
```

## 🎨 Features Showcase

### Semantic Search for Tableau

Uses OpenAI embeddings to create vector representations of:

- Workbook names and descriptions
- View names and content URLs
- Data source metadata
- Project names and tags

### Embedded Visualizations

Tableau Embedding API v3 with:

- JWT token authentication
- Interactive filters and parameters
- Full toolbar support (refresh, download, maximize)
- Responsive sizing

### Multi-Agent Workflow

LangGraph orchestrates:

1. Intent classification
2. Parallel data retrieval (Tableau + files)
3. Context-aware analysis
4. Natural language summarization

## 🐛 Troubleshooting

### Tableau Connection Issues

```bash
# Verify credentials
curl -X POST http://localhost:3000/api/tableau/auth/connect

# Check environment variables
echo $TABLEAU_CLIENT_ID
```

**Common Issues:**

- Invalid Connected App credentials → Verify Client ID and Secret in Tableau Cloud
- Token expired → Server automatically refreshes tokens
- Missing scopes → Ensure Connected App has read and embed permissions

### Embedding Authentication Errors

If visualizations show "Sign in required":

1. Check that `/api/tableau/auth/embedding-token` returns a valid JWT
2. Verify Connected App has `tableau:views:embed` scope
3. Ensure TABLEAU_USERNAME matches your Tableau Cloud username

### OpenAI/Gemini API Errors

- Verify API keys in `.env`
- Check API credits and rate limits
- Gemini Pro requires billing enabled on Google Cloud

## 🗂️ Project Structure

```
tableau-ai-copilot/
├── Backend/
│   ├── src/
│   │   ├── agents/           # LangGraph AI agents
│   │   │   ├── tableauAgent.ts         # Tableau integration
│   │   │   ├── tableauDiscovery.ts     # Semantic search
│   │   │   └── workflow.ts             # Multi-agent orchestration
│   │   ├── services/
│   │   │   ├── tableau.ts              # Tableau REST API client
│   │   │   └── tableauJWT.ts           # JWT token generation
│   │   ├── routes/
│   │   │   └── tableau.ts              # Tableau API endpoints
│   │   └── config/
│   │       └── tableau.ts              # Tableau configuration
│   └── package.json
│
├── Frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── features/
│   │   │   │   ├── TableauViz.tsx           # Embedding component
│   │   │   │   └── TableauWorkbookBrowser.tsx  # Workbook browser
│   │   │   └── pages/
│   │   │       └── TableauPage.tsx          # Main Tableau UI
│   │   ├── contexts/
│   │   │   └── TableauContext.tsx           # Tableau state management
│   │   └── lib/
│   │       └── api.ts                       # API client
│   └── package.json
│
└── README.md
```

## 🙏 Acknowledgments

- **Tableau** for the powerful analytics platform and Embedding API
- **Google** for Gemini Pro AI and Cloud infrastructure
- **LangChain.js** for agent orchestration framework
- **OpenAI** for embeddings API
- **shadcn/ui** for beautiful UI components

---

**Tech Stack**: TypeScript · React · Node.js · Google Gemini · Tableau Cloud · LangGraph · OpenAI
