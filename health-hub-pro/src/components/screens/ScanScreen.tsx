import React, { useState, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { ArrowLeft, Image, Paperclip, Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { uploadReport } from '@/lib/api';
import { toast } from 'sonner';

export function ScanScreen() {
  const { setCurrentScreen, setActiveTab, setCurrentReportId } = useApp();
  const [capturedImages, setCapturedImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleBack = () => {
    setActiveTab('home');
    setCurrentScreen('home');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      setCapturedImages([...capturedImages, ...newFiles]);
    }
  };

  const handleGalleryClick = () => {
    galleryInputRef.current?.click();
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleScan = async () => {
    if (capturedImages.length === 0) {
      toast.error('Please select at least one image');
      return;
    }

    setUploading(true);
    try {
      // Upload first image (for now, we'll handle single image upload)
      const file = capturedImages[0];
      const result = await uploadReport(file);
      
      // Store report ID and navigate to scanning screen
      setCurrentReportId(result.report_id);
      setCurrentScreen('scanning');
      
      toast.success('Report uploaded successfully! Processing...');
    } catch (error: any) {
      console.error('Upload failed:', error);
      toast.error(error.message || 'Failed to upload report. Please try again.');
      setCurrentScreen('scan-error');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setCapturedImages(capturedImages.filter((_, i) => i !== index));
  };

  return (
    <div className="absolute inset-0 bg-foreground overflow-hidden flex flex-col">
      {/* Top Bar */}
      <div className="pt-12 px-5 pb-4 flex items-center justify-between">
        <button 
          onClick={handleBack}
          className="w-10 h-10 flex items-center justify-center"
        >
          <ArrowLeft className="w-6 h-6 text-primary-foreground" />
        </button>
        <h1 className="text-section text-primary-foreground font-semibold">Scan Document</h1>
        <div className="w-10" />
      </div>

      {/* Preview Thumbnails */}
      {capturedImages.length > 0 && (
        <div className="px-5 py-3 flex gap-2 overflow-x-auto">
          {capturedImages.map((file, index) => (
            <div 
              key={`${file.name}-${index}`}
              className="relative w-14 h-14 rounded-lg bg-card/20 shrink-0 overflow-hidden"
            >
              <button
                onClick={() => removeImage(index)}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive flex items-center justify-center z-10"
              >
                <X className="w-3 h-3 text-destructive-foreground" />
              </button>
              <img 
                src={URL.createObjectURL(file)} 
                alt={`Preview ${index + 1}`}
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
          ))}
        </div>
      )}

      {/* Camera View */}
      <div className="flex-1 relative mx-5 rounded-2xl overflow-hidden bg-foreground/80">
        {/* Viewfinder */}
        <div className="absolute inset-8 border-2 border-dashed border-primary-foreground/50 rounded-xl">
          {/* Corner Markers */}
          <div className="absolute -top-0.5 -left-0.5 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
          <div className="absolute -top-0.5 -right-0.5 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
          <div className="absolute -bottom-0.5 -left-0.5 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
          <div className="absolute -bottom-0.5 -right-0.5 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
          
          {/* Scan Line Animation */}
          <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan-line opacity-60" />
        </div>

        {/* Guide Text */}
        <div className="absolute bottom-8 left-0 right-0 text-center">
          <p className="text-body text-primary-foreground/70">
            Position document here
          </p>
        </div>
      </div>

      {/* Capture Controls */}
      <div className="px-5 py-6 bg-foreground/95">
        {/* Scan Button */}
        {capturedImages.length > 0 && (
          <Button 
            size="lg" 
            className="w-full mb-4"
            onClick={handleScan}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : `Scan (${capturedImages.length} page${capturedImages.length > 1 ? 's' : ''})`}
          </Button>
        )}

        {/* Control Row */}
        <div className="flex items-center justify-around">
          {/* Gallery */}
          <button 
            onClick={handleGalleryClick}
            className="flex flex-col items-center gap-1 py-2 px-4"
          >
            <div className="w-12 h-12 rounded-full bg-primary-foreground/10 flex items-center justify-center">
              <Image className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-caption text-primary-foreground/70">Gallery</span>
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </button>

          {/* Capture */}
          <button 
            onClick={handleGalleryClick}
            className="w-[70px] h-[70px] rounded-full bg-primary-foreground flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          >
            <div className="w-16 h-16 rounded-full border-4 border-foreground flex items-center justify-center">
              <Camera className="w-6 h-6 text-foreground" />
            </div>
          </button>

          {/* File */}
          <button 
            onClick={handleFileClick}
            className="flex flex-col items-center gap-1 py-2 px-4"
          >
            <div className="w-12 h-12 rounded-full bg-primary-foreground/10 flex items-center justify-center">
              <Paperclip className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-caption text-primary-foreground/70">File</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </button>
        </div>
      </div>
    </div>
  );
}
