
import type { Tables } from '@/integrations/supabase/types';
import type { DateFilter, StatusFilter } from '@/components/filters/RequirementsFilter';

type Requirement = Tables<'requirements'> & {
  profiles?: {
    company_name: string;
    website_url: string;
  } | null;
};

export const getRequirementStatus = (requirement: Requirement): string => {
  if (requirement.rejected_by_client) {
    return 'rejected';
  } else if (requirement.accepted_by_client) {
    return 'completed';
  } else if (requirement.completed_by_admin) {
    return 'completed'; // Awaiting client review, but technically completed
  } else if (requirement.approved_by_admin) {
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
  statusFilter: StatusFilter
): Requirement[] => {
  // First filter by status
  const statusFiltered = filterRequirementsByStatus(requirements, statusFilter);
  
  // Then sort by date
  const dateSorted = sortRequirementsByDate(statusFiltered, dateFilter);
  
  return dateSorted;
};
