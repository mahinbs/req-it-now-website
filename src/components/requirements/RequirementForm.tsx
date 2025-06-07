
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileVideo, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface RequirementFormProps {
  onSubmit: (data: {
    title: string;
    description: string;
    priority: string;
    screenRecording?: File;
  }) => void;
}

export const RequirementForm = ({ onSubmit }: RequirementFormProps) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium'
  });
  const [screenRecording, setScreenRecording] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    try {
      await onSubmit({
        ...formData,
        screenRecording: screenRecording || undefined
      });
      setFormData({ title: '', description: '', priority: 'medium' });
      setScreenRecording(null);
      toast({
        title: "Success",
        description: "Requirement submitted successfully!"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit requirement",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) { // 100MB limit
        toast({
          title: "Error",
          description: "File size must be less than 100MB",
          variant: "destructive"
        });
        return;
      }
      setScreenRecording(file);
    }
  };

  const removeFile = () => {
    setScreenRecording(null);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Submit New Requirement</CardTitle>
        <CardDescription>
          Describe the changes you need for your website. You can also upload a screen recording to help explain your requirements.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Requirement Title *</Label>
            <Input
              id="title"
              placeholder="Brief title for your requirement"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Detailed Description *</Label>
            <Textarea
              id="description"
              placeholder="Provide a detailed description of what changes you need..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={6}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <select
              id="priority"
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>Screen Recording (Optional)</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              {screenRecording ? (
                <div className="flex items-center justify-between bg-muted p-3 rounded-md">
                  <div className="flex items-center space-x-2">
                    <FileVideo className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">{screenRecording.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({(screenRecording.size / 1024 / 1024).toFixed(1)} MB)
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeFile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div>
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Upload a screen recording to better explain your requirements
                  </p>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <Button type="button" variant="outline" asChild>
                    <label htmlFor="file-upload" className="cursor-pointer">
                      Choose File
                    </label>
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Max file size: 100MB
                  </p>
                </div>
              )}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Submitting..." : "Submit Requirement"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
