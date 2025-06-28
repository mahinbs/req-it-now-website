
import React from 'react';
import { MessageCircle } from 'lucide-react';

export const RejectionNextStepsInfo = () => {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start space-x-2">
        <MessageCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-blue-800 mb-1">Next Steps</h3>
          <p className="text-sm text-blue-700">
            After rejection, our admin team will review your feedback and either:
            <br />• Make the necessary revisions
            <br />• Contact you via chat for clarification
            <br />• Provide an updated version for review
          </p>
        </div>
      </div>
    </div>
  );
};
