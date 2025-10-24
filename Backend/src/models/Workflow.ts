export interface Workflow {
  id: string;
  name: string;
  description: string;
  query: string;
  enabled: boolean;
  schedule: string; // Cron expression
  actions: WorkflowAction[];
  createdAt: Date;
  updatedAt: Date;
  lastRun?: Date;
  nextRun?: Date;
  createdBy?: string;
}

export interface WorkflowAction {
  type: 'pin_to_canvas' | 'send_email' | 'export_pdf' | 'send_slack' | 'webhook';
  config: any;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'success' | 'failed';
  result?: any;
  error?: string;
  duration?: number; // milliseconds
}

export interface CreateWorkflowRequest {
  name: string;
  description: string;
  query: string;
  schedule: string;
  actions?: WorkflowAction[];
  enabled?: boolean;
}

export interface UpdateWorkflowRequest {
  name?: string;
  description?: string;
  query?: string;
  schedule?: string;
  actions?: WorkflowAction[];
  enabled?: boolean;
}
