import React from 'react';
import { Home, FileText, Users, User, Plus } from 'lucide-react';
import { useApp, Tab } from '@/contexts/AppContext';
import { cn } from '@/lib/utils';

export function TabBar() {
  const { activeTab, setActiveTab, setCurrentScreen } = useApp();

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === 'scan') {
      setCurrentScreen('scan');
    } else {
      setCurrentScreen(tab);
    }
  };

  const tabs = [
    { id: 'home' as Tab, icon: Home, label: 'Home' },
    { id: 'history' as Tab, icon: FileText, label: 'History' },
    { id: 'scan' as Tab, icon: Plus, label: 'Scan', isCenter: true },
    { id: 'family' as Tab, icon: Users, label: 'Family' },
    { id: 'profile' as Tab, icon: User, label: 'Profile' },
  ];

  return (
    <div className="tab-bar absolute bottom-0 left-0 right-0 flex items-center justify-around px-2 safe-area-pb">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => handleTabChange(tab.id)}
          className={cn(
            "flex-1 flex flex-col items-center justify-center py-2 transition-all duration-200",
            tab.isCenter && "relative -mt-6"
          )}
        >
          {tab.isCenter ? (
            <div className="scan-button shadow-primary">
              <Plus className="w-7 h-7 text-primary-foreground" />
            </div>
          ) : (
            <>
              <tab.icon
                className={cn(
                  "w-6 h-6 transition-colors duration-200",
                  activeTab === tab.id ? "text-primary" : "text-text-tertiary"
                )}
              />
              <span
                className={cn(
                  "text-xs mt-1 transition-colors duration-200",
                  activeTab === tab.id
                    ? "text-primary font-semibold"
                    : "text-text-tertiary font-normal"
                )}
              >
                {tab.label}
              </span>
            </>
          )}
        </button>
      ))}
    </div>
  );
}
