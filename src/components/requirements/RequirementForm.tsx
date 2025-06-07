
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileVideo, X, File, Image, FileText } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface RequirementFormProps {
  onSubmit: (data: {
    title: string;
    description: string;
    priority: string;
    attachments?: File[];
  }) => void;
}

export const RequirementForm = ({ onSubmit }: RequirementFormProps) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium'
  });
  const [attachments, setAttachments] = useState<File[]>([]);
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
        attachments: attachments.length > 0 ? attachments : undefined
      });
      setFormData({ title: '', description: '', priority: 'medium' });
      setAttachments([]);
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
    const files = Array.from(e.target.files || []);
    
    // Check file size limit (100MB total)
    const totalSize = [...attachments, ...files].reduce((sum, file) => sum + file.size, 0);
    if (totalSize > 100 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Total file size must be less than 100MB",
        variant: "destructive"
      });
      return;
    }

    // Check individual file size (25MB per file)
    const oversizedFiles = files.filter(file => file.size > 25 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast({
        title: "Error",
        description: "Each file must be less than 25MB",
        variant: "destructive"
      });
      return;
    }

    setAttachments(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (file: File) => {
    const type = file.type;
    if (type.startsWith('image/')) return <Image className="h-4 w-4 text-green-500" />;
    if (type.startsWith('video/')) return <FileVideo className="h-4 w-4 text-red-500" />;
    if (type.includes('pdf') || type.includes('document')) return <FileText className="h-4 w-4 text-blue-500" />;
    return <File className="h-4 w-4 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg border-slate-200">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200">
        <CardTitle className="text-slate-900">Submit New Requirement</CardTitle>
        <CardDescription className="text-slate-600">
          Describe the changes you need for your website. You can attach files to help explain your requirements.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-slate-700 font-medium">Requirement Title *</Label>
            <Input
              id="title"
              placeholder="Brief title for your requirement"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
              className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-slate-700 font-medium">Detailed Description *</Label>
            <Textarea
              id="description"
              placeholder="Provide a detailed description of what changes you need..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={6}
              required
              className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority" className="text-slate-700 font-medium">Priority</Label>
            <select
              id="priority"
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-700 font-medium">Attachments (Optional)</Label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center bg-slate-50 hover:bg-slate-100 transition-colors">
              <Upload className="mx-auto h-12 w-12 text-slate-400 mb-4" />
              <p className="text-sm text-slate-600 mb-2">
                Upload files to better explain your requirements
              </p>
              <p className="text-xs text-slate-500 mb-4">
                Supports images, videos, documents (PDF, DOC, etc.)
              </p>
              <input
                type="file"
                accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
                multiple
              />
              <Button type="button" variant="outline" asChild className="border-blue-300 text-blue-600 hover:bg-blue-50">
                <label htmlFor="file-upload" className="cursor-pointer">
                  Choose Files
                </label>
              </Button>
              <p className="text-xs text-slate-500 mt-2">
                Max 25MB per file, 100MB total
              </p>
            </div>

            {/* Show selected files */}
            {attachments.length > 0 && (
              <div className="space-y-2 mt-4">
                <Label className="text-slate-700 font-medium">Selected Files:</Label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-white border border-slate-200 p-3 rounded-md">
                      <div className="flex items-center space-x-3">
                        {getFileIcon(file)}
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-medium text-slate-900 truncate block">{file.name}</span>
                          <span className="text-xs text-slate-500">{formatFileSize(file.size)}</span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white" 
            disabled={isLoading}
          >
            {isLoading ? "Submitting..." : "Submit Requirement"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
