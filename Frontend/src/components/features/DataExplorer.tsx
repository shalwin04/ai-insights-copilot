import { useState, useEffect } from 'react';
import {
  Database, Filter, SortAsc, Download, Sparkles,
  BarChart3, Table2, Info, Search, RefreshCw, MessageSquare,
  TrendingUp, AlertCircle, LineChart as LineChartIcon, Activity, Upload, Pin, PinOff
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { explorerApi } from '@/lib/api';
import { useCanvas } from '@/contexts/CanvasContext';
import {
  LineChart, Line, BarChart, Bar, PieChart as RechartsPie, Pie, Cell,
  ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];

interface DataExplorerProps {
  onNavigateToChat?: () => void;
}

export function DataExplorer({ onNavigateToChat }: DataExplorerProps = {}) {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const [datasetOverview, setDatasetOverview] = useState<any>(null);
  const [insights, setInsights] = useState<any[]>([]);
  const [visualizations, setVisualizations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [isGeneratingVisualizations, setIsGeneratingVisualizations] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  // Use CanvasContext for pinned visualizations
  const { pinnedCards, addExplorerVisualization } = useCanvas();

  // Fetch datasets on mount
  useEffect(() => {
    fetchDatasets();
  }, []);

  // Fetch dataset overview when selection changes
  useEffect(() => {
    if (selectedDatasetId) {
      fetchDatasetOverview(selectedDatasetId);
    }
  }, [selectedDatasetId]);

  const fetchDatasets = async () => {
    try {
      setIsLoading(true);
      const response = await explorerApi.getDatasets();
      setDatasets(response.data.datasets || []);

      // Auto-select first dataset if available
      if (response.data.datasets && response.data.datasets.length > 0) {
        setSelectedDatasetId(response.data.datasets[0].id);
      }
    } catch (error) {
      console.error('Error fetching datasets:', error);
      setDatasets([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDatasetOverview = async (datasetId: string) => {
    try {
      setIsLoadingOverview(true);
      const response = await explorerApi.getDatasetOverview(datasetId);
      setDatasetOverview(response.data);
    } catch (error) {
      console.error('Error fetching dataset overview:', error);
      setDatasetOverview(null);
    } finally {
      setIsLoadingOverview(false);
    }
  };

  const handleGenerateInsights = async () => {
    if (!selectedDatasetId) return;

    try {
      setIsGeneratingInsights(true);
      const response = await explorerApi.generateInsights(selectedDatasetId);
      setInsights(response.data.insights || []);
      // Switch to insights tab after generation
      setActiveTab('insights');
    } catch (error) {
      console.error('Error generating insights:', error);
      alert('Failed to generate insights. Please try again.');
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const handleGenerateVisualizations = async () => {
    if (!selectedDatasetId) return;

    try {
      setIsGeneratingVisualizations(true);
      const response = await explorerApi.generateVisualizations(selectedDatasetId);
      setVisualizations(response.data.visualizations || []);
      // Switch to visuals tab after generation
      setActiveTab('visuals');
    } catch (error) {
      console.error('Error generating visualizations:', error);
      alert('Failed to generate visualizations. Please try again.');
    } finally {
      setIsGeneratingVisualizations(false);
    }
  };

  const handleAskCopilot = (insightContext?: string) => {
    if (onNavigateToChat) {
      // If there's insight context, we could pass it to the chat
      // For now, just navigate to chat
      onNavigateToChat();
      // TODO: In a future enhancement, pass the insight context to pre-populate the chat
      if (insightContext) {
        console.log('Insight context for chat:', insightContext);
      }
    } else {
      alert('Chat feature is not available. Please ensure the navigation is properly configured.');
    }
  };

  const handleVisualizeInsight = async (insight: any) => {
    if (!selectedDatasetId) return;

    try {
      setIsGeneratingVisualizations(true);
      // Generate a visualization based on the insight
      const query = `Create a visualization for this insight: ${insight.title}. ${insight.content}`;
      const response = await explorerApi.generateVisualizations(selectedDatasetId, query);
      setVisualizations(response.data.visualizations || []);
      // Switch to visuals tab after generation
      setActiveTab('visuals');
    } catch (error) {
      console.error('Error generating visualization for insight:', error);
      alert('Failed to generate visualization. Please try again.');
    } finally {
      setIsGeneratingVisualizations(false);
    }
  };

  const handlePinVisualization = (viz: any) => {
    // Use CanvasContext to pin/unpin
    addExplorerVisualization(viz);
  };

  const isVisualizationPinned = (viz: any) => {
    // Check if pinned in CanvasContext
    return pinnedCards.some((card) =>
      card.title === viz.title && JSON.stringify(card.content.data) === JSON.stringify(viz.data)
    );
  };

  const handleExportData = async () => {
    if (!selectedDatasetId || !previewData || previewData.length === 0) {
      alert('No data available to export');
      return;
    }

    try {
      // Convert data to CSV
      const headers = Object.keys(previewData[0]);
      const csvContent = [
        headers.join(','),
        ...previewData.map(row =>
          headers.map(header => {
            const value = row[header];
            // Escape values that contain commas or quotes
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${currentDataset.name || 'dataset'}_export.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'trend': return TrendingUp;
      case 'anomaly': return AlertCircle;
      case 'summary': return Info;
      case 'recommendation': return Sparkles;
      default: return Info;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'trend': return 'border-blue-200 bg-blue-50 dark:bg-blue-950';
      case 'anomaly': return 'border-orange-200 bg-orange-50 dark:bg-orange-950';
      case 'summary': return 'border-green-200 bg-green-50 dark:bg-green-950';
      case 'recommendation': return 'border-purple-200 bg-purple-50 dark:bg-purple-950';
      default: return 'border-gray-200 bg-gray-50 dark:bg-gray-950';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'string': return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300';
      case 'number': return 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300';
      case 'date': return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading datasets...</p>
        </div>
      </div>
    );
  }

  // Show empty state if no datasets
  if (datasets.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Upload className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-3">No Datasets Yet</h2>
          <p className="text-muted-foreground mb-6">
            You haven't uploaded any datasets yet. Get started by connecting to Google Drive and indexing your data files.
          </p>
          <div className="space-y-3">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>How to get started:</AlertTitle>
              <AlertDescription className="space-y-2 mt-2">
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">1</Badge>
                  <span className="text-sm">Go to the <strong>Drive</strong> tab in the navigation</span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">2</Badge>
                  <span className="text-sm">Connect your Google Drive account</span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">3</Badge>
                  <span className="text-sm">Select CSV or Excel files to analyze</span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">4</Badge>
                  <span className="text-sm">Click "Index Selected" to process them</span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">5</Badge>
                  <span className="text-sm">Return here to explore your data!</span>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    );
  }

  const currentDataset = datasets.find(d => d.id === selectedDatasetId) || datasets[0];
  const overview = datasetOverview?.overview;
  const previewData = datasetOverview?.preview || [];
  const columns = overview?.columnStatistics || [];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-background p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <Select value={selectedDatasetId || undefined} onValueChange={setSelectedDatasetId}>
                <SelectTrigger className="w-[400px] h-auto py-2">
                  <SelectValue>
                    <div className="text-left">
                      <div className="font-bold">{currentDataset.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {currentDataset.rows?.toLocaleString()} rows × {currentDataset.columns} columns
                        {currentDataset.size && ` • ${currentDataset.size}`}
                      </div>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {datasets.map((dataset) => (
                    <SelectItem key={dataset.id} value={dataset.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{dataset.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {dataset.rows?.toLocaleString()} rows × {dataset.columns} cols
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleAskCopilot()}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Ask Copilot
            </Button>
            <Button variant="outline" onClick={() => fetchDatasetOverview(selectedDatasetId!)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={handleGenerateInsights} disabled={isGeneratingInsights || !selectedDatasetId}>
              <Sparkles className="h-4 w-4 mr-2" />
              {isGeneratingInsights ? 'Generating...' : 'Generate Insights'}
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search columns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline">
            <SortAsc className="h-4 w-4 mr-2" />
            Sort
          </Button>
          <Button variant="outline" onClick={handleExportData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="mx-4 mt-4 w-fit">
            <TabsTrigger value="overview">
              <Activity className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="schema">
              <Database className="h-4 w-4 mr-2" />
              Schema
            </TabsTrigger>
            <TabsTrigger value="visuals">
              <LineChartIcon className="h-4 w-4 mr-2" />
              Visual Summaries
            </TabsTrigger>
            <TabsTrigger value="insights">
              <Sparkles className="h-4 w-4 mr-2" />
              Smart Insights
            </TabsTrigger>
            <TabsTrigger value="preview">
              <Table2 className="h-4 w-4 mr-2" />
              Data Preview
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="flex-1 overflow-hidden px-4 mt-4">
            <ScrollArea className="h-full">
              <div className="space-y-6 pb-6">
                {isLoadingOverview ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    {/* Key Metrics */}
                    <div className="grid grid-cols-4 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">Total Records</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{overview?.totalRows?.toLocaleString() || 0}</div>
                          <p className="text-xs text-muted-foreground mt-1">Across all columns</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">Columns</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{overview?.totalColumns || 0}</div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {(overview?.dataTypes?.numeric || 0) + (overview?.dataTypes?.categorical || 0) + (overview?.dataTypes?.date || 0)} data types
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">Data Quality</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-green-600">
                            {overview?.dataQuality?.completenessScore?.toFixed(1) || 100}%
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {overview?.dataQuality?.missingValuesPercent?.toFixed(1) || 0}% missing values
                          </p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">File Size</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{currentDataset.size || 'N/A'}</div>
                          <p className="text-xs text-muted-foreground mt-1">{currentDataset.type || 'Unknown'} format</p>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}

                {/* Data Type Distribution */}
                {!isLoadingOverview && overview && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Column Type Distribution</CardTitle>
                      <CardDescription>Breakdown of data types in your dataset</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {overview.dataTypes.categorical > 0 && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                              <span className="text-sm">Text / String</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500"
                                  style={{ width: `${(overview.dataTypes.categorical / overview.totalColumns) * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium w-12 text-right">{overview.dataTypes.categorical} cols</span>
                            </div>
                          </div>
                        )}
                        {overview.dataTypes.numeric > 0 && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                              <span className="text-sm">Numeric</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-orange-500"
                                  style={{ width: `${(overview.dataTypes.numeric / overview.totalColumns) * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium w-12 text-right">{overview.dataTypes.numeric} cols</span>
                            </div>
                          </div>
                        )}
                        {overview.dataTypes.date > 0 && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                              <span className="text-sm">Date / Time</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-400"
                                  style={{ width: `${(overview.dataTypes.date / overview.totalColumns) * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium w-12 text-right">{overview.dataTypes.date} cols</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Jump into analysis or generate insights</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        className="justify-start h-auto py-4"
                        onClick={() => handleAskCopilot()}
                      >
                        <div className="flex flex-col items-start gap-1">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            <span className="font-semibold">Ask the Copilot</span>
                          </div>
                          <span className="text-xs text-muted-foreground">Get instant answers about your data</span>
                        </div>
                      </Button>
                      <Button
                        variant="outline"
                        className="justify-start h-auto py-4"
                        onClick={handleGenerateInsights}
                        disabled={isGeneratingInsights}
                      >
                        <div className="flex flex-col items-start gap-1">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4" />
                            <span className="font-semibold">
                              {isGeneratingInsights ? 'Generating...' : 'Generate Insights'}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">Auto-discover patterns and trends</span>
                        </div>
                      </Button>
                      <Button
                        variant="outline"
                        className="justify-start h-auto py-4"
                        onClick={handleGenerateVisualizations}
                        disabled={isGeneratingVisualizations}
                      >
                        <div className="flex flex-col items-start gap-1">
                          <div className="flex items-center gap-2">
                            <LineChartIcon className="h-4 w-4" />
                            <span className="font-semibold">
                              {isGeneratingVisualizations ? 'Generating...' : 'View Visualizations'}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">Explore auto-generated charts</span>
                        </div>
                      </Button>
                      <Button
                        variant="outline"
                        className="justify-start h-auto py-4"
                        onClick={handleExportData}
                      >
                        <div className="flex flex-col items-start gap-1">
                          <div className="flex items-center gap-2">
                            <Download className="h-4 w-4" />
                            <span className="font-semibold">Export Data</span>
                          </div>
                          <span className="text-xs text-muted-foreground">Download in various formats</span>
                        </div>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="schema" className="flex-1 overflow-hidden mt-4">
            <div className="h-full flex gap-4 px-4">
              {/* Column List */}
              <div className="w-1/3">
                <ScrollArea className="h-full pr-4">
                  <div className="space-y-2">
                    {columns
                      .filter((col: any) => col.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((col: any) => (
                        <Card
                          key={col.name}
                          className={`cursor-pointer transition-all hover:shadow-md ${
                            selectedColumn === col.name ? 'ring-2 ring-primary' : ''
                          }`}
                          onClick={() => setSelectedColumn(col.name)}
                        >
                          <CardHeader className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-sm font-mono">{col.name}</CardTitle>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge className={getTypeColor(col.type)} variant="outline">
                                    {col.type}
                                  </Badge>
                                  {col.nullCount > 0 && (
                                    <Badge variant="outline" className="text-xs">
                                      {col.nullCount} nulls
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                        </Card>
                      ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Column Details */}
              <div className="flex-1">
                {selectedColumn ? (
                  <Card className="h-fit">
                    <CardHeader>
                      <CardTitle className="font-mono">{selectedColumn}</CardTitle>
                      <CardDescription>Column Statistics & Information</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {(() => {
                        const col = columns.find((c: any) => c.name === selectedColumn);
                        if (!col) return null;

                        return (
                          <>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">Data Type</div>
                                <Badge className={getTypeColor(col.type)}>{col.type}</Badge>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">Unique Values</div>
                                <div className="text-lg font-semibold">{col.uniqueCount.toLocaleString()}</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">Null Count</div>
                                <div className="text-lg font-semibold">{col.nullCount}</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">Null %</div>
                                <div className="text-lg font-semibold">
                                  {((col.nullCount / (overview?.totalRows || 1)) * 100).toFixed(2)}%
                                </div>
                              </div>
                            </div>

                            {col.type === 'number' && (
                              <div>
                                <h4 className="text-sm font-semibold mb-3">Numerical Statistics</h4>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="p-3 rounded-lg bg-muted">
                                    <div className="text-xs text-muted-foreground mb-1">Mean</div>
                                    <div className="text-lg font-semibold">{col.mean?.toFixed(2)}</div>
                                  </div>
                                  <div className="p-3 rounded-lg bg-muted">
                                    <div className="text-xs text-muted-foreground mb-1">Median</div>
                                    <div className="text-lg font-semibold">{col.median?.toFixed(2) || 'N/A'}</div>
                                  </div>
                                  <div className="p-3 rounded-lg bg-muted">
                                    <div className="text-xs text-muted-foreground mb-1">Min</div>
                                    <div className="text-lg font-semibold">{col.min?.toFixed(2)}</div>
                                  </div>
                                  <div className="p-3 rounded-lg bg-muted">
                                    <div className="text-xs text-muted-foreground mb-1">Max</div>
                                    <div className="text-lg font-semibold">{col.max?.toFixed(2)}</div>
                                  </div>
                                </div>
                              </div>
                            )}

                            <div>
                              <h4 className="text-sm font-semibold mb-3">Quick Actions</h4>
                              <div className="flex flex-wrap gap-2">
                                <Button variant="outline" size="sm">
                                  <BarChart3 className="h-3 w-3 mr-2" />
                                  Show Distribution
                                </Button>
                                <Button variant="outline" size="sm">
                                  <Sparkles className="h-3 w-3 mr-2" />
                                  Find Correlations
                                </Button>
                                <Button variant="outline" size="sm">
                                  Detect Anomalies
                                </Button>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="h-full flex items-center justify-center text-center p-8">
                    <div>
                      <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Select a column</h3>
                      <p className="text-sm text-muted-foreground">
                        Click on a column to view detailed statistics and insights
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="flex-1 overflow-hidden px-4 mt-4">
            {previewData.length > 0 ? (
              <div className="h-full flex flex-col">
                <div className="flex-1 overflow-auto rounded-lg border">
                  <div className="relative">
                    <table className="w-full text-sm">
                      <thead className="bg-muted sticky top-0 z-10">
                        <tr>
                          {Object.keys(previewData[0]).map((key) => (
                            <th key={key} className="text-left p-3 font-medium whitespace-nowrap border-b">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.map((row: any, i: number) => (
                          <tr key={i} className="border-t hover:bg-muted/50">
                            {Object.values(row).map((value: any, j: number) => (
                              <td key={j} className="p-3 whitespace-nowrap">
                                {String(value)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="text-center text-sm text-muted-foreground mt-4 py-2">
                  Showing {previewData.length} of {overview?.totalRows?.toLocaleString() || 0} rows
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Table2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No preview data available</p>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Visual Summaries Tab */}
          <TabsContent value="visuals" className="flex-1 overflow-hidden px-4 mt-4">
            <ScrollArea className="h-full">
              <div className="space-y-6 pb-6">
                {isGeneratingVisualizations ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <RefreshCw className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                      <p className="text-muted-foreground">Generating visualizations...</p>
                    </div>
                  </div>
                ) : visualizations.length > 0 ? (
                  <>
                    <Alert>
                      <TrendingUp className="h-4 w-4" />
                      <AlertTitle>AI-Generated Visualizations</AlertTitle>
                      <AlertDescription>
                        These charts are automatically created based on your dataset structure and content.
                      </AlertDescription>
                    </Alert>

                    {visualizations.map((viz, index) => (
                      <Card key={index}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle>{viz.title}</CardTitle>
                              {viz.description && <CardDescription>{viz.description}</CardDescription>}
                            </div>
                            <Button
                              size="sm"
                              variant={isVisualizationPinned(viz) ? "default" : "outline"}
                              onClick={() => handlePinVisualization(viz)}
                            >
                              {isVisualizationPinned(viz) ? (
                                <>
                                  <PinOff className="h-3 w-3 mr-2" />
                                  Unpin
                                </>
                              ) : (
                                <>
                                  <Pin className="h-3 w-3 mr-2" />
                                  Pin to Canvas
                                </>
                              )}
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {viz.data && viz.data.length > 0 ? (
                            <div>
                              {viz.type === 'bar' && (
                                <ResponsiveContainer width="100%" height={300}>
                                  <BarChart data={viz.data}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="name" fontSize={12} />
                                    <YAxis fontSize={12} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="value" fill={COLORS[index % COLORS.length]} radius={[8, 8, 0, 0]} />
                                  </BarChart>
                                </ResponsiveContainer>
                              )}
                              {viz.type === 'line' && (
                                <ResponsiveContainer width="100%" height={300}>
                                  <LineChart data={viz.data}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="name" fontSize={12} />
                                    <YAxis fontSize={12} />
                                    <Tooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="value" stroke={COLORS[index % COLORS.length]} strokeWidth={2} dot={{ r: 4 }} />
                                  </LineChart>
                                </ResponsiveContainer>
                              )}
                              {viz.type === 'pie' && (
                                <ResponsiveContainer width="100%" height={300}>
                                  <RechartsPie>
                                    <Pie
                                      data={viz.data}
                                      cx="50%"
                                      cy="50%"
                                      labelLine={false}
                                      label
                                      outerRadius={100}
                                      fill="#8884d8"
                                      dataKey="value"
                                    >
                                      {viz.data.map((_entry: unknown, idx: number) => (
                                        <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                                      ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                  </RechartsPie>
                                </ResponsiveContainer>
                              )}
                              {viz.type === 'scatter' && (
                                <ResponsiveContainer width="100%" height={300}>
                                  <ScatterChart>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis
                                      dataKey="x"
                                      type="number"
                                      name={viz.xAxis || 'X'}
                                      fontSize={12}
                                      label={{ value: viz.xAxis || 'X', position: 'insideBottom', offset: -5 }}
                                    />
                                    <YAxis
                                      dataKey="y"
                                      type="number"
                                      name={viz.yAxis || 'Y'}
                                      fontSize={12}
                                      label={{ value: viz.yAxis || 'Y', angle: -90, position: 'insideLeft' }}
                                    />
                                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                    <Legend />
                                    <Scatter
                                      name={viz.title}
                                      data={viz.data}
                                      fill={COLORS[index % COLORS.length]}
                                    />
                                  </ScatterChart>
                                </ResponsiveContainer>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center justify-center py-12 bg-muted/50 rounded-lg">
                              <p className="text-sm text-muted-foreground">No data available for this visualization</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <LineChartIcon className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Visualizations Yet</h3>
                      <p className="text-sm text-muted-foreground mb-4 max-w-md">
                        Generate visualizations to see auto-created charts based on your dataset.
                        Click the button below or use the Quick Actions in the Overview tab.
                      </p>
                      <Button onClick={handleGenerateVisualizations} disabled={isGeneratingVisualizations}>
                        <LineChartIcon className="h-4 w-4 mr-2" />
                        {isGeneratingVisualizations ? 'Generating...' : 'Generate Visualizations'}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Smart Insights Tab */}
          <TabsContent value="insights" className="flex-1 overflow-hidden px-4 mt-4">
            <ScrollArea className="h-full">
              <div className="space-y-4 pb-6">
                <Alert>
                  <Sparkles className="h-4 w-4" />
                  <AlertTitle>AI-Powered Insights</AlertTitle>
                  <AlertDescription>
                    These insights are automatically generated by analyzing patterns, trends, and anomalies in your data.
                  </AlertDescription>
                </Alert>

                {insights.length > 0 ? (
                  insights.map((insight, index) => {
                    const Icon = getInsightIcon(insight.type);
                    return (
                      <Card key={index} className={`border-2 ${getInsightColor(insight.type)}`}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-900 flex items-center justify-center">
                                <Icon className="h-4 w-4" />
                              </div>
                              <div>
                                <CardTitle className="text-base">{insight.title}</CardTitle>
                                <Badge variant="outline" className="mt-1 text-xs capitalize">
                                  {insight.type}
                                </Badge>
                              </div>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {Math.round(insight.confidence * 100)}% confidence
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm leading-relaxed">{insight.content}</p>
                          <div className="mt-4 flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAskCopilot(`${insight.title}: ${insight.content}`)}
                            >
                              <MessageSquare className="h-3 w-3 mr-2" />
                              Ask About This
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleVisualizeInsight(insight)}
                              disabled={isGeneratingVisualizations}
                            >
                              <BarChart3 className="h-3 w-3 mr-2" />
                              {isGeneratingVisualizations ? 'Generating...' : 'Visualize'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <Info className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Insights Yet</h3>
                      <p className="text-sm text-muted-foreground mb-4 max-w-md">
                        Click "Generate Insights" to discover patterns, trends, and anomalies in your dataset using AI analysis.
                      </p>
                    </CardContent>
                  </Card>
                )}

                <Card className="border-2 border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                    <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Generate More Insights</h3>
                    <p className="text-sm text-muted-foreground mb-4 max-w-md">
                      Click below to generate additional insights using advanced AI analysis of your dataset.
                    </p>
                    <Button onClick={handleGenerateInsights} disabled={isGeneratingInsights}>
                      <Sparkles className="h-4 w-4 mr-2" />
                      {isGeneratingInsights ? 'Generating...' : 'Generate More Insights'}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
