
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileVideo, ExternalLink, MessageCircle, Calendar, Building, Globe, User, Paperclip, Download } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Requirement = Tables<'requirements'> & {
  profiles?: {
    company_name: string;
    website_url: string;
  } | null;
};

interface AttachmentFile {
  url: string;
  name: string;
  size: number;
  type: string;
}

interface RequirementCardProps {
  requirement: Requirement;
  onChatClick: (requirement: Requirement) => void;
  onDownloadAttachment: (url: string, fileName: string) => void;
}

export const RequirementCard = ({ requirement, onChatClick, onDownloadAttachment }: RequirementCardProps) => {
  const parseAttachmentMetadata = (metadata: any): AttachmentFile[] => {
    if (!metadata) return [];
    try {
      if (typeof metadata === 'string') {
        return JSON.parse(metadata);
      }
      if (Array.isArray(metadata)) {
        return metadata;
      }
      return [];
    } catch (error) {
      console.error('Error parsing attachment metadata:', error);
      return [];
    }
  };

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

  const attachmentMetadata = parseAttachmentMetadata(requirement.attachment_metadata);
  const attachmentUrls = requirement.attachment_urls || [];
  const hasAttachments = attachmentMetadata.length > 0 || attachmentUrls.length > 0;

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 border-slate-200 bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg line-clamp-2 text-slate-900 group-hover:text-blue-600 transition-colors">
            {requirement.title}
          </CardTitle>
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
        <p className="text-sm text-slate-600 line-clamp-3">
          {requirement.description}
        </p>
        
        {/* Attachments Section */}
        {hasAttachments && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-xs text-blue-600">
              <Paperclip className="h-3 w-3" />
              <span>
                {attachmentMetadata.length || attachmentUrls.length} attachment(s)
              </span>
            </div>
            <div className="space-y-1 max-h-20 overflow-y-auto">
              {attachmentMetadata.map((file, index) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <span className="truncate">{file.name}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDownloadAttachment(file.url, file.name)}
                    className="h-6 w-6 p-0"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {attachmentUrls.map((url, index) => (
                <div key={`url-${index}`} className="flex items-center justify-between text-xs">
                  <span className="truncate">Attachment {index + 1}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDownloadAttachment(url, `attachment-${index + 1}`)}
                    className="h-6 w-6 p-0"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="space-y-2 text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <Building className="h-3 w-3 text-blue-500" />
            <span className="font-medium">{requirement.profiles?.company_name || 'Unknown Company'}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Globe className="h-3 w-3 text-green-500" />
            <span className="truncate">{requirement.profiles?.website_url || 'No website provided'}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="h-3 w-3 text-purple-500" />
            <span>{new Date(requirement.created_at).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center space-x-2">
            <User className="h-3 w-3 text-orange-500" />
            <span className="text-xs">User ID: {requirement.user_id}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          {requirement.has_screen_recording && (
            <div className="flex items-center space-x-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
              <FileVideo className="h-3 w-3" />
              <span>Recording</span>
            </div>
          )}
          <div className="flex space-x-2 ml-auto">
            <Button
              size="sm"
              onClick={() => {
                console.log('Opening chat for requirement:', requirement);
                onChatClick(requirement);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <MessageCircle className="h-3 w-3 mr-1" />
              Chat
            </Button>
            {requirement.profiles?.website_url && (
              <Button size="sm" variant="outline" asChild>
                <a href={requirement.profiles.website_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
