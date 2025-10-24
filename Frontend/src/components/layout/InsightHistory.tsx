import { useState } from 'react';
import {
  History, Bookmark, Clock, MessageSquare, BarChart3,
  ChevronRight, Star, Trash2
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface HistoryItem {
  id: string;
  query: string;
  timestamp: Date;
  type: 'chat' | 'chart' | 'insight';
  bookmarked: boolean;
  tags?: string[];
}

const mockHistory: HistoryItem[] = [
  {
    id: '1',
    query: 'Show me revenue growth by region',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    type: 'chart',
    bookmarked: true,
    tags: ['Q4 Report']
  },
  {
    id: '2',
    query: 'Analyze customer churn patterns',
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    type: 'insight',
    bookmarked: false,
  },
  {
    id: '3',
    query: 'Compare Q3 vs Q4 performance',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    type: 'chart',
    bookmarked: true,
    tags: ['Important', 'Q4 Report']
  },
  {
    id: '4',
    query: 'What are the top selling products?',
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
    type: 'chat',
    bookmarked: false,
  },
  {
    id: '5',
    query: 'Detect anomalies in sales data',
    timestamp: new Date(Date.now() - 1000 * 60 * 60),
    type: 'insight',
    bookmarked: false,
  },
  {
    id: '6',
    query: 'Show correlation between price and quantity',
    timestamp: new Date(Date.now() - 1000 * 60 * 90),
    type: 'chart',
    bookmarked: true,
  },
];

const typeIcons = {
  chat: MessageSquare,
  chart: BarChart3,
  insight: History,
};

export function InsightHistory() {
  const [items, setItems] = useState<HistoryItem[]>(mockHistory);
  const [filter, setFilter] = useState<'all' | 'bookmarked'>('all');

  const toggleBookmark = (id: string) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, bookmarked: !item.bookmarked } : item
    ));
  };

  const deleteItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const getRelativeTime = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const filteredItems = filter === 'bookmarked'
    ? items.filter(item => item.bookmarked)
    : items;

  return (
    <div className="w-80 border-l bg-muted/20 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-background">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5" />
            <h2 className="font-semibold">History</h2>
          </div>
          <Badge variant="secondary">{filteredItems.length}</Badge>
        </div>

        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            className="flex-1"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant={filter === 'bookmarked' ? 'default' : 'outline'}
            size="sm"
            className="flex-1"
            onClick={() => setFilter('bookmarked')}
          >
            <Bookmark className="h-3 w-3 mr-1" />
            Saved
          </Button>
        </div>
      </div>

      {/* Timeline */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {filteredItems.map((item, index) => {
            const Icon = typeIcons[item.type];

            return (
              <div
                key={item.id}
                className={cn(
                  "group relative p-3 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-all",
                  item.bookmarked && "ring-1 ring-primary/20"
                )}
              >
                {/* Timeline connector */}
                {index < filteredItems.length - 1 && (
                  <div className="absolute left-[22px] top-12 w-px h-6 bg-border" />
                )}

                <div className="flex gap-3">
                  {/* Icon */}
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10",
                    item.type === 'chart' && "bg-blue-100 dark:bg-blue-950",
                    item.type === 'chat' && "bg-green-100 dark:bg-green-950",
                    item.type === 'insight' && "bg-purple-100 dark:bg-purple-950"
                  )}>
                    <Icon className={cn(
                      "h-3.5 w-3.5",
                      item.type === 'chart' && "text-blue-600 dark:text-blue-400",
                      item.type === 'chat' && "text-green-600 dark:text-green-400",
                      item.type === 'insight' && "text-purple-600 dark:text-purple-400"
                    )} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-2 mb-1">
                      {item.query}
                    </p>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <Clock className="h-3 w-3" />
                      <span>{getRelativeTime(item.timestamp)}</span>
                    </div>

                    {/* Tags */}
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.tags.map((tag, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBookmark(item.id);
                      }}
                    >
                      {item.bookmarked ? (
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      ) : (
                        <Star className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteItem(item.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>

                {/* Hover indicator */}
                <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <Bookmark className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No bookmarked items</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t">
        <Button variant="outline" className="w-full text-xs" size="sm">
          <History className="h-3 w-3 mr-2" />
          Clear History
        </Button>
      </div>
    </div>
  );
}
