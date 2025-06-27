
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, Plus, HelpCircle } from 'lucide-react';

interface WelcomeCardProps {
  onShowNewRequirement: () => void;
}

export const WelcomeCard = ({ onShowNewRequirement }: WelcomeCardProps) => {
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
              Submit detailed requirements and chat directly with our admin team for each task. 
              Every requirement comes with its own dedicated chat channel.
            </p>
            <div className="bg-blue-100 p-3 rounded-lg mt-3 mb-4">
              <div className="flex items-start space-x-2">
                <HelpCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Need help or have general questions?</p>
                  <p className="mt-1">Create a requirement with type "General Question" to get personalized support from our team.</p>
                </div>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button onClick={onShowNewRequirement} className="bg-blue-600 hover:bg-blue-700">
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
