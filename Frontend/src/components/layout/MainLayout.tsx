import { useState } from 'react';
import { MessageSquare, LayoutGrid, Database, Moon, Sun, FolderOpen } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { InsightHistory } from './InsightHistory';
import { ChatMode } from '../features/ChatMode';
import { InsightCanvas } from '../features/InsightCanvas';
import { DataExplorer } from '../features/DataExplorer';
import { GoogleDrive } from '../features/GoogleDrive';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ViewMode } from '@/types';

export function MainLayout() {
  const [viewMode, setViewMode] = useState<ViewMode>('chat');
  const [showHistory, _setShowHistory] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar onNavigateToChat={() => setViewMode('chat')} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="border-b bg-background px-6 py-3 flex items-center justify-between">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="chat">
                <MessageSquare className="h-4 w-4 mr-2" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="canvas">
                <LayoutGrid className="h-4 w-4 mr-2" />
                Canvas
              </TabsTrigger>
              <TabsTrigger value="explorer">
                <Database className="h-4 w-4 mr-2" />
                Explorer
              </TabsTrigger>
              <TabsTrigger value="drive">
                <FolderOpen className="h-4 w-4 mr-2" />
                Drive
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
            >
              {theme === 'light' ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-hidden p-6">
          {viewMode === 'chat' && <ChatMode />}
          {viewMode === 'canvas' && <InsightCanvas />}
          {viewMode === 'explorer' && <DataExplorer onNavigateToChat={() => setViewMode('chat')} />}
          {viewMode === 'drive' && <GoogleDrive />}
        </div>
      </div>

      {/* Right Panel - History */}
      {showHistory && <InsightHistory />}
    </div>
  );
}
