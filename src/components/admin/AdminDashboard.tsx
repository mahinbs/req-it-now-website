
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileVideo, ExternalLink, MessageCircle, Calendar, Building, Globe, LogOut, User } from 'lucide-react';
import { ChatBox } from '../chat/ChatBox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Requirement {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in-progress' | 'completed';
  submittedAt: Date;
  hasScreenRecording: boolean;
  user: {
    email: string;
    companyName: string;
    websiteUrl: string;
  };
}

export const AdminDashboard = () => {
  const [selectedRequirement, setSelectedRequirement] = useState<Requirement | null>(null);
  const [requirements] = useState<Requirement[]>([
    {
      id: '1',
      title: 'Update homepage hero section',
      description: 'Need to change the main heading and add a new call-to-action button on the homepage.',
      priority: 'high',
      status: 'pending',
      submittedAt: new Date('2024-06-01'),
      hasScreenRecording: true,
      user: {
        email: 'john@techcorp.com',
        companyName: 'TechCorp Solutions',
        websiteUrl: 'https://techcorp.com'
      }
    },
    {
      id: '2',
      title: 'Fix mobile responsiveness',
      description: 'The navigation menu is not working properly on mobile devices. Users cannot access the submenu items.',
      priority: 'urgent',
      status: 'in-progress',
      submittedAt: new Date('2024-06-02'),
      hasScreenRecording: false,
      user: {
        email: 'sarah@designstudio.com',
        companyName: 'Creative Design Studio',
        websiteUrl: 'https://designstudio.com'
      }
    }
  ]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast({
        title: "Success",
        description: "You have been logged out successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive"
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-600 p-2 rounded-lg">
                <User className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
                <p className="text-slate-600">Manage website requirements and communicate with clients</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout} className="flex items-center space-x-2">
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <Tabs defaultValue="requirements" className="space-y-6">
          <TabsList className="bg-white border border-slate-200">
            <TabsTrigger value="requirements" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              All Requirements
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requirements" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {requirements.map((requirement) => (
                <Card key={requirement.id} className="group hover:shadow-lg transition-all duration-200 border-slate-200 bg-white">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg line-clamp-2 text-slate-900 group-hover:text-blue-600 transition-colors">
                        {requirement.title}
                      </CardTitle>
                      <div className="flex flex-col space-y-2">
                        <Badge className={`${getPriorityColor(requirement.priority)} border`}>
                          {requirement.priority}
                        </Badge>
                        <Badge className={`${getStatusColor(requirement.status)} border`}>
                          {requirement.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-slate-600 line-clamp-3">
                      {requirement.description}
                    </p>
                    
                    <div className="space-y-2 text-xs text-slate-500">
                      <div className="flex items-center space-x-2">
                        <Building className="h-3 w-3 text-blue-500" />
                        <span className="font-medium">{requirement.user.companyName}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Globe className="h-3 w-3 text-green-500" />
                        <span className="truncate">{requirement.user.websiteUrl}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-3 w-3 text-purple-500" />
                        <span>{requirement.submittedAt.toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      {requirement.hasScreenRecording && (
                        <div className="flex items-center space-x-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                          <FileVideo className="h-3 w-3" />
                          <span>Recording</span>
                        </div>
                      )}
                      <div className="flex space-x-2 ml-auto">
                        <Button
                          size="sm"
                          onClick={() => setSelectedRequirement(requirement)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <MessageCircle className="h-3 w-3 mr-1" />
                          Chat
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <a href={requirement.user.websiteUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-blue-900">Total Requirements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-700">{requirements.length}</div>
                  <p className="text-sm text-blue-600 mt-1">All time</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-yellow-900">Pending</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-700">
                    {requirements.filter(r => r.status === 'pending').length}
                  </div>
                  <p className="text-sm text-yellow-600 mt-1">Awaiting review</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-orange-900">In Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-700">
                    {requirements.filter(r => r.status === 'in-progress').length}
                  </div>
                  <p className="text-sm text-orange-600 mt-1">Being worked on</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-green-900">Completed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-700">
                    {requirements.filter(r => r.status === 'completed').length}
                  </div>
                  <p className="text-sm text-green-600 mt-1">Finished</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Chat Modal */}
        {selectedRequirement && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Chat: {selectedRequirement.title}
                  </h3>
                  <p className="text-sm text-slate-600">{selectedRequirement.user.companyName}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedRequirement(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ×
                </Button>
              </div>
              <ChatBox
                requirementId={selectedRequirement.id}
                currentUserName="Admin"
                isAdmin={true}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
