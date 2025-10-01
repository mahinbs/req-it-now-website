import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowLeft,
  Download,
  ExternalLink,
  Calendar,
  User,
  Globe,
  AlertTriangle,
  CheckCircle,
  Clock,
  RotateCcw,
  Eye,
  MessageSquare,
} from 'lucide-react';
import {
  getStatusColor,
  getPriorityColor,
  formatDate,
  getUniqueAttachments,
} from '@/utils/requirementUtils';
import { downloadFile } from '@/utils/downloadUtils';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { EnhancedLoadingScreen } from '@/components/common/EnhancedLoadingScreen';

type Requirement = Tables<'requirements'> & {
  profiles?: {
    company_name: string;
    website_url: string;
  } | null;
};

export const RequirementDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [requirement, setRequirement] = useState<Requirement | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (id) {
      fetchRequirement(id);
    }
  }, [id]);

  const fetchRequirement = async (requirementId: string) => {
    try {
      setLoading(true);
      
      // Fetch requirement and profile separately
      const [requirementResult, profilesResult] = await Promise.all([
        supabase
          .from('requirements')
          .select('*')
          .eq('id', requirementId)
          .single(),
        supabase
          .from('profiles')
          .select('id, company_name, website_url')
      ]);

      const { data: requirementData, error: requirementError } = requirementResult;
      const { data: profilesData, error: profilesError } = profilesResult;

      if (requirementError) {
        console.error('Error fetching requirement:', requirementError);
        toast({
          title: 'Error',
          description: 'Failed to load requirement details',
          variant: 'destructive',
        });
        navigate(-1);
        return;
      }

      if (profilesError) {
        console.warn('Error fetching profiles:', profilesError);
      }

      // Manually join requirement with profile
      const profile = profilesData?.find(p => p.id === requirementData.user_id);
      const requirementWithProfile: Requirement = {
        ...requirementData,
        profiles: profile ? {
          company_name: profile.company_name,
          website_url: profile.website_url
        } : null
      };

      setRequirement(requirementWithProfile);
    } catch (error) {
      console.error('Error fetching requirement:', error);
      toast({
        title: 'Error',
        description: 'Failed to load requirement details',
        variant: 'destructive',
      });
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const setLoadingState = (url: string, loadingState: boolean) => {
    setLoadingStates((prev) => ({ ...prev, [url]: loadingState }));
  };

  const handleDownload = async (url: string, fileName: string) => {
    setLoadingState(url, true);

    try {
      const result = await downloadFile(url, fileName, { forceDownload: true });

      if (!result.success) {
        toast({
          title: 'Download Failed',
          description: result.error || 'Failed to download file',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Download Started',
          description: `${fileName} is being downloaded`,
        });
      }
    } finally {
      setLoadingState(url, false);
    }
  };

  const handleOpenInNewTab = async (url: string, fileName: string) => {
    setLoadingState(url, true);

    try {
      await downloadFile(url, fileName, { openInNewTab: true });
    } finally {
      setLoadingState(url, false);
    }
  };

  if (loading) {
    return <EnhancedLoadingScreen message="Loading requirement details..." />;
  }

  if (!requirement) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-red-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Requirement not found</h2>
          <Button onClick={() => navigate(-1)} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const attachments = getUniqueAttachments(requirement);
  const adminStatus = requirement.admin_status || 'pending';
  const adminStatusConfig = {
    pending: {
      label: 'Pending',
      color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      icon: Clock,
    },
    ongoing: {
      label: 'Ongoing',
      color: 'bg-blue-100 text-blue-800 border-blue-300',
      icon: Clock,
    },
    completed: {
      label: 'Completed',
      color: 'bg-green-100 text-green-800 border-green-300',
      icon: CheckCircle,
    },
  };
  const statusConfig =
    adminStatusConfig[adminStatus as keyof typeof adminStatusConfig] ||
    adminStatusConfig.pending;
  const StatusIcon = statusConfig.icon;

  // Check if task was recently reopened
  const wasRecentlyReopened =
    requirement.admin_response_to_rejection &&
    !requirement.rejected_by_client &&
    requirement.rejection_reason;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-red-900 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 animated-gradient opacity-5"></div>

      <div className="max-w-6xl mx-auto p-6 relative z-10">
        {/* Header with Back Button */}
        <div className="mb-6 flex items-center justify-between">
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            className="glass border-white/20 text-slate-200 hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center space-x-2">
            <Eye className="h-5 w-5 text-slate-400" />
            <h1 className="text-2xl font-bold text-white font-space-grotesk">
              Requirement Details
            </h1>
          </div>
        </div>

        <div className="space-y-6">
          {/* Header Information */}
          <Card className="glass bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-xl font-semibold text-white">
                  {requirement.title}
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge
                    variant="outline"
                    className={getPriorityColor(requirement.priority)}
                  >
                    {requirement.priority}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center space-x-4">
                  <Badge
                    variant="outline"
                    className={getStatusColor(requirement.status)}
                  >
                    {requirement.status.replace('_', ' ')}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`${statusConfig.color} ${
                      wasRecentlyReopened ? 'ring-2 ring-green-200' : ''
                    }`}
                  >
                    {wasRecentlyReopened && (
                      <RotateCcw className="h-3 w-3 mr-1" />
                    )}
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {wasRecentlyReopened ? 'Reopened' : statusConfig.label}
                  </Badge>
                </div>
                <div className="flex items-center text-sm text-slate-300">
                  <Calendar className="h-4 w-4 mr-1" />
                  {formatDate(requirement.created_at, true)}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Company Information */}
          <Card className="glass bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-lg flex items-center text-white">
                <User className="h-5 w-5 mr-2" />
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-300">
                    Company Name
                  </label>
                  <p className="text-slate-100">
                    {requirement.profiles?.company_name || 'Not provided'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300">
                    Website URL
                  </label>
                  <div className="flex items-center space-x-2">
                    <Globe className="h-4 w-4 text-slate-400" />
                    <a
                      href={requirement.profiles?.website_url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 hover:underline"
                    >
                      {requirement.profiles?.website_url || 'Not provided'}
                    </a>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card className="glass bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-lg text-white">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-200 whitespace-pre-wrap leading-relaxed">
                {requirement.description}
              </p>
            </CardContent>
          </Card>

          {/* Rejection/Reopened Information */}
          {requirement.rejected_by_client && (
            <Card className="border-red-500/50 bg-red-900/30 glass backdrop-blur-xl shadow-2xl">
              <CardHeader>
                <CardTitle className="text-lg text-red-300 flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Rejection Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-red-200">
                      Rejection Reason
                    </label>
                    <p className="text-red-100 mt-1">
                      {requirement.rejection_reason ||
                        'No specific reason provided'}
                    </p>
                  </div>
                  {requirement.admin_response_to_rejection && (
                    <div>
                      <label className="text-sm font-medium text-red-200">
                        Admin Response
                      </label>
                      <p className="text-red-100 mt-1">
                        {requirement.admin_response_to_rejection}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Reopened Task Information */}
          {wasRecentlyReopened && (
            <Card className="border-green-500/50 bg-green-900/30 glass backdrop-blur-xl shadow-2xl">
              <CardHeader>
                <CardTitle className="text-lg text-green-300 flex items-center">
                  <RotateCcw className="h-5 w-5 mr-2" />
                  Task Reopened
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-green-200">
                    This task was reopened after addressing client concerns.
                    Work is continuing.
                  </p>
                  {requirement.rejection_reason && (
                    <div>
                      <label className="text-sm font-medium text-green-200">
                        Original Rejection Reason
                      </label>
                      <p className="text-green-100 mt-1">
                        {requirement.rejection_reason}
                      </p>
                    </div>
                  )}
                  {requirement.admin_response_to_rejection && (
                    <div>
                      <label className="text-sm font-medium text-green-200">
                        Admin Response
                      </label>
                      <p className="text-green-100 mt-1">
                        {requirement.admin_response_to_rejection}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status Timeline */}
          <Card className="glass bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-lg text-white">
                Status Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-slate-300">
                    Created: {formatDate(requirement.created_at, true)}
                  </span>
                </div>
                {requirement.approval_date && (
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-slate-300">
                      Approved: {formatDate(requirement.approval_date, true)}
                    </span>
                  </div>
                )}
                {requirement.completion_date && (
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-sm text-slate-300">
                      Completed: {formatDate(requirement.completion_date, true)}
                    </span>
                  </div>
                )}
                {requirement.acceptance_date && (
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    <span className="text-sm text-slate-300">
                      Accepted: {formatDate(requirement.acceptance_date, true)}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Attachments */}
          {attachments.length > 0 && (
            <Card className="glass bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-lg text-white">
                  Attachments ({attachments.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {attachments.map((attachment, index) => {
                    const isLoading = loadingStates[attachment.url];

                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 glass bg-slate-800/50 rounded-lg border border-white/10"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-600/20 rounded flex items-center justify-center">
                            {attachment.type === 'video' ? '🎥' : '📄'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-200">
                              {attachment.name}
                            </p>
                            <p className="text-xs text-slate-400">
                              {attachment.type === 'video' ? 'Video' : 'File'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button
                            onClick={() =>
                              handleOpenInNewTab(
                                attachment.url,
                                attachment.name
                              )
                            }
                            size="sm"
                            variant="outline"
                            className="glass border-white/20 hover:bg-white/10 text-slate-300 h-8 w-8 p-0"
                            title="Open in new tab"
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <ExternalLink className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            onClick={() =>
                              handleDownload(attachment.url, attachment.name)
                            }
                            size="sm"
                            variant="outline"
                            className="glass border-white/20 hover:bg-white/10 text-slate-300 h-8 w-8 p-0"
                            title="Download file"
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Download className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

