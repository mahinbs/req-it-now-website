
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Calendar, Plus, File, FileText } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Requirement = Tables<'requirements'>;

interface RequirementsListProps {
  requirements: Requirement[];
  onSelectRequirement: (requirement: Requirement) => void;
  onShowNewRequirement: () => void;
}

export const RequirementsList = ({ requirements, onSelectRequirement, onShowNewRequirement }: RequirementsListProps) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'pending': return 'Waiting for admin review';
      case 'in-progress': return 'Being worked on by admin';
      case 'completed': return 'Completed by admin';
      default: return '';
    }
  };

  if (requirements.length === 0) {
    return (
      <Card className="bg-white border-slate-200">
        <CardContent className="text-center py-12">
          <div className="bg-blue-50 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <FileText className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-medium mb-2 text-slate-900">No requirements yet</h3>
          <p className="text-slate-600 mb-4">
            Submit your first website requirement to get started
          </p>
          <Button onClick={onShowNewRequirement} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Submit Requirement
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {requirements.map((requirement) => (
        <Card key={requirement.id} className="bg-white border-slate-200 hover:shadow-lg transition-all duration-200">
          <CardHeader>
            <div className="flex items-start justify-between">
              <CardTitle className="text-lg text-slate-900">{requirement.title}</CardTitle>
              <div className="flex flex-col space-y-2">
                <Badge className={`${getPriorityColor(requirement.priority)} border`}>
                  {requirement.priority}
                </Badge>
                <Badge className={`${getStatusColor(requirement.status)} border`}>
                  {requirement.status}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              {requirement.description}
            </p>
            
            <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-md">
              <div className="flex items-center space-x-2 mb-1">
                <Calendar className="h-3 w-3 text-blue-500" />
                <span>Submitted: {new Date(requirement.created_at).toLocaleDateString()}</span>
              </div>
              <p className="text-slate-600">{getStatusMessage(requirement.status)}</p>
              {(requirement.attachment_urls?.length > 0 || requirement.attachment_metadata) && (
                <div className="flex items-center space-x-1 mt-2">
                  <File className="h-3 w-3 text-green-500" />
                  <span className="text-green-600">Files attached</span>
                </div>
              )}
            </div>

            <Button
              size="sm"
              onClick={() => onSelectRequirement(requirement)}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Chat with Admin
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
