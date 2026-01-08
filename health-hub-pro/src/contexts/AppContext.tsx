import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSession, onAuthStateChange, getCurrentUser } from '@/lib/auth';
import type { Session } from '@supabase/supabase-js';

export type Screen = 
  | 'splash'
  | 'onboarding'
  | 'login'
  | 'signup'
  | 'profile-setup'
  | 'home'
  | 'history'
  | 'scan'
  | 'scanning'
  | 'scan-error'
  | 'report-result'
  | 'family'
  | 'add-family'
  | 'nickname-popup'
  | 'profile';

export type Tab = 'home' | 'history' | 'scan' | 'family' | 'profile';

interface User {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  phoneNumber: string;
  gender: string;
  bloodGroup: string;
  allergies: string;
  conditions: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
}

interface Report {
  id: string;
  date: string;
  type: string;
  labName: string;
  flagLevel: 'green' | 'yellow' | 'red';
  uploadedToABDM: boolean;
}

interface FamilyMember {
  id: string;
  name: string;
  initials: string;
  status: 'good' | 'needs-review' | 'critical' | 'pending';
  connectionStatus: 'connected' | 'pending-sent' | 'pending-received';
}

interface AppContextType {
  currentScreen: Screen;
  setCurrentScreen: (screen: Screen) => void;
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  user: User | null;
  setUser: (user: User | null) => void;
  isLoggedIn: boolean;
  setIsLoggedIn: (value: boolean) => void;
  hasCompletedProfile: boolean;
  setHasCompletedProfile: (value: boolean) => void;
  freeScansLeft: number;
  setFreeScansLeft: (value: number) => void;
  reports: Report[];
  setReports: (reports: Report[]) => void;
  familyMembers: FamilyMember[];
  setFamilyMembers: (members: FamilyMember[]) => void;
  showAuthModal: boolean;
  setShowAuthModal: (value: boolean) => void;
  authMode: 'login' | 'signup';
  setAuthMode: (mode: 'login' | 'signup') => void;
  showPremiumModal: boolean;
  setShowPremiumModal: (value: boolean) => void;
  showNicknameModal: boolean;
  setShowNicknameModal: (value: boolean) => void;
  selectedFamilyMember: { id: string; name: string } | null;
  setSelectedFamilyMember: (member: { id: string; name: string } | null) => void;
  currentReportId: string | null;
  setCurrentReportId: (id: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const mockReports: Report[] = [
  { id: '1', date: 'Jan 3, 2025', type: 'Lipid Panel', labName: 'CityLab Diagnostics', flagLevel: 'yellow', uploadedToABDM: true },
  { id: '2', date: 'Dec 28, 2024', type: 'Complete Blood Count', labName: 'Apollo Labs', flagLevel: 'green', uploadedToABDM: true },
  { id: '3', date: 'Dec 15, 2024', type: 'HbA1c Test', labName: 'HealthFirst Labs', flagLevel: 'red', uploadedToABDM: false },
  { id: '4', date: 'Nov 30, 2024', type: 'Liver Function Test', labName: 'CityLab Diagnostics', flagLevel: 'green', uploadedToABDM: true },
  { id: '5', date: 'Nov 15, 2024', type: 'Thyroid Panel', labName: 'MedPath Labs', flagLevel: 'yellow', uploadedToABDM: false },
];

const mockFamilyMembers: FamilyMember[] = [
  { id: '1', name: 'Kabir', initials: 'K', status: 'good', connectionStatus: 'connected' },
  { id: '2', name: 'Aarohi', initials: 'A', status: 'needs-review', connectionStatus: 'connected' },
  { id: '3', name: 'Vihaan', initials: 'V', status: 'pending', connectionStatus: 'pending-received' },
  { id: '4', name: 'Saanvi', initials: 'S', status: 'good', connectionStatus: 'connected' },
  { id: '5', name: 'Ishaan', initials: 'I', status: 'good', connectionStatus: 'connected' },
];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentScreen, setCurrentScreen] = useState<Screen>('splash');
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasCompletedProfile, setHasCompletedProfile] = useState(false);
  const [freeScansLeft, setFreeScansLeft] = useState(3);
  const [reports, setReports] = useState<Report[]>(mockReports);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>(mockFamilyMembers);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [selectedFamilyMember, setSelectedFamilyMember] = useState<{ id: string; name: string } | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);

  /**
   * Initialize authentication state on app load
   * Checks for existing session and updates app state accordingly
   */
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const session = await getSession();
        const supabaseUser = await getCurrentUser();

        if (session && supabaseUser) {
          setIsLoggedIn(true);
          // Map Supabase user to app user format if needed
          // For now, we'll just set logged in state
          // Navigate to home if user is authenticated
          setCurrentScreen('home');
        } else {
          setIsLoggedIn(false);
          setCurrentScreen('onboarding');
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setIsLoggedIn(false);
        setCurrentScreen('onboarding');
      } finally {
        setIsCheckingAuth(false);
      }
    };

    initializeAuth();

    /**
     * Listen to authentication state changes
     * Updates app state when user signs in/out
     */
    const { data: { subscription } } = onAuthStateChange(async (event, session: Session | null) => {
      if (event === 'SIGNED_IN' && session) {
        setIsLoggedIn(true);
        const supabaseUser = await getCurrentUser();
        if (supabaseUser) {
          setCurrentScreen('home');
        }
      } else if (event === 'SIGNED_OUT') {
        setIsLoggedIn(false);
        setUser(null);
        setCurrentScreen('onboarding');
      } else if (event === 'TOKEN_REFRESHED' && session) {
        // Session refreshed, user still logged in
        setIsLoggedIn(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AppContext.Provider
      value={{
        currentScreen,
        setCurrentScreen,
        activeTab,
        setActiveTab,
        user,
        setUser,
        isLoggedIn,
        setIsLoggedIn,
        hasCompletedProfile,
        setHasCompletedProfile,
        freeScansLeft,
        setFreeScansLeft,
        reports,
        setReports,
        familyMembers,
        setFamilyMembers,
        showAuthModal,
        setShowAuthModal,
        authMode,
        setAuthMode,
        showPremiumModal,
        setShowPremiumModal,
        showNicknameModal,
        setShowNicknameModal,
        selectedFamilyMember,
        setSelectedFamilyMember,
        currentReportId,
        setCurrentReportId,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
