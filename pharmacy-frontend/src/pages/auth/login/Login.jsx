import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../stores/authStore';
import { Mail, Lock, LogIn, Eye, EyeOff, Pill, Heart, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../services/api';

const Login = () => {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Load saved email if "Remember Me" was checked
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    const savedRememberMe = localStorage.getItem('rememberMe') === 'true';
    if (savedRememberMe && savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(email, password);
    if (result.success) {
      // Handle "Remember Me" functionality
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberMe');
      }
      toast.success('Login successful!');
      navigate('/dashboard');
    } else {
      toast.error(result.error);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error('Please enter your email address');
      return;
    }
    
    setResetLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', { email: resetEmail });
      if (response.data.success) {
        setResetSent(true);
        toast.success('Password reset link sent to your email!');
      } else {
        toast.error(response.data.message || 'Failed to send reset link');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send reset link');
    } finally {
      setResetLoading(false);
    }
  };

  const handleResendResetLink = async () => {
    setResetLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', { email: resetEmail });
      if (response.data.success) {
        toast.success('Reset link resent! Check your email.');
      } else {
        toast.error(response.data.message || 'Failed to resend reset link');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resend reset link');
    } finally {
      setResetLoading(false);
    }
  };

  // Forgot Password Modal
  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl shadow-xl mb-4">
              <Pill className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold gradient-text">Reset Password</h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {resetSent ? 'Check your email' : 'Enter your email to reset password'}
            </p>
          </div>

          <div className="glass-morphism rounded-2xl shadow-2xl p-8 backdrop-blur-xl">
            {!resetSent ? (
              <form onSubmit={handleForgotPassword}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email Address
                    </label>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 w-5 h-5 transition-colors duration-200" />
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                        placeholder="Enter your email address"
                        required
                        autoFocus
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      We'll send you a link to reset your password
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    {resetLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Sending...</span>
                      </div>
                    ) : (
                      <>
                        <Mail className="w-5 h-5" />
                        <span>Send Reset Link</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="w-full flex items-center justify-center gap-2 py-3 text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Login</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <Mail className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Check Your Email
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  We've sent a password reset link to:
                </p>
                <p className="font-medium text-primary-600">{resetEmail}</p>
                <p className="text-sm text-gray-500">
                  Click the link in the email to reset your password. The link will expire in 1 hour.
                </p>
                <div className="pt-4 space-y-3">
                  <button
                    onClick={handleResendResetLink}
                    disabled={resetLoading}
                    className="w-full text-primary-600 hover:text-primary-700 text-sm font-medium transition-colors"
                  >
                    {resetLoading ? 'Sending...' : 'Resend Email'}
                  </button>
                  <button
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetSent(false);
                      setResetEmail('');
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 text-sm text-gray-600 dark:text-gray-400 hover:text-primary-600 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Login</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Logo & Brand Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl shadow-xl mb-4 animate-float">
            <Pill className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold gradient-text">Welcome Back</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Sign in to your account</p>
        </div>
        
        {/* Login Card */}
        <div className="glass-morphism rounded-2xl shadow-2xl p-8 backdrop-blur-xl">
          <form className="mt-4 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 w-5 h-5 transition-colors duration-200" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 hover:border-primary-300"
                    placeholder="admin@pharmacy.com"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 w-5 h-5 transition-colors duration-200" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200 hover:border-primary-300"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-primary-500 transition-colors duration-200"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                />
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400 group-hover:text-primary-600 transition-colors">
                  Remember me
                </span>
              </label>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-primary-600 hover:text-primary-500 font-medium transition-colors"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Sign in</span>
                </>
              )}
            </button>

            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Don't have an account?{' '}
                <Link to="/register" className="text-primary-600 hover:text-primary-500 font-medium transition-colors">
                  Create an account
                </Link>
              </p>
            </div>

            
            <div className="mt-6 p-4 bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 rounded-xl border border-primary-100 dark:border-primary-800">
              <div className="flex items-center gap-2 mb-2">
  
              </div>
    
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;