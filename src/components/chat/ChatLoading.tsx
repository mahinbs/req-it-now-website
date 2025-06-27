
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, MessageCircle } from 'lucide-react';

interface ChatLoadingProps {
  error?: string | null;
  loadingMessage?: string;
}

export const ChatLoading = ({ 
  error, 
  loadingMessage = "Loading chat..." 
}: ChatLoadingProps) => {
  return (
    <Card className="w-full">
      <CardContent className="flex items-center justify-center py-8">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center space-x-2">
            <MessageCircle className="h-6 w-6 text-blue-600" />
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600 font-medium">{loadingMessage}</p>
            {error && (
              <p className="mt-2 text-xs text-red-600 bg-red-50 px-3 py-1 rounded">
                {error}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
