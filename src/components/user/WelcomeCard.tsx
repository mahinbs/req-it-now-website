
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, Plus } from 'lucide-react';

interface WelcomeCardProps {
  onShowGeneralChat: () => void;
  onShowNewRequirement: () => void;
}

export const WelcomeCard = ({ onShowGeneralChat, onShowNewRequirement }: WelcomeCardProps) => {
  return (
    <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <CardContent className="p-6">
        <div className="flex items-center space-x-4">
          <div className="bg-blue-100 p-3 rounded-full">
            <MessageCircle className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-blue-900">Welcome to your Requirements Dashboard!</h3>
            <p className="text-blue-700 mt-1">
              Need help getting started? You can chat directly with our admin team or submit a detailed requirement.
            </p>
            <div className="flex space-x-3 mt-3">
              <Button 
                onClick={onShowGeneralChat}
                className="bg-green-600 hover:bg-green-700"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Quick Chat
              </Button>
              <Button onClick={onShowNewRequirement} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Submit Requirement
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
