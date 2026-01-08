import React, { useState } from 'react';
import { X, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { signIn, signUp, signUpWithOTP, verifyOTP, resendOTP, updatePassword } from '@/lib/auth';
import { toast } from 'sonner';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

export function AuthModal() {
  const { 
    showAuthModal, 
    setShowAuthModal, 
    authMode, 
    setCurrentScreen,
    setIsLoggedIn 
  } = useApp();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResendEmail, setShowResendEmail] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [showOTPInput, setShowOTPInput] = useState(false);
  const [otp, setOtp] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingPassword, setPendingPassword] = useState('');
  const [otpType, setOtpType] = useState<'signup' | 'email' | 'magiclink'>('magiclink');

  if (!showAuthModal) return null;

  /**
   * Validates form inputs before submission
   * @returns true if valid, false otherwise
   */
  const validateForm = (): boolean => {
    setError(null);

    if (!email.trim()) {
      setError('Email is required');
      return false;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }

    if (!password) {
      setError('Password is required');
      return false;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }

    if (authMode === 'signup') {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return false;
      }
    }

    return true;
  };

  /**
   * Handles form submission for both login and signup
   * Integrates with Supabase authentication
   */
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (authMode === 'signup') {
        // Sign up new user with OTP (passwordless first, then set password after verification)
        const { error: otpError } = await signUpWithOTP(email);

        if (otpError) {
          setError(otpError.message || 'Failed to send OTP');
          toast.error('Sign up failed', {
            description: otpError.message || 'Please try again',
          });
          setIsLoading(false);
          return;
        }

        // OTP sent successfully - show OTP input
        setPendingEmail(email);
        setPendingPassword(password); // Store password to set after OTP verification
        setOtpType('magiclink');
        setShowOTPInput(true);
          toast.info('Check your email', {
            description: 'We sent you an 8-digit OTP code. Please enter it below.',
          });
        setIsLoading(false);
      } else {
        // Sign in existing user
        const { user, session, error: signInError } = await signIn(email, password);

        if (signInError) {
          // Check if error is due to unconfirmed email
          const isEmailNotConfirmed = 
            signInError.message?.toLowerCase().includes('email not confirmed') ||
            signInError.message?.toLowerCase().includes('email_not_confirmed') ||
            signInError.message?.toLowerCase().includes('confirm your email');

          if (isEmailNotConfirmed) {
            // For unconfirmed emails, show OTP input to verify
            setPendingEmail(email);
            setOtpType('email');
            setShowOTPInput(true);
            toast.info('Email not confirmed', {
              description: 'Please enter the OTP code sent to your email',
            });
            // Request OTP for email verification
            await resendOTP(email, 'email');
            setIsLoading(false);
            return;
          } else {
            setError(signInError.message || 'Invalid email or password');
            toast.error('Login failed', {
              description: signInError.message || 'Please check your credentials',
            });
          }
          setIsLoading(false);
          return;
        }

        if (user && session) {
          toast.success('Welcome back!', {
            description: 'Successfully logged in',
          });
          setShowAuthModal(false);
          setIsLoggedIn(true);
          setCurrentScreen('home');
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      toast.error('Authentication error', {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Closes the modal and resets form state
   */
  const handleClose = () => {
    setShowAuthModal(false);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setIsLoading(false);
    setShowResendEmail(false);
    setIsResendingEmail(false);
    setShowOTPInput(false);
    setOtp('');
    setPendingEmail('');
    setPendingPassword('');
  };

  /**
   * Handles Enter key press on form inputs
   */
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSubmit();
    }
  };

  /**
   * Resends OTP code to user's email
   */
  const handleResendEmail = async () => {
    const emailToUse = pendingEmail || email;
    if (!emailToUse.trim()) {
      setError('Please enter your email address');
      return;
    }

    setIsResendingEmail(true);
    setError(null);

    try {
      const { error: resendError } = await resendOTP(emailToUse, otpType);
      
      if (resendError) {
        setError(resendError.message || 'Failed to resend OTP');
        toast.error('Failed to resend OTP', {
          description: resendError.message || 'Please try again',
        });
      } else {
        toast.success('OTP sent!', {
          description: 'Please check your inbox for the 8-digit code',
        });
        setOtp(''); // Clear previous OTP
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resend OTP';
      setError(errorMessage);
      toast.error('Error', {
        description: errorMessage,
      });
    } finally {
      setIsResendingEmail(false);
    }
  };

  /**
   * Verifies OTP code entered by user
   */
  const handleVerifyOTP = async () => {
    if (otp.length !== 8) {
      setError('Please enter the complete 8-digit OTP code');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { user, session, error: verifyError } = await verifyOTP(pendingEmail, otp, otpType);

      if (verifyError) {
        setError(verifyError.message || 'Invalid OTP code');
        toast.error('Verification failed', {
          description: verifyError.message || 'Please check the code and try again',
        });
        setIsLoading(false);
        return;
      }

      if (user && session) {
        // If password was provided during signup, set it now
        if (pendingPassword) {
          const { error: passwordError } = await updatePassword(pendingPassword);
          if (passwordError) {
            console.error('Failed to set password:', passwordError);
            // Continue anyway - user can set password later
          }
        }

        toast.success('Email verified successfully!', {
          description: 'Welcome to MediGuide',
        });
        setShowAuthModal(false);
        setShowOTPInput(false);
        setIsLoggedIn(true);
        setCurrentScreen('profile-setup');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      toast.error('Verification error', {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative w-[320px] bg-card rounded-2xl shadow-elevated p-6 animate-scale-in">
        {/* Close Button */}
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-text-secondary hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <h2 className="text-title text-foreground text-center mb-6">
          {showOTPInput ? 'Verify Email' : authMode === 'login' ? 'Log In' : 'Create Account'}
        </h2>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-destructive-light border border-destructive rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
            {(showResendEmail || showOTPInput) && (
              <button
                onClick={handleResendEmail}
                disabled={isResendingEmail}
                className="mt-2 text-sm text-primary hover:underline disabled:opacity-50"
              >
                {isResendingEmail ? 'Sending...' : 'Resend OTP'}
              </button>
            )}
          </div>
        )}

        {/* OTP Input Section */}
        {showOTPInput ? (
          <div className="space-y-4">
            <p className="text-body text-text-secondary text-center mb-4">
              We sent an 8-digit code to <span className="font-medium text-foreground">{pendingEmail}</span>
            </p>
            
            <div className="flex justify-center">
              <InputOTP
                maxLength={8}
                value={otp}
                onChange={(value) => {
                  setOtp(value);
                  setError(null);
                  // Auto-submit when 8 digits are entered
                  if (value.length === 8) {
                    handleVerifyOTP();
                  }
                }}
                disabled={isLoading}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                  <InputOTPSlot index={6} />
                  <InputOTPSlot index={7} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <div className="mt-6 space-y-3">
              <Button 
                className="w-full"
                onClick={handleVerifyOTP}
                disabled={isLoading || otp.length !== 8}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify Email'
                )}
              </Button>
              <Button 
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setShowOTPInput(false);
                  setOtp('');
                  setPendingEmail('');
                  setPendingPassword('');
                  setError(null);
                }}
                disabled={isLoading}
              >
                Back
              </Button>
            </div>
          </div>
        ) : (
          /* Regular Form */
          <div className="space-y-4">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            className={error && !email ? 'border-destructive' : ''}
          />
          
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              className={error && !password ? 'border-destructive' : ''}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary disabled:opacity-50"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {authMode === 'signup' && (
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                className={error && password !== confirmPassword ? 'border-destructive' : ''}
              />
            </div>
          )}
          
          {/* Buttons */}
          <div className="mt-6 space-y-3">
            <Button 
              className="w-full"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {authMode === 'login' ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                authMode === 'login' ? 'Log In' : 'Sign Up'
              )}
            </Button>
            <Button 
              variant="ghost"
              className="w-full"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
