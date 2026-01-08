import { supabase } from './supabase';
import type { User, Session, AuthError } from '@supabase/supabase-js';

/**
 * Authentication utility functions
 * Handles login, signup, logout, and session management
 */

export interface AuthResponse {
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}

/**
 * Sign up a new user with email using OTP method (passwordless)
 * Sends OTP code to email instead of confirmation link
 * @param email - User's email address
 * @returns Promise with error if any
 */
export async function signUpWithOTP(email: string): Promise<{ error: AuthError | null }> {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true, // Create user if doesn't exist
      },
    });
    return { error };
  } catch (error) {
    return { error: error as AuthError };
  }
}

/**
 * Sign up a new user with email and password
 * Note: This will send confirmation link by default. For OTP, use signUpWithOTP instead.
 * @param email - User's email address
 * @param password - User's password (min 6 characters)
 * @returns AuthResponse with user, session, and error
 */
export async function signUp(email: string, password: string): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    return {
      user: data.user,
      session: data.session,
      error: error,
    };
  } catch (error) {
    return {
      user: null,
      session: null,
      error: error as AuthError,
    };
  }
}

/**
 * Update user password after OTP verification
 * @param password - New password to set
 * @returns Promise with error if any
 */
export async function updatePassword(password: string): Promise<{ error: AuthError | null }> {
  try {
    const { error } = await supabase.auth.updateUser({
      password: password,
    });
    return { error };
  } catch (error) {
    return { error: error as AuthError };
  }
}

/**
 * Verify OTP code sent to user's email
 * @param email - User's email address
 * @param token - OTP code (6 digits)
 * @param type - Type of OTP verification: 'signup' for new users, 'email' for email confirmation, 'magiclink' for passwordless
 * @returns AuthResponse with user, session, and error
 */
export async function verifyOTP(
  email: string, 
  token: string, 
  type: 'signup' | 'email' | 'magiclink' = 'magiclink'
): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: type,
    });

    return {
      user: data.user,
      session: data.session,
      error: error,
    };
  } catch (error) {
    return {
      user: null,
      session: null,
      error: error as AuthError,
    };
  }
}

/**
 * Resend OTP code to user's email
 * @param email - User's email address
 * @param type - Type of OTP: 'signup' for new users, 'email' for email confirmation, 'magiclink' for passwordless
 * @returns Promise with error if any
 */
export async function resendOTP(
  email: string, 
  type: 'signup' | 'email' | 'magiclink' = 'magiclink'
): Promise<{ error: AuthError | null }> {
  try {
    // For passwordless OTP, use signInWithOtp
    if (type === 'magiclink') {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });
      return { error };
    } else {
      const { error } = await supabase.auth.resend({
        type: type,
        email: email,
      });
      return { error };
    }
  } catch (error) {
    return { error: error as AuthError };
  }
}

/**
 * Sign in an existing user with email and password
 * @param email - User's email address
 * @param password - User's password
 * @returns AuthResponse with user, session, and error
 */
export async function signIn(email: string, password: string): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return {
      user: data.user,
      session: data.session,
      error: error,
    };
  } catch (error) {
    return {
      user: null,
      session: null,
      error: error as AuthError,
    };
  }
}

/**
 * Sign out the current user
 * @returns Promise that resolves when sign out is complete
 */
export async function signOut(): Promise<{ error: AuthError | null }> {
  try {
    const { error } = await supabase.auth.signOut();
    return { error };
  } catch (error) {
    return { error: error as AuthError };
  }
}

/**
 * Get the current user session
 * @returns Current session or null if not authenticated
 */
export async function getSession(): Promise<Session | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

/**
 * Get the current authenticated user
 * @returns Current user or null if not authenticated
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

/**
 * Resend email confirmation (kept for backward compatibility)
 * Now uses OTP method
 * @param email - User's email address
 * @returns Promise with error if any
 */
export async function resendConfirmationEmail(email: string): Promise<{ error: AuthError | null }> {
  return resendOTP(email);
}

/**
 * Listen to authentication state changes
 * @param callback - Function called when auth state changes
 * @returns Function to unsubscribe from auth state changes
 */
export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void
) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}

