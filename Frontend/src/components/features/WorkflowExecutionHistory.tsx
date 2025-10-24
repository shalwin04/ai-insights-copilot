import { useState, useEffect } from 'react';
import { X, CheckCircle2, XCircle, Clock, Loader2, TrendingUp } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { workflowApi } from '@/lib/api';

interface WorkflowExecutionHistoryProps {
  open: boolean;
  onClose: () => void;
  workflowId: string;
}

export function WorkflowExecutionHistory({ open, onClose, workflowId }: WorkflowExecutionHistoryProps) {
  const [executions, setExecutions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open && workflowId) {
      loadExecutions();
    }
  }, [open, workflowId]);

  const loadExecutions = async () => {
    try {
      setIsLoading(true);
      const response = await workflowApi.getExecutions(workflowId, 50);
      setExecutions(response.data.executions || []);
    } catch (error) {
      console.error('Error loading executions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-500">Success</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'running':
        return <Badge variant="default" className="bg-blue-500">Running</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Execution History</DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : executions.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">No executions yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                This workflow hasn't run yet
              </p>
            </div>
          ) : (
            <div className="space-y-3 pr-4">
              {executions.map((execution) => (
                <div
                  key={execution.id}
                  className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(execution.status)}
                      <div>
                        <div className="font-medium text-sm">
                          {new Date(execution.startTime).toLocaleString()}
                        </div>
                        {execution.duration && (
                          <div className="text-xs text-muted-foreground">
                            Duration: {formatDuration(execution.duration)}
                          </div>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(execution.status)}
                  </div>

                  {/* Success Details */}
                  {execution.status === 'success' && execution.result && (
                    <div className="space-y-2 mt-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                      {execution.result.summary && (
                        <div>
                          <div className="text-xs font-medium text-green-900 dark:text-green-100 mb-1">
                            Summary
                          </div>
                          <div className="text-xs text-green-800 dark:text-green-200 line-clamp-3">
                            {execution.result.summary}
                          </div>
                        </div>
                      )}

                      {execution.result.visualization && (
                        <div className="flex items-center gap-2 text-xs text-green-800 dark:text-green-200">
                          <TrendingUp className="h-3 w-3" />
                          <span>Visualization generated: {execution.result.visualization.type}</span>
                        </div>
                      )}

                      {execution.result.insights && execution.result.insights.length > 0 && (
                        <div className="text-xs text-green-800 dark:text-green-200">
                          {execution.result.insights.length} insights generated
                        </div>
                      )}

                      {execution.result.datasets && execution.result.datasets.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {execution.result.datasets.map((dataset: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {dataset}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Error Details */}
                  {execution.status === 'failed' && execution.error && (
                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
                      <div className="text-xs font-medium text-red-900 dark:text-red-100 mb-1">
                        Error
                      </div>
                      <div className="text-xs text-red-800 dark:text-red-200 font-mono">
                        {execution.error}
                      </div>
                    </div>
                  )}

                  {/* Running State */}
                  {execution.status === 'running' && (
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                      <div className="flex items-center gap-2 text-xs text-blue-800 dark:text-blue-200">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Workflow is currently running...</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {executions.length > 0 && (
          <div className="border-t pt-4">
            <div className="flex items-center justify-between text-sm">
              <div className="text-muted-foreground">
                Total: {executions.length} executions
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  <span className="text-xs">
                    {executions.filter(e => e.status === 'success').length} succeeded
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <XCircle className="h-3 w-3 text-red-500" />
                  <span className="text-xs">
                    {executions.filter(e => e.status === 'failed').length} failed
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
