import React from "react";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Calendar, AlertTriangle } from "lucide-react";
import { getPriorityColor, formatDate } from "@/utils/requirementUtils";
import { useAutoCompletion } from "@/hooks/useAutoCompletion";
import type { Tables } from "@/integrations/supabase/types";

type Requirement = Tables<"requirements"> & {
  profiles?: {
    company_name: string;
    website_url: string;
  } | null;
};

interface RequirementCardHeaderProps {
  requirement: Requirement;
  unreadCount: number;
}

export const RequirementCardHeader = ({
  requirement,
  unreadCount,
}: RequirementCardHeaderProps) => {
  const { autoCompletionInfo } = useAutoCompletion(requirement);

  const getStatusBadgeVariant = () => {
    if (requirement.rejected_by_client) {
      return "bg-red-900/50 text-red-300 border-red-500/50";
    } else if (requirement.accepted_by_client) {
      return "bg-green-900/50 text-green-300 border-green-500/50";
    } else if (autoCompletionInfo.isAwaitingReview) {
      if (autoCompletionInfo.shouldAutoComplete) {
        return "bg-green-900/50 text-green-300 border-green-500/50"; // Auto-completed (green)
      } else {
        return "bg-purple-900/50 text-purple-300 border-purple-500/50"; // Awaiting review (purple)
      }
    } else if (
      requirement.admin_status === "ongoing" ||
      requirement.approved_by_admin
    ) {
      return "bg-blue-900/50 text-blue-300 border-blue-500/50";
    } else if (requirement.admin_status === "completed") {
      return "bg-green-900/50 text-green-300 border-green-500/50";
    }
    return "bg-slate-700/50 text-slate-300 border-slate-500/50";
  };

  const getStatusText = () => {
    if (requirement.rejected_by_client) {
      return "Rejected by Client";
    } else if (requirement.accepted_by_client) {
      return "Accepted by Client";
    } else if (autoCompletionInfo.isAwaitingReview) {
      if (autoCompletionInfo.shouldAutoComplete) {
        return "Completed"; // Auto-completed after 24 hours
      } else {
        return `Awaiting Client Review (${autoCompletionInfo.hoursRemaining}h remaining)`;
      }
    } else if (
      requirement.admin_status === "ongoing" ||
      requirement.approved_by_admin
    ) {
      return "Work in Progress";
    } else if (requirement.admin_status === "completed") {
      return "Completed";
    }
    return requirement.status.replace("_", " ");
  };

  return (
    <>
      {/* Top-right notification indicator */}
      {unreadCount > 0 && (
        <div className="absolute -top-2 -right-2 z-20">
          <div className="bg-red-500 text-white rounded-full text-xs font-bold min-w-[1.25rem] h-5 flex items-center justify-center px-1 shadow-lg border-2 border-white animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </div>
        </div>
      )}

      {/* Rejection indicator */}
      {requirement.rejected_by_client && (
        <div className="absolute top-2 left-2 z-10">
          <div className="bg-red-500 text-white rounded-full p-1">
            <AlertTriangle className="h-3 w-3" />
          </div>
        </div>
      )}

      <CardHeader className="pb-3 flex-shrink-0">
        <div className="space-y-4">
          <Badge variant="outline" className={getStatusBadgeVariant()}>
            {getStatusText()}
          </Badge>
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-lg font-semibold text-white leading-tight flex-1 min-w-0">
              {requirement.title}
            </CardTitle>
            <div className="flex flex-col items-end space-y-2 flex-shrink-0">
              <Badge
                variant="outline"
                className={getPriorityColor(requirement.priority)}
              >
                {requirement.priority}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-300">
            <div className="flex items-center min-w-0">
              <User className="h-4 w-4 mr-1 flex-shrink-0" />
              <span className="truncate">
                {requirement.profiles?.company_name || "Unknown Company"}
              </span>
            </div>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1 flex-shrink-0" />
              <span className="whitespace-nowrap">
                {formatDate(requirement.created_at, true)}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
    </>
  );
};
