
import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, X, File, AlertCircle, CheckCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface RequirementFormData {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  attachments?: File[];
}

interface RequirementFormProps {
  onSubmit: (data: RequirementFormData) => void;
}

interface AttachmentFile {
  url: string;
  name: string;
  size: number;
  type: string;
}

interface FileUploadState {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  url?: string;
}

export const RequirementFormOptimized = ({ onSubmit }: RequirementFormProps) => {
  const [formData, setFormData] = useState<RequirementFormData>({
    title: '',
    description: '',
    priority: 'medium',
    attachments: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStates, setUploadStates] = useState<Map<string, FileUploadState>>(new Map());

  const handleInputChange = useCallback((field: keyof RequirementFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const uploadFileOptimized = useCallback(async (file: File): Promise<AttachmentFile> => {
    const fileId = `${file.name}-${Date.now()}`;
    
    // Initialize upload state
    setUploadStates(prev => new Map(prev.set(fileId, {
      file,
      progress: 0,
      status: 'uploading'
    })));

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadStates(prev => {
          const newMap = new Map(prev);
          const current = newMap.get(fileId);
          if (current && current.progress < 90) {
            newMap.set(fileId, { ...current, progress: current.progress + 10 });
          }
          return newMap;
        });
      }, 200);

      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const fileExtension = file.name.split('.').pop();
      const fileName = `${timestamp}_${randomSuffix}.${fileExtension}`;
      
      const { data, error } = await supabase.storage
        .from('requirement-attachments')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      clearInterval(progressInterval);

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('requirement-attachments')
        .getPublicUrl(fileName);

      // Complete upload state
      setUploadStates(prev => new Map(prev.set(fileId, {
        file,
        progress: 100,
        status: 'completed',
        url: publicUrl
      })));

      return {
        url: publicUrl,
        name: file.name,
        size: file.size,
        type: file.type
      };

    } catch (error) {
      setUploadStates(prev => new Map(prev.set(fileId, {
        file,
        progress: 0,
        status: 'error'
      })));
      throw error;
    }
  }, []);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setFormData(prev => ({
        ...prev,
        attachments: [...(prev.attachments || []), ...newFiles]
      }));

      // Start optimistic upload
      newFiles.forEach(file => {
        uploadFileOptimized(file).catch(error => {
          console.error(`Upload failed for ${file.name}:`, error);
          toast({
            title: "Upload Warning",
            description: `Failed to upload ${file.name}`,
            variant: "destructive"
          });
        });
      });
    }
  }, [uploadFileOptimized]);

  const removeFile = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments?.filter((_, i) => i !== index) || []
    }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.description.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Optimistic UI update
      toast({
        title: "Submitting...",
        description: "Your requirement is being processed"
      });

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Get completed uploads
      const completedUploads = Array.from(uploadStates.values())
        .filter(state => state.status === 'completed' && state.url)
        .map(state => state.url!);

      const requirementData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        priority: formData.priority,
        user_id: user.id,
        has_screen_recording: formData.attachments && formData.attachments.length > 0,
        attachment_urls: completedUploads.length > 0 ? completedUploads : null,
        status: 'pending'
      };

      const { data, error } = await supabase
        .from('requirements')
        .insert([requirementData])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to save requirement: ${error.message}`);
      }

      // Reset form with smooth transition
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        attachments: []
      });
      setUploadStates(new Map());

      onSubmit(formData);

      toast({
        title: "Success!",
        description: "Your requirement has been submitted successfully",
        className: "bg-green-50 border-green-200 text-green-800"
      });

    } catch (error) {
      console.error('Submission error:', error);
      toast({
        title: "Submission Error",
        description: error instanceof Error ? error.message : "Failed to submit requirement",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const totalUploadProgress = useMemo(() => {
    const states = Array.from(uploadStates.values());
    if (states.length === 0) return 0;
    const totalProgress = states.reduce((sum, state) => sum + state.progress, 0);
    return Math.round(totalProgress / states.length);
  }, [uploadStates]);

  return (
    <Card className="w-full max-w-2xl mx-auto bg-white border-slate-200">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-slate-900">Submit Website Requirement</CardTitle>
        <CardDescription className="text-slate-600">
          Describe what you need help with on your website. Be as detailed as possible.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium text-slate-700">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              type="text"
              placeholder="Brief description of what you need"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="w-full"
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-slate-700">
              Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Provide detailed information about your requirement..."
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full min-h-[120px] resize-none"
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority" className="text-sm font-medium text-slate-700">
              Priority
            </Label>
            <Select
              value={formData.priority}
              onValueChange={(value) => handleInputChange('priority', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select priority level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low - Can wait</SelectItem>
                <SelectItem value="medium">Medium - Normal priority</SelectItem>
                <SelectItem value="high">High - Important</SelectItem>
                <SelectItem value="urgent">Urgent - Needs immediate attention</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">
              Attachments (Optional)
            </Label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-slate-400 transition-colors">
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
                accept="image/*,.pdf,.doc,.docx,.txt"
                disabled={isSubmitting}
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-600">
                  Click to upload files or drag and drop
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Images, PDFs, documents up to 10MB each
                </p>
              </label>
            </div>

            {uploadStates.size > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-slate-700">Upload Progress:</Label>
                  <span className="text-sm text-slate-600">{totalUploadProgress}%</span>
                </div>
                <Progress value={totalUploadProgress} className="w-full" />
              </div>
            )}

            {formData.attachments && formData.attachments.length > 0 && (
              <div className="space-y-2 mt-4">
                <Label className="text-sm font-medium text-slate-700">Selected Files:</Label>
                {formData.attachments.map((file, index) => {
                  const fileId = `${file.name}-${Date.now()}`;
                  const uploadState = Array.from(uploadStates.values()).find(state => state.file.name === file.name);
                  
                  return (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <File className="h-4 w-4 text-slate-500" />
                          {uploadState?.status === 'completed' && (
                            <CheckCircle className="h-3 w-3 text-green-500 absolute -top-1 -right-1" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                          <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                          {uploadState && (
                            <div className="mt-1">
                              <Progress value={uploadState.progress} className="h-1" />
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="h-6 w-6 p-0"
                        disabled={isSubmitting}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 p-4 bg-blue-50 rounded-lg">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <p className="text-xs text-blue-800">
              Our admin team will review your requirement and get back to you as soon as possible.
            </p>
          </div>

          <Button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={isSubmitting || !formData.title.trim() || !formData.description.trim()}
          >
            {isSubmitting ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Submitting...</span>
              </div>
            ) : (
              'Submit Requirement'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
