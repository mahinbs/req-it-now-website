import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { useAutoCompletionManager } from '@/hooks/useAutoCompletion';
import { toast } from '@/hooks/use-toast';

export const AutoCompletionTest = () => {
  const { 
    isLoading, 
    lastCheck, 
    runAutoCompletionCheck, 
    getPendingAutoCompletions 
  } = useAutoCompletionManager();
  
  const [pendingData, setPendingData] = useState<any>(null);
  const [lastResult, setLastResult] = useState<any>(null);

  const handleRunCheck = async () => {
    const result = await runAutoCompletionCheck();
    setLastResult(result);
    
    if (result.success) {
      toast({
        title: "Auto-completion Check Completed",
        description: `Updated ${result.data?.result?.updated_count || 0} requirements`,
      });
    } else {
      toast({
        title: "Auto-completion Check Failed",
        description: result.error?.message || "Unknown error",
        variant: "destructive"
      });
    }
  };

  const handleGetPending = async () => {
    const result = await getPendingAutoCompletions();
    setPendingData(result);
    
    if (result.success) {
      toast({
        title: "Pending Auto-completions Retrieved",
        description: `Found ${result.data?.length || 0} pending requirements`,
      });
    } else {
      toast({
        title: "Failed to Get Pending Auto-completions",
        description: result.error?.message || "Unknown error",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Auto-Completion Test Panel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button 
              onClick={handleRunCheck}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Run Auto-completion Check
            </Button>
            
            <Button 
              onClick={handleGetPending}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Clock className="h-4 w-4" />
              Get Pending Auto-completions
            </Button>
          </div>

          {lastCheck && (
            <div className="text-sm text-gray-600">
              Last check: {lastCheck.toLocaleString()}
            </div>
          )}

          {lastResult && (
            <div className="space-y-2">
              <h4 className="font-medium">Last Result:</h4>
              <div className="p-3 bg-gray-50 rounded-lg">
                <Badge variant={lastResult.success ? "default" : "destructive"}>
                  {lastResult.success ? "Success" : "Failed"}
                </Badge>
                <pre className="text-xs mt-2 overflow-auto">
                  {JSON.stringify(lastResult, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {pendingData && (
            <div className="space-y-2">
              <h4 className="font-medium">Pending Auto-completions:</h4>
              <div className="p-3 bg-gray-50 rounded-lg">
                {pendingData.success ? (
                  <div>
                    <Badge variant="outline">
                      {pendingData.data?.length || 0} requirements
                    </Badge>
                    <pre className="text-xs mt-2 overflow-auto">
                      {JSON.stringify(pendingData.data, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-4 w-4" />
                    {pendingData.error?.message || "Failed to retrieve pending data"}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};