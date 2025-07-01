import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Filter, ChevronDown, X, Search, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export type DateFilter = 'newest' | 'oldest';
export type StatusFilter = 'all' | 'pending' | 'ongoing' | 'completed' | 'rejected';
export type PriorityFilter = 'all' | 'low' | 'medium' | 'high';

export interface FilterState {
  dateFilter: DateFilter;
  statusFilter: StatusFilter;
  priorityFilter: PriorityFilter;
  searchTerm: string;
  startDate?: Date;
  endDate?: Date;
}

interface RequirementsFilterProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  className?: string;
  theme?: 'light' | 'dark';
}

export const RequirementsFilter = ({
  filters,
  onFiltersChange,
  className = '',
  theme = 'light'
}: RequirementsFilterProps) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [dateRangeMode, setDateRangeMode] = useState<'start' | 'end'>('start');

  const hasActiveFilters = filters.dateFilter !== 'newest' || filters.statusFilter !== 'all' || filters.priorityFilter !== 'all' || filters.searchTerm !== '' || filters.startDate || filters.endDate;
  const activeFilterCount = (filters.dateFilter !== 'newest' ? 1 : 0) + (filters.statusFilter !== 'all' ? 1 : 0) + (filters.priorityFilter !== 'all' ? 1 : 0) + (filters.searchTerm !== '' ? 1 : 0) + (filters.startDate ? 1 : 0) + (filters.endDate ? 1 : 0);

  // Theme-aware styles
  const isDark = theme === 'dark';
  const inputClass = isDark ? 'pl-10 glass bg-white/5 border-white/20 text-white placeholder:text-slate-400' : 'pl-10 border-slate-300 text-slate-700 placeholder:text-slate-400 bg-white';
  const buttonClass = isDark ? 'glass border-white/20 text-slate-200 hover:bg-white/10 hover:text-white hover:border-white/30 transition-all duration-300' : 'bg-white hover:bg-slate-50 border-slate-300 shadow-sm hover:shadow-md transition-all duration-200';
  const dropdownClass = isDark ? 'glass bg-slate-800/90 backdrop-blur-xl border-white/20 shadow-2xl rounded-xl p-2' : 'w-56 bg-white border border-slate-200 shadow-xl rounded-xl p-2';
  const labelClass = isDark ? 'text-slate-200 font-medium px-2 py-1' : 'text-slate-700 font-medium px-2 py-1';
  const menuItemClass = (isActive: boolean) => isDark 
    ? `cursor-pointer rounded-lg transition-colors duration-150 ${isActive ? 'bg-blue-500/30 text-blue-200 font-medium' : 'text-slate-300 hover:bg-white/10'}`
    : `cursor-pointer rounded-lg transition-colors duration-150 ${isActive ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700 hover:bg-slate-50'}`;
  const separatorClass = isDark ? 'my-2 bg-white/20' : 'my-2 bg-slate-200';
  const clearButtonClass = isDark ? 'cursor-pointer text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-lg transition-colors duration-150 font-medium' : 'cursor-pointer text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors duration-150 font-medium';
  const popoverClass = isDark ? 'glass bg-slate-800/90 backdrop-blur-xl border-white/20 shadow-2xl' : '';

  // Handler functions
  const handleDateFilterChange = (dateFilter: DateFilter) => {
    onFiltersChange({
      ...filters,
      dateFilter
    });
  };

  const handleStatusFilterChange = (statusFilter: StatusFilter) => {
    onFiltersChange({
      ...filters,
      statusFilter
    });
  };

  const handlePriorityFilterChange = (priorityFilter: PriorityFilter) => {
    onFiltersChange({
      ...filters,
      priorityFilter
    });
  };

  const handleSearchChange = (searchTerm: string) => {
    onFiltersChange({
      ...filters,
      searchTerm
    });
  };

  const handleDateRangeSelect = (date: Date | undefined) => {
    if (!date) return;
    if (dateRangeMode === 'start') {
      onFiltersChange({
        ...filters,
        startDate: date
      });
    } else {
      onFiltersChange({
        ...filters,
        endDate: date
      });
    }
    setIsCalendarOpen(false);
  };

  const clearDateRange = () => {
    onFiltersChange({
      ...filters,
      startDate: undefined,
      endDate: undefined
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      dateFilter: 'newest',
      statusFilter: 'all',
      priorityFilter: 'all',
      searchTerm: '',
      startDate: undefined,
      endDate: undefined
    });
  };

  const getStatusLabel = (status: StatusFilter) => {
    switch (status) {
      case 'all':
        return 'All Status';
      case 'pending':
        return 'Pending';
      case 'ongoing':
        return 'Ongoing';
      case 'completed':
        return 'Completed';
      case 'rejected':
        return 'Rejected';
      default:
        return 'All Status';
    }
  };

  const getPriorityLabel = (priority: PriorityFilter) => {
    switch (priority) {
      case 'all':
        return 'All Priority';
      case 'low':
        return 'Low';
      case 'medium':
        return 'Medium';
      case 'high':
        return 'High';
      default:
        return 'All Priority';
    }
  };

  const getDateLabel = (date: DateFilter) => {
    switch (date) {
      case 'newest':
        return 'Newest First';
      case 'oldest':
        return 'Oldest First';
      default:
        return 'Newest First';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Bar */}
      <div className="relative">
        <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${isDark ? 'text-slate-400' : 'text-slate-400'}`} />
        <Input 
          placeholder="Search requirements..." 
          value={filters.searchTerm} 
          onChange={e => handleSearchChange(e.target.value)} 
          className={inputClass}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Main Filter Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className={`relative ${buttonClass}`}>
              <Filter className={`h-4 w-4 mr-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`} />
              <span className={isDark ? 'text-slate-200' : 'text-slate-700'}>Filter</span>
              <ChevronDown className={`h-4 w-4 ml-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs min-w-[1.25rem] h-5 flex items-center justify-center p-0 border-2 border-white shadow-sm">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className={dropdownClass} align="end">
            <DropdownMenuLabel className={labelClass}>
              Sort by Date
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => handleDateFilterChange('newest')} className={menuItemClass(filters.dateFilter === 'newest')}>
              Newest to Oldest
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDateFilterChange('oldest')} className={menuItemClass(filters.dateFilter === 'oldest')}>
              Oldest to Newest
            </DropdownMenuItem>
            
            <DropdownMenuSeparator className={separatorClass} />
            
            <DropdownMenuLabel className={labelClass}>
              Filter by Status
            </DropdownMenuLabel>
            {['all', 'pending', 'ongoing', 'completed', 'rejected'].map(status => (
              <DropdownMenuItem 
                key={status} 
                onClick={() => handleStatusFilterChange(status as StatusFilter)} 
                className={menuItemClass(filters.statusFilter === status)}
              >
                {getStatusLabel(status as StatusFilter)}
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator className={separatorClass} />
            
            <DropdownMenuLabel className={labelClass}>
              Filter by Priority
            </DropdownMenuLabel>
            {['all', 'low', 'medium', 'high'].map(priority => (
              <DropdownMenuItem 
                key={priority} 
                onClick={() => handlePriorityFilterChange(priority as PriorityFilter)} 
                className={menuItemClass(filters.priorityFilter === priority)}
              >
                {getPriorityLabel(priority as PriorityFilter)}
              </DropdownMenuItem>
            ))}
            
            {hasActiveFilters && (
              <>
                <DropdownMenuSeparator className={separatorClass} />
                <DropdownMenuItem onClick={clearFilters} className={clearButtonClass}>
                  <X className="h-4 w-4 mr-2" />
                  Clear All Filters
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Date Range Picker */}
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className={buttonClass}>
              <CalendarIcon className={`h-4 w-4 mr-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`} />
              <span className={isDark ? 'text-slate-200' : 'text-slate-700'}>Date Range</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className={`w-auto p-0 ${popoverClass}`} align="start">
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <label className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>Select Date Range</label>
                <div className="flex space-x-2">
                  <Button 
                    variant={dateRangeMode === 'start' ? 'default' : 'outline'} 
                    size="sm" 
                    onClick={() => setDateRangeMode('start')} 
                    className="text-xs"
                  >
                    Start Date
                  </Button>
                  <Button 
                    variant={dateRangeMode === 'end' ? 'default' : 'outline'} 
                    size="sm" 
                    onClick={() => setDateRangeMode('end')} 
                    className="text-xs"
                  >
                    End Date
                  </Button>
                </div>
              </div>
              
              <Calendar 
                mode="single" 
                selected={dateRangeMode === 'start' ? filters.startDate : filters.endDate} 
                onSelect={handleDateRangeSelect} 
                className="pointer-events-auto" 
              />
              
              <div className="flex justify-between items-center pt-2 border-t">
                <div className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  {filters.startDate && <span>From: {format(filters.startDate, 'MMM dd, yyyy')}</span>}
                  {filters.startDate && filters.endDate && <br />}
                  {filters.endDate && <span>To: {format(filters.endDate, 'MMM dd, yyyy')}</span>}
                </div>
                {(filters.startDate || filters.endDate) && (
                  <Button variant="outline" size="sm" onClick={clearDateRange} className="text-xs">
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Active filters display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2">
            {filters.dateFilter !== 'newest' && (
              <Badge variant="secondary" className={isDark ? "bg-blue-500/30 text-blue-200 border-blue-400/30" : "bg-blue-100 text-blue-800 border-blue-300"}>
                {getDateLabel(filters.dateFilter)}
              </Badge>
            )}
            {filters.statusFilter !== 'all' && (
              <Badge variant="secondary" className={isDark ? "bg-green-500/30 text-green-200 border-green-400/30" : "bg-green-100 text-green-800 border-green-300"}>
                {getStatusLabel(filters.statusFilter)}
              </Badge>
            )}
            {filters.priorityFilter !== 'all' && (
              <Badge variant="secondary" className={isDark ? "bg-purple-500/30 text-purple-200 border-purple-400/30" : "bg-purple-100 text-purple-800 border-purple-300"}>
                {getPriorityLabel(filters.priorityFilter)}
              </Badge>
            )}
            {filters.searchTerm && (
              <Badge variant="secondary" className={isDark ? "bg-yellow-500/30 text-yellow-200 border-yellow-400/30" : "bg-yellow-100 text-yellow-800 border-yellow-300"}>
                Search: "{filters.searchTerm}"
              </Badge>
            )}
            {filters.startDate && (
              <Badge variant="secondary" className={isDark ? "bg-indigo-500/30 text-indigo-200 border-indigo-400/30" : "bg-indigo-100 text-indigo-800 border-indigo-300"}>
                From: {format(filters.startDate, 'MMM dd')}
              </Badge>
            )}
            {filters.endDate && (
              <Badge variant="secondary" className={isDark ? "bg-indigo-500/30 text-indigo-200 border-indigo-400/30" : "bg-indigo-100 text-indigo-800 border-indigo-300"}>
                To: {format(filters.endDate, 'MMM dd')}
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
