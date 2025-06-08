
import React from 'react';
import { cn } from '@/lib/utils';

interface NotificationBadgeProps {
  count: number;
  children: React.ReactNode;
  show?: boolean;
  pulse?: boolean;
  className?: string;
}

export const NotificationBadge = ({ 
  count, 
  children, 
  show = true, 
  pulse = false,
  className 
}: NotificationBadgeProps) => {
  const shouldShow = show && count > 0;

  return (
    <div className={cn("relative inline-block", className)}>
      {children}
      {shouldShow && (
        <div className={cn(
          "absolute -top-2 -right-2 bg-red-500 text-white rounded-full text-xs font-bold min-w-[1.25rem] h-5 flex items-center justify-center px-1",
          pulse && "animate-pulse",
          count > 99 && "text-[10px]"
        )}>
          {count > 99 ? '99+' : count}
        </div>
      )}
    </div>
  );
};
