import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Eye,
  Download,
  ExternalLink,
  Calendar,
  User,
  Globe,
  AlertTriangle,
  CheckCircle,
  Clock,
  RotateCcw,
} from "lucide-react";
import {
  getStatusColor,
  getPriorityColor,
  formatDate,
  getUniqueAttachments,
  adminStatusConfig,
} from "@/utils/requirementUtils";
import { downloadFile } from "@/utils/downloadUtils";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Requirement = Tables<"requirements"> & {
  profiles?: {
    company_name: string;
    website_url: string;
  } | null;
};
interface RequirementViewModalProps {
  requirement: Requirement;
  isOpen: boolean;
  onClose: () => void;
  onDownloadAttachment?: (url: string, fileName: string) => void;
}

export const RequirementViewModal = ({
  requirement,
  isOpen,
  onClose,
  onDownloadAttachment,
}: RequirementViewModalProps) => {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>(
    {}
  );

  const attachments = getUniqueAttachments(requirement);
  const adminStatus = requirement.admin_status || "pending";
  const adminStatusConfig = {
    pending: {
      label: "Pending",
      color: "bg-yellow-100 text-yellow-800 border-yellow-300",
      icon: Clock,
    },
    ongoing: {
      label: "Ongoing",
      color: "bg-blue-100 text-blue-800 border-blue-300",
      icon: Clock,
    },
    completed: {
      label: "Completed",
      color: "bg-green-100 text-green-800 border-green-300",
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

  const setLoading = (url: string, loading: boolean) => {
    setLoadingStates((prev) => ({ ...prev, [url]: loading }));
  };

  const handleDownload = async (url: string, fileName: string) => {
    if (onDownloadAttachment) {
      onDownloadAttachment(url, fileName);
      return;
    }

    setLoading(url, true);

    try {
      const result = await downloadFile(url, fileName, { forceDownload: true });

      if (!result.success) {
        toast({
          title: "Download Failed",
          description: result.error || "Failed to download file",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Download Started",
          description: `${fileName} is being downloaded`,
        });
      }
    } finally {
      setLoading(url, false);
    }
  };

  const handleOpenInNewTab = async (url: string, fileName: string) => {
    setLoading(url, true);

    try {
      await downloadFile(url, fileName, { openInNewTab: true });
    } finally {
      setLoading(url, false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-white">
            <Eye className="h-5 w-5" />
            <span>Requirement Details</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Information */}
          <Card>
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
                    {requirement.status.replace("_", " ")}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`${statusConfig.color} ${
                      wasRecentlyReopened ? "ring-2 ring-green-200" : ""
                    }`}
                  >
                    {wasRecentlyReopened && (
                      <RotateCcw className="h-3 w-3 mr-1" />
                    )}
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {wasRecentlyReopened ? "Reopened" : statusConfig.label}
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
          <Card>
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
                    {requirement.profiles?.company_name || "Not provided"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300">
                    Website URL
                  </label>
                  <div className="flex items-center space-x-2">
                    <Globe className="h-4 w-4 text-slate-400" />
                    <a
                      href={requirement.profiles?.website_url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 hover:underline"
                    >
                      {requirement.profiles?.website_url || "Not provided"}
                    </a>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
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
            <Card className="border-red-500/50 bg-red-900/30">
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
                        "No specific reason provided"}
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
            <Card className="border-green-500/50 bg-green-900/30">
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
          <Card>
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
            <Card>
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
                        className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-600"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-600/20 rounded flex items-center justify-center">
                            {attachment.type === "video" ? "🎥" : "📄"}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-200">
                              {attachment.name}
                            </p>
                            <p className="text-xs text-slate-400">
                              {attachment.type === "video" ? "Video" : "File"}
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
                            className="flex items-center space-x-1 border-slate-600 hover:bg-slate-700 text-gray-400 h-8 w-8 p-0"
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
                            className="flex items-center space-x-1 border-slate-600 hover:bg-slate-700 text-gray-400 h-8 w-8 p-0"
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
      </DialogContent>
    </Dialog>
  );
};
