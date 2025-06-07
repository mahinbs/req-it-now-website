
import React, { useState, useEffect } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignupForm } from '@/components/auth/SignupForm';
import { UserDashboard } from '@/components/user/UserDashboard';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

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

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event, session?.user?.email);
      
      if (session?.user) {
        setUser(session.user);
        // Fetch user profile after auth state change
        await fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    // Check for existing session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await fetchUserProfile(session.user.id);
      }
      setLoading(false);
    };

    getSession();

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log('Fetching profile for user:', userId);
      
      // First, try to fetch the user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Profile error:', profileError);
        // If profile doesn't exist, create a default one
        if (profileError.code === 'PGRST116') {
          console.log('Profile not found, creating default profile');
          await createDefaultProfile(userId);
          return;
        }
        throw profileError;
      }

      if (!profile) {
        console.log('No profile found, creating default profile');
        await createDefaultProfile(userId);
        return;
      }

      // Check if user is admin using the new security definer function
      let isAdmin = false;
      try {
        const { data: adminCheck, error: adminError } = await supabase
          .rpc('is_admin', { user_id: userId });

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
      // Create a fallback profile so user can still access the dashboard
      await createDefaultProfile(userId);
    }
  };

  const createDefaultProfile = async (userId: string) => {
    try {
      console.log('Creating default profile for user:', userId);
      
      // Get user metadata if available
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
        // Still set a basic profile so user can access dashboard
        setUserProfile({
          ...defaultProfile,
          isAdmin: false
        });
      } else {
        console.log('Default profile created successfully');
        setUserProfile({
          ...defaultProfile,
          isAdmin: false
        });
      }
    } catch (error) {
      console.error('Error in createDefaultProfile:', error);
      // Last resort: set a minimal profile
      setUserProfile({
        id: userId,
        company_name: 'My Company',
        website_url: 'https://example.com',
        isAdmin: false
      });
    }
  };

  const handleLogin = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      console.log('Login successful');
      
    } catch (error) {
      console.error('Login error:', error);
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
      
      // Sign up with automatic email confirmation disabled
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
        throw error;
      }
      
      console.log('Signup response:', data);
      
      if (data.user) {
        console.log('User created successfully! User will be logged in automatically.');
      }
      
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      console.log('Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
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
          <p className="text-green-600 font-medium">✅ Instant signup - no email verification!</p>
          <p>Create your account and start using the app immediately</p>
        </div>
      </div>
    </div>
  );
};
