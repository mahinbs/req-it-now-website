
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileVideo, ExternalLink, MessageCircle, Calendar, Building, Globe } from 'lucide-react';
import { ChatBox } from '../chat/ChatBox';

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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Manage all website requirements and communicate with clients
          </p>
        </div>

        <Tabs defaultValue="requirements" className="space-y-6">
          <TabsList>
            <TabsTrigger value="requirements">All Requirements</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="requirements" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {requirements.map((requirement) => (
                <Card key={requirement.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg line-clamp-2">{requirement.title}</CardTitle>
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
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {requirement.description}
                    </p>
                    
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <div className="flex items-center space-x-2">
                        <Building className="h-3 w-3" />
                        <span>{requirement.user.companyName}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Globe className="h-3 w-3" />
                        <span className="truncate">{requirement.user.websiteUrl}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-3 w-3" />
                        <span>{requirement.submittedAt.toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      {requirement.hasScreenRecording && (
                        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                          <FileVideo className="h-3 w-3" />
                          <span>Screen recording</span>
                        </div>
                      )}
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedRequirement(requirement)}
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
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Total Requirements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{requirements.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Pending</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {requirements.filter(r => r.status === 'pending').length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">In Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {requirements.filter(r => r.status === 'in-progress').length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Completed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {requirements.filter(r => r.status === 'completed').length}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Chat Modal */}
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
