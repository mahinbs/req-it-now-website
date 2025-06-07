
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
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event, session?.user?.email);
      
      if (session?.user) {
        setUser(session.user);
        // Fetch user profile after auth state change
        setTimeout(() => {
          fetchUserProfile(session.user.id);
        }, 0);
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
      
      // Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
        return;
      }

      // Check if user is admin
      const { data: adminCheck } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', userId)
        .single();

      if (profile) {
        setUserProfile({
          ...profile,
          isAdmin: !!adminCheck
        });
        console.log('Profile loaded:', profile.company_name, adminCheck ? '(Admin)' : '(User)');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
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
      // Sign up the user without email confirmation
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            company_name: userData.companyName,
            website_url: userData.websiteUrl
          },
          emailRedirectTo: undefined // Disable email confirmation
        }
      });
      
      if (error) throw error;
      
      console.log('Signup successful for:', userData.email);
      
      // If signup was successful and we have a user, they should be logged in automatically
      if (data.user && !data.user.email_confirmed_at) {
        console.log('User created and logged in automatically');
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
          <p>Simple signup - no email confirmation needed!</p>
          <p>Just create an account and start using the app immediately</p>
        </div>
      </div>
    </div>
  );
};
