
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface LoginFormProps {
  onLogin: (email: string, password: string) => void;
  onSwitchToSignup: () => void;
}

const getAuthErrorMessage = (error: any) => {
  console.log('Auth error details:', error);
  
  if (!error) return "An unexpected error occurred";
  
  const message = error.message?.toLowerCase() || '';
  
  if (message.includes('invalid login credentials') || message.includes('invalid credentials')) {
    return "Invalid email or password. Please check your credentials and try again.";
  }
  if (message.includes('email not confirmed')) {
    return "Please check your email and click the confirmation link before signing in.";
  }
  if (message.includes('too many requests')) {
    return "Too many login attempts. Please wait a few minutes before trying again.";
  }
  if (message.includes('network') || message.includes('fetch')) {
    return "Network connection error. Please check your internet connection and try again.";
  }
  if (message.includes('user not found')) {
    return "No account found with this email address. Please sign up first.";
  }
  
  return error.message || "Login failed. Please try again.";
};

export const LoginForm = ({ onLogin, onSwitchToSignup }: LoginFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Login attempt for email:', email);
    
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Calling onLogin...');
      await onLogin(email, password);
      console.log('Login successful');
      toast({
        title: "Success",
        description: "Logged in successfully!"
      });
    } catch (authError: any) {
      console.error('Login error:', authError);
      const errorMessage = getAuthErrorMessage(authError);
      setError(errorMessage);
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Welcome back</CardTitle>
        <CardDescription className="text-center">
          Sign in to manage your website requirements
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
          {error && (
            <div className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="user-email">Email</Label>
            <Input
              id="user-email"
              name="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-password">Password</Label>
            <div className="relative">
              <Input
                id="user-password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
        <div className="mt-4 text-center">
          <span className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Button variant="link" className="p-0" onClick={onSwitchToSignup} disabled={isLoading}>
              Sign up
            </Button>
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
