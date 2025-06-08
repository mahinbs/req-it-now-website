
import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Filter, ChevronDown, X } from 'lucide-react';

export type DateFilter = 'newest' | 'oldest';
export type StatusFilter = 'all' | 'pending' | 'ongoing' | 'completed' | 'rejected';

export interface FilterState {
  dateFilter: DateFilter;
  statusFilter: StatusFilter;
}

interface RequirementsFilterProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  className?: string;
}

export const RequirementsFilter = ({ 
  filters, 
  onFiltersChange, 
  className = '' 
}: RequirementsFilterProps) => {
  const hasActiveFilters = filters.dateFilter !== 'newest' || filters.statusFilter !== 'all';
  const activeFilterCount = (filters.dateFilter !== 'newest' ? 1 : 0) + (filters.statusFilter !== 'all' ? 1 : 0);

  const handleDateFilterChange = (dateFilter: DateFilter) => {
    onFiltersChange({ ...filters, dateFilter });
  };

  const handleStatusFilterChange = (statusFilter: StatusFilter) => {
    onFiltersChange({ ...filters, statusFilter });
  };

  const clearFilters = () => {
    onFiltersChange({ dateFilter: 'newest', statusFilter: 'all' });
  };

  const getStatusLabel = (status: StatusFilter) => {
    switch (status) {
      case 'all': return 'All Status';
      case 'pending': return 'Pending';
      case 'ongoing': return 'Ongoing';
      case 'completed': return 'Completed';
      case 'rejected': return 'Rejected';
      default: return 'All Status';
    }
  };

  const getDateLabel = (date: DateFilter) => {
    switch (date) {
      case 'newest': return 'Newest First';
      case 'oldest': return 'Oldest First';
      default: return 'Newest First';
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className="relative bg-white hover:bg-slate-50 border-slate-300 shadow-sm hover:shadow-md transition-all duration-200"
          >
            <Filter className="h-4 w-4 mr-2 text-slate-600" />
            <span className="text-slate-700">Filter</span>
            <ChevronDown className="h-4 w-4 ml-2 text-slate-500" />
            {activeFilterCount > 0 && (
              <Badge 
                variant="secondary" 
                className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs min-w-[1.25rem] h-5 flex items-center justify-center p-0 border-2 border-white shadow-sm"
              >
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          className="w-56 bg-white border border-slate-200 shadow-xl rounded-xl p-2" 
          align="end"
        >
          <DropdownMenuLabel className="text-slate-700 font-medium px-2 py-1">
            Sort by Date
          </DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => handleDateFilterChange('newest')}
            className={`cursor-pointer rounded-lg transition-colors duration-150 ${
              filters.dateFilter === 'newest' 
                ? 'bg-blue-50 text-blue-700 font-medium' 
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            Newest to Oldest
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleDateFilterChange('oldest')}
            className={`cursor-pointer rounded-lg transition-colors duration-150 ${
              filters.dateFilter === 'oldest' 
                ? 'bg-blue-50 text-blue-700 font-medium' 
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            Oldest to Newest
          </DropdownMenuItem>
          
          <DropdownMenuSeparator className="my-2 bg-slate-200" />
          
          <DropdownMenuLabel className="text-slate-700 font-medium px-2 py-1">
            Filter by Status
          </DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => handleStatusFilterChange('all')}
            className={`cursor-pointer rounded-lg transition-colors duration-150 ${
              filters.statusFilter === 'all' 
                ? 'bg-blue-50 text-blue-700 font-medium' 
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            All Status
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleStatusFilterChange('pending')}
            className={`cursor-pointer rounded-lg transition-colors duration-150 ${
              filters.statusFilter === 'pending' 
                ? 'bg-blue-50 text-blue-700 font-medium' 
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            Pending
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleStatusFilterChange('ongoing')}
            className={`cursor-pointer rounded-lg transition-colors duration-150 ${
              filters.statusFilter === 'ongoing' 
                ? 'bg-blue-50 text-blue-700 font-medium' 
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            Ongoing
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleStatusFilterChange('completed')}
            className={`cursor-pointer rounded-lg transition-colors duration-150 ${
              filters.statusFilter === 'completed' 
                ? 'bg-blue-50 text-blue-700 font-medium' 
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            Completed
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleStatusFilterChange('rejected')}
            className={`cursor-pointer rounded-lg transition-colors duration-150 ${
              filters.statusFilter === 'rejected' 
                ? 'bg-blue-50 text-blue-700 font-medium' 
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            Rejected
          </DropdownMenuItem>
          
          {hasActiveFilters && (
            <>
              <DropdownMenuSeparator className="my-2 bg-slate-200" />
              <DropdownMenuItem
                onClick={clearFilters}
                className="cursor-pointer text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors duration-150 font-medium"
              >
                <X className="h-4 w-4 mr-2" />
                Clear All Filters
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Active filters display */}
      {hasActiveFilters && (
        <div className="flex items-center space-x-2">
          {filters.dateFilter !== 'newest' && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-300">
              {getDateLabel(filters.dateFilter)}
            </Badge>
          )}
          {filters.statusFilter !== 'all' && (
            <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-300">
              {getStatusLabel(filters.statusFilter)}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};
