
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, MessageCircle, ArrowLeft, Home } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';
import type { Tables } from '@/integrations/supabase/types';

type Requirement = Tables<'requirements'>;

const rejectionReasons = [
  'Not as per requirements', 
  'Quality issues', 
  'Missing functionality', 
  'Design concerns', 
  'Performance issues', 
  'Other (please specify)'
];

export const RejectRequirementPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [requirement, setRequirement] = useState<Requirement | null>(null);
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRequirement = async () => {
      if (!id) {
        navigate('/');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('requirements')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          console.error('Error fetching requirement:', error);
          toast({
            title: "Error",
            description: "Failed to load requirement details.",
            variant: "destructive"
          });
          navigate('/');
          return;
        }

        setRequirement(data);
      } catch (error) {
        console.error('Error:', error);
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequirement();
  }, [id, navigate]);

  const handleReject = async () => {
    if (!requirement) return;

    const finalReason = selectedReason === 'Other (please specify)' ? customReason : selectedReason;
    
    if (!finalReason.trim()) {
      toast({
        title: "Please select a reason",
        description: "A rejection reason is required to help us improve.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsRejecting(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('You must be logged in to reject requirements');
      }

      const { error } = await supabase
        .from('requirements')
        .update({
          rejected_by_client: true,
          rejection_reason: finalReason,
          status: 'rejected_by_client'
        })
        .eq('id', requirement.id);

      if (error) {
        console.error('Error rejecting requirement:', error);
        throw error;
      }

      toast({
        title: "Requirement Rejected",
        description: "Your feedback has been sent to the admin team. They will review and respond."
      });

      navigate('/');
    } catch (error) {
      console.error('Error rejecting requirement:', error);
      toast({
        title: "Error",
        description: "Failed to reject requirement. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRejecting(false);
    }
  };

  const handleCancel = () => {
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!requirement) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-xl font-semibold mb-4">Requirement not found</h1>
          <Button onClick={() => navigate('/')} variant="outline">
            <Home className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Breadcrumb Navigation */}
        <div className="mb-6">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink 
                  onClick={() => navigate('/')}
                  className="text-slate-300 hover:text-white cursor-pointer"
                >
                  Dashboard
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-slate-500" />
              <BreadcrumbPage className="text-white">
                Reject Requirement
              </BreadcrumbPage>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-6 w-6 text-red-400" />
            <h1 className="text-2xl font-bold">Reject Requirement</h1>
          </div>
          <Button 
            variant="ghost" 
            onClick={handleCancel}
            className="text-slate-300 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        <div className="space-y-6">
          {/* Requirement Summary */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-100">Requirement Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="font-medium text-slate-300">Title:</span> 
                <span className="text-white ml-2">{requirement.title}</span>
              </div>
              <div>
                <span className="font-medium text-slate-300">Description:</span>
                <p className="mt-1 text-sm text-slate-400">{requirement.description}</p>
              </div>
            </CardContent>
          </Card>

          {/* Rejection Form */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-slate-100">Rejection Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Rejection Reasons */}
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-200">Please select a reason for rejection:</h3>
                <div className="grid gap-3">
                  {rejectionReasons.map(reason => (
                    <label key={reason} className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg hover:bg-slate-700/50 border border-transparent hover:border-slate-600">
                      <input 
                        type="radio" 
                        name="rejectionReason" 
                        value={reason}
                        checked={selectedReason === reason}
                        onChange={(e) => setSelectedReason(e.target.value)}
                        className="text-red-500" 
                      />
                      <span className="text-sm text-slate-300">{reason}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Custom Reason Input */}
              {selectedReason === 'Other (please specify)' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">
                    Please specify the reason:
                  </label>
                  <Textarea 
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Please describe the specific issues you found..."
                    className="min-h-[120px] bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                  />
                </div>
              )}

              {/* Communication Note */}
              <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <MessageCircle className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-blue-300 mb-2">Next Steps</h3>
                    <p className="text-sm text-blue-200">
                      After rejection, our admin team will review your feedback and either:
                      <br />• Make the necessary revisions
                      <br />• Contact you via chat for clarification
                      <br />• Provide an updated version for review
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-4 pt-4 border-t border-slate-700">
                <Button 
                  variant="outline" 
                  onClick={handleCancel} 
                  disabled={isRejecting}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleReject} 
                  disabled={isRejecting || !selectedReason} 
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isRejecting ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Rejecting...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Confirm Rejection</span>
                    </div>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
