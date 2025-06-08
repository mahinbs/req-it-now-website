
import React, { useState, useEffect } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignupForm } from '@/components/auth/SignupForm';
import { UserDashboard } from '@/components/user/UserDashboard';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import { toast } from '@/hooks/use-toast';

interface UserProfile {
  id: string;
  company_name: string;
  website_url: string;
  isAdmin?: boolean;
}

export const RequirementsManagement = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    console.log('Setting up authentication listeners...');

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event, session?.user?.email);
      
      if (!mounted) return;
      
      if (session?.user) {
        setUser(session.user);
        setError(null);
        await fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    // Check for existing session
    const getInitialSession = async () => {
      try {
        console.log('Checking for existing session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          setError(error.message);
          setLoading(false);
          return;
        }

        if (!session?.user && mounted) {
          console.log('No existing session found');
          setLoading(false);
        }
        // If session exists, onAuthStateChange will handle it
      } catch (err) {
        console.error('Initial session check failed:', err);
        setError('Failed to check authentication status');
        setLoading(false);
      }
    };

    getInitialSession();

    return () => {
      console.log('Cleaning up authentication listeners');
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log('Fetching profile for user:', userId);
      setError(null);
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Profile error:', profileError);
        throw profileError;
      }

      if (!profile) {
        console.log('No profile found, creating default profile');
        await createDefaultProfile(userId);
        return;
      }

      // Check admin status
      let isAdmin = false;
      try {
        const { data: adminCheck, error: adminError } = await supabase.rpc('is_admin', { user_id: userId });
        
        if (adminError) {
          console.warn('Admin check failed, defaulting to false:', adminError);
          isAdmin = false;
        } else {
          isAdmin = adminCheck || false;
        }
      } catch (adminCheckError) {
        console.warn('Admin check error, defaulting to false:', adminCheckError);
        isAdmin = false;
      }

      console.log('Profile loaded:', profile.company_name, isAdmin ? '(Admin)' : '(User)');
      
      setUserProfile({
        ...profile,
        isAdmin
      });

    } catch (error) {
      console.error('Error fetching user profile:', error);
      await createDefaultProfile(userId);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultProfile = async (userId: string) => {
    try {
      console.log('Creating default profile for user:', userId);
      
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const metadata = currentUser?.user_metadata || {};
      
      const defaultProfile = {
        id: userId,
        company_name: metadata.company_name || 'My Company',
        website_url: metadata.website_url || 'https://example.com'
      };

      const { error } = await supabase
        .from('profiles')
        .insert([defaultProfile]);

      if (error) {
        console.error('Error creating default profile:', error);
      } else {
        console.log('Default profile created successfully');
      }

      setUserProfile({
        ...defaultProfile,
        isAdmin: false
      });
    } catch (error) {
      console.error('Error in createDefaultProfile:', error);
      setUserProfile({
        id: userId,
        company_name: 'My Company',
        website_url: 'https://example.com',
        isAdmin: false
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (email: string, password: string) => {
    try {
      setError(null);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      console.log('Login successful');
      
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message);
      throw error;
    }
  };

  const handleSignup = async (userData: {
    email: string;
    password: string;
    companyName: string;
    websiteUrl: string;
  }) => {
    try {
      console.log('Starting signup for:', userData.email);
      setError(null);
      
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            company_name: userData.companyName,
            website_url: userData.websiteUrl || ''
          }
        }
      });
      
      if (error) {
        console.error('Signup error:', error);
        setError(error.message);
        throw error;
      }
      
      console.log('Signup response:', data);
      
      if (data.user) {
        console.log('User created successfully!');
        toast({
          title: "Account created!",
          description: "You can now submit website requirements.",
        });
      }
      
    } catch (error: any) {
      console.error('Signup error:', error);
      setError(error.message);
      throw error;
    }
  };

  const handleLogout = async () => {
    try {
      console.log('Starting logout...');
      setLoading(true);
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error);
        throw error;
      }
      
      console.log('Logout successful');
      // Clear all state
      setUserProfile(null);
      setUser(null);
      setError(null);
      
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
      
    } catch (error: any) {
      console.error('Logout error:', error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
          {error && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (user && userProfile) {
    if (userProfile.isAdmin) {
      return <AdminDashboard />;
    } else {
      return <UserDashboard user={userProfile} onLogout={handleLogout} />;
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Website Requirements
          </h1>
          <p className="text-gray-600">
            Manage your website changes and requirements efficiently
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
            {error}
          </div>
        )}

        {authMode === 'login' ? (
          <LoginForm
            onLogin={handleLogin}
            onSwitchToSignup={() => setAuthMode('signup')}
          />
        ) : (
          <SignupForm
            onSignup={handleSignup}
            onSwitchToLogin={() => setAuthMode('login')}
          />
        )}

        <div className="mt-6 text-center text-sm text-gray-600">
          <p className="text-green-600 font-medium">✅ Ready to submit requirements!</p>
          <p>Create your account and start submitting website changes</p>
        </div>
      </div>
    </div>
  );
};
