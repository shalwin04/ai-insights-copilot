import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import { esClient, INDICES } from '../config/elasticsearch.js';
import { executeWorkflow as runAIWorkflow } from '../langgraph/workflow.js';
import type { Workflow, WorkflowExecution } from '../models/Workflow.js';

class WorkflowScheduler {
  private scheduledTasks: Map<string, cron.ScheduledTask> = new Map();
  private initialized = false;

  /**
   * Initialize the scheduler and load all enabled workflows
   */
  async initialize() {
    if (this.initialized) {
      console.log('⚠️  Workflow scheduler already initialized');
      return;
    }

    console.log('🔄 Initializing workflow scheduler...');

    try {
      // Load all enabled workflows from Elasticsearch
      const response = await (esClient.search as any)({
        index: INDICES.WORKFLOWS,
        body: {
          query: {
            term: { enabled: true },
          },
          size: 1000,
        },
      });

      const workflows = response.hits.hits.map((hit: any) => hit._source as Workflow);

      console.log(`✅ Found ${workflows.length} enabled workflows`);

      // Schedule each workflow
      for (const workflow of workflows) {
        this.scheduleWorkflow(workflow);
      }

      this.initialized = true;
      console.log('✅ Workflow scheduler initialized');
    } catch (error) {
      console.error('❌ Failed to initialize workflow scheduler:', error);
      throw error;
    }
  }

  /**
   * Schedule a workflow
   */
  scheduleWorkflow(workflow: Workflow) {
    try {
      // Unschedule if already scheduled
      this.unscheduleWorkflow(workflow.id);

      // Validate cron expression
      if (!cron.validate(workflow.schedule)) {
        console.error(`❌ Invalid cron expression for workflow ${workflow.id}: ${workflow.schedule}`);
        return;
      }

      // Schedule the workflow
      const task = cron.schedule(workflow.schedule, async () => {
        console.log(`\n⏰ Executing scheduled workflow: ${workflow.name}`);
        await this.executeWorkflow(workflow);
      });

      this.scheduledTasks.set(workflow.id, task);

      console.log(`✅ Scheduled workflow: ${workflow.name} (${workflow.schedule})`);
    } catch (error) {
      console.error(`❌ Failed to schedule workflow ${workflow.id}:`, error);
    }
  }

  /**
   * Unschedule a workflow
   */
  unscheduleWorkflow(workflowId: string) {
    const task = this.scheduledTasks.get(workflowId);
    if (task) {
      task.stop();
      this.scheduledTasks.delete(workflowId);
      console.log(`🛑 Unscheduled workflow: ${workflowId}`);
    }
  }

  /**
   * Execute a workflow manually or on schedule
   */
  async executeWorkflow(workflow: Workflow): Promise<WorkflowExecution> {
    const execution: WorkflowExecution = {
      id: uuidv4(),
      workflowId: workflow.id,
      startTime: new Date(),
      status: 'running',
    };

    try {
      // Save execution start to Elasticsearch
      await esClient.index({
        index: INDICES.WORKFLOW_EXECUTIONS,
        id: execution.id,
        document: execution,
      });

      console.log(`🚀 Starting workflow execution: ${workflow.name}`);

      // Execute the AI workflow with the query
      const result = await runAIWorkflow(workflow.query);

      execution.endTime = new Date();
      execution.status = 'success';
      execution.result = {
        summary: result.summary,
        visualization: result.visualization,
        insights: result.insights,
        datasets: result.relevantDatasets?.map((d: any) => d.name),
      };
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();

      console.log(`✅ Workflow execution completed: ${workflow.name} (${execution.duration}ms)`);

      // Perform workflow actions
      await this.performActions(workflow, result);

      // Update workflow lastRun timestamp
      await esClient.update({
        index: INDICES.WORKFLOWS,
        id: workflow.id,
        doc: {
          lastRun: execution.endTime,
        },
      });
    } catch (error) {
      execution.endTime = new Date();
      execution.status = 'failed';
      execution.error = (error as Error).message;
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();

      console.error(`❌ Workflow execution failed: ${workflow.name}`, error);
    }

    // Save final execution state
    await esClient.update({
      index: INDICES.WORKFLOW_EXECUTIONS,
      id: execution.id,
      doc: execution,
    });

    return execution;
  }

  /**
   * Perform workflow actions (pin to canvas, send email, etc.)
   */
  private async performActions(workflow: Workflow, result: any) {
    if (!workflow.actions || workflow.actions.length === 0) {
      return;
    }

    console.log(`🎯 Performing ${workflow.actions.length} workflow actions...`);

    for (const action of workflow.actions) {
      try {
        switch (action.type) {
          case 'pin_to_canvas':
            console.log('📌 Action: Pinning to Canvas...');
            await this.pinToCanvas(workflow, result);
            console.log('✅ Successfully pinned to Canvas');
            break;

          case 'send_email':
            console.log('📧 Action: Send Email (not implemented yet)');
            // TODO: Implement email sending
            break;

          case 'export_pdf':
            console.log('📄 Action: Export PDF (not implemented yet)');
            // TODO: Implement PDF export
            break;

          case 'send_slack':
            console.log('💬 Action: Send to Slack (not implemented yet)');
            // TODO: Implement Slack integration
            break;

          case 'webhook':
            console.log('🔗 Action: Call Webhook (not implemented yet)');
            // TODO: Implement webhook call
            break;

          default:
            console.warn(`⚠️  Unknown action type: ${action.type}`);
        }
      } catch (error) {
        console.error(`❌ Action failed (${action.type}):`, error);
      }
    }
  }

  /**
   * Pin workflow results to canvas by saving to insights index
   */
  private async pinToCanvas(workflow: Workflow, result: any) {
    const insight = {
      id: uuidv4(),
      workflowId: workflow.id,
      workflowName: workflow.name,
      type: 'workflow_result',
      title: `${workflow.name} - ${new Date().toLocaleDateString()}`,
      content: result.summary || '',
      visualization: result.visualization || null,
      insights: result.insights || [],
      datasets: result.relevantDatasets?.map((d: any) => d.name) || [],
      query: workflow.query,
      metadata: {
        source: 'workflow',
        workflowId: workflow.id,
        workflowSchedule: workflow.schedule,
      },
      pinned: true,
      createdAt: new Date(),
    };

    await esClient.index({
      index: INDICES.INSIGHTS,
      id: insight.id,
      document: insight,
      refresh: 'true',
    });

    console.log(`📌 Pinned workflow result to canvas (insight ID: ${insight.id})`);
  }

  /**
   * Get scheduled workflows count
   */
  getScheduledCount(): number {
    return this.scheduledTasks.size;
  }

  /**
   * Stop all scheduled workflows
   */
  stopAll() {
    console.log('🛑 Stopping all scheduled workflows...');
    for (const [workflowId, task] of this.scheduledTasks) {
      task.stop();
    }
    this.scheduledTasks.clear();
    this.initialized = false;
    console.log('✅ All workflows stopped');
  }
}

// Export singleton instance
export const workflowScheduler = new WorkflowScheduler();
