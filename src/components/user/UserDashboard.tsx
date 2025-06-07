
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, FileVideo, MessageCircle, Calendar, LogOut } from 'lucide-react';
import { RequirementForm } from '../requirements/RequirementForm';
import { ChatBox } from '../chat/ChatBox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Requirement = Tables<'requirements'>;

interface User {
  id: string;
  company_name: string;
  website_url: string;
}

interface UserDashboardProps {
  user: User;
  onLogout: () => void;
}

export const UserDashboard = ({ user, onLogout }: UserDashboardProps) => {
  const [showNewRequirement, setShowNewRequirement] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState<Requirement | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequirements();
  }, []);

  const fetchRequirements = async () => {
    try {
      const { data, error } = await supabase
        .from('requirements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequirements(data || []);
    } catch (error) {
      console.error('Error fetching requirements:', error);
      toast({
        title: "Error",
        description: "Failed to load requirements",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequirement = async (data: any) => {
    try {
      const { error } = await supabase
        .from('requirements')
        .insert([{
          title: data.title,
          description: data.description,
          priority: data.priority,
          user_id: user.id,
          has_screen_recording: !!data.screenRecording
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Requirement submitted successfully!"
      });

      await fetchRequirements();
      setShowNewRequirement(false);
    } catch (error) {
      console.error('Error submitting requirement:', error);
      toast({
        title: "Error",
        description: "Failed to submit requirement",
        variant: "destructive"
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'urgent': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-blue-100 text-blue-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Website changes or requirement for my company</h1>
              <p className="text-muted-foreground">{user.company_name}</p>
            </div>
            <Button variant="outline" onClick={onLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <Tabs defaultValue="requirements" className="space-y-6">
          <TabsList>
            <TabsTrigger value="requirements">My Requirements</TabsTrigger>
            <TabsTrigger value="new">Submit New</TabsTrigger>
          </TabsList>

          <TabsContent value="requirements" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Your Requirements</h2>
              <Button onClick={() => setShowNewRequirement(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Requirement
              </Button>
            </div>

            {requirements.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <h3 className="text-lg font-medium mb-2">No requirements yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Submit your first website requirement to get started
                  </p>
                  <Button onClick={() => setShowNewRequirement(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Submit Requirement
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {requirements.map((requirement) => (
                  <Card key={requirement.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">{requirement.title}</CardTitle>
                        <div className="flex flex-col space-y-1">
                          <Badge className={getPriorityColor(requirement.priority)}>
                            {requirement.priority}
                          </Badge>
                          <Badge className={getStatusColor(requirement.status)}>
                            {requirement.status}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        {requirement.description}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(requirement.created_at).toLocaleDateString()}</span>
                        </div>
                        {requirement.has_screen_recording && (
                          <div className="flex items-center space-x-1">
                            <FileVideo className="h-3 w-3" />
                            <span>Screen recording attached</span>
                          </div>
                        )}
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedRequirement(requirement)}
                        className="w-full"
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Open Chat
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="new">
            <RequirementForm onSubmit={handleSubmitRequirement} />
          </TabsContent>
        </Tabs>

        {/* Modals */}
        {showNewRequirement && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-background rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Submit New Requirement</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNewRequirement(false)}
                >
                  ×
                </Button>
              </div>
              <RequirementForm onSubmit={handleSubmitRequirement} />
            </div>
          </div>
        )}

        {selectedRequirement && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-background rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  Chat: {selectedRequirement.title}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedRequirement(null)}
                >
                  ×
                </Button>
              </div>
              <ChatBox
                requirementId={selectedRequirement.id}
                currentUserName={user.company_name}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
