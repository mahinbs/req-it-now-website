
import type { Tables } from '@/integrations/supabase/types';

type Requirement = Tables<'requirements'>;

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'completed': return 'bg-green-100 text-green-800 border-green-200';
    case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'low': return 'bg-green-50 text-green-700 border-green-200';
    case 'medium': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'high': return 'bg-red-50 text-red-700 border-red-200';
    default: return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

export const formatDate = (dateString: string, includeTime = false) => {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };
  
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  
  return new Date(dateString).toLocaleDateString('en-US', options);
};

export const getAttachmentCount = (requirement: Requirement) => {
  let count = 0;
  
  // Count from attachment_urls array
  if (requirement.attachment_urls && Array.isArray(requirement.attachment_urls)) {
    count += requirement.attachment_urls.length;
  }
  
  // Count screen recording if present
  if (requirement.screen_recording_url) {
    count += 1;
  }
  
  return count;
};

export const getUniqueAttachments = (requirement: Requirement) => {
  const attachments: Array<{ url: string; name: string; type: 'file' | 'video' }> = [];
  
  // Add regular attachments from attachment_urls
  if (requirement.attachment_urls && Array.isArray(requirement.attachment_urls)) {
    requirement.attachment_urls.forEach((url, index) => {
      // Parse metadata to get proper filename
      let filename = `Attachment ${index + 1}`;
      
      if (requirement.attachment_metadata) {
        try {
          const metadata = Array.isArray(requirement.attachment_metadata) 
            ? requirement.attachment_metadata[index]
            : requirement.attachment_metadata;
          
          if (metadata && typeof metadata === 'object' && 'name' in metadata) {
            filename = metadata.name as string;
          }
        } catch (e) {
          console.warn('Error parsing attachment metadata:', e);
        }
      }
      
      attachments.push({
        url,
        name: filename,
        type: 'file'
      });
    });
  }
  
  // Add screen recording if present
  if (requirement.screen_recording_url) {
    attachments.push({
      url: requirement.screen_recording_url,
      name: 'Screen Recording',
      type: 'video'
    });
  }
  
  return attachments;
};
