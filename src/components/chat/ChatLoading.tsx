
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface ChatLoadingProps {
  error?: string | null;
}

export const ChatLoading = ({ error }: ChatLoadingProps) => {
  return (
    <Card className="w-full">
      <CardContent className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading chat...</p>
          {error && (
            <p className="mt-2 text-xs text-red-600">{error}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
