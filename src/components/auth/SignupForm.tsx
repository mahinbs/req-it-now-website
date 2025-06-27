
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Mail, Lock, Building, Globe } from 'lucide-react';

interface SignupFormProps {
  onSignup: (userData: {
    email: string;
    password: string;
    companyName: string;
    websiteUrl: string;
  }) => Promise<void>;
  onSwitchToLogin: () => void;
  loading?: boolean;
  error?: string | null;
}

export const SignupForm = ({ onSignup, onSwitchToLogin, loading = false, error }: SignupFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || !companyName.trim() || !websiteUrl.trim()) {
      return;
    }
    await onSignup({
      email: email.trim(),
      password,
      companyName: companyName.trim(),
      websiteUrl: websiteUrl.trim()
    });
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-2xl border-0 bg-gradient-to-br from-slate-800/95 to-slate-700/95 backdrop-blur-xl border-white/20">
      <CardHeader className="text-center pb-6 space-y-2">
        <CardTitle className="text-2xl font-bold text-white">Create Account</CardTitle>
        <CardDescription className="text-slate-200">
          Sign up to start managing your website requirements
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-5" autoComplete="on">
          
          <div className="space-y-2">
            <Label htmlFor="signup-email" className="text-slate-200 font-medium text-sm">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                id="signup-email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="pl-10 h-12 border-slate-600 bg-slate-800/50 text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500 rounded-xl transition-all duration-200 hover:border-slate-500"
                required
                autoComplete="username email"
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-password" className="text-slate-200 font-medium text-sm">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                id="signup-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a secure password"
                className="pl-10 pr-10 h-12 border-slate-600 bg-slate-800/50 text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500 rounded-xl transition-all duration-200 hover:border-slate-500"
                required
                autoComplete="new-password"
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors duration-200"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-company" className="text-slate-200 font-medium text-sm">
              Company Name
            </Label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                id="signup-company"
                name="company"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Your company name"
                className="pl-10 h-12 border-slate-600 bg-slate-800/50 text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500 rounded-xl transition-all duration-200 hover:border-slate-500"
                required
                autoComplete="organization"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-website" className="text-slate-200 font-medium text-sm">
              Website URL
            </Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                id="signup-website"
                name="website"
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://example.com"
                className="pl-10 h-12 border-slate-600 bg-slate-800/50 text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500 rounded-xl transition-all duration-200 hover:border-slate-500"
                required
                autoComplete="url"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-3 h-12 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
            disabled={loading || !email.trim() || !password.trim() || !companyName.trim() || !websiteUrl.trim()}
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Creating account...</span>
              </div>
            ) : (
              'Create Account'
            )}
          </Button>

          <div className="text-center text-sm text-slate-300 pt-4 border-t border-slate-600">
            Already have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-blue-400 hover:text-blue-300 font-medium underline hover:no-underline transition-colors duration-200"
            >
              Sign in here
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
