
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
    let sessionCheckAttempts = 0;
    const maxSessionCheckAttempts = 3;

    console.log('Setting up enhanced authentication listeners...');

    const initializeAuth = async () => {
      try {
        // Enhanced session checking with retry logic
        const checkSession = async (): Promise<boolean> => {
          try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError) {
              console.error('Session error:', sessionError);
              if (sessionCheckAttempts < maxSessionCheckAttempts) {
                sessionCheckAttempts++;
                console.log(`Retrying session check (${sessionCheckAttempts}/${maxSessionCheckAttempts})`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                return checkSession();
              }
              throw sessionError;
            }

            if (session?.user && mounted) {
              console.log('✅ Existing session found:', session.user.email);
              setUser(session.user);
              await fetchUserProfile(session.user.id);
              return true;
            } else {
              console.log('No existing session found');
              if (mounted) {
                setLoading(false);
              }
              return false;
            }
          } catch (error) {
            console.error('Session check failed:', error);
            return false;
          }
        };

        await checkSession();

        // Enhanced auth state listener with better error handling
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('🔄 Auth event:', event, session?.user?.email);
          
          if (!mounted) return;
          
          try {
            if (session?.user) {
              setUser(session.user);
              setError(null);
              await fetchUserProfile(session.user.id);
              
              // Enhanced success feedback
              if (event === 'SIGNED_IN') {
                toast({
                  title: "✅ Welcome back!",
                  description: "You have been successfully signed in.",
                  className: "bg-green-50 border-green-200 text-green-800"
                });
              }
            } else {
              // User logged out or session expired
              setUser(null);
              setUserProfile(null);
              if (mounted) {
                setLoading(false);
              }
              
              if (event === 'SIGNED_OUT') {
                toast({
                  title: "👋 Signed out",
                  description: "You have been successfully signed out.",
                  className: "bg-blue-50 border-blue-200 text-blue-800"
                });
              }
            }
          } catch (profileError) {
            console.error('Profile fetch error in auth change:', profileError);
            setError('Failed to load user profile');
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
      console.log('Cleaning up enhanced authentication listeners');
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

      // Check admin status with enhanced error handling
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

      console.log('✅ Profile loaded:', profile.company_name, isAdmin ? '(Admin)' : '(User)');
      
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
        console.log('✅ Default profile created successfully');
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
      console.log('✅ Login successful');
      
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.message || 'Login failed. Please try again.';
      setError(errorMessage);
      setLoading(false);
      
      toast({
        title: "❌ Login Failed",
        description: errorMessage,
        variant: "destructive"
      });
      
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
      console.log('Starting enhanced signup for:', userData.email);
      setError(null);
      setLoading(true);
      
      // Enhanced redirect URL for better compatibility
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            company_name: userData.companyName,
            website_url: userData.websiteUrl || ''
          },
          emailRedirectTo: redirectUrl
        }
      });
      
      if (error) {
        console.error('Signup error:', error);
        setError(error.message);
        throw error;
      }
      
      console.log('✅ Signup response:', data);
      
      if (data.user) {
        console.log('✅ User created successfully!');
        toast({
          title: "🎉 Account created!",
          description: "You can now submit website requirements.",
          className: "bg-green-50 border-green-200 text-green-800"
        });
      }
      
    } catch (error: any) {
      console.error('Signup error:', error);
      setError(error.message);
      setLoading(false);
      
      toast({
        title: "❌ Signup Failed",
        description: error.message || 'Failed to create account. Please try again.',
        variant: "destructive"
      });
      
      throw error;
    }
  };

  const handleLogout = async () => {
    try {
      console.log('Starting enhanced logout...');
      setLoading(true);
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error);
        throw error;
      }
      
      console.log('✅ Logout successful');
      
      // Clear state immediately
      setUser(null);
      setUserProfile(null);
      setError(null);
      setLoading(false);
      
    } catch (error: any) {
      console.error('Logout error:', error);
      setLoading(false);
      toast({
        title: "❌ Error",
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
