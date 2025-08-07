import React, { useState, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { RefreshCw, Bell, BarChart3, Users, MessageSquare } from "lucide-react";
import { ChatModal } from "./ChatModal";
import { AdminDashboardHeader } from "./AdminDashboardHeader";
import { AdminOverviewPage } from "./AdminOverviewPage";
import { AdminRequirementsPage } from "./AdminRequirementsPage";
import { MessagesPage } from "./MessagesPage";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { useUnifiedNotificationContext } from "@/hooks/useUnifiedNotifications";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Requirement = Tables<"requirements"> & {
  profiles?: {
    company_name: string;
    website_url: string;
  } | null;
};

interface AdminDashboardLayoutProps {
  onLogout: () => void;
}

export const AdminDashboardLayout = ({
  onLogout,
}: AdminDashboardLayoutProps) => {
  const [selectedRequirement, setSelectedRequirement] =
    useState<Requirement | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const {
    requirements,
    loading,
    refreshing,
    error,
    setError,
    handleRefresh,
    handleApprovalUpdate,
    statusCounts,
  } = useAdminDashboard();

  const {
    markAsRead,
    refreshNotifications,
    hasNewMessage,
    notificationCounts,
    connected,
    error: notificationError,
    getUnreadCount,
  } = useUnifiedNotificationContext();

  const handleChatClick = useCallback((requirement: Requirement) => {
    console.log("Admin opening chat for requirement:", requirement.id);
    setSelectedRequirement(requirement);
  }, []);

  const handleCloseChatModal = useCallback(() => {
    setSelectedRequirement(null);
  }, []);

  const handleDownloadAttachment = useCallback(
    (url: string, fileName: string) => {
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    []
  );

  const handleLogout = useCallback(async () => {
    try {
      console.log("Admin logout triggered");
      await onLogout();
      toast({
        title: "Success",
        description: "Logged out successfully",
      });
    } catch (error) {
      console.error("Logout failed:", error);
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive",
      });
    }
  }, [onLogout]);

  const handleRefreshNotifications = useCallback(async () => {
    try {
      await refreshNotifications();
      toast({
        title: "Refreshed",
        description: "Notifications have been refreshed",
      });
    } catch (error) {
      console.error("Failed to refresh notifications:", error);
      toast({
        title: "Error",
        description: "Failed to refresh notifications",
        variant: "destructive",
      });
    }
  }, [refreshNotifications]);

  const totalUnreadCount = useMemo(() => {
    return Object.values(notificationCounts).reduce(
      (sum, count) => sum + count,
      0
    );
  }, [notificationCounts]);

  // Determine active page from location
  const activePage = useMemo(() => {
    if (location.pathname === "/") return "overview";
    if (location.pathname.startsWith("/requirements")) return "requirements";
    if (location.pathname === "/messages") return "messages";
    return "overview";
  }, [location.pathname]);

  // Calculate unread messages count for requirements
  const unreadMessagesCount = useMemo(() => {
    // Use the same calculation as totalUnreadCount for consistency
    return Object.values(notificationCounts).reduce(
      (sum, count) => sum + count,
      0
    );
  }, [notificationCounts]);

  console.log({ 
    unreadMessagesCount, 
    totalUnreadCount, 
    notificationCounts,
    requirementsCount: requirements.length,
    hasNewMessage,
    connected
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-red-900 flex items-center justify-center relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 animated-gradient opacity-10"></div>

        <div className="text-center relative z-10">
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-transparent border-t-purple-400 border-r-red-400 mx-auto"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-pink-400 border-r-purple-400 animate-ping"></div>
          </div>
          <p className="text-2xl font-bold text-white font-space-grotesk">
            Loading admin dashboard...
          </p>
          <p className="mt-2 text-slate-300">Preparing your command center</p>
          {error && (
            <div className="mt-6 glass p-4 border border-red-400/30 rounded-xl text-red-200 max-w-md mx-auto">
              {error}
              <button
                onClick={() => window.location.reload()}
                className="ml-2 text-red-300 underline hover:no-underline"
              >
                Refresh Page
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-red-900 relative overflow-hidden">
      {/* Animated background particles */}
      <div className="absolute inset-0 animated-gradient opacity-5"></div>

      <AdminDashboardHeader
        onLogout={handleLogout}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      <div className="max-w-7xl mx-auto p-6 relative z-10">
        {(error || notificationError) && (
          <div className="mb-6 glass p-4 border border-red-400/30 rounded-xl text-red-200 animate-fade-in">
            {error || notificationError}
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-300 underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-6">
            <h1 className="text-3xl font-bold text-white font-space-grotesk">
              Admin Command Center
            </h1>
            <div className="flex items-center space-x-4">
              {/* Enhanced notification status indicator */}
              <div className="glass px-4 py-2 rounded-xl border border-white/10 flex items-center space-x-3">
                <Bell
                  className={`h-5 w-5 ${
                    hasNewMessage
                      ? "text-red-400 animate-pulse"
                      : "text-slate-400"
                  }`}
                />
                <span className="text-sm text-slate-200 font-medium">
                  {totalUnreadCount > 0
                    ? `${totalUnreadCount} unread`
                    : "No new messages"}
                </span>
                <div
                  className={`w-3 h-3 rounded-full ${
                    connected
                      ? "bg-green-400 pulse-neon"
                      : "bg-orange-400 animate-pulse"
                  }`}
                  title={connected ? "Connected" : "Reconnecting..."}
                />
              </div>

              <Button
                onClick={handleRefreshNotifications}
                variant="outline"
                size="sm"
                className="glass border-white/20 text-slate-200 hover:bg-white/10 hover:text-white hover:border-white/30 transition-all duration-300 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
                <Bell className="h-4 w-4 mr-2 relative z-10" />
                <span className="relative z-10">Refresh Notifications</span>
              </Button>

              <Button
                onClick={handleRefresh}
                disabled={refreshing}
                variant="outline"
                size="sm"
                className="glass border-white/20 text-slate-200 hover:bg-white/10 hover:text-white hover:border-white/30 transition-all duration-300 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
                <RefreshCw
                  className={`h-4 w-4 mr-2 relative z-10 ${
                    refreshing ? "animate-spin" : ""
                  }`}
                />
                <span className="relative z-10">
                  {refreshing ? "Refreshing..." : "Refresh"}
                </span>
              </Button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="glass bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl p-2 mb-8">
          <div className="flex items-center space-x-2">
            <Button
              variant={activePage === "overview" ? "default" : "ghost"}
              onClick={() => navigate("/")}
              className={`flex items-center space-x-2 ${
                activePage === "overview"
                  ? "bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-xl"
                  : "text-slate-200 hover:text-white hover:bg-white/10"
              } rounded-xl transition-all duration-300 font-medium`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Overview</span>
            </Button>
            <Button
              variant={activePage === "requirements" ? "default" : "ghost"}
              onClick={() => navigate("/requirements")}
              className={`flex items-center space-x-2 ${
                activePage === "requirements"
                  ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-xl"
                  : "text-slate-200 hover:text-white hover:bg-white/10"
              } rounded-xl transition-all duration-300 font-medium`}
            >
              <Users className="h-4 w-4" />
              <span>Requirements</span>
            </Button>
            <Button
              variant={activePage === "messages" ? "default" : "ghost"}
              onClick={() => navigate("/messages")}
              className={`flex items-center space-x-2 relative ${
                activePage === "messages"
                  ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-xl"
                  : "text-slate-200 hover:text-white hover:bg-white/10"
              } rounded-xl transition-all duration-300 font-medium ${
                unreadMessagesCount > 0 ? "notification-badge-bounce" : ""
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              <span>Messages</span>
              {unreadMessagesCount > 0 && (
                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center notification-badge">
                  {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
                </div>
              )}
            </Button>
          </div>
        </div>

        {/* Page Content */}
        <div className="space-y-8">
          {activePage === "overview" && (
            <AdminOverviewPage
              requirements={requirements}
              statusCounts={statusCounts}
              onChatClick={handleChatClick}
              onDownloadAttachment={handleDownloadAttachment}
              onRefresh={handleRefresh}
            />
          )}

          {activePage === "requirements" && (
            <AdminRequirementsPage
              requirements={requirements}
              statusCounts={statusCounts}
              onChatClick={handleChatClick}
              onDownloadAttachment={handleDownloadAttachment}
              onRefresh={handleRefresh}
              onApprovalUpdate={handleApprovalUpdate}
            />
          )}

          {activePage === "messages" && (
            <MessagesPage
              requirements={requirements}
              onChatClick={handleChatClick}
              onDownloadAttachment={handleDownloadAttachment}
              onRefresh={handleRefresh}
              onApprovalUpdate={handleApprovalUpdate}
            />
          )}
        </div>

        <ChatModal
          isOpen={!!selectedRequirement}
          onClose={handleCloseChatModal}
          requirementId={selectedRequirement?.id || ""}
          requirementTitle={selectedRequirement?.title || ""}
          currentUserName="Admin"
          onMarkAsRead={markAsRead}
        />
      </div>
    </div>
  );
};
