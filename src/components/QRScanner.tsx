import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAudioFeedback } from "@/hooks/useAudioFeedback";
import { useSoundSettings } from "@/hooks/useSoundSettings";

interface QRScannerProps {
  onScan: (qrToken: string) => Promise<{
    success: boolean;
    message?: string;
    error?: string;
    member_name?: string;
    member_id?: string;
  }>;
  isOpen: boolean;
  onClose: () => void;
}

export function QRScanner({ onScan, isOpen, onClose }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    message: string;
    memberName?: string;
    memberId?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScannedRef = useRef<string | null>(null);
  const processingRef = useRef(false);
  
  // Audio feedback with settings
  const { settings } = useSoundSettings();
  const { playSound, prepareAudio } = useAudioFeedback(settings);

  useEffect(() => {
    if (isOpen && !isScanning) {
      startScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const startScanner = async () => {
    try {
      setError(null);
      setLastResult(null);
      
      // Prepare audio context on scanner start (requires user interaction)
      prepareAudio();
      
      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          // Prevent duplicate scans
          if (processingRef.current || lastScannedRef.current === decodedText) {
            return;
          }
          
          processingRef.current = true;
          lastScannedRef.current = decodedText;

          try {
            const result = await onScan(decodedText);
            
            // Play audio feedback based on result
            playSound(result.success ? 'approve' : 'deny');
            
            setLastResult({
              success: result.success,
              message: result.success ? result.message || "Check-in successful!" : result.error || "Scan failed",
              memberName: result.member_name,
              memberId: result.member_id,
            });

            // Reset for next scan after delay
            setTimeout(() => {
              lastScannedRef.current = null;
              processingRef.current = false;
              setLastResult(null);
            }, 3000);
          } catch (err) {
            processingRef.current = false;
            lastScannedRef.current = null;
          }
        },
        () => {
          // QR code not detected - ignore
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error("Failed to start scanner:", err);
      setError(err.message || "Failed to access camera. Please allow camera permissions.");
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (err) {
        // Ignore errors when stopping
      }
    }
    setIsScanning(false);
    lastScannedRef.current = null;
    processingRef.current = false;
  };

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">QR Scanner</h2>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <XCircle className="h-5 w-5" />
          </Button>
        </div>

        {/* Scanner Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          {error ? (
            <div className="text-center">
              <CameraOff className="h-16 w-16 mx-auto text-destructive mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Camera Error</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={startScanner}>Try Again</Button>
            </div>
          ) : (
            <>
              <div className="relative">
                <div
                  id="qr-reader"
                  className="w-[300px] h-[300px] rounded-xl overflow-hidden border-2 border-primary"
                />
                
                {/* Scan Result Overlay */}
                {lastResult && (
                  <div
                    className={cn(
                      "absolute inset-0 flex flex-col items-center justify-center rounded-xl",
                      lastResult.success ? "bg-md-green/90" : "bg-destructive/90"
                    )}
                  >
                    {lastResult.success ? (
                      <CheckCircle2 className="h-16 w-16 text-white mb-3" />
                    ) : (
                      <AlertCircle className="h-16 w-16 text-white mb-3" />
                    )}
                    <p className="text-white font-semibold text-lg text-center px-4">
                      {lastResult.message}
                    </p>
                    {lastResult.memberName && (
                      <p className="text-white/90 text-sm mt-1">
                        {lastResult.memberName} ({lastResult.memberId})
                      </p>
                    )}
                  </div>
                )}
              </div>

              <p className="text-muted-foreground text-center mt-6">
                Point camera at member's QR code to check in
              </p>

              {isScanning && (
                <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                  <div className="h-2 w-2 rounded-full bg-md-green animate-pulse" />
                  Camera active
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <Button variant="outline" className="w-full" onClick={handleClose}>
            Close Scanner
          </Button>
        </div>
      </div>
    </div>
  );
}
