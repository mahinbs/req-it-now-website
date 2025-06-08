
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';

interface LoginFormProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onSwitchToSignup: () => void;
  loading?: boolean;
  error?: string | null;
}

export const LoginForm = ({ onLogin, onSwitchToSignup, loading = false, error }: LoginFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      return;
    }
    await onLogin(email.trim(), password);
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader className="text-center pb-6 space-y-2">
        <CardTitle className="text-2xl font-bold text-slate-900">Welcome Back</CardTitle>
        <CardDescription className="text-slate-600">
          Sign in to your account to continue
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-5" autoComplete="on">
          
          <div className="space-y-2">
            <Label htmlFor="login-email" className="text-slate-700 font-medium text-sm">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                id="login-email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="pl-10 h-12 border-slate-300 focus:border-blue-500 focus:ring-blue-500 rounded-xl transition-all duration-200 hover:border-slate-400"
                required
                autoComplete="username email"
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="login-password" className="text-slate-700 font-medium text-sm">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="pl-10 pr-10 h-12 border-slate-300 focus:border-blue-500 focus:ring-blue-500 rounded-xl transition-all duration-200 hover:border-slate-400"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors duration-200"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-3 h-12 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
            disabled={loading || !email.trim() || !password.trim()}
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Signing in...</span>
              </div>
            ) : (
              'Sign In'
            )}
          </Button>

          <div className="text-center text-sm text-gray-600 pt-4 border-t border-slate-200">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToSignup}
              className="text-blue-600 hover:text-blue-700 font-medium underline hover:no-underline transition-colors duration-200"
            >
              Sign up here
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
