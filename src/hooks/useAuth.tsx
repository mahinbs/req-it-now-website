
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import { toast } from '@/hooks/use-toast';

interface UserProfile {
  id: string;
  company_name: string;
  website_url: string;
  isAdmin?: boolean;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let authSubscription: any = null;

    console.log('Setting up authentication listeners...');

    const initializeAuth = async () => {
      try {
        // Check for existing session first
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          throw sessionError;
        }

        if (session?.user && mounted) {
          console.log('Existing session found:', session.user.email);
          setUser(session.user);
          await fetchUserProfile(session.user.id);
        } else {
          console.log('No existing session found');
          if (mounted) {
            setLoading(false);
          }
        }

        // Set up auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('Auth event:', event, session?.user?.email);
          
          if (!mounted) return;
          
          if (session?.user) {
            setUser(session.user);
            setError(null);
            try {
              await fetchUserProfile(session.user.id);
            } catch (profileError) {
              console.error('Profile fetch error:', profileError);
              setError('Failed to load user profile');
              if (mounted) {
                setLoading(false);
              }
            }
          } else {
            // User logged out
            setUser(null);
            setUserProfile(null);
            if (mounted) {
              setLoading(false);
            }
          }
        });

        authSubscription = subscription;

      } catch (err) {
        console.error('Auth initialization failed:', err);
        if (mounted) {
          setError('Failed to check authentication status');
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      console.log('Cleaning up authentication listeners');
      mounted = false;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
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
      setLoading(true);
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      console.log('Login successful');
      
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message);
      setLoading(false);
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
      setLoading(true);
      
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
      setLoading(false);
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
      
      // Clear state immediately
      setUser(null);
      setUserProfile(null);
      setError(null);
      setLoading(false);
      
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
      
    } catch (error: any) {
      console.error('Logout error:', error);
      setLoading(false);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  };

  return {
    user,
    userProfile,
    loading,
    error,
    setError,
    handleLogin,
    handleSignup,
    handleLogout
  };
};
