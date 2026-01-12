import { useState, useRef, useEffect } from 'react';
import { Send, Mic, Paperclip, Sparkles, TrendingUp, Download, Pin, Loader2, AlertCircle, ExternalLink, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useChat } from '@/contexts/ChatContext';
import { useCanvas } from '@/contexts/CanvasContext';
import { useTableau } from '@/contexts/TableauContext';
import { TableauViz } from './TableauViz';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// Colors for charts
const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#6366f1'];

export function ChatMode() {
  const { messages, sendMessage, isLoading, error, clearError, agentProgress } = useChat();
  const { addPinnedVisualization } = useCanvas();
  const { isAuthenticated: tableauAuthenticated, connect: connectTableau } = useTableau();
  const [input, setInput] = useState('');
  const [pinnedMessageId, setPinnedMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const messageText = input;
    setInput('');
    await sendMessage(messageText);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  const handlePinVisualization = (messageIndex: number) => {
    const message = messages[messageIndex];
    if (message.visualization) {
      addPinnedVisualization(message.visualization, `msg-${messageIndex}`);
      // Show visual feedback
      setPinnedMessageId(`msg-${messageIndex}`);
      setTimeout(() => setPinnedMessageId(null), 2000);
    }
  };

  // Display initial greeting if no messages
  const displayMessages = messages.length === 0 ? [
    {
      role: 'assistant' as const,
      content: "Hello! I'm your AI Data Copilot. I can help you analyze data, generate insights, and create visualizations. What would you like to explore today?",
      timestamp: new Date(),
    }
  ] : messages;

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <ScrollArea className="flex-1 px-6 py-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{error}</span>
                <Button variant="ghost" size="sm" onClick={clearError}>
                  Dismiss
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <AnimatePresence>
            {displayMessages.map((message, idx) => (
              <motion.div
                key={`${message.role}-${idx}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                  {/* Avatar */}
                  <div className="flex items-start gap-3 mb-2">
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <div className={`flex-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                      <div
                        className={`inline-block rounded-2xl px-4 py-3 ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        {message.role === 'user' ? (
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        ) : (
                          <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown
                              components={{
                                h1: ({ node, ...props }) => <h1 className="text-lg font-bold mt-4 mb-2" {...props} />,
                                h2: ({ node, ...props }) => <h2 className="text-base font-bold mt-3 mb-2" {...props} />,
                                h3: ({ node, ...props }) => <h3 className="text-sm font-bold mt-2 mb-1" {...props} />,
                                p: ({ node, ...props }) => <p className="mb-2" {...props} />,
                                ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-2" {...props} />,
                                ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-2" {...props} />,
                                li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                                strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,
                                em: ({ node, ...props }) => <em className="italic" {...props} />,
                                code: ({ node, ...props }) => <code className="bg-muted px-1 py-0.5 rounded text-xs" {...props} />,
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>

                      {/* Chart Visualization for AI responses */}
                      {message.role === 'assistant' && (() => {
                        console.log('🔍 Checking message for visualization:', message);
                        console.log('🔍 Has visualization?', !!message.visualization);
                        if (message.visualization) {
                          console.log('🔍 Visualization details:', message.visualization);
                        }
                        return message.visualization;
                      })() && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          transition={{ delay: 0.5 }}
                        >
                          <Card className="mt-3">
                            <CardContent className="p-4">
                              {(() => {
                                const viz = message.visualization;
                                if (!viz) return null;

                                return (
                                  <>
                                    <div className="flex items-center justify-between mb-4">
                                      <h4 className="text-sm font-semibold">{viz.title}</h4>
                                      <div className="flex gap-2">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className={`h-7 w-7 ${pinnedMessageId === `msg-${idx}` ? 'bg-green-100 dark:bg-green-900' : ''}`}
                                          onClick={() => handlePinVisualization(idx)}
                                          title="Pin to canvas"
                                        >
                                          <Pin className={`h-3 w-3 ${pinnedMessageId === `msg-${idx}` ? 'text-green-600 fill-green-600' : ''}`} />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Download">
                                          <Download className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                    <ResponsiveContainer width="100%" height={300}>
                                      {(() => {
                                        switch (viz.type) {
                                          case 'line':
                                            return (
                                              <LineChart data={viz.data}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                <XAxis dataKey="name" fontSize={12} />
                                                <YAxis fontSize={12} />
                                                <Tooltip />
                                                <Legend />
                                                <Line
                                                  type="monotone"
                                                  dataKey="value"
                                                  stroke={COLORS[0]}
                                                  strokeWidth={2}
                                                  dot={{ fill: COLORS[0], r: 4 }}
                                                />
                                              </LineChart>
                                            );
                                          case 'bar':
                                            return (
                                              <BarChart data={viz.data}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                <XAxis dataKey="name" fontSize={12} />
                                                <YAxis fontSize={12} />
                                                <Tooltip />
                                                <Legend />
                                                <Bar dataKey="value" fill={COLORS[0]} />
                                              </BarChart>
                                            );
                                          case 'pie':
                                            return (
                                              <PieChart>
                                                <Pie
                                                  data={viz.data}
                                                  cx="50%"
                                                  cy="50%"
                                                  labelLine={false}
                                                  label={({ name, percent }: any) => `${name}: ${((percent as number) * 100).toFixed(0)}%`}
                                                  outerRadius={80}
                                                  fill="#8884d8"
                                                  dataKey="value"
                                                >
                                                  {viz.data.map((_entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                  ))}
                                                </Pie>
                                                <Tooltip />
                                              </PieChart>
                                            );
                                          case 'scatter':
                                            return (
                                              <ScatterChart>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="name" fontSize={12} />
                                                <YAxis fontSize={12} />
                                                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                                <Scatter data={viz.data} fill={COLORS[0]} />
                                              </ScatterChart>
                                            );
                                          default:
                                            return <div>Unsupported chart type</div>;
                                        }
                                      })()}
                                    </ResponsiveContainer>
                                    {viz.description && (
                                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                                        <div className="flex items-start gap-2 text-sm">
                                          <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5" />
                                          <span className="font-medium text-blue-900 dark:text-blue-100">
                                            {viz.description}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </CardContent>
                          </Card>
                        </motion.div>
                      )}

                      {/* Tableau Visualizations */}
                      {message.role === 'assistant' && message.tableauViews && message.tableauViews.length > 0 && (
                        <div className="mt-3 space-y-3">
                          <h4 className="text-sm font-semibold flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-blue-600" />
                            Found {message.tableauViews.length} Tableau {message.tableauViews.length === 1 ? 'Visualization' : 'Visualizations'}
                          </h4>

                          {/* Check Tableau Authentication */}
                          {!tableauAuthenticated ? (
                            <Alert className="border-orange-200 bg-orange-50">
                              <AlertCircle className="h-4 w-4 text-orange-600" />
                              <AlertDescription className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-orange-900">Tableau Not Connected</p>
                                  <p className="text-sm text-orange-700 mt-1">
                                    Connect to Tableau Cloud to view these visualizations
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={connectTableau}
                                  className="ml-4"
                                >
                                  Connect Now
                                </Button>
                              </AlertDescription>
                            </Alert>
                          ) : (
                            <>
                              {message.tableauViews.map((view) => {
                                console.log('📊 Rendering Tableau view in chat:', {
                                  name: view.name,
                                  fullEmbedUrl: view.fullEmbedUrl,
                                  embedUrl: view.embedUrl,
                                  workbookName: view.workbookName,
                                });
                                return (
                                <Card key={view.id} className="overflow-hidden">
                                  <CardContent className="p-4">
                                    <div className="mb-3">
                                      <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                          <h5 className="text-sm font-semibold">{view.name}</h5>
                                          <p className="text-xs text-muted-foreground mt-1">{view.description}</p>
                                          {view.workbookName && (
                                            <Badge variant="outline" className="mt-2 text-xs">
                                              {view.workbookName}
                                            </Badge>
                                          )}
                                        </div>
                                        <Badge variant="secondary" className="text-xs">
                                          {Math.round(view.relevanceScore * 100)}% match
                                        </Badge>
                                      </div>
                                    </div>
                                    {view.fullEmbedUrl && (
                                      <TableauViz
                                        src={view.fullEmbedUrl}
                                        height="500px"
                                        toolbar="bottom"
                                      />
                                    )}
                                    <div className="mt-3 flex items-center gap-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        asChild
                                      >
                                        <a
                                          href={view.fullEmbedUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-1"
                                        >
                                          <ExternalLink className="h-3 w-3" />
                                          Open in Tableau
                                        </a>
                                      </Button>
                                    </div>
                                  </CardContent>
                                </Card>
                                );
                              })}
                            </>
                          )}
                        </div>
                      )}

                      {/* Insights from metadata */}
                      {message.metadata?.insights && message.metadata.insights.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {message.metadata.insights.map((insight, i) => (
                            <Card key={i} className="p-3">
                              <div className="flex items-start gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {insight.type}
                                </Badge>
                                <div className="flex-1">
                                  <h5 className="text-sm font-semibold">{insight.title}</h5>
                                  <p className="text-xs text-muted-foreground mt-1">{insight.content}</p>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Confidence: {Math.round(insight.confidence * 100)}%
                                  </div>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                    {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm font-semibold">U</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Agent Progress Indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Loader2 className="h-4 w-4 text-white animate-spin" />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex gap-1">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1, delay: 0 }}
                    className="w-2 h-2 bg-muted-foreground rounded-full"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                    className="w-2 h-2 bg-muted-foreground rounded-full"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                    className="w-2 h-2 bg-muted-foreground rounded-full"
                  />
                </div>
                {agentProgress && (
                  <div className="text-xs text-muted-foreground">
                    {agentProgress.agent ? `${agentProgress.agent} agent working...` : 'Processing...'}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t bg-background p-4">
        <div className="max-w-4xl mx-auto">
          {/* Smart Suggestions */}
          {!isLoading && messages.length === 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-accent"
                onClick={() => handleSuggestionClick('Show me sales trends and patterns')}
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Show sales trends
              </Badge>
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-accent"
                onClick={() => handleSuggestionClick('Analyze revenue growth by region')}
              >
                <TrendingUp className="h-3 w-3 mr-1" />
                Analyze revenue growth
              </Badge>
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-accent"
                onClick={() => handleSuggestionClick('Summarize my data')}
              >
                Summarize my data
              </Badge>
            </div>
          )}

          {/* Input Field */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon">
              <Paperclip className="h-4 w-4" />
            </Button>
            <div className="relative flex-1">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Ask anything about your data..."
                className="pr-10"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              >
                <Mic className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={handleSend} disabled={!input.trim() || isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
