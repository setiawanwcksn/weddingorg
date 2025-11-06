/**
 * CameraView
 * A reusable camera preview component that handles permission, stream lifecycle,
 * and switching between front (user) and back (environment) cameras.
 *
 * Relationship:
 * - Used inside CheckInModal scan area to open the real camera for QR scanning.
 * - Can be reused in other pages (e.g., standalone scan sections) without modification.
 */
import React from 'react';
import { BrowserQRCodeReader, DecodeHintType, BarcodeFormat, RGBLuminanceSource, BinaryBitmap, HybridBinarizer } from '@zxing/library';
import { Upload, Camera } from 'lucide-react';

export interface CameraViewProps {
  facingMode?: 'user' | 'environment';
  className?: string;
  onQRCodeScanned?: (data: string) => void;
  onFileUpload?: (data: string) => void;
}

export function CameraView({ facingMode = 'environment', className = '', onQRCodeScanned, onFileUpload }: CameraViewProps): JSX.Element {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = React.useState<MediaStream | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [started, setStarted] = React.useState(false);
  const [scanning, setScanning] = React.useState(false);
  const [lastScannedData, setLastScannedData] = React.useState<string | null>(null);
  const [scanMode, setScanMode] = React.useState<'camera' | 'upload'>('camera');
  const [uploading, setUploading] = React.useState(false);
  const codeReaderRef = React.useRef<BrowserQRCodeReader | null>(null);
  const scanningRef = React.useRef(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const stopQRScanning = React.useCallback(() => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
      codeReaderRef.current = null;
    }
    scanningRef.current = false;
    setScanning(false);
  }, []);

  const startQRScanning = React.useCallback(async () => {
    if (!videoRef.current || !onQRCodeScanned || scanningRef.current) return;
    
    scanningRef.current = true;
    setScanning(true);
    
    try {
      // Create QR code reader with comprehensive settings and hints
      const hints = new Map();
      hints.set(DecodeHintType.TRY_HARDER, true);
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
      hints.set(DecodeHintType.CHARACTER_SET, 'utf-8');
      hints.set(DecodeHintType.ALLOWED_LENGTHS, [1, 100]); // Allow various QR code sizes

      codeReaderRef.current = new BrowserQRCodeReader(
        hints,
        { delayBetweenScanAttempts: 500 }
      );
      
      console.log('[CameraView] Starting QR scanning with comprehensive settings...');
      console.log('[CameraView] Video element ready state:', videoRef.current.readyState);
      console.log('[CameraView] Video dimensions:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
      
      await codeReaderRef.current.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, error) => {
          if (result) {
            const text = result.getText().trim();
            console.log('[CameraView] QR code detected:', text);
            console.log('[CameraView] QR code format:', result.getBarcodeFormat()?.toString());
            console.log('[CameraView] QR code raw bytes:', result.getRawBytes());
            
            if (text && onQRCodeScanned) {
              if (text !== lastScannedData) {
                setLastScannedData(text);
                console.log('[CameraView] Triggering callback with QR data:', text);
                onQRCodeScanned(text);
                // Stop scanning after successful scan to prevent multiple triggers
                stopQRScanning();
              }
            }
          } else if (error) {
            // Only log significant errors, not routine "no code found" errors
            const errorMessage = error.toString();
            if (!errorMessage.includes('NotFoundException') && 
                !errorMessage.includes('No code detected') &&
                !errorMessage.includes('No barcode')) {
              console.log('[CameraView] QR scanning debug (non-critical):', errorMessage);
            }
          }
        }
      );
    } catch (e: any) {
      console.error('[CameraView] QR scanning setup error:', e);
      console.error('[CameraView] Error details:', e.message);
      console.error('[CameraView] Error stack:', e.stack);
      scanningRef.current = false;
      setScanning(false);
      setError(`QR scanning setup failed: ${e.message}`);
    }
  }, [onQRCodeScanned, lastScannedData, stopQRScanning]);

  const stopStream = React.useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((t) => {
        try { t.stop(); } catch (_) { /* ignore */ }
      });
    }
  }, [stream]);

  const startStream = React.useCallback(async () => {
    setError(null);
    try {
      if (!('mediaDevices' in navigator) || !navigator.mediaDevices?.getUserMedia) {
        setError('Camera is not supported on this device/browser.');
        return;
      }
      
      console.log('[CameraView] Requesting camera with facingMode:', facingMode);
      
      // Request video with facingMode preference, try hard for higher resolution
      let s: MediaStream | null = null;
      try {
        s = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false,
        });
      } catch (primaryErr) {
        console.warn('[CameraView] Preferred camera constraints failed, falling back to default camera:', primaryErr);
        // Fallback to any available camera
        s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      console.log('[CameraView] Camera stream obtained successfully');
      setStream(s);
      setStarted(true);
      
      if (videoRef.current) {
        // assign stream
        videoRef.current.srcObject = s;
        
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          console.log('[CameraView] Video metadata loaded');
          if (onQRCodeScanned && !scanningRef.current) {
            console.log('[CameraView] Starting QR scanning after video ready');
            // Add small delay to ensure video is fully ready
            setTimeout(() => {
              startQRScanning();
            }, 500);
          }
        };
        
        await videoRef.current.play().catch((playError) => {
          console.error('[CameraView] Video play error:', playError);
          // some browsers require user gesture; fallback handled by showing controls
        });
        
        // Fallback: start scanning immediately if video is already playing
        if (videoRef.current.readyState >= 2 && onQRCodeScanned && !scanningRef.current) {
          console.log('[CameraView] Starting QR scanning immediately (video ready)');
          // Add small delay to ensure video is fully ready
          setTimeout(() => {
            startQRScanning();
          }, 500);
        }
      }
    } catch (e: any) {
      console.error('[CameraView] Camera access error:', e);
      setError(e?.message || 'Failed to access camera');
      setStarted(false);
    }
  }, [facingMode, onQRCodeScanned, startQRScanning]);

  // Restart camera when facingMode changes and camera already started
  React.useEffect(() => {
    if (!started) return;
    (async () => {
      stopStream();
      await startStream();
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  // Auto-start camera on mount
  React.useEffect(() => {
    startStream();
  }, []);



  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      stopQRScanning();
      stopStream();
    };
  }, [stopStream, stopQRScanning]);

  const switchToCameraMode = React.useCallback(() => {
    setScanMode('camera');
    setError(null);
    // Restart camera scanning
    if (onQRCodeScanned && !scanningRef.current) {
      setTimeout(() => {
        startQRScanning();
      }, 500);
    }
  }, [onQRCodeScanned, startQRScanning]);

  const switchToUploadMode = React.useCallback(() => {
    setScanMode('upload');
    stopQRScanning();
    setError(null);
  }, [stopQRScanning]);

  return (
    <div className={`relative overflow-hidden rounded-lg ${className}`}>
      {/* Mode Switcher */}
      <div className="absolute top-3 left-3 right-3 z-10 flex gap-2">
        <button
          onClick={switchToCameraMode}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            scanMode === 'camera'
              ? 'bg-primary text-white'
              : 'bg-white/90 text-text hover:bg-white'
          }`}
        >
          <Camera size={16} />
          Camera
        </button>
        <button
          onClick={switchToUploadMode}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            scanMode === 'upload'
              ? 'bg-primary text-white'
              : 'bg-white/90 text-text hover:bg-white'
          }`}
        >
          <Upload size={16} />
          Upload
        </button>
      </div>

      {scanMode === 'camera' && (
        <>
          <video
            ref={videoRef}
            className="w-full h-full object-cover bg-accent"
            playsInline
            muted
            autoPlay
          />

          {/* QR Scanner Overlay */}
          {started && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative">
                {/* Scanner frame */}
                <div className="w-48 h-48 border-2 border-primary rounded-lg">
                  {/* Corner indicators */}
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-primary rounded-tl-lg"></div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-primary rounded-tr-lg"></div>
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-primary rounded-bl-lg"></div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-primary rounded-br-lg"></div>
                  
                  {/* Scanning line animation */}
                  {scanning && (
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-primary animate-pulse transform transition-transform duration-1000" 
                         style={{ transform: `translateY(${Math.floor(Date.now() % 2000 / 2000 * 192)}px)` }}>
                    </div>
                  )}
                </div>
                
                {/* Status text */}
                <div className="text-center mt-4">
                  <div className="text-xs text-text/80 font-medium">
                    {scanning ? 'Scanning for QR code...' : 'Camera ready'}
                  </div>
                  {lastScannedData && (
                    <div className="text-xs text-primary mt-1">
                      Last scanned: {lastScannedData}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {!started && (
            <div className="absolute inset-0 flex items-center justify-center text-text/70">
              <div className="text-center">
                <div className="animate-pulse mb-2">📷</div>
                <div className="text-sm">Opening camera...</div>
              </div>
            </div>
          )}
        </>
      )}

      {scanMode === 'upload' && (
        <div className="flex items-center justify-center h-64 bg-accent rounded-lg">
          <div className="text-center p-6">
            <div className="mb-4">
              <Upload size={48} className="mx-auto text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-text mb-2">Upload QR Code Image</h3>
            <p className="text-sm text-text/70 mb-4">
              Select an image file containing a QR code to scan
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Choose File
                </>
              )}
            </button>
            {lastScannedData && (
              <div className="mt-4 text-xs text-primary">
                Last scanned: {lastScannedData}
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-x-0 bottom-0 m-3 rounded-md bg-danger/10 border border-danger/30 text-danger text-sm px-3 py-2">
          {error}
        </div>
      )}
    </div>
  );
}
