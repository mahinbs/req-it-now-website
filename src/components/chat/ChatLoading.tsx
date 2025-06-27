
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, MessageCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatLoadingProps {
  error?: string | null;
  loadingMessage?: string;
  onRetry?: () => void;
}

export const ChatLoading = ({ 
  error, 
  loadingMessage = "Loading messages...",
  onRetry
}: ChatLoadingProps) => {
  return (
    <Card className="w-full">
      <CardContent className="flex items-center justify-center py-8">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center space-x-2">
            <MessageCircle className="h-6 w-6 text-blue-600" />
            {error ? (
              <AlertCircle className="h-6 w-6 text-red-600" />
            ) : (
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            )}
          </div>
          <div>
            <p className="text-sm text-gray-600 font-medium">
              {error ? 'Connection Error' : loadingMessage}
            </p>
            {error && (
              <div className="mt-2 space-y-2">
                <p className="text-xs text-red-600 bg-red-50 px-3 py-1 rounded max-w-md">
                  {error}
                </p>
                {onRetry && (
                  <Button 
                    onClick={onRetry} 
                    size="sm" 
                    variant="outline"
                    className="mt-2"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Try Again
                  </Button>
                )}
              </div>
            )}
            {!error && (
              <p className="mt-1 text-xs text-gray-500">
                Setting up real-time connection...
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
