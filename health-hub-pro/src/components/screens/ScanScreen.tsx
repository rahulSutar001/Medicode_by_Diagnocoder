import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { ArrowLeft, Image, Paperclip, Camera, X, RefreshCcw, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { uploadReport } from '@/lib/api';
import { toast } from 'sonner';

export function ScanScreen() {
  const { setCurrentScreen, setActiveTab, setCurrentReportId } = useApp();
  const [capturedImages, setCapturedImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [permissionState, setPermissionState] = useState<'checking' | 'granted' | 'denied' | 'error'>('checking');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null); // For fallback
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleBack = () => {
    stopCamera();
    setActiveTab('home');
    setCurrentScreen('home');
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const initCamera = async () => {
    setCameraError(null);
    setPermissionState('checking');

    try {
      // Check if browser supports mediaDevices
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not available');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Prefer back camera
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for the video to be ready to play
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(e => console.error("Play error:", e));
          setPermissionState('granted');
        };
      }
    } catch (err: any) {
      console.error('Camera initialization failed:', err);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionState('denied');
        setCameraError('Camera access denied. Please allow permission to scan.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setPermissionState('error');
        setCameraError('No camera found on this device.');
      } else {
        setPermissionState('error');
        setCameraError('Failed to start camera. Please try again.');
      }
    }
  };

  useEffect(() => {
    initCamera();

    return () => {
      stopCamera();
    };
  }, []);

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current || permissionState !== 'granted') return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video source size
    if (video.videoWidth && video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to file
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `scan_${Date.now()}.jpg`, { type: 'image/jpeg' });
          validateAndAddFiles([file] as unknown as FileList, 'image');
          toast.success('Image captured');
        }
      }, 'image/jpeg', 0.85);
    }
  };

  const validateAndAddFiles = (files: FileList | null, type: 'image' | 'pdf') => {
    if (!files || files.length === 0) return;

    const newFiles: File[] = [];
    let hasInvalidFile = false;

    Array.from(files).forEach(file => {
      if (type === 'image') {
        if (file.type.startsWith('image/')) {
          newFiles.push(file);
        } else {
          hasInvalidFile = true;
        }
      } else if (type === 'pdf') {
        if (file.type === 'application/pdf') {
          newFiles.push(file);
        } else {
          hasInvalidFile = true;
        }
      }
    });

    if (hasInvalidFile) {
      toast.error(`Please select ${type === 'image' ? 'image' : 'PDF'} files only.`);
    }

    if (newFiles.length > 0) {
      setCapturedImages(prev => [...prev, ...newFiles]);
    }
  };

  const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    validateAndAddFiles(e.target.files, 'image');
    if (e.target) e.target.value = '';
  };

  const handleCameraSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    validateAndAddFiles(e.target.files, 'image');
    if (e.target) e.target.value = '';
  };

  const handlePdfSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    validateAndAddFiles(e.target.files, 'pdf');
    if (e.target) e.target.value = '';
  };

  const handleGalleryClick = () => {
    galleryInputRef.current?.click();
  };

  // Primary action button handler
  const handlePrimaryAction = () => {
    if (permissionState === 'granted') {
      captureImage();
    } else if (permissionState === 'denied' || permissionState === 'error') {
      // Only fallback if camera is definitely broken/denied
      cameraInputRef.current?.click();
    }
    // If checking, do nothing (prevent accidental fallback trigger while loading)
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleScan = async () => {
    if (capturedImages.length === 0) {
      toast.error('Please select at least one document');
      return;
    }

    setUploading(true);
    try {
      const file = capturedImages[0];
      const result = await uploadReport(file);

      setCurrentReportId(result.report_id);
      setCurrentScreen('scanning');

      toast.success('Document uploaded successfully!');
    } catch (error: any) {
      console.error('Upload failed:', error);
      toast.error(error.message || 'Failed to upload document. Please try again.');
      setCurrentScreen('scan-error');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setCapturedImages(capturedImages.filter((_, i) => i !== index));
  };

  const isPDF = (file: File) => file.type === 'application/pdf';

  return (
    <div className="absolute inset-0 bg-foreground overflow-hidden flex flex-col">
      {/* Hidden Canvas for Capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Bar */}
      <div className="pt-12 px-5 pb-4 flex items-center justify-between z-10">
        <button
          onClick={handleBack}
          className="w-10 h-10 flex items-center justify-center bg-black/20 rounded-full backdrop-blur-sm"
        >
          <ArrowLeft className="w-6 h-6 text-primary-foreground" />
        </button>
        <h1 className="text-section text-primary-foreground font-semibold drop-shadow-md">Scan Document</h1>
        <div className="w-10" />
      </div>

      {/* Preview List Overlay */}
      {capturedImages.length > 0 && (
        <div className="absolute top-24 left-0 right-0 z-20 px-5 py-3 flex gap-2 overflow-x-auto bg-black/40 backdrop-blur-sm">
          {capturedImages.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="relative w-16 h-16 rounded-lg bg-card/20 shrink-0 overflow-hidden flex items-center justify-center border border-primary-foreground/20"
            >
              <button
                onClick={() => removeImage(index)}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive flex items-center justify-center z-10"
              >
                <X className="w-3 h-3 text-destructive-foreground" />
              </button>

              {isPDF(file) ? (
                <div className="flex flex-col items-center justify-center p-1 text-center">
                  <Paperclip className="w-4 h-4 text-primary-foreground" />
                </div>
              ) : (
                <img
                  src={URL.createObjectURL(file)}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Camera View Area */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black">
        {/* Video Element - ALWAYS RENDERED to ensure ref exists */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            permissionState === 'granted' ? "opacity-100" : "opacity-0"
          )}
        />

        {/* States Overlay */}
        {permissionState !== 'granted' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center max-w-[80%] z-10">
            {permissionState === 'checking' && (
              <div className="animate-pulse flex flex-col items-center">
                <Camera className="w-12 h-12 text-primary-foreground/50 mb-4" />
                <p className="text-body text-primary-foreground/60">Starting camera...</p>
              </div>
            )}

            {(permissionState === 'denied' || permissionState === 'error') && (
              <>
                <Info className="w-12 h-12 text-destructive mb-4" />
                <p className="text-body text-primary-foreground font-medium mb-4">
                  {cameraError || 'Camera unavailable'}
                </p>
                <Button variant="secondary" onClick={initCamera} className="gap-2">
                  <RefreshCcw className="w-4 h-4" />
                  Try Again
                </Button>
              </>
            )}
          </div>
        )}

        {/* Viewfinder Overlay - visible only when camera is active */}
        {permissionState === 'granted' && (
          <div className="absolute inset-x-8 inset-y-32 border-2 border-dashed border-primary-foreground/30 rounded-2xl pointer-events-none" />
        )}
      </div>

      {/* Capture Controls */}
      <div className="absolute bottom-0 inset-x-0 px-5 py-8 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-20">
        {/* Scan Button (if images captured) */}
        {capturedImages.length > 0 && (
          <Button
            size="lg"
            className="w-full mb-8 shadow-lg"
            onClick={handleScan}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : `Process ${capturedImages.length} Document${capturedImages.length > 1 ? 's' : ''}`}
          </Button>
        )}

        {/* Control Row */}
        <div className="flex items-center justify-around translate-y-2 mb-4">
          {/* Gallery */}
          <button
            onClick={handleGalleryClick}
            className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
          >
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20">
              <Image className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-[12px] font-medium text-primary-foreground/90 shadow-black drop-shadow-md">Gallery</span>
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              onChange={handleGallerySelect}
              className="hidden"
            />
          </button>

          {/* Camera Capture / Trigger */}
          <button
            onClick={handlePrimaryAction}
            className="w-20 h-20 rounded-full bg-transparent border-[4px] border-primary-foreground flex items-center justify-center active:scale-95 transition-all duration-200 -mt-2"
          >
            <div className={cn(
              "w-[66px] h-[66px] rounded-full flex items-center justify-center transition-colors",
              permissionState === 'granted' ? "bg-primary-foreground" : "bg-primary-foreground/50"
            )}>
              <Camera className={cn(
                "w-8 h-8 fill-current",
                permissionState === 'granted' ? "text-primary" : "text-primary-foreground"
              )} />
            </div>
            {/* Fallback input if camera fails */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleCameraSelect}
              className="hidden"
            />
          </button>

          {/* File/PDF */}
          <button
            onClick={handleFileClick}
            className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
          >
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20">
              <Paperclip className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-[12px] font-medium text-primary-foreground/90 shadow-black drop-shadow-md">PDF</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handlePdfSelect}
              className="hidden"
            />
          </button>
        </div>
      </div>
    </div>
  );
}
