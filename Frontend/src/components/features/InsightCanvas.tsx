import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  GripVertical, Maximize2, Minimize2, X, Pin, Download,
  Share2, TrendingUp, AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LineChart, Line, BarChart, Bar, PieChart as RechartsPie, Pie, Cell,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import type { InsightCard } from '@/types';
import { useCanvas } from '@/contexts/CanvasContext';

const mockRevenueData = [
  { month: 'Jan', revenue: 4000, target: 3800 },
  { month: 'Feb', revenue: 3000, target: 3500 },
  { month: 'Mar', revenue: 5000, target: 4200 },
  { month: 'Apr', revenue: 4500, target: 4500 },
  { month: 'May', revenue: 6000, target: 5000 },
  { month: 'Jun', revenue: 5500, target: 5200 },
];

// Colors for charts
const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#6366f1'];

const mockTableData = [
  { product: 'Product A', sales: 1234, growth: '+12%', status: 'up' },
  { product: 'Product B', sales: 987, growth: '+8%', status: 'up' },
  { product: 'Product C', sales: 756, growth: '-3%', status: 'down' },
  { product: 'Product D', sales: 2341, growth: '+24%', status: 'up' },
];

interface DraggableCardProps {
  card: InsightCard;
  onRemove: (id: string) => void;
  onPin: (id: string) => void;
}

function DraggableCard({ card, onRemove, onPin }: DraggableCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const renderContent = () => {
    switch (card.type) {
      case 'chart':
        // Use actual data if available, otherwise fall back to mock data
        const chartData = card.content.data || mockRevenueData;
        const dataKey = card.content.yAxis || 'value';

        if (card.content.chartType === 'line') {
          return (
            <ResponsiveContainer width="100%" height={isExpanded ? 400 : 250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey={card.content.xAxis || 'name'} fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey={dataKey}
                  stroke={COLORS[0]}
                  strokeWidth={2}
                  dot={{ fill: COLORS[0], r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          );
        } else if (card.content.chartType === 'bar') {
          return (
            <ResponsiveContainer width="100%" height={isExpanded ? 400 : 250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey={card.content.xAxis || 'name'} fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey={dataKey} fill={COLORS[0]} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          );
        } else if (card.content.chartType === 'pie') {
          return (
            <ResponsiveContainer width="100%" height={isExpanded ? 400 : 250}>
              <RechartsPie>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: any) => `${name}: ${((percent as number) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey={dataKey}
                >
                  {chartData.map((_entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPie>
            </ResponsiveContainer>
          );
        } else if (card.content.chartType === 'scatter') {
          return (
            <ResponsiveContainer width="100%" height={isExpanded ? 400 : 250}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={card.content.xAxis || 'name'} fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter data={chartData} fill={COLORS[0]} />
              </ScatterChart>
            </ResponsiveContainer>
          );
        }
        break;

      case 'table':
        return (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">Product</th>
                  <th className="text-right p-2 font-medium">Sales</th>
                  <th className="text-right p-2 font-medium">Growth</th>
                </tr>
              </thead>
              <tbody>
                {mockTableData.map((row, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-2">{row.product}</td>
                    <td className="text-right p-2">{row.sales.toLocaleString()}</td>
                    <td className="text-right p-2">
                      <Badge variant={row.status === 'up' ? 'success' : 'destructive'}>
                        {row.growth}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'metric':
        return (
          <div className="flex flex-col items-center justify-center h-full py-8">
            <div className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {card.content.value}
            </div>
            <p className="text-sm text-muted-foreground mt-2">{card.content.label}</p>
            {card.content.change && (
              <div className="flex items-center gap-1 mt-3">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-green-600">{card.content.change}</span>
              </div>
            )}
          </div>
        );

      case 'text':
        return (
          <div className="prose prose-sm max-w-none">
            <p>{card.content.text}</p>
          </div>
        );
    }
  };

  const renderDescription = () => {
    if (card.content.description) {
      return (
        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <div className="flex items-start gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5" />
            <span className="font-medium text-blue-900 dark:text-blue-100">
              {card.content.description}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0.1}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={isExpanded ? 'col-span-2 row-span-2' : 'col-span-1'}
    >
      <Card className="h-full hover:shadow-lg transition-shadow cursor-move">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
              <CardTitle className="text-base">{card.title}</CardTitle>
              {card.pinned && <Pin className="h-3 w-3 text-primary fill-primary" />}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onPin(card.id)}
              >
                <Pin className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
              >
                <Download className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
              >
                <Share2 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onRemove(card.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {renderContent()}
          {renderDescription()}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function InsightCanvas() {
  const { pinnedCards, removePinnedCard, togglePinCard } = useCanvas();
  const [cards, setCards] = useState<InsightCard[]>([]);

  // Merge pinned cards from context with local cards
  useEffect(() => {
    setCards(pinnedCards);
  }, [pinnedCards]);

  const handleRemove = (id: string) => {
    removePinnedCard(id);
  };

  const handlePin = (id: string) => {
    togglePinCard(id);
  };

  return (
    <div className="h-full p-6 bg-muted/20">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Insight Canvas</h2>
          <p className="text-sm text-muted-foreground">
            Drag and arrange your insights • {cards.length} cards
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Dashboard
          </Button>
          <Button>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 auto-rows-min">
        {cards.map(card => (
          <DraggableCard
            key={card.id}
            card={card}
            onRemove={handleRemove}
            onPin={handlePin}
          />
        ))}
      </div>

      {/* Empty State */}
      {cards.length === 0 && (
        <div className="flex flex-col items-center justify-center h-96 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No insights yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Start by asking questions in chat mode to generate insights
          </p>
          <Button>Go to Chat</Button>
        </div>
      )}
    </div>
  );
}
