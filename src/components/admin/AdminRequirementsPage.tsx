import React, { useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SortAsc, SortDesc } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AnalyticsCards } from './AnalyticsCards';
import { RequirementsList } from './RequirementsList';
import { RequirementsFilter, type FilterState, type StatusFilter, type PriorityFilter } from '@/components/filters/RequirementsFilter';
import { applyFilters } from '@/utils/filterUtils';
import type { Tables } from '@/integrations/supabase/types';

type Requirement = Tables<'requirements'> & {
  profiles?: {
    company_name: string;
    website_url: string;
  } | null;
};

interface AdminRequirementsPageProps {
  requirements: Requirement[];
  statusCounts: {
    pending: number;
    inProgress: number;
    completed: number;
  };
  onChatClick: (requirement: Requirement) => void;
  onDownloadAttachment: (url: string, fileName: string) => void;
  onRefresh: () => void;
  onApprovalUpdate?: () => void;
}

export const AdminRequirementsPage = ({
  requirements,
  statusCounts,
  onChatClick,
  onDownloadAttachment,
  onRefresh,
  onApprovalUpdate
}: AdminRequirementsPageProps) => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Get URL parameters
  const sortOrder = (searchParams.get('sort') as 'newest' | 'oldest') || 'newest';
  const statusFilter = searchParams.get('status') || 'all';
  const priorityFilter = searchParams.get('priority') || 'all';
  const searchTerm = searchParams.get('search') || '';
  const startDate = searchParams.get('startDate') || undefined;
  const endDate = searchParams.get('endDate') || undefined;

  // Initialize filters state from URL params
  const [filters, setFilters] = React.useState<FilterState>({
    statusFilter: statusFilter as StatusFilter,
    priorityFilter: priorityFilter as PriorityFilter,
    searchTerm,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined
  });

  // Update URL when filters change
  const updateURL = useCallback((newFilters: FilterState, newSort?: string) => {
    const params = new URLSearchParams();
    
    if (newSort && newSort !== 'newest') params.set('sort', newSort);
    if (newFilters.statusFilter !== 'all') params.set('status', newFilters.statusFilter);
    if (newFilters.priorityFilter !== 'all') params.set('priority', newFilters.priorityFilter);
    if (newFilters.searchTerm) params.set('search', newFilters.searchTerm);
    if (newFilters.startDate) params.set('startDate', newFilters.startDate.toISOString());
    if (newFilters.endDate) params.set('endDate', newFilters.endDate.toISOString());

    setSearchParams(params);
  }, [setSearchParams]);

  // Handle sort change
  const handleSortChange = useCallback((value: 'newest' | 'oldest') => {
    updateURL(filters, value);
  }, [filters, updateURL]);

  // Handle filters change
  const handleFiltersChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
    updateURL(newFilters, sortOrder);
  }, [sortOrder, updateURL]);

  // Memoized filtered and sorted requirements
  const filteredRequirements = useMemo(() => {
    let filtered = applyFilters(
      requirements, 
      'newest', // Default date filter
      filters.statusFilter, 
      filters.priorityFilter,
      filters.searchTerm,
      filters.startDate,
      filters.endDate
    );

    // Apply sort order
    filtered = [...filtered].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [requirements, filters, sortOrder]);

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-6">
        <h2 className="text-2xl font-bold text-white font-space-grotesk">All Requirements</h2>
         
        {/* Sort Dropdown */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-300 font-medium">Sort by:</span>
            <Select value={sortOrder} onValueChange={handleSortChange}>
              <SelectTrigger className="w-32 glass bg-white/5 border-white/20 text-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="newest" className="text-slate-200 hover:bg-slate-700">
                  <div className="flex items-center space-x-2">
                    <SortDesc className="h-4 w-4" />
                    <span>Newest</span>
                  </div>
                </SelectItem>
                <SelectItem value="oldest" className="text-slate-200 hover:bg-slate-700">
                  <div className="flex items-center space-x-2">
                    <SortAsc className="h-4 w-4" />
                    <span>Oldest</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Stats Display using AnalyticsCards */}
      <div className="scale-in">
        <AnalyticsCards 
          requirements={requirements}
          totalCount={requirements.length}
          pendingCount={statusCounts.pending}
          inProgressCount={statusCounts.inProgress}
          completedCount={statusCounts.completed}
        />
      </div>
     
      {/* Always show filters with dark theme */}
      <div className="glass bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-6">
        <RequirementsFilter 
          filters={filters}
          onFiltersChange={handleFiltersChange}
          theme="dark"
        />
      </div>
      
      <div className="scale-in">
        <RequirementsList
          requirements={filteredRequirements}
          onChatClick={onChatClick}
          onDownloadAttachment={onDownloadAttachment}
          onRefresh={onRefresh}
          onApprovalUpdate={onApprovalUpdate}
        />
      </div>
    </>
  );
}; 