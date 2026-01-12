import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

export interface Visualization {
  type: 'line' | 'bar' | 'pie' | 'scatter';
  title: string;
  xAxis?: string;
  yAxis?: string;
  data: Array<{ name: string; value: number }>;
  description?: string;
}

export interface TableauView {
  id: string;
  name: string;
  type: string;
  description: string;
  relevanceScore: number;
  workbookName?: string;
  workbookId?: string;
  projectName?: string;
  embedUrl?: string;
  fullEmbedUrl?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  visualization?: Visualization;
  tableauViews?: TableauView[];
  metadata?: {
    intent?: string;
    datasetsUsed?: string[];
    insights?: Insight[];
  };
}

export interface Insight {
  type: 'trend' | 'anomaly' | 'summary' | 'recommendation';
  title: string;
  content: string;
  confidence: number;
}

export interface Dataset {
  id: string;
  name: string;
  type: string;
}

export interface AgentProgress {
  agent: string | null;
  hasDatasets: boolean;
  hasResults: boolean;
  hasVisualization: boolean;
}

export interface ChatSession {
  sessionId: string;
  messageCount: number;
  lastMessage?: {
    content: string;
    timestamp: string;
  };
}

interface ChatContextType {
  // State
  messages: ChatMessage[];
  currentSession: string | null;
  sessions: ChatSession[];
  isLoading: boolean;
  error: string | null;
  agentProgress: AgentProgress | null;

  // Actions
  sendMessage: (message: string) => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  loadSessions: () => Promise<void>;
  createNewSession: () => void;
  clearError: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agentProgress, setAgentProgress] = useState<AgentProgress | null>(null);

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!isAuthenticated) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    try {
      const newSocket = io(BACKEND_URL, {
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

    newSocket.on('connect', () => {
      console.log('🔌 Connected to WebSocket');
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Disconnected from WebSocket');
    });

    newSocket.on('agent:progress', (progress: AgentProgress) => {
      console.log('📊 Agent progress:', progress);
      setAgentProgress(progress);
    });

    newSocket.on('chat:complete', (response: any) => {
      console.log('✅ Chat complete via WebSocket:', response);
      setAgentProgress(null);
      setIsLoading(false);
      // NOTE: Don't add message here - it's added via REST response to avoid duplicates
    });

    newSocket.on('error', (error: any) => {
      console.error('❌ WebSocket error:', error);
      setError(error.message || 'WebSocket error occurred');
      setIsLoading(false);
      setAgentProgress(null);
    });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    } catch (err) {
      console.error('Failed to initialize WebSocket:', err);
      // Don't block the app if WebSocket fails
    }
  }, [isAuthenticated]);

  // Load sessions on mount
  useEffect(() => {
    if (isAuthenticated) {
      loadSessions();
    }
  }, [isAuthenticated]);

  const sendMessage = useCallback(async (message: string) => {
    // Socket is optional - we use REST API for messages
    // Google auth is also optional - Tableau queries work independently

    try {
      setIsLoading(true);
      setError(null);
      setAgentProgress(null);

      // Add user message immediately
      const userMessage: ChatMessage = {
        role: 'user',
        content: message,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);

      // Send to backend via REST API (more reliable than WebSocket for complex workflows)
      const response = await fetch(`${BACKEND_URL}/api/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          message,
          sessionId: currentSession,
          socketId: socket?.id, // Pass socket ID for progress updates (optional)
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      const result = await response.json();

      console.log('📊 Received response from backend:', result);
      console.log('📊 Visualization data:', result.visualization);

      // Update session ID if new
      if (result.sessionId && !currentSession) {
        setCurrentSession(result.sessionId);
      }

      // Add assistant message
      const assistantMessage = {
        role: 'assistant' as const,
        content: result.message,
        timestamp: new Date(),
        visualization: result.visualization, // Add visualization from backend
        tableauViews: result.tableauViews, // Add Tableau views from backend
        metadata: {
          intent: result.intent,
          datasetsUsed: result.datasets?.map((d: Dataset) => d.id),
          insights: result.insights,
        },
      };

      console.log('📊 Creating assistant message:', assistantMessage);

      setMessages(prev => [
        ...prev,
        assistantMessage,
      ]);

      setIsLoading(false);
      setAgentProgress(null);
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setError(err.message || 'Failed to send message');
      setIsLoading(false);
      setAgentProgress(null);
    }
  }, [isAuthenticated, socket, currentSession]);

  const loadSession = useCallback(async (sessionId: string) => {
    if (!isAuthenticated) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${BACKEND_URL}/api/chat/history/${sessionId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load session history');
      }

      const data = await response.json();
      setMessages(data.messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      })));
      setCurrentSession(sessionId);
      setIsLoading(false);
    } catch (err: any) {
      console.error('Failed to load session:', err);
      setError(err.message || 'Failed to load session');
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const loadSessions = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/chat/sessions`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load sessions');
      }

      const data = await response.json();
      setSessions(data.sessions);
    } catch (err: any) {
      console.error('Failed to load sessions:', err);
      // Don't set error state for session loading failures (non-critical)
    }
  }, [isAuthenticated]);

  const createNewSession = useCallback(() => {
    setMessages([]);
    setCurrentSession(null);
    setError(null);
    setAgentProgress(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: ChatContextType = {
    messages,
    currentSession,
    sessions,
    isLoading,
    error,
    agentProgress,
    sendMessage,
    loadSession,
    loadSessions,
    createNewSession,
    clearError,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
