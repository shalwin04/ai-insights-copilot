import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { esClient, INDICES } from '../config/elasticsearch.js';
import { workflowScheduler } from '../services/workflowScheduler.js';
import type { Workflow, CreateWorkflowRequest, UpdateWorkflowRequest } from '../models/Workflow.js';
import cron from 'node-cron';

const router = express.Router();

/**
 * GET /api/workflows - Get all workflows
 */
router.get('/', async (req, res) => {
  try {
    const response = await (esClient.search as any)({
      index: INDICES.WORKFLOWS,
      body: {
        query: { match_all: {} },
        sort: [{ createdAt: { order: 'desc' } }],
        size: 100,
      },
    });

    const workflows = response.hits.hits.map((hit: any) => ({
      ...hit._source,
      id: hit._id,
    }));

    res.json({
      success: true,
      workflows,
      count: workflows.length,
    });
  } catch (error) {
    console.error('Error fetching workflows:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch workflows',
    });
  }
});

/**
 * GET /api/workflows/:id - Get a single workflow
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const response = await esClient.get({
      index: INDICES.WORKFLOWS,
      id,
    });

    res.json({
      success: true,
      workflow: {
        ...(response._source as any),
        id: response._id,
      },
    });
  } catch (error: any) {
    if (error.meta?.statusCode === 404) {
      res.status(404).json({
        success: false,
        error: 'Workflow not found',
      });
    } else {
      console.error('Error fetching workflow:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch workflow',
      });
    }
  }
});

/**
 * POST /api/workflows - Create a new workflow
 */
router.post('/', async (req, res) => {
  try {
    const data: CreateWorkflowRequest = req.body;

    // Validate required fields
    if (!data.name || !data.query || !data.schedule) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, query, schedule',
      });
    }

    // Validate cron expression
    if (!cron.validate(data.schedule)) {
      return res.status(400).json({
        success: false,
        error: `Invalid cron expression: ${data.schedule}`,
      });
    }

    const workflow: Workflow = {
      id: uuidv4(),
      name: data.name,
      description: data.description || '',
      query: data.query,
      schedule: data.schedule,
      enabled: data.enabled ?? true,
      actions: data.actions || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save to Elasticsearch
    await esClient.index({
      index: INDICES.WORKFLOWS,
      id: workflow.id,
      document: workflow,
      refresh: 'true',
    });

    // Schedule if enabled
    if (workflow.enabled) {
      workflowScheduler.scheduleWorkflow(workflow);
    }

    res.status(201).json({
      success: true,
      workflow,
      message: 'Workflow created successfully',
    });
  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create workflow',
    });
  }
});

/**
 * PUT /api/workflows/:id - Update a workflow
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data: UpdateWorkflowRequest = req.body;

    // Validate cron expression if provided
    if (data.schedule && !cron.validate(data.schedule)) {
      return res.status(400).json({
        success: false,
        error: `Invalid cron expression: ${data.schedule}`,
      });
    }

    // Get existing workflow
    const existing = await esClient.get({
      index: INDICES.WORKFLOWS,
      id,
    });

    const workflow: Workflow = {
      ...(existing._source as Workflow),
      ...data,
      id,
      updatedAt: new Date(),
    };

    // Update in Elasticsearch
    await esClient.update({
      index: INDICES.WORKFLOWS,
      id,
      doc: workflow,
      refresh: 'true',
    });

    // Reschedule if enabled changed or schedule changed
    workflowScheduler.unscheduleWorkflow(id);
    if (workflow.enabled) {
      workflowScheduler.scheduleWorkflow(workflow);
    }

    res.json({
      success: true,
      workflow,
      message: 'Workflow updated successfully',
    });
  } catch (error: any) {
    if (error.meta?.statusCode === 404) {
      res.status(404).json({
        success: false,
        error: 'Workflow not found',
      });
    } else {
      console.error('Error updating workflow:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update workflow',
      });
    }
  }
});

/**
 * DELETE /api/workflows/:id - Delete a workflow
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Unschedule the workflow
    workflowScheduler.unscheduleWorkflow(id);

    // Delete from Elasticsearch
    await esClient.delete({
      index: INDICES.WORKFLOWS,
      id,
      refresh: 'true',
    });

    res.json({
      success: true,
      message: 'Workflow deleted successfully',
    });
  } catch (error: any) {
    if (error.meta?.statusCode === 404) {
      res.status(404).json({
        success: false,
        error: 'Workflow not found',
      });
    } else {
      console.error('Error deleting workflow:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete workflow',
      });
    }
  }
});

/**
 * POST /api/workflows/:id/execute - Manually execute a workflow
 */
router.post('/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;

    // Get workflow
    const response = await esClient.get({
      index: INDICES.WORKFLOWS,
      id,
    });

    const workflow: Workflow = {
      ...(response._source as any),
      id: response._id,
    };

    // Execute workflow (don't await, run in background)
    workflowScheduler.executeWorkflow(workflow).catch((error) => {
      console.error(`Error executing workflow ${id}:`, error);
    });

    res.json({
      success: true,
      message: 'Workflow execution started',
    });
  } catch (error: any) {
    if (error.meta?.statusCode === 404) {
      res.status(404).json({
        success: false,
        error: 'Workflow not found',
      });
    } else {
      console.error('Error executing workflow:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to execute workflow',
      });
    }
  }
});

/**
 * GET /api/workflows/:id/executions - Get execution history
 */
router.get('/:id/executions', async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;

    const response = await (esClient.search as any)({
      index: INDICES.WORKFLOW_EXECUTIONS,
      body: {
        query: {
          term: { workflowId: id },
        },
        sort: [{ startTime: { order: 'desc' } }],
        size: limit,
      },
    });

    const executions = response.hits.hits.map((hit: any) => ({
      ...hit._source,
      id: hit._id,
    }));

    res.json({
      success: true,
      executions,
      count: executions.length,
    });
  } catch (error) {
    console.error('Error fetching executions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch executions',
    });
  }
});

/**
 * GET /api/workflows/stats - Get workflow statistics
 */
router.get('/stats/overview', async (req, res) => {
  try {
    // Get total workflows count
    const workflowsCount = await (esClient.count as any)({
      index: INDICES.WORKFLOWS,
    });

    // Get enabled workflows count
    const enabledCount = await (esClient.count as any)({
      index: INDICES.WORKFLOWS,
      body: {
        query: { term: { enabled: true } },
      },
    });

    // Get recent executions
    const recentExecutions = await (esClient.search as any)({
      index: INDICES.WORKFLOW_EXECUTIONS,
      body: {
        query: { match_all: {} },
        sort: [{ startTime: { order: 'desc' } }],
        size: 10,
      },
    });

    // Calculate success rate
    const executionsResponse = await (esClient.search as any)({
      index: INDICES.WORKFLOW_EXECUTIONS,
      body: {
        query: { match_all: {} },
        size: 100,
      },
    });

    const allExecutions = executionsResponse.hits.hits;
    const successCount = allExecutions.filter((hit: any) => hit._source.status === 'success').length;
    const successRate = allExecutions.length > 0 ? (successCount / allExecutions.length) * 100 : 0;

    res.json({
      success: true,
      stats: {
        totalWorkflows: workflowsCount.count,
        enabledWorkflows: enabledCount.count,
        scheduledWorkflows: workflowScheduler.getScheduledCount(),
        recentExecutions: recentExecutions.hits.hits.map((hit: any) => ({
          ...hit._source,
          id: hit._id,
        })),
        successRate: Math.round(successRate),
        totalExecutions: allExecutions.length,
      },
    });
  } catch (error) {
    console.error('Error fetching workflow stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch workflow stats',
    });
  }
});

export default router;
