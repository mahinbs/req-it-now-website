
import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface RejectionFormActionsProps {
  onCancel: () => void;
  onReject: () => void;
  isRejecting: boolean;
  isDisabled: boolean;
}

export const RejectionFormActions = ({
  onCancel,
  onReject,
  isRejecting,
  isDisabled
}: RejectionFormActionsProps) => {
  return (
    <div className="flex items-center justify-end space-x-3">
      <Button 
        variant="outline" 
        onClick={onCancel} 
        disabled={isRejecting}
      >
        Cancel
      </Button>
      <Button 
        onClick={onReject} 
        disabled={isRejecting || isDisabled} 
        className="bg-red-600 hover:bg-red-700 text-white"
      >
        {isRejecting ? (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Rejecting...</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4" />
            <span>Confirm Rejection</span>
          </div>
        )}
      </Button>
    </div>
  );
};
