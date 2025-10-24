import { useState, useEffect } from 'react';
import {
  Play, Pause, Edit, Trash2, Clock, CheckCircle2, History, MoreVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { workflowApi } from '@/lib/api';
import { WorkflowBuilder } from './WorkflowBuilder';
import { WorkflowExecutionHistory } from './WorkflowExecutionHistory';

export function WorkflowList() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyWorkflowId, setHistoryWorkflowId] = useState<string | null>(null);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      setIsLoading(true);
      const response = await workflowApi.getWorkflows();
      setWorkflows(response.data.workflows || []);
    } catch (error) {
      console.error('Error loading workflows:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleEnabled = async (workflow: any) => {
    try {
      await workflowApi.updateWorkflow(workflow.id, {
        enabled: !workflow.enabled,
      });
      await loadWorkflows();
    } catch (error) {
      console.error('Error toggling workflow:', error);
      alert('Failed to toggle workflow');
    }
  };

  const handleExecute = async (workflowId: string) => {
    try {
      await workflowApi.executeWorkflow(workflowId);
      alert('Workflow execution started! Check execution history for results.');
    } catch (error) {
      console.error('Error executing workflow:', error);
      alert('Failed to execute workflow');
    }
  };

  const handleEdit = (workflow: any) => {
    setSelectedWorkflow(workflow);
    setShowBuilder(true);
  };

  const handleDelete = async (workflowId: string, workflowName: string) => {
    if (!confirm(`Are you sure you want to delete "${workflowName}"?`)) {
      return;
    }

    try {
      await workflowApi.deleteWorkflow(workflowId);
      await loadWorkflows();
    } catch (error) {
      console.error('Error deleting workflow:', error);
      alert('Failed to delete workflow');
    }
  };

  const handleViewHistory = (workflowId: string) => {
    setHistoryWorkflowId(workflowId);
    setShowHistory(true);
  };

  const handleCloseBuilder = () => {
    setShowBuilder(false);
    setSelectedWorkflow(null);
  };

  const handleSaveWorkflow = () => {
    loadWorkflows();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-muted-foreground">Loading workflows...</div>
      </div>
    );
  }

  if (workflows.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-sm text-muted-foreground">No workflows yet</div>
        <p className="text-xs text-muted-foreground mt-1">
          Create your first workflow to automate data analysis
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {workflows.map((workflow) => (
          <Card key={workflow.id} className="hover:bg-accent/50 transition-colors">
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm truncate">{workflow.name}</h4>
                    <Badge
                      variant={workflow.enabled ? 'default' : 'secondary'}
                      className="text-xs shrink-0"
                    >
                      {workflow.enabled ? 'ON' : 'OFF'}
                    </Badge>
                  </div>

                  {workflow.description && (
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                      {workflow.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{workflow.schedule}</span>
                    </div>

                    {workflow.lastRun && (
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        <span>
                          Last: {new Date(workflow.lastRun).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleExecute(workflow.id)}>
                      <Play className="h-3 w-3 mr-2" />
                      Run Now
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleViewHistory(workflow.id)}>
                      <History className="h-3 w-3 mr-2" />
                      View History
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEdit(workflow)}>
                      <Edit className="h-3 w-3 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleToggleEnabled(workflow)}>
                      {workflow.enabled ? (
                        <>
                          <Pause className="h-3 w-3 mr-2" />
                          Disable
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3 mr-2" />
                          Enable
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDelete(workflow.id, workflow.name)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-3 w-3 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Workflow Builder Modal */}
      <WorkflowBuilder
        open={showBuilder}
        onClose={handleCloseBuilder}
        workflow={selectedWorkflow}
        onSave={handleSaveWorkflow}
      />

      {/* Execution History Modal */}
      {historyWorkflowId && (
        <WorkflowExecutionHistory
          open={showHistory}
          onClose={() => {
            setShowHistory(false);
            setHistoryWorkflowId(null);
          }}
          workflowId={historyWorkflowId}
        />
      )}
    </>
  );
}
