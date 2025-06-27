
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
    <Card className="w-full glass bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
      <CardContent className="flex items-center justify-center py-12">
        <div className="text-center space-y-6">
          <div className="flex items-center justify-center space-x-3">
            <div className="relative">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-2xl">
                <MessageCircle className="h-8 w-8 text-white" />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur opacity-20 animate-pulse"></div>
            </div>
            {error ? (
              <div className="bg-gradient-to-r from-red-500 to-pink-600 p-3 rounded-2xl">
                <AlertCircle className="h-8 w-8 text-white" />
              </div>
            ) : (
              <div className="bg-gradient-to-r from-cyan-500 to-blue-600 p-3 rounded-2xl">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            )}
          </div>
          <div>
            <p className="text-lg text-white font-medium font-space-grotesk">
              {error ? 'Connection Error' : loadingMessage}
            </p>
            {error && (
              <div className="mt-4 space-y-4">
                <div className="glass p-4 bg-red-500/10 border border-red-400/30 rounded-xl max-w-md mx-auto">
                  <p className="text-sm text-red-300">{error}</p>
                </div>
                {onRetry && (
                  <Button 
                    onClick={onRetry} 
                    size="sm" 
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-xl transition-all duration-300"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                )}
              </div>
            )}
            {!error && (
              <p className="mt-2 text-sm text-slate-400">
                Setting up real-time connection...
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
