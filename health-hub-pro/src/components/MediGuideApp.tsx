import React from 'react';
import { useApp } from '@/contexts/AppContext';
import { MobileFrame } from './MobileFrame';
import { SplashScreen } from './screens/SplashScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { ProfileSetupScreen } from './screens/ProfileSetupScreen';
import { HomeScreen } from './screens/HomeScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { ScanScreen } from './screens/ScanScreen';
import { ScanningScreen } from './screens/ScanningScreen';
import { ScanErrorScreen } from './screens/ScanErrorScreen';
import { ReportResultScreen } from './screens/ReportResultScreen';
import { FamilyScreen } from './screens/FamilyScreen';
import { AddFamilyScreen } from './screens/AddFamilyScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { ReportExplanationScreen } from './screens/ReportExplanationScreen';
import { AuthModal } from './modals/AuthModal';
import { NicknameModal } from './modals/NicknameModal';
import { PremiumModal } from './modals/PremiumModal';

export function MediGuideApp() {
  const { currentScreen } = useApp();

  const renderScreen = () => {
    switch (currentScreen) {
      case 'splash':
        return <SplashScreen />;
      case 'onboarding':
        return <OnboardingScreen />;
      case 'profile-setup':
        return <ProfileSetupScreen />;
      case 'home':
        return <HomeScreen />;
      case 'history':
        return <HistoryScreen />;
      case 'scan':
        return <ScanScreen />;
      case 'scanning':
        return <ScanningScreen />;
      case 'scan-error':
        return <ScanErrorScreen />;
      case 'report-result':
        return <ReportResultScreen />;
      case 'family':
        return <FamilyScreen />;
      case 'add-family':
        return <AddFamilyScreen />;
      case 'profile':
        return <ProfileScreen />;
      case 'nickname-popup':
        return <FamilyScreen />;
      case 'report-explanation':
        return <ReportExplanationScreen />;
      default:
        return <SplashScreen />;
    }
  };

  return (
    <MobileFrame>
      {renderScreen()}
      <AuthModal />
      <NicknameModal />
      <PremiumModal />
    </MobileFrame>
  );
}
