
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
}

export const RequirementsFilter = ({ 
  filters, 
  onFiltersChange, 
  className = '' 
}: RequirementsFilterProps) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [dateRangeMode, setDateRangeMode] = useState<'start' | 'end'>('start');

  const hasActiveFilters = 
    filters.dateFilter !== 'newest' || 
    filters.statusFilter !== 'all' || 
    filters.priorityFilter !== 'all' ||
    filters.searchTerm !== '' ||
    filters.startDate || 
    filters.endDate;

  const activeFilterCount = 
    (filters.dateFilter !== 'newest' ? 1 : 0) + 
    (filters.statusFilter !== 'all' ? 1 : 0) + 
    (filters.priorityFilter !== 'all' ? 1 : 0) +
    (filters.searchTerm !== '' ? 1 : 0) +
    (filters.startDate ? 1 : 0) +
    (filters.endDate ? 1 : 0);

  const handleDateFilterChange = (dateFilter: DateFilter) => {
    onFiltersChange({ ...filters, dateFilter });
  };

  const handleStatusFilterChange = (statusFilter: StatusFilter) => {
    onFiltersChange({ ...filters, statusFilter });
  };

  const handlePriorityFilterChange = (priorityFilter: PriorityFilter) => {
    onFiltersChange({ ...filters, priorityFilter });
  };

  const handleSearchChange = (searchTerm: string) => {
    onFiltersChange({ ...filters, searchTerm });
  };

  const handleDateRangeSelect = (date: Date | undefined) => {
    if (!date) return;
    
    if (dateRangeMode === 'start') {
      onFiltersChange({ ...filters, startDate: date });
    } else {
      onFiltersChange({ ...filters, endDate: date });
    }
    setIsCalendarOpen(false);
  };

  const clearDateRange = () => {
    onFiltersChange({ ...filters, startDate: undefined, endDate: undefined });
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
      case 'all': return 'All Status';
      case 'pending': return 'Pending';
      case 'ongoing': return 'Ongoing';
      case 'completed': return 'Completed';
      case 'rejected': return 'Rejected';
      default: return 'All Status';
    }
  };

  const getPriorityLabel = (priority: PriorityFilter) => {
    switch (priority) {
      case 'all': return 'All Priority';
      case 'low': return 'Low';
      case 'medium': return 'Medium';
      case 'high': return 'High';
      default: return 'All Priority';
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
    <div className={`space-y-4 ${className}`}>
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search requirements..."
          value={filters.searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10 bg-white/90 border-slate-300 text-slate-700 placeholder:text-slate-400"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Main Filter Dropdown */}
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
            {['all', 'pending', 'ongoing', 'completed', 'rejected'].map((status) => (
              <DropdownMenuItem
                key={status}
                onClick={() => handleStatusFilterChange(status as StatusFilter)}
                className={`cursor-pointer rounded-lg transition-colors duration-150 ${
                  filters.statusFilter === status 
                    ? 'bg-blue-50 text-blue-700 font-medium' 
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {getStatusLabel(status as StatusFilter)}
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator className="my-2 bg-slate-200" />
            
            <DropdownMenuLabel className="text-slate-700 font-medium px-2 py-1">
              Filter by Priority
            </DropdownMenuLabel>
            {['all', 'low', 'medium', 'high'].map((priority) => (
              <DropdownMenuItem
                key={priority}
                onClick={() => handlePriorityFilterChange(priority as PriorityFilter)}
                className={`cursor-pointer rounded-lg transition-colors duration-150 ${
                  filters.priorityFilter === priority 
                    ? 'bg-blue-50 text-blue-700 font-medium' 
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {getPriorityLabel(priority as PriorityFilter)}
              </DropdownMenuItem>
            ))}
            
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

        {/* Date Range Picker */}
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="bg-white hover:bg-slate-50 border-slate-300 shadow-sm hover:shadow-md transition-all duration-200"
            >
              <CalendarIcon className="h-4 w-4 mr-2 text-slate-600" />
              <span className="text-slate-700">Date Range</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Select Date Range</label>
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
                <div className="text-xs text-slate-600">
                  {filters.startDate && (
                    <span>From: {format(filters.startDate, 'MMM dd, yyyy')}</span>
                  )}
                  {filters.startDate && filters.endDate && <br />}
                  {filters.endDate && (
                    <span>To: {format(filters.endDate, 'MMM dd, yyyy')}</span>
                  )}
                </div>
                {(filters.startDate || filters.endDate) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearDateRange}
                    className="text-xs"
                  >
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
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-300">
                {getDateLabel(filters.dateFilter)}
              </Badge>
            )}
            {filters.statusFilter !== 'all' && (
              <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-300">
                {getStatusLabel(filters.statusFilter)}
              </Badge>
            )}
            {filters.priorityFilter !== 'all' && (
              <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-300">
                {getPriorityLabel(filters.priorityFilter)}
              </Badge>
            )}
            {filters.searchTerm && (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                Search: "{filters.searchTerm}"
              </Badge>
            )}
            {filters.startDate && (
              <Badge variant="secondary" className="bg-indigo-100 text-indigo-800 border-indigo-300">
                From: {format(filters.startDate, 'MMM dd')}
              </Badge>
            )}
            {filters.endDate && (
              <Badge variant="secondary" className="bg-indigo-100 text-indigo-800 border-indigo-300">
                To: {format(filters.endDate, 'MMM dd')}
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
