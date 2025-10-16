
import type { Tables } from '@/integrations/supabase/types';
import type { DateFilter, StatusFilter, PriorityFilter } from '@/components/filters/RequirementsFilter';

type Requirement = Tables<'requirements'> & {
  profiles?: {
    company_name: string;
    website_url: string;
  } | null;
};

export const getRequirementStatus = (requirement: Requirement): string => {
  // Check for closed status first
  if (requirement.admin_status === 'closed') {
    return 'closed';
  }
  if (requirement.rejected_by_client) {
    return 'rejected';
  } else if (requirement.accepted_by_client) {
    return 'completed';
  } else if (requirement.completed_by_admin) {
    return 'completed'; // Awaiting client review, but technically completed
  } else if (requirement.approved_by_admin || requirement.admin_status === 'ongoing') {
    return 'ongoing';
  }
  return 'pending';
};

export const filterRequirementsByStatus = (
  requirements: Requirement[], 
  statusFilter: StatusFilter
): Requirement[] => {
  if (statusFilter === 'all') {
    return requirements;
  }

  return requirements.filter(requirement => {
    const status = getRequirementStatus(requirement);
    return status === statusFilter;
  });
};

export const filterRequirementsByPriority = (
  requirements: Requirement[], 
  priorityFilter: PriorityFilter
): Requirement[] => {
  if (priorityFilter === 'all') {
    return requirements;
  }

  return requirements.filter(requirement => {
    return requirement.priority === priorityFilter;
  });
};

export const filterRequirementsByDateRange = (
  requirements: Requirement[], 
  startDate?: Date,
  endDate?: Date
): Requirement[] => {
  if (!startDate && !endDate) {
    return requirements;
  }

  return requirements.filter(requirement => {
    const reqDate = new Date(requirement.created_at);
    
    if (startDate && reqDate < startDate) {
      return false;
    }
    
    if (endDate) {
      // Set end date to end of day
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      if (reqDate > endOfDay) {
        return false;
      }
    }
    
    return true;
  });
};

export const filterRequirementsBySearch = (
  requirements: Requirement[], 
  searchTerm: string
): Requirement[] => {
  if (!searchTerm.trim()) {
    return requirements;
  }

  const searchLower = searchTerm.toLowerCase();
  
  return requirements.filter(requirement => {
    const titleMatch = requirement.title.toLowerCase().includes(searchLower);
    const descriptionMatch = requirement.description.toLowerCase().includes(searchLower);
    const companyMatch = requirement.profiles?.company_name?.toLowerCase().includes(searchLower) || false;
    
    return titleMatch || descriptionMatch || companyMatch;
  });
};

export const sortRequirementsByDate = (
  requirements: Requirement[], 
  dateFilter: DateFilter
): Requirement[] => {
  const sorted = [...requirements].sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    
    if (dateFilter === 'oldest') {
      return dateA - dateB; // Oldest first
    }
    return dateB - dateA; // Newest first (default)
  });

  return sorted;
};

export const applyFilters = (
  requirements: Requirement[],
  dateFilter: DateFilter,
  statusFilter: StatusFilter,
  priorityFilter: PriorityFilter,
  searchTerm: string,
  startDate?: Date,
  endDate?: Date
): Requirement[] => {
  // Apply all filters in sequence
  let filtered = requirements;
  
  // Filter by status
  filtered = filterRequirementsByStatus(filtered, statusFilter);
  
  // Filter by priority
  filtered = filterRequirementsByPriority(filtered, priorityFilter);
  
  // Filter by date range
  filtered = filterRequirementsByDateRange(filtered, startDate, endDate);
  
  // Filter by search term
  filtered = filterRequirementsBySearch(filtered, searchTerm);
  
  // Sort by date
  filtered = sortRequirementsByDate(filtered, dateFilter);
  
  return filtered;
};
