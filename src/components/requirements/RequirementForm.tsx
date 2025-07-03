import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, X, File, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { uploadRequirementFile, type UploadProgress } from '@/utils/storageUtils';
import { useIsMobile } from '@/hooks/use-mobile';
interface RequirementFormData {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  attachments?: File[];
}
interface RequirementFormProps {
  onSubmit: (data: RequirementFormData) => void;
}
interface FileUploadState {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  url?: string;
  error?: string;
}
export const RequirementForm = ({
  onSubmit
}: RequirementFormProps) => {
  const [formData, setFormData] = useState<RequirementFormData>({
    title: '',
    description: '',
    priority: 'medium',
    attachments: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStates, setUploadStates] = useState<Map<string, FileUploadState>>(new Map());
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const handleInputChange = useCallback((field: keyof RequirementFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);
  const uploadFileOptimized = useCallback(async (file: File): Promise<string | null> => {
    const fileId = `${file.name}-${Date.now()}`;

    // Initialize upload state
    setUploadStates(prev => new Map(prev.set(fileId, {
      file,
      progress: 0,
      status: 'uploading'
    })));
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      const url = await uploadRequirementFile(file, user.id, 'temp-' + Date.now(), (progressInfo: UploadProgress) => {
        setUploadStates(prev => {
          const newMap = new Map(prev);
          newMap.set(fileId, {
            file,
            progress: progressInfo.progress,
            status: progressInfo.status,
            error: progressInfo.error,
            url: progressInfo.status === 'completed' ? 'uploading-complete' : undefined
          });
          return newMap;
        });
      });
      if (url) {
        setUploadStates(prev => new Map(prev.set(fileId, {
          file,
          progress: 100,
          status: 'completed',
          url
        })));
        return url;
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      setUploadStates(prev => new Map(prev.set(fileId, {
        file,
        progress: 0,
        status: 'error',
        error: error instanceof Error ? error.message : 'Upload failed'
      })));
      return null;
    }
  }, []);
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles = Array.from(files);

      // Validate files
      const validFiles = newFiles.filter(file => {
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = ['image/', 'application/pdf', 'application/msword', 'text/'];
        if (file.size > maxSize) {
          toast({
            title: "File too large",
            description: `${file.name} is larger than 10MB`,
            variant: "destructive"
          });
          return false;
        }
        if (!allowedTypes.some(type => file.type.startsWith(type))) {
          toast({
            title: "Invalid file type",
            description: `${file.name} is not a supported file type`,
            variant: "destructive"
          });
          return false;
        }
        return true;
      });
      if (validFiles.length > 0) {
        setFormData(prev => ({
          ...prev,
          attachments: [...(prev.attachments || []), ...validFiles]
        }));

        // Start uploads
        validFiles.forEach(file => {
          uploadFileOptimized(file).catch(error => {
            console.error(`Upload failed for ${file.name}:`, error);
          });
        });
      }
    }
  }, [uploadFileOptimized]);
  const removeFile = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments?.filter((_, i) => i !== index) || []
    }));
  }, []);
  const retryUpload = useCallback((file: File) => {
    uploadFileOptimized(file).catch(error => {
      console.error(`Retry upload failed for ${file.name}:`, error);
    });
  }, [uploadFileOptimized]);
  // Add a timeout effect to prevent stuck submitting state
  useEffect(() => {
    let timeoutId: number | undefined;
    
    if (isSubmitting) {
      // Set a timeout to automatically reset the submitting state after 15 seconds
      // This prevents the UI from being stuck in a submitting state if something goes wrong
      timeoutId = window.setTimeout(() => {
        setIsSubmitting(false);
        setSubmitError('Submission timed out. Please try again.');
        toast({
          title: "Submission Timeout",
          description: "The request is taking too long. Please try again.",
          variant: "destructive"
        });
      }, 15000);
    }
    
    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [isSubmitting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    
    if (!formData.title.trim() || !formData.description.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    // Check if any uploads are in progress
    const uploadStatesArray = Array.from(uploadStates.values());
    const hasUploadingFiles = uploadStatesArray.some(state => state.status === 'uploading');
    if (hasUploadingFiles) {
      toast({
        title: "Upload in Progress",
        description: "Please wait for all files to finish uploading",
        variant: "destructive"
      });
      return;
    }
    
    // Prevent multiple submissions
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      // For mobile browsers, add a small delay to ensure UI updates properly
      if (isMobile) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const {
        data: {
          user
        },
        error: userError
      } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Get completed uploads
      const completedUploads = uploadStatesArray
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
      
      // Add a small delay before database operation on mobile
      if (isMobile) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      const {
        data,
        error
      } = await supabase.from('requirements').insert([requirementData]).select().single();
      
      if (error) {
        throw new Error(`Failed to save requirement: ${error.message}`);
      }

      // Reset form
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        attachments: []
      });
      setUploadStates(new Map());
      
      // Call the onSubmit callback
      onSubmit(formData);
      
      toast({
        title: "Success!",
        description: "Your requirement has been submitted successfully",
        className: "bg-green-50 border-green-200 text-green-800"
      });
    } catch (error) {
      console.error('Submission error:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to submit requirement";
      setSubmitError(errorMessage);
      
      toast({
        title: "Submission Error",
        description: errorMessage,
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
  const getFileStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'uploading':
        return <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      default:
        return <File className="h-4 w-4 text-slate-500" />;
    }
  };
  return <Card className="w-full max-w-2xl mx-auto bg-gradient-to-br from-slate-800/95 to-slate-700/95 backdrop-blur-xl border-slate-600/50 shadow-2xl">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-white">Submit Website Requirement</CardTitle>
        <CardDescription className="text-slate-300">
          Describe what you need help with on your website. Be as detailed as possible.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium text-slate-200">
              Title <span className="text-red-400">*</span>
            </Label>
            <Input id="title" type="text" placeholder="Brief description of what you need" value={formData.title} onChange={e => handleInputChange('title', e.target.value)} className="w-full bg-slate-700/50 border-slate-500 text-white placeholder:text-slate-400 focus:border-slate-400 focus:ring-slate-400" disabled={isSubmitting} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-slate-200">
              Description <span className="text-red-400">*</span>
            </Label>
            <Textarea id="description" placeholder="Provide detailed information about your requirement..." value={formData.description} onChange={e => handleInputChange('description', e.target.value)} className="w-full min-h-[120px] resize-none bg-slate-700/50 border-slate-500 text-white placeholder:text-slate-400 focus:border-slate-400 focus:ring-slate-400" disabled={isSubmitting} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority" className="text-sm font-medium text-slate-200">
              Priority
            </Label>
            <Select value={formData.priority} onValueChange={value => handleInputChange('priority', value)} disabled={isSubmitting}>
              <SelectTrigger className="w-full bg-slate-700/50 border-slate-500 text-white focus:border-slate-400 focus:ring-slate-400">
                <SelectValue placeholder="Select priority level" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600 text-white">
                <SelectItem value="low" className="text-white hover:bg-slate-600">Low - Can wait</SelectItem>
                <SelectItem value="medium" className="text-white hover:bg-slate-600">Medium - Normal priority</SelectItem>
                <SelectItem value="high" className="text-white hover:bg-slate-600">High - Important</SelectItem>
                <SelectItem value="urgent" className="text-white hover:bg-slate-600">Urgent - Needs immediate attention</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-200">
              Attachments (Optional)
            </Label>
            <div className="border-2 border-dashed border-slate-500 rounded-lg p-6 text-center hover:border-slate-400 transition-colors bg-slate-700/30">
              <input type="file" multiple onChange={handleFileUpload} className="hidden" id="file-upload" accept="image/*,.pdf,.doc,.docx,.txt" disabled={isSubmitting} />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-300">
                  Click to upload files or drag and drop
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Images, PDFs, documents up to 10MB each
                </p>
              </label>
            </div>

            {uploadStates.size > 0 && <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-slate-200">Upload Progress:</Label>
                  <span className="text-sm text-slate-300">{totalUploadProgress}%</span>
                </div>
                <Progress value={totalUploadProgress} className="w-full bg-slate-600" />
              </div>}

            {formData.attachments && formData.attachments.length > 0 && <div className="space-y-2 mt-4">
                <Label className="text-sm font-medium text-slate-200">Selected Files:</Label>
                {formData.attachments.map((file, index) => {
              const uploadState = Array.from(uploadStates.values()).find(state => state.file.name === file.name);
              return <div key={index} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg border border-slate-600">
                      <div className="flex items-center space-x-3 flex-1">
                        {getFileStatusIcon(uploadState?.status || 'pending')}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-200 truncate">{file.name}</p>
                          <p className="text-xs text-slate-400">{formatFileSize(file.size)}</p>
                          {uploadState && <div className="mt-1 space-y-1">
                              <Progress value={uploadState.progress} className="h-1 bg-slate-600" />
                              {uploadState.error && <p className="text-xs text-red-400">{uploadState.error}</p>}
                            </div>}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {uploadState?.status === 'error' && <Button type="button" variant="ghost" size="sm" onClick={() => retryUpload(file)} className="text-blue-400 hover:text-blue-300 text-xs hover:bg-slate-600">
                            Retry
                          </Button>}
                        
                      </div>
                    </div>;
            })}
              </div>}
          </div>

          <div className="flex items-center space-x-2 p-4 bg-blue-900/30 rounded-lg border border-blue-500/30">
            <AlertCircle className="h-4 w-4 text-blue-400" />
            <p className="text-xs text-blue-200">
              Our admin team will review your requirement and get back to you as soon as possible.
            </p>
          </div>

          {submitError && (
            <div className="p-3 mb-4 bg-red-100 border border-red-300 rounded-md text-red-800 text-sm">
              <p className="font-medium">Error: {submitError}</p>
              <p className="mt-1">Please try again or refresh the page if the problem persists.</p>
            </div>
          )}
          
          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200" 
            disabled={isSubmitting || !formData.title.trim() || !formData.description.trim()}
          >
            {isSubmitting ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Submitting...</span>
              </div>
            ) : 'Submit Requirement'}
          </Button>
        </form>
      </CardContent>
    </Card>;
};