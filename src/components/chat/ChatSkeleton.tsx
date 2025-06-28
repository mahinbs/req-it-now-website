
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const ChatSkeleton = () => {
  return (
    <div className="space-y-4 p-4">
      {/* Message skeletons */}
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-xs lg:max-w-md space-y-2 ${i % 2 === 0 ? 'items-end' : 'items-start'}`}>
            <Skeleton className="h-3 w-20" />
            <Skeleton className={`h-12 ${i % 3 === 0 ? 'w-32' : i % 3 === 1 ? 'w-48' : 'w-40'} rounded-lg`} />
          </div>
        </div>
      ))}
    </div>
  );
};
