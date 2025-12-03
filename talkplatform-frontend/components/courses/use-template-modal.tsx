'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CourseTemplate, createCourseFromTemplateApi } from '@/api/templates.rest';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Calendar, DollarSign, Users } from 'lucide-react';

interface UseTemplateModalProps {
  template: CourseTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UseTemplateModal({ template, open, onOpenChange }: UseTemplateModalProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    priceFullCourse: '',
    pricePerSession: '',
    maxStudents: '30',
  });

  if (!template) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!template) return;

    try {
      setLoading(true);
      const course = await createCourseFromTemplateApi(template.id, {
        title: formData.title,
        description: formData.description || undefined,
        startDate: formData.startDate || new Date().toISOString(),
        priceFullCourse: formData.priceFullCourse ? parseFloat(formData.priceFullCourse) : undefined,
        pricePerSession: formData.pricePerSession ? parseFloat(formData.pricePerSession) : undefined,
        maxStudents: parseInt(formData.maxStudents) || 30,
      });

      toast({
        title: 'Course created successfully!',
        description: `Course "${course.title}" has been created from template.`,
      });

      onOpenChange(false);
      router.push(`/courses/${course.id}`);
    } catch (error: any) {
      console.error('Failed to create course from template:', error);
      toast({
        title: 'Failed to create course',
        description: error.response?.data?.message || 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Set default values when template changes
  const defaultTitle = template.name;
  const defaultDescription = template.description || '';
  const defaultStartDate = new Date().toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Course from Template</DialogTitle>
          <DialogDescription>
            Use the template &quot;{template.name}&quot; to create a new course. Fill in the details below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Course Title *</Label>
            <Input
              id="title"
              value={formData.title || defaultTitle}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., English Conversation - Winter 2025"
              required
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || defaultDescription}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Course description"
              className="mt-1 min-h-[100px]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Start Date *
              </Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate || defaultStartDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="maxStudents" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Max Students
              </Label>
              <Input
                id="maxStudents"
                type="number"
                min="1"
                max="100"
                value={formData.maxStudents}
                onChange={(e) => setFormData({ ...formData, maxStudents: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {template.suggestedPriceFull && (
              <div>
                <Label htmlFor="priceFullCourse" className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Full Course Price (USD)
                </Label>
                <Input
                  id="priceFullCourse"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.priceFullCourse || template.suggestedPriceFull}
                  onChange={(e) => setFormData({ ...formData, priceFullCourse: e.target.value })}
                  placeholder={template.suggestedPriceFull?.toString()}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Suggested: ${template.suggestedPriceFull}
                </p>
              </div>
            )}

            {template.suggestedPriceSession && (
              <div>
                <Label htmlFor="pricePerSession" className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Price per Session (USD)
                </Label>
                <Input
                  id="pricePerSession"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.pricePerSession || template.suggestedPriceSession}
                  onChange={(e) => setFormData({ ...formData, pricePerSession: e.target.value })}
                  placeholder={template.suggestedPriceSession?.toString()}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Suggested: ${template.suggestedPriceSession}
                </p>
              </div>
            )}
          </div>

          {/* Template Info */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <p className="text-sm font-medium">Template Details:</p>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
              <div>Sessions: {template.totalSessions}</div>
              <div>Duration: {template.totalDurationHours || 'N/A'} hours</div>
              {template.sessionsPerWeek && (
                <div>Sessions/Week: {template.sessionsPerWeek}</div>
              )}
              {template.usageCount > 0 && (
                <div>Used {template.usageCount} times</div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Course
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

