import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { 
  Camera, 
  CameraOff, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Zap,
  Clock,
  User,
  Shield,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAudioFeedback } from "@/hooks/useAudioFeedback";
import { useSoundSettings } from "@/hooks/useSoundSettings";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";

interface QRScannerProps {
  onScan: (qrToken: string) => Promise<{
    success: boolean;
    message?: string;
    error?: string;
    member_name?: string;
    member_id?: string;
    total_visits?: number;
  }>;
  isOpen: boolean;
  onClose: () => void;
}

interface ScanResult {
  success: boolean;
  message: string;
  memberName?: string;
  memberId?: string;
  totalVisits?: number;
  type: 'success' | 'error' | 'warning' | 'duplicate';
}

// Client-side scan cache to prevent duplicate API calls
const scanCache = new Map<string, { timestamp: number; result: ScanResult }>();
const CACHE_DURATION = 5000; // 5 seconds

export function QRScanner({ onScan, isOpen, onClose }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { settings } = useSoundSettings();
  const { playSound, prepareAudio } = useAudioFeedback(settings);
  const { triggerHaptic, triggerScanSuccess, triggerScanError, triggerScanWarning } = useHapticFeedback();

  // Clean up expired cache entries
  const cleanCache = useCallback(() => {
    const now = Date.now();
    scanCache.forEach((value, key) => {
      if (now - value.timestamp > CACHE_DURATION) {
        scanCache.delete(key);
      }
    });
  }, []);

  useEffect(() => {
    if (isOpen && !isScanning) {
      startScanner();
    }
    return () => {
      stopScanner();
    };
  }, [isOpen]);

  // Periodic cache cleanup
  useEffect(() => {
    const interval = setInterval(cleanCache, 10000);
    return () => clearInterval(interval);
  }, [cleanCache]);

  const startScanner = async () => {
    try {
      setError(null);
      setLastResult(null);
      prepareAudio();
      
      const html5QrCode = new Html5Qrcode("qr-reader-advanced");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 15, // Higher FPS for faster detection
          qrbox: { width: 280, height: 280 },
          aspectRatio: 1,
          disableFlip: false,
        },
        handleQRDetected,
        () => {} // Ignore non-detections
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error("Failed to start scanner:", err);
      setError(err.message || "Failed to access camera. Please allow camera permissions.");
    }
  };

  const handleQRDetected = async (decodedText: string) => {
    if (processingRef.current) return;
    
    // Check client-side cache first
    const cached = scanCache.get(decodedText);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      // Show cached result without API call
      playSound(cached.result.type === 'success' ? 'approve' : 'warning');
      triggerHaptic('light');
      setLastResult({
        ...cached.result,
        message: cached.result.type === 'success' 
          ? `Already checked in!` 
          : cached.result.message
      });
      
      setTimeout(() => setLastResult(null), 2000);
      return;
    }
    
    processingRef.current = true;
    
    try {
      const result = await onScan(decodedText);
      
      const scanResult: ScanResult = {
        success: result.success,
        message: result.success ? result.message || "Check-in successful!" : result.error || "Scan failed",
        memberName: result.member_name,
        memberId: result.member_id,
        totalVisits: result.total_visits,
        type: result.success ? 'success' : 
              result.error?.includes('already') ? 'duplicate' :
              result.error?.includes('expired') ? 'warning' : 'error'
      };
      
      // Cache the result
      scanCache.set(decodedText, { timestamp: Date.now(), result: scanResult });
      
      // Play appropriate sound and haptic
      if (scanResult.success) {
        playSound('approve');
        triggerScanSuccess(); // Sweet double-tap
        setScanCount(prev => prev + 1);
      } else if (scanResult.type === 'duplicate') {
        playSound('warning');
        triggerHaptic('light');
      } else if (scanResult.type === 'warning') {
        playSound('deny');
        triggerScanWarning(); // Triple pulse for expired
      } else {
        playSound('deny');
        triggerScanError(); // Long buzz for errors
      }
      
      setLastResult(scanResult);

      // Reset for next scan
      setTimeout(() => {
        processingRef.current = false;
        setLastResult(null);
      }, scanResult.success ? 2500 : 2000);
      
    } catch (err) {
      processingRef.current = false;
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (err) {
        // Ignore
      }
    }
    setIsScanning(false);
    processingRef.current = false;
  };

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  if (!isOpen) return null;

  const getResultStyles = () => {
    if (!lastResult) return {};
    
    switch (lastResult.type) {
      case 'success':
        return { bg: 'bg-md-green', icon: CheckCircle2 };
      case 'duplicate':
        return { bg: 'bg-md-orange', icon: Clock };
      case 'warning':
        return { bg: 'bg-md-orange', icon: Shield };
      default:
        return { bg: 'bg-destructive', icon: AlertCircle };
    }
  };

  const resultStyles = getResultStyles();
  const ResultIcon = resultStyles.icon || AlertCircle;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div ref={containerRef} className="flex flex-col h-full">
        {/* Header */}
        <div className="relative z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 backdrop-blur-sm">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Quick Scan</h2>
              <p className="text-xs text-white/60">Point at member's QR code</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {scanCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-md-green/20 backdrop-blur-sm">
                <User className="h-3.5 w-3.5 text-md-green" />
                <span className="text-sm font-medium text-md-green">{scanCount}</span>
              </div>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleClose}
              className="h-10 w-10 rounded-xl bg-white/10 hover:bg-white/20 text-white"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Scanner Area */}
        <div className="flex-1 flex flex-col items-center justify-center relative">
          {error ? (
            <div className="text-center p-6">
              <div className="h-20 w-20 rounded-2xl bg-destructive/20 flex items-center justify-center mx-auto mb-4">
                <CameraOff className="h-10 w-10 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Camera Error</h3>
              <p className="text-white/60 mb-6 max-w-xs">{error}</p>
              <Button onClick={startScanner} className="rounded-xl">
                <Camera className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </div>
          ) : (
            <>
              {/* Scanner viewport */}
              <div className="relative">
                {/* Scanning frame with animated corners */}
                <div className="absolute -inset-4 pointer-events-none z-10">
                  {/* Corner decorations */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-3 border-l-3 border-primary rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-3 border-r-3 border-primary rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-3 border-l-3 border-primary rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-3 border-r-3 border-primary rounded-br-lg" />
                  
                  {/* Scanning line animation */}
                  {isScanning && !lastResult && (
                    <div className="absolute inset-x-4 top-4 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan-line" />
                  )}
                </div>

                <div
                  id="qr-reader-advanced"
                  className="w-[300px] h-[300px] rounded-2xl overflow-hidden bg-black"
                />
                
                {/* Result Overlay */}
                {lastResult && (
                  <div
                    className={cn(
                      "absolute inset-0 flex flex-col items-center justify-center rounded-2xl transition-all duration-300",
                      resultStyles.bg
                    )}
                  >
                    <div className="animate-scale-in">
                      <ResultIcon className="h-16 w-16 text-white mb-3" />
                    </div>
                    <p className="text-white font-semibold text-lg text-center px-4 animate-fade-in">
                      {lastResult.message}
                    </p>
                    {lastResult.memberName && (
                      <div className="mt-3 px-4 py-2 rounded-lg bg-white/20 backdrop-blur-sm animate-fade-in">
                        <p className="text-white font-medium">{lastResult.memberName}</p>
                        {lastResult.memberId && (
                          <p className="text-white/80 text-sm">ID: {lastResult.memberId}</p>
                        )}
                        {lastResult.totalVisits && lastResult.success && (
                          <p className="text-white/80 text-xs mt-1">Visit #{lastResult.totalVisits}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Status indicator */}
              <div className="mt-8 flex flex-col items-center gap-3">
                {isScanning && !lastResult && (
                  <>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm">
                      <div className="h-2 w-2 rounded-full bg-md-green animate-pulse" />
                      <span className="text-sm text-white/80">Scanning...</span>
                    </div>
                    <p className="text-white/40 text-xs">Hold steady for best results</p>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="relative z-10 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <Button 
            variant="outline" 
            className="w-full h-12 rounded-xl bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white" 
            onClick={handleClose}
          >
            Close Scanner
          </Button>
        </div>
      </div>
      
      {/* Custom styles for scan animation */}
      <style>{`
        @keyframes scan-line {
          0%, 100% { transform: translateY(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          50% { transform: translateY(280px); }
        }
        .animate-scan-line {
          animation: scan-line 2s ease-in-out infinite;
        }
        @keyframes scale-in {
          0% { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out forwards;
        }
        .border-3 {
          border-width: 3px;
        }
      `}</style>
    </div>
  );
}