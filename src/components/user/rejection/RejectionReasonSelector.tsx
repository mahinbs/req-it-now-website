
import React from 'react';
import { Textarea } from '@/components/ui/textarea';

interface RejectionReasonSelectorProps {
  selectedReason: string;
  customReason: string;
  onReasonChange: (reason: string) => void;
  onCustomReasonChange: (reason: string) => void;
}

const rejectionReasons = [
  'Not as per requirements', 
  'Quality issues', 
  'Missing functionality', 
  'Design concerns', 
  'Performance issues', 
  'Other (please specify)'
];

export const RejectionReasonSelector = ({
  selectedReason,
  customReason,
  onReasonChange,
  onCustomReasonChange
}: RejectionReasonSelectorProps) => {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-slate-800">Please select a reason for rejection:</h3>
      <div className="grid gap-2">
        {rejectionReasons.map(reason => (
          <label key={reason} className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-slate-50">
            <input 
              type="radio" 
              name="rejectionReason" 
              value={reason}
              checked={selectedReason === reason}
              onChange={(e) => onReasonChange(e.target.value)}
              className="text-red-600" 
            />
            <span className="text-sm text-slate-700">{reason}</span>
          </label>
        ))}
      </div>

      {selectedReason === 'Other (please specify)' && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">
            Please specify the reason:
          </label>
          <Textarea 
            value={customReason}
            onChange={(e) => onCustomReasonChange(e.target.value)}
            placeholder="Please describe the specific issues you found..."
            className="min-h-[100px]"
          />
        </div>
      )}
    </div>
  );
};
