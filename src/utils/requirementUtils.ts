
import type { Tables } from '@/integrations/supabase/types';
import { Clock, Play, CheckCircle } from 'lucide-react';

type Requirement = Tables<'requirements'>;

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'approved':
    case 'approved_by_admin':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'completed':
    case 'completed_by_admin':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'rejected':
    case 'rejected_by_client':
      return 'bg-red-100 text-red-800 border-red-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

export const getPriorityColor = (priority: string) => {
  switch (priority.toLowerCase()) {
    case 'high':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'low':
      return 'bg-green-100 text-green-800 border-green-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

export const getAdminStatusColor = (adminStatus: string) => {
  switch (adminStatus) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'ongoing':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

// Unified status configuration for admin status dropdown
export const adminStatusConfig = {
  pending: {
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    buttonColor: 'bg-yellow-600 hover:bg-yellow-700',
    icon: Clock
  },
  ongoing: {
    label: 'Ongoing',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    buttonColor: 'bg-blue-600 hover:bg-blue-700',
    icon: Play
  },
  completed: {
    label: 'Completed',
    color: 'bg-green-100 text-green-800 border-green-300',
    buttonColor: 'bg-green-600 hover:bg-green-700',
    icon: CheckCircle
  }
};

export const formatDate = (dateString: string, includeTime = false) => {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  
  return date.toLocaleDateString(undefined, options);
};

export const getAttachmentCount = (requirement: Requirement) => {
  if (requirement.attachment_urls) {
    return requirement.attachment_urls.length;
  }
  return 0;
};

export const getUniqueAttachments = (requirement: Requirement) => {
  const attachments = [];
  
  // Add regular attachments
  if (requirement.attachment_urls && requirement.attachment_urls.length > 0) {
    requirement.attachment_urls.forEach((url, index) => {
      const metadata = requirement.attachment_metadata as any;
      const fileName = metadata?.[index]?.name || `Attachment ${index + 1}`;
      attachments.push({
        url,
        name: fileName,
        type: 'file'
      });
    });
  }
  
  // Add screen recording if exists
  if (requirement.screen_recording_url) {
    attachments.push({
      url: requirement.screen_recording_url,
      name: 'Screen Recording',
      type: 'video'
    });
  }
  
  return attachments;
};

// Helper function to determine if a requirement is in a "stuck" state
export const isRequirementStuck = (requirement: Requirement): boolean => {
  return requirement.rejected_by_client === true && 
         !requirement.admin_response_to_rejection;
};

// Enhanced function to get the appropriate action text for requirement status
export const getRequirementActionText = (requirement: Requirement): string => {
  if (requirement.rejected_by_client) {
    return requirement.admin_response_to_rejection ? 'View Response' : 'Respond to Rejection';
  }
  
  if (requirement.completed_by_admin && !requirement.accepted_by_client) {
    return 'Review Completed Work';
  }
  
  return 'Open Chat';
};

// Helper function to check if a requirement was recently reopened
export const wasRequirementReopened = (requirement: Requirement): boolean => {
  return Boolean(
    requirement.rejection_reason && 
    !requirement.rejected_by_client && 
    requirement.admin_response_to_rejection
  );
};

// Helper function to get reopened task display info
export const getReopenedTaskInfo = (requirement: Requirement) => {
  const wasReopened = wasRequirementReopened(requirement);
  return {
    wasReopened,
    responseToRejection: requirement.admin_response_to_rejection,
    originalRejectionReason: requirement.rejection_reason,
    canCompleteTask: wasReopened || (!requirement.rejected_by_client && requirement.admin_status !== 'completed')
  };
};

// Helper function to get the most accurate status based on admin_status and flags
export const getEffectiveStatus = (requirement: Requirement): string => {
  // Always prioritize admin_status as the source of truth
  const adminStatus = requirement.admin_status || 'pending';
  
  // Handle special cases
  if (requirement.rejected_by_client) {
    return 'rejected_by_client';
  }
  
  if (requirement.accepted_by_client) {
    return 'accepted_by_client';
  }
  
  // Map admin status to effective status
  switch (adminStatus) {
    case 'pending':
      return 'pending';
    case 'ongoing':
      return 'approved_by_admin';
    case 'completed':
      return 'completed_by_admin';
    default:
      return requirement.status;
  }
};

// Helper function to check if status is consistent
export const isStatusConsistent = (requirement: Requirement): boolean => {
  const adminStatus = requirement.admin_status || 'pending';
  
  switch (adminStatus) {
    case 'pending':
      return !requirement.approved_by_admin && 
             !requirement.completed_by_admin && 
             !requirement.accepted_by_client &&
             requirement.status === 'pending';
    case 'ongoing':
      return requirement.approved_by_admin && 
             !requirement.completed_by_admin && 
             !requirement.accepted_by_client &&
             requirement.status === 'approved_by_admin';
    case 'completed':
      return requirement.approved_by_admin && 
             requirement.completed_by_admin && 
             !requirement.accepted_by_client &&
             requirement.status === 'completed_by_admin';
    default:
      return true;
  }
};

// Helper function to check if requirement should be auto-completed
export const shouldAutoComplete = (requirement: Requirement): boolean => {
  if (!requirement.completed_by_admin || 
      requirement.accepted_by_client || 
      requirement.rejected_by_client || 
      !requirement.completion_date) {
    return false;
  }
  
  const completionDate = new Date(requirement.completion_date);
  const now = new Date();
  const hoursElapsed = (now.getTime() - completionDate.getTime()) / (1000 * 60 * 60);
  
  return hoursElapsed >= 24;
};

// Helper function to get hours remaining for auto-completion
export const getHoursRemainingForAutoCompletion = (requirement: Requirement): number => {
  if (!requirement.completed_by_admin || 
      requirement.accepted_by_client || 
      requirement.rejected_by_client || 
      !requirement.completion_date) {
    return 0;
  }
  
  const completionDate = new Date(requirement.completion_date);
  const now = new Date();
  const hoursElapsed = (now.getTime() - completionDate.getTime()) / (1000 * 60 * 60);
  
  return Math.max(0, Math.ceil(24 - hoursElapsed));
};

// Helper function to get auto-completion status info
export const getAutoCompletionInfo = (requirement: Requirement) => {
  const shouldAuto = shouldAutoComplete(requirement);
  const hoursRemaining = getHoursRemainingForAutoCompletion(requirement);
  
  return {
    shouldAutoComplete: shouldAuto,
    hoursRemaining,
    isAwaitingReview: requirement.completed_by_admin && !requirement.accepted_by_client && !requirement.rejected_by_client,
    hasCompletionDate: Boolean(requirement.completion_date)
  };
};
