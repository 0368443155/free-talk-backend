'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CourseTemplate } from '@/api/templates.rest';
import { BookOpen, Clock, Users, Star, TrendingUp } from 'lucide-react';

interface TemplateCardProps {
  template: CourseTemplate;
  onUse?: (template: CourseTemplate) => void;
  onView?: (template: CourseTemplate) => void;
}

export function TemplateCard({ template, onUse, onView }: TemplateCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg mb-2">{template.name}</CardTitle>
            <CardDescription className="line-clamp-2">
              {template.description || 'No description'}
            </CardDescription>
          </div>
          {template.isFeatured && (
            <Badge variant="default" className="ml-2">
              Featured
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Stats */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <BookOpen className="w-4 h-4" />
              <span>{template.totalSessions} sessions</span>
            </div>
            {template.totalDurationHours && (
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{template.totalDurationHours}h</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              <span>{template.usageCount} uses</span>
            </div>
            {template.rating && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span>{template.rating.toFixed(1)}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {template.tags && template.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {template.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {template.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{template.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Category & Level */}
          <div className="flex gap-2 text-xs text-gray-500">
            {template.category && <span>{template.category}</span>}
            {template.level && <span>• {template.level}</span>}
            {template.language && <span>• {template.language}</span>}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        {onUse && (
          <Button onClick={() => onUse(template)} className="flex-1">
            Use Template
          </Button>
        )}
        {onView && (
          <Button variant="outline" onClick={() => onView(template)}>
            View Details
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

