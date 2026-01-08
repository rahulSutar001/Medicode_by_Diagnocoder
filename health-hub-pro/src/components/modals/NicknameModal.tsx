import React, { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function NicknameModal() {
  const { showNicknameModal, setShowNicknameModal, selectedFamilyMember } = useApp();
  const [nickname, setNickname] = useState('');

  useEffect(() => {
    if (selectedFamilyMember) {
      setNickname(selectedFamilyMember.name);
    }
  }, [selectedFamilyMember]);

  if (!showNicknameModal) return null;

  const handleSave = () => {
    // In real app, would update the family member's nickname
    setShowNicknameModal(false);
  };

  const handleCancel = () => {
    setShowNicknameModal(false);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={handleCancel}
      />
      
      {/* Modal */}
      <div className="relative w-[300px] bg-card rounded-2xl shadow-elevated p-6 animate-scale-in">
        <h2 className="text-section text-foreground text-center mb-4">
          Set a nickname
        </h2>
        <p className="text-body text-text-secondary text-center mb-4">
          Change "{selectedFamilyMember?.name}" to a custom name
        </p>

        <Input
          placeholder="e.g., Son, Dad, Dr. Smith"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="mb-6"
        />

        <div className="flex gap-3">
          <Button 
            variant="secondary"
            className="flex-1"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button 
            className="flex-1"
            onClick={handleSave}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
