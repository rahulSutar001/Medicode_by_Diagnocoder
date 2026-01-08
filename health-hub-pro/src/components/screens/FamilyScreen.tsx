import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { TabBar } from '@/components/TabBar';
import { Plus, Clock, Check, User, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function FamilyScreen() {
  const { familyMembers, setCurrentScreen, setShowNicknameModal, setSelectedFamilyMember } = useApp();
  const [acceptedMembers, setAcceptedMembers] = useState<string[]>([]);

  const handleAccept = (memberId: string, memberName: string) => {
    setAcceptedMembers([...acceptedMembers, memberId]);
  };

  const handleEditNickname = (memberId: string, memberName: string) => {
    setSelectedFamilyMember({ id: memberId, name: memberName });
    setShowNicknameModal(true);
  };

  const connectionStatuses = [
    { type: 'pending-sent', id: 'sent1', name: 'Vihaan', icon: Clock, color: 'text-warning', bgColor: 'bg-warning/10', text: 'Invitation sent' },
    { type: 'connected', id: 'conn1', name: 'Aarohi', icon: Check, color: 'text-success', bgColor: 'bg-success/10', text: 'accepted' },
    { type: 'pending-received', id: 'recv1', name: 'Saanvi', icon: User, color: 'text-primary', bgColor: 'bg-primary/10', text: 'wants to connect' },
  ];

  return (
    <div className="absolute inset-0 bg-background-secondary overflow-hidden flex flex-col">
      {/* Header */}
      <div className="pt-12 px-5 pb-4">
        <h1 className="text-title text-foreground">My Health Circle</h1>
        <p className="text-body text-text-secondary mt-1">Care for your loved ones</p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-36 custom-scrollbar">
        {/* Family Members Circles - No status labels */}
        <div className="flex gap-4 overflow-x-auto py-4 -mx-5 px-5 scrollbar-hide">
          {familyMembers.map((member, index) => (
            <button
              key={member.id}
              className="flex flex-col items-center shrink-0 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={cn(
                "w-20 h-20 rounded-full ring-4 flex items-center justify-center bg-card shadow-md ring-primary/30"
              )}>
                <span className="text-title text-foreground font-bold">
                  {member.initials}
                </span>
              </div>
              <span className="text-body text-foreground font-medium mt-2">{member.name}</span>
            </button>
          ))}

          {/* Add Button */}
          <button
            onClick={() => setCurrentScreen('add-family')}
            className="flex flex-col items-center shrink-0 animate-fade-in delay-300"
          >
            <div className="w-20 h-20 rounded-full bg-muted border-2 border-dashed border-border flex items-center justify-center">
              <Plus className="w-8 h-8 text-text-tertiary" />
            </div>
            <span className="text-body text-text-secondary mt-2">Add</span>
          </button>
        </div>

        {/* Connection Status Section */}
        <div className="mt-6">
          <h2 className="text-section text-foreground mb-4">Connection Status</h2>
          
          {connectionStatuses.length > 0 ? (
            <div className="space-y-3">
              {connectionStatuses.map((status, index) => {
                const isAccepted = acceptedMembers.includes(status.id);
                const showAsAccepted = status.type === 'pending-received' && isAccepted;
                
                return (
                  <div 
                    key={index}
                    className="card-elevated p-4 flex items-center gap-3 animate-fade-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center", 
                      showAsAccepted ? 'bg-success/10' : status.bgColor
                    )}>
                      {showAsAccepted ? (
                        <Check className="w-5 h-5 text-success" />
                      ) : (
                        <status.icon className={cn("w-5 h-5", status.color)} />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-body-lg text-foreground">
                        {status.type === 'pending-sent' && `${status.text} to ${status.name}`}
                        {status.type === 'connected' && `${status.name} ${status.text}`}
                        {status.type === 'pending-received' && !showAsAccepted && `${status.name} ${status.text}`}
                        {showAsAccepted && `${status.name} accepted`}
                      </p>
                    </div>
                    {status.type === 'pending-received' && !showAsAccepted && (
                      <div className="flex gap-2">
                        <Button size="sm" className="h-8 px-3" onClick={() => handleAccept(status.id, status.name)}>Accept</Button>
                        <Button size="sm" variant="ghost" className="h-8 px-3">Decline</Button>
                      </div>
                    )}
                    {(status.type === 'connected' || showAsAccepted) && (
                      <button 
                        onClick={() => handleEditNickname(status.id, status.name)}
                        className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                      >
                        <Pencil className="w-4 h-4 text-primary" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-body-lg text-text-tertiary">No pending connections</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Add Button */}
      <div className="absolute bottom-24 left-5 right-5">
        <Button 
          size="lg" 
          className="w-full"
          onClick={() => setCurrentScreen('add-family')}
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Member
        </Button>
      </div>

      <TabBar />
    </div>
  );
}
