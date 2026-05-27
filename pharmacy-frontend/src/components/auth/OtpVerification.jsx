import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowRight, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const OtpVerification = ({ email, userId, onBack }) => {
  const navigate = useNavigate();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timer, setTimer] = useState(300); // 5 minutes = 300 seconds
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    // Start countdown timer
    if (timer > 0 && !canResend) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else if (timer === 0 && !canResend) {
      setCanResend(true);
    }
  }, [timer, canResend]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    
    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      toast.error('Please enter the 6-digit verification code');
      return;
    }
    
    setLoading(true);
    try {
      const response = await api.post('/auth/verify-otp', {
        email,
        otpCode
      });
      
      if (response.data.success) {
        // Save token and user data
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        toast.success('Email verified successfully!');
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      toast.error(error.response?.data?.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResendLoading(true);
    try {
      const response = await api.post('/auth/resend-otp', { email });
      
      if (response.data.success) {
        toast.success('New verification code sent to your email');
        setTimer(300);
        setCanResend(false);
        setOtp(['', '', '', '', '', '']);
      }
    } catch (error) {
      console.error('Resend OTP error:', error);
      toast.error(error.response?.data?.message || 'Failed to resend code');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="glass-morphism rounded-2xl p-8 shadow-2xl">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg mb-4">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold gradient-text">Verify Your Email</h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              We've sent a verification code to
            </p>
            <p className="text-blue-600 font-semibold mt-1">{email}</p>
          </div>
          
          <div className="mt-8 space-y-6">
            <div>
              <label className="block text-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                Enter 6-digit verification code
              </label>
              <div className="flex justify-center gap-3">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-12 h-12 text-center text-xl font-bold rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    autoFocus={index === 0}
                  />
                ))}
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-500">
                {!canResend ? (
                  <>Code expires in <span className="font-semibold text-blue-600">{formatTime(timer)}</span></>
                ) : (
                  <span className="text-green-600">Ready to request new code</span>
                )}
              </p>
            </div>

            <button
              onClick={handleVerify}
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Verifying...
                </div>
              ) : (
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Verify & Continue
                </div>
              )}
            </button>

            <div className="flex justify-between items-center">
              <button
                onClick={onBack}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                ← Back to registration
              </button>
              
              <button
                onClick={handleResendOtp}
                disabled={!canResend || resendLoading}
                className={`text-sm flex items-center gap-1 transition-colors ${
                  canResend 
                    ? 'text-blue-600 hover:text-blue-700' 
                    : 'text-gray-400 cursor-not-allowed'
                }`}
              >
                {resendLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Resend Code
                  </>
                )}
              </button>
            </div>

            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                Didn't receive the email? Check your spam folder or click "Resend Code"
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OtpVerification;