import { useState, useEffect } from 'react';
import { X, Clock, Play, Calendar, Zap } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { workflowApi } from '@/lib/api';

interface WorkflowBuilderProps {
  open: boolean;
  onClose: () => void;
  workflow?: any;
  onSave?: () => void;
}

// Common cron schedule presets
const SCHEDULE_PRESETS = [
  { label: 'Every Minute (for testing)', value: '* * * * *', description: 'Runs every minute' },
  { label: 'Every 5 Minutes', value: '*/5 * * * *', description: 'Every 5 minutes' },
  { label: 'Every Hour', value: '0 * * * *', description: 'At minute 0 of every hour' },
  { label: 'Every Day at 9 AM', value: '0 9 * * *', description: 'Daily at 9:00 AM' },
  { label: 'Every Monday at 9 AM', value: '0 9 * * 1', description: 'Weekly on Monday at 9:00 AM' },
  { label: 'Every 1st of Month', value: '0 9 1 * *', description: 'Monthly on the 1st at 9:00 AM' },
  { label: 'Weekdays at 8 AM', value: '0 8 * * 1-5', description: 'Monday-Friday at 8:00 AM' },
  { label: 'Custom', value: 'custom', description: 'Enter your own cron expression' },
];

export function WorkflowBuilder({ open, onClose, workflow, onSave }: WorkflowBuilderProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    query: '',
    schedule: '0 9 * * *',
    schedulePreset: 'Every Day at 9 AM',
    enabled: true,
    actions: [] as any[],
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [showCustomSchedule, setShowCustomSchedule] = useState(false);

  useEffect(() => {
    if (workflow) {
      setFormData({
        name: workflow.name || '',
        description: workflow.description || '',
        query: workflow.query || '',
        schedule: workflow.schedule || '0 9 * * *',
        schedulePreset: workflow.schedulePreset || 'Every Day at 9 AM',
        enabled: workflow.enabled ?? true,
        actions: workflow.actions || [],
      });
    } else {
      // Reset form for new workflow
      setFormData({
        name: '',
        description: '',
        query: '',
        schedule: '0 9 * * *',
        schedulePreset: 'Every Day at 9 AM',
        enabled: true,
        actions: [],
      });
    }
  }, [workflow, open]);

  const handlePresetChange = (presetLabel: string) => {
    const preset = SCHEDULE_PRESETS.find(p => p.label === presetLabel);
    if (preset) {
      if (preset.value === 'custom') {
        setShowCustomSchedule(true);
      } else {
        setShowCustomSchedule(false);
        setFormData(prev => ({
          ...prev,
          schedule: preset.value,
          schedulePreset: preset.label,
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSaving(true);

    try {
      const data = {
        name: formData.name,
        description: formData.description,
        query: formData.query,
        schedule: formData.schedule,
        enabled: formData.enabled,
        actions: formData.actions,
      };

      if (workflow?.id) {
        await workflowApi.updateWorkflow(workflow.id, data);
      } else {
        await workflowApi.createWorkflow(data);
      }

      onSave?.();
      onClose();
    } catch (err: any) {
      console.error('Error saving workflow:', err);
      setError(err.response?.data?.error || 'Failed to save workflow');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleAction = (actionType: string) => {
    setFormData(prev => {
      const hasAction = prev.actions.some(a => a.type === actionType);
      if (hasAction) {
        return {
          ...prev,
          actions: prev.actions.filter(a => a.type !== actionType),
        };
      } else {
        return {
          ...prev,
          actions: [...prev.actions, { type: actionType, config: {} }],
        };
      }
    });
  };

  const hasAction = (actionType: string) => {
    return formData.actions.some(a => a.type === actionType);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              {workflow ? 'Edit Workflow' : 'Create New Workflow'}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Workflow Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Daily Sales Report"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of what this workflow does"
              />
            </div>
          </div>

          {/* Query */}
          <div>
            <Label htmlFor="query">Analysis Query *</Label>
            <Textarea
              id="query"
              value={formData.query}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, query: e.target.value }))}
              placeholder="e.g., Show me today's revenue by product category and compare with targets"
              rows={3}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Ask your question in natural language. Our AI will analyze your data and generate insights.
            </p>
          </div>

          {/* Schedule */}
          <div className="space-y-4">
            <Label>Schedule *</Label>

            <Select value={formData.schedulePreset} onValueChange={handlePresetChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCHEDULE_PRESETS.map((preset) => (
                  <SelectItem key={preset.label} value={preset.label}>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <div>
                        <div>{preset.label}</div>
                        <div className="text-xs text-muted-foreground">{preset.description}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {showCustomSchedule && (
              <div>
                <Label htmlFor="customSchedule">Custom Cron Expression</Label>
                <Input
                  id="customSchedule"
                  value={formData.schedule}
                  onChange={(e) => setFormData(prev => ({ ...prev, schedule: e.target.value }))}
                  placeholder="0 9 * * *"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Format: minute hour day month weekday (e.g., "0 9 * * *" = daily at 9 AM)
                </p>
              </div>
            )}

            {!showCustomSchedule && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Cron: <code className="bg-background px-2 py-1 rounded">{formData.schedule}</code>
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Label>Actions (Optional)</Label>
            <p className="text-sm text-muted-foreground">
              What should happen when this workflow runs?
            </p>

            <div className="space-y-2">
              <div
                className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                  hasAction('pin_to_canvas') ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                }`}
                onClick={() => toggleAction('pin_to_canvas')}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded border-2 ${
                    hasAction('pin_to_canvas') ? 'border-primary bg-primary' : 'border-muted-foreground'
                  }`} />
                  <div>
                    <div className="font-medium text-sm">Pin to Canvas</div>
                    <div className="text-xs text-muted-foreground">Save results to your insight canvas</div>
                  </div>
                </div>
              </div>

              <div
                className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                  hasAction('send_email') ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                }`}
                onClick={() => toggleAction('send_email')}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded border-2 ${
                    hasAction('send_email') ? 'border-primary bg-primary' : 'border-muted-foreground'
                  }`} />
                  <div>
                    <div className="font-medium text-sm">Send Email</div>
                    <div className="text-xs text-muted-foreground">Email summary to your inbox (coming soon)</div>
                  </div>
                </div>
              </div>

              <div
                className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                  hasAction('export_pdf') ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                }`}
                onClick={() => toggleAction('export_pdf')}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded border-2 ${
                    hasAction('export_pdf') ? 'border-primary bg-primary' : 'border-muted-foreground'
                  }`} />
                  <div>
                    <div className="font-medium text-sm">Export as PDF</div>
                    <div className="text-xs text-muted-foreground">Generate PDF report (coming soon)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <div className="font-medium text-sm">Enable Workflow</div>
              <div className="text-xs text-muted-foreground">Start running on schedule immediately</div>
            </div>
            <Button
              type="button"
              variant={formData.enabled ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFormData(prev => ({ ...prev, enabled: !prev.enabled }))}
            >
              {formData.enabled ? (
                <>
                  <Zap className="h-3 w-3 mr-2" />
                  Enabled
                </>
              ) : (
                'Disabled'
              )}
            </Button>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} className="flex-1">
              {isSaving ? (
                <>Saving...</>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  {workflow ? 'Update Workflow' : 'Create Workflow'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
