import React from 'react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AppProvider } from '@/contexts/AppContext';
import { MediGuideApp } from '@/components/MediGuideApp';

const Index = () => {
  return (
    <ThemeProvider>
      <AppProvider>
        <MediGuideApp />
      </AppProvider>
    </ThemeProvider>
  );
};

export default Index;
