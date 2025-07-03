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
    try {
      console.log("File upload triggered");
      
      // Get the file input element
      const fileInput = event.target;
      const files = fileInput.files;
      
      if (!files || files.length === 0) {
        console.log("No files selected");
        return;
      }
      
      console.log(`${files.length} files selected`);
      
      // Create a copy of the FileList before resetting the input
      const newFiles = Array.from(files);
      
      // Log file details for debugging
      newFiles.forEach((file, index) => {
        console.log(`File ${index + 1}: ${file.name}, type: ${file.type}, size: ${file.size} bytes`);
      });
      
      // Validate files with more permissive rules for mobile
      const validFiles = newFiles.filter(file => {
        // Check if file is valid (not empty or corrupted)
        if (!file || file.size === 0) {
          toast({
            title: "Invalid file",
            description: "The selected file appears to be empty or corrupted",
            variant: "destructive"
          });
          return false;
        }
        
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        if (file.size > maxSize) {
          toast({
            title: "File too large",
            description: `${file.name} is larger than 10MB`,
            variant: "destructive"
          });
          return false;
        }
        
        // Very permissive file type checking to ensure mobile compatibility
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
        const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'txt', 'rtf'];
        
        if (!allowedExtensions.includes(fileExtension)) {
          toast({
            title: "Invalid file type",
            description: `${file.name} is not a supported file type. Please use images, PDFs, or documents.`,
            variant: "destructive"
          });
          return false;
        }
        
        return true;
      });
      
      console.log(`${validFiles.length} valid files after filtering`);
      
      if (validFiles.length > 0) {
        // Update form data with new files
        setFormData(prev => {
          const updatedFormData = {
            ...prev,
            attachments: [...(prev.attachments || []), ...validFiles]
          };
          console.log(`Form data updated with ${updatedFormData.attachments?.length} total attachments`);
          return updatedFormData;
        });

        // Process one file at a time to avoid overwhelming mobile browsers
        const processFiles = async () => {
          for (const file of validFiles) {
            try {
              console.log(`Starting upload for ${file.name}`);
              const url = await uploadRequirementFile(file, 'temp-user-id', 'temp-req-id', (progress) => {
                console.log(`Upload progress for ${file.name}: ${progress.progress}%, status: ${progress.status}`);
                // Update the upload state for this file
                setUploadStates(prev => {
                  const fileId = `${file.name}-${Date.now()}`;
                  const newMap = new Map(prev);
                  newMap.set(fileId, {
                    file,
                    progress: progress.progress,
                    status: progress.status,
                    error: progress.error,
                    url: progress.status === 'completed' ? 'uploading-complete' : undefined
                  });
                  return newMap;
                });
              });
              
              if (url) {
                console.log(`Upload completed for ${file.name}, URL: ${url}`);
                // Update the upload state with the completed URL
                setUploadStates(prev => {
                  const fileId = `${file.name}-${Date.now()}`;
                  const newMap = new Map(prev);
                  newMap.set(fileId, {
                    file,
                    progress: 100,
                    status: 'completed',
                    url
                  });
                  return newMap;
                });
              } else {
                console.error(`Upload failed for ${file.name}`);
                toast({
                  title: "Upload Failed",
                  description: `Could not upload ${file.name}. Please try again.`,
                  variant: "destructive"
                });
              }
            } catch (error) {
              console.error(`Error uploading ${file.name}:`, error);
              toast({
                title: "Upload Error",
                description: `Error uploading ${file.name}. Please try again.`,
                variant: "destructive"
              });
            }
          }
        };
        
        // Start processing files
        processFiles().catch(error => {
          console.error("File processing error:", error);
        });
      }
      
      // Reset the file input to allow selecting the same file again
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (error) {
      console.error("File upload handler error:", error);
      toast({
        title: "File Upload Error",
        description: "There was a problem processing your files. Please try again.",
        variant: "destructive"
      });
    }
  }, [toast]);
  const removeFile = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments?.filter((_, i) => i !== index) || []
    }));
  }, []);
  const retryUpload = useCallback((file: File) => {
    console.log(`Retrying upload for ${file.name}`);
    
    // Update UI to show retry is in progress
    setUploadStates(prev => {
      const fileId = `${file.name}-${Date.now()}`;
      const newMap = new Map(prev);
      newMap.set(fileId, {
        file,
        progress: 0,
        status: 'uploading'
      });
      return newMap;
    });
    
    // Attempt the upload again
    uploadRequirementFile(file, 'temp-user-id', 'temp-req-id', (progress) => {
      console.log(`Retry progress for ${file.name}: ${progress.progress}%, status: ${progress.status}`);
      
      // Update the upload state for this file
      setUploadStates(prev => {
        const fileId = `${file.name}-${Date.now()}`;
        const newMap = new Map(prev);
        newMap.set(fileId, {
          file,
          progress: progress.progress,
          status: progress.status,
          error: progress.error,
          url: progress.status === 'completed' ? 'uploading-complete' : undefined
        });
        return newMap;
      });
    })
    .then(url => {
      if (url) {
        console.log(`Retry completed for ${file.name}, URL: ${url}`);
        toast({
          title: "Upload Successful",
          description: `${file.name} has been uploaded successfully.`,
          variant: "default"
        });
        
        // Update the upload state with the completed URL
        setUploadStates(prev => {
          const fileId = `${file.name}-${Date.now()}`;
          const newMap = new Map(prev);
          newMap.set(fileId, {
            file,
            progress: 100,
            status: 'completed',
            url
          });
          return newMap;
        });
      } else {
        console.error(`Retry failed for ${file.name}`);
        toast({
          title: "Retry Failed",
          description: `Could not upload ${file.name}. Please try again.`,
          variant: "destructive"
        });
      }
    })
    .catch(error => {
      console.error(`Retry upload failed for ${file.name}:`, error);
      toast({
        title: "Retry Error",
        description: `Error uploading ${file.name}. Please try again.`,
        variant: "destructive"
      });
    });
  }, [toast]);
  // Add a timeout effect to prevent stuck submitting state
  useEffect(() => {
    let timeoutId: number | undefined;
    
    if (isSubmitting) {
      // Set a timeout to automatically reset the submitting state after 10 seconds
      // This prevents the UI from being stuck in a submitting state if something goes wrong
      timeoutId = window.setTimeout(() => {
        setIsSubmitting(false);
        setSubmitError('Submission timed out. Please try again.');
        toast({
          title: "Submission Timeout",
          description: "The request is taking too long. Please try again.",
          variant: "destructive"
        });
      }, 10000); // Reduced timeout to 10 seconds
    }
    
    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [isSubmitting]);
  
  // Add a cleanup effect when component unmounts
  useEffect(() => {
    return () => {
      // Clean up any pending state if the component unmounts
      setIsSubmitting(false);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    
    // Validate form fields
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
    
    // Set a flag in sessionStorage to track submission state
    // This helps recover from page refreshes or browser issues
    try {
      sessionStorage.setItem('requirement_submitting', 'true');
    } catch (e) {
      // Ignore errors with sessionStorage
    }
    
    setIsSubmitting(true);
    
    try {
      // For all browsers, add a small delay to ensure UI updates properly
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Get user information with retry logic
      let user = null;
      let userError = null;
      
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await supabase.auth.getUser();
          user = response.data.user;
          userError = response.error;
          
          if (user) break;
          
          if (userError) {
            console.warn(`Auth attempt ${attempt + 1} failed:`, userError);
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (err) {
          console.error(`Auth attempt ${attempt + 1} error:`, err);
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      if (!user) {
        throw new Error('User not authenticated. Please try refreshing the page and logging in again.');
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
        status: 'pending',
        created_at: new Date().toISOString() // Explicitly set creation time
      };
      
      // Add a small delay before database operation
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Insert with retry logic
      let insertError = null;
      let insertData = null;
      
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await supabase.from('requirements')
            .insert([requirementData])
            .select()
            .single();
            
          insertData = response.data;
          insertError = response.error;
          
          if (!insertError) break;
          
          console.warn(`Insert attempt ${attempt + 1} failed:`, insertError);
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) {
          console.error(`Insert attempt ${attempt + 1} error:`, err);
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      if (insertError) {
        throw new Error(`Failed to save requirement: ${insertError.message}`);
      }

      // Clear the submission tracking flag
      try {
        sessionStorage.removeItem('requirement_submitting');
      } catch (e) {
        // Ignore errors with sessionStorage
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
      
      // Clear the submission tracking flag on error
      try {
        sessionStorage.removeItem('requirement_submitting');
      } catch (e) {
        // Ignore errors with sessionStorage
      }
      
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
              {/* Mobile-optimized file input */}
              <input 
                type="file" 
                multiple 
                onChange={handleFileUpload} 
                className="hidden" 
                id="file-upload" 
                accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt" 
                disabled={isSubmitting} 
              />
              
              {/* Mobile-friendly upload UI */}
              <div className="flex flex-col items-center justify-center">
                <Upload className="h-8 w-8 text-slate-400 mb-2" />
                
                <p className="text-sm text-slate-300 mb-3">
                  {isMobile ? "Upload images or documents" : "Click to upload files or drag and drop"}
                </p>
                
                {/* Primary upload button - larger target for mobile */}
                <Button 
                  type="button"
                  onClick={() => document.getElementById('file-upload')?.click()}
                  className="w-full md:w-auto mb-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4"
                  disabled={isSubmitting}
                >
                  {isMobile ? "Choose Files" : "Select Files"}
                </Button>
                
                {/* Camera button for mobile */}
                {isMobile && (
                  <Button 
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('file-upload') as HTMLInputElement;
                      if (input) {
                        input.setAttribute('capture', 'environment');
                        input.setAttribute('accept', 'image/*');
                        input.click();
                        // Reset after click
                        setTimeout(() => {
                          input.removeAttribute('capture');
                          input.setAttribute('accept', '.jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt');
                        }, 1000);
                      }
                    }}
                    className="w-full md:w-auto mt-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4"
                    disabled={isSubmitting}
                  >
                    Take Photo
                  </Button>
                )}
                
                <p className="text-xs text-slate-400 mt-3">
                  Images, PDFs, documents up to 10MB each
                </p>
              </div>
            </div>

            {/* Simplified upload progress indicator */}
            {uploadStates.size > 0 && (
              <div className="space-y-3 mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-600">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-slate-200">Upload Progress:</Label>
                  <span className="text-sm text-slate-300">{totalUploadProgress}%</span>
                </div>
                <Progress value={totalUploadProgress} className="w-full h-2 bg-slate-700" />
              </div>
            )}

            {/* File list with simplified UI */}
            {formData.attachments && formData.attachments.length > 0 && (
              <div className="space-y-3 mt-4">
                <Label className="text-sm font-medium text-slate-200">
                  Selected Files ({formData.attachments.length}):
                </Label>
                
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                  {formData.attachments.map((file, index) => {
                    // Find the upload state for this file
                    const uploadState = Array.from(uploadStates.values())
                      .find(state => state.file.name === file.name);
                    
                    // Determine status color
                    let statusColor = "bg-slate-600"; // default/pending
                    if (uploadState) {
                      if (uploadState.status === 'completed') statusColor = "bg-green-600";
                      else if (uploadState.status === 'error') statusColor = "bg-red-600";
                      else if (uploadState.status === 'uploading') statusColor = "bg-blue-600";
                    }
                    
                    return (
                      <div 
                        key={index} 
                        className="flex items-center p-3 bg-slate-700/50 rounded-lg border border-slate-600"
                      >
                        {/* Status indicator */}
                        <div className={`w-2 h-full min-h-[40px] ${statusColor} rounded-full mr-3`}></div>
                        
                        {/* File info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center">
                            {getFileStatusIcon(uploadState?.status || 'pending')}
                            <p className="text-sm font-medium text-slate-200 truncate ml-2">
                              {file.name}
                            </p>
                          </div>
                          
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-slate-400">
                              {formatFileSize(file.size)}
                            </p>
                            
                            {/* Status text */}
                            <p className="text-xs">
                              {uploadState?.status === 'completed' && (
                                <span className="text-green-400">Uploaded</span>
                              )}
                              {uploadState?.status === 'uploading' && (
                                <span className="text-blue-400">Uploading {uploadState.progress}%</span>
                              )}
                              {uploadState?.status === 'error' && (
                                <span className="text-red-400">Failed</span>
                              )}
                              {!uploadState && <span className="text-slate-400">Pending</span>}
                            </p>
                          </div>
                          
                          {/* Progress bar */}
                          {uploadState && (
                            <Progress 
                              value={uploadState.progress} 
                              className="h-1 mt-1 bg-slate-700" 
                            />
                          )}
                          
                          {/* Error message */}
                          {uploadState?.error && (
                            <p className="text-xs text-red-400 mt-1">{uploadState.error}</p>
                          )}
                        </div>
                        
                        {/* Action buttons */}
                        <div className="ml-2">
                          {uploadState?.status === 'error' && (
                            <Button 
                              type="button" 
                              size="sm" 
                              onClick={() => retryUpload(file)} 
                              className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                            >
                              Retry
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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