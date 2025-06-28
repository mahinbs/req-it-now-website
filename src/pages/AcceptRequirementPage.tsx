
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { CheckCircle2, X, Calendar, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import type { Tables } from '@/integrations/supabase/types';

type Requirement = Tables<'requirements'>;

export const AcceptRequirementPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [requirement, setRequirement] = useState<Requirement | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchRequirement();
    }
  }, [id]);

  const fetchRequirement = async () => {
    try {
      const { data, error } = await supabase
        .from('requirements')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      if (!data) {
        setError('Requirement not found');
        return;
      }

      // Check if user can accept this requirement
      if (!data.completed_by_admin || data.accepted_by_client || data.rejected_by_client) {
        setError('This requirement cannot be accepted at this time');
        return;
      }

      setRequirement(data);
    } catch (error) {
      console.error('Error fetching requirement:', error);
      setError('Failed to load requirement');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!requirement) return;

    try {
      setIsAccepting(true);
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('You must be logged in to accept requirements');
      }

      const { error } = await supabase
        .from('requirements')
        .update({
          accepted_by_client: true,
          acceptance_date: new Date().toISOString(),
          status: 'accepted_by_client'
        })
        .eq('id', requirement.id);

      if (error) {
        console.error('Error accepting requirement:', error);
        throw error;
      }

      toast({
        title: "✅ Requirement Accepted",
        description: "You have successfully accepted this requirement. Our team will proceed with implementation.",
        className: "bg-green-50 border-green-200 text-green-800"
      });

      navigate('/');
    } catch (error) {
      console.error('Error accepting requirement:', error);
      toast({
        title: "❌ Error",
        description: "Failed to accept requirement. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAccepting(false);
    }
  };

  const handleCancel = () => {
    navigate('/');
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (error || !requirement) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <div className="max-w-2xl mx-auto pt-8">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-red-800 mb-2">Unable to Load Requirement</h2>
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={() => navigate('/')} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto pt-6">
        {/* Breadcrumb Navigation */}
        <div className="mb-6">
          <Breadcrumb>
            <BreadcrumbList className="text-slate-300">
              <BreadcrumbItem>
                <Button
                  variant="ghost"
                  onClick={() => navigate('/')}
                  className="text-slate-300 hover:text-white p-0 h-auto"
                >
                  Dashboard
                </Button>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-slate-500" />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-slate-100 font-medium">
                  Accept Requirement
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <CheckCircle2 className="h-8 w-8 text-green-400" />
            <h1 className="text-3xl font-bold text-white">Accept & Confirm Requirement</h1>
          </div>
          <p className="text-slate-300">
            Review the completed requirement and confirm your acceptance to proceed with implementation.
          </p>
        </div>

        <div className="space-y-6">
          {/* Requirement Summary */}
          <Card className="border-green-200 bg-green-50 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
              <CardTitle className="flex items-center space-x-2 text-green-800">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span>Approved Requirement</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex flex-col space-y-1">
                  <span className="font-medium text-green-700">Title:</span>
                  <span className="text-green-800 bg-white/50 px-3 py-2 rounded-lg">{requirement.title}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="font-medium text-green-700">Priority:</span>
                  <span className="text-green-800 bg-white/50 px-3 py-2 rounded-lg capitalize">{requirement.priority}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <span className="font-medium text-green-700">Description:</span>
                  <p className="text-green-800 bg-white/50 px-3 py-2 rounded-lg text-sm leading-relaxed">{requirement.description}</p>
                </div>
                {requirement.approval_date && (
                  <div className="flex items-center space-x-2 text-sm text-green-700 bg-white/50 px-3 py-2 rounded-lg">
                    <Calendar className="h-4 w-4" />
                    <span>Approved on: {new Date(requirement.approval_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Terms & Timeline */}
          <Card className="border-blue-200 bg-blue-50 shadow-lg">
            <CardContent className="p-6">
              <h3 className="font-semibold text-blue-800 mb-4 flex items-center">
                📋 Terms & Timeline
              </h3>
              <div className="space-y-3 text-sm text-blue-700">
                <p className="flex items-start">
                  <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Implementation will begin within 1-2 business days after acceptance
                </p>
                <p className="flex items-start">
                  <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  You will receive regular updates on progress through our chat system
                </p>
                <p className="flex items-start">
                  <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Timeline may vary based on requirement complexity and priority
                </p>
                <p className="flex items-start">
                  <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Any changes to the approved requirement may affect timeline and cost
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Confirmation Warning */}
          <Card className="border-amber-200 bg-amber-50 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-amber-800 mb-2">Important Notice</h3>
                  <p className="text-sm text-amber-700 leading-relaxed">
                    By clicking "Confirm Acceptance" below, you acknowledge that you have reviewed 
                    and agree to proceed with this requirement as approved. Our team will be 
                    notified to begin implementation.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card className="border-slate-200 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-end space-x-3">
                <Button 
                  variant="outline" 
                  onClick={handleCancel} 
                  disabled={isAccepting}
                  className="bg-slate-100 hover:bg-slate-200"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button 
                  onClick={handleAccept} 
                  disabled={isAccepting} 
                  className="bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  {isAccepting ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Confirming...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Confirm Acceptance</span>
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
