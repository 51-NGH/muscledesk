import { useState, useRef, useEffect, useCallback } from "react";
import { useMemberAuth } from "@/contexts/MemberAuthContext";
import { MemberLayout } from "@/components/member-portal/MemberLayout";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Download, X, AlertTriangle, WifiOff, CheckCircle2 } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { toast } from "sonner";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { useAudioFeedback } from "@/hooks/useAudioFeedback";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export default function MemberQRCode() {
  const { member, isOffline, loading, memberLoading } = useMemberAuth();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSuccessPulse, setShowSuccessPulse] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const { triggerScanSuccess, triggerScanError, triggerScanWarning } = useHapticFeedback();
  const { playSound, prepareAudio } = useAudioFeedback();

  // Memoized callback for check-in detection
  const handleCheckInDetected = useCallback(() => {
    console.log('[MemberQR] Check-in detected! Triggering feedback...');
    
    // Trigger success animation
    setShowSuccessPulse(true);
    
    // Play success sound - this should work on all devices
    console.log('[MemberQR] Playing approval sound...');
    playSound('approve');
    
    // Trigger haptic feedback with slight delay
    console.log('[MemberQR] Triggering haptic...');
    setTimeout(() => {
      const hapticResult = triggerScanSuccess();
      console.log('[MemberQR] Haptic result:', hapticResult);
    }, 50);
    
    // Show toast
    toast.success('Check-in successful! 💪', {
      description: 'Your attendance has been recorded.',
      duration: 3000,
    });
    
    // Hide animation after 3 seconds
    setTimeout(() => {
      setShowSuccessPulse(false);
    }, 3000);
  }, [playSound, triggerScanSuccess]);

  // Track last known attendance to detect new check-ins
  const lastAttendanceRef = useRef<string | null>(null);

  // Poll for new attendance records (secure approach - uses edge function)
  useEffect(() => {
    if (!member?.id) return;

    console.log('[MemberQR] Setting up secure polling for member:', member.id);
    
    // Prepare audio context on mount
    prepareAudio();

    const checkForNewAttendance = async () => {
      try {
        // Call edge function to get latest attendance (bypasses RLS securely)
        const { data, error } = await supabase.functions.invoke('get-member-latest-attendance', {
          body: { member_id: member.id }
        });

        if (error) {
          console.error('[MemberQR] Polling error:', error);
          return;
        }

        if (data?.attendance_id && data.attendance_id !== lastAttendanceRef.current) {
          // New check-in detected!
          if (lastAttendanceRef.current !== null) {
            // Only trigger feedback if this isn't the first load
            console.log('[MemberQR] New check-in detected via polling!');
            handleCheckInDetected();
          }
          lastAttendanceRef.current = data.attendance_id;
        }
      } catch (err) {
        console.error('[MemberQR] Polling fetch error:', err);
      }
    };

    // Initial check
    checkForNewAttendance();

    // Poll every 3 seconds
    const intervalId = setInterval(checkForNewAttendance, 3000);

    return () => {
      console.log('[MemberQR] Cleaning up polling');
      clearInterval(intervalId);
    };
  }, [member?.id, handleCheckInDetected, prepareAudio]);

  // Show loading state
  if (loading || memberLoading || !member) {
    return (
      <MemberLayout title="QR Code">
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
            <p className="text-muted-foreground">Loading QR Code...</p>
          </div>
        </div>
      </MemberLayout>
    );
  }

  const expiryDate = parseISO(member.expiry_date);
  const isExpired = differenceInDays(expiryDate, new Date()) < 0;
  const isBlocked = member.is_blocked;
  const isInvalid = isExpired || isBlocked;

  const handleDownload = () => {
    const canvas = document.querySelector("#member-qr-code canvas") as HTMLCanvasElement;
    if (canvas) {
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `${member.member_id}-qr-code.png`;
      link.href = url;
      link.click();
      toast.success("QR Code downloaded!");
    }
  };


  const QRContent = ({ size = 200 }: { size?: number }) => (
    <div className="flex flex-col items-center relative">
      {/* Success Pulse Animation Overlay */}
      {showSuccessPulse && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="absolute inset-0 bg-md-green/20 rounded-2xl animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-full rounded-2xl border-4 border-md-green animate-[ping_1s_ease-out_infinite]" />
          </div>
          <div className="relative z-20 bg-md-green rounded-full p-4 animate-scale-in shadow-lg">
            <CheckCircle2 className="h-12 w-12 text-white" />
          </div>
        </div>
      )}
      <div 
        id="member-qr-code"
        className={cn(
          "p-4 sm:p-5 bg-white rounded-2xl shadow-lg transition-all duration-300",
          isInvalid && "opacity-50 grayscale",
          showSuccessPulse && "ring-4 ring-md-green ring-offset-4 ring-offset-background"
        )}
      >
        <QRCodeCanvas
          value={member.qr_token}
          size={size}
          level="H"
          includeMargin={false}
          bgColor="#FFFFFF"
          fgColor="#000000"
        />
      </div>
    </div>
  );

  return (
    <MemberLayout title="QR Code">
      <div className="space-y-5 animate-fade-in">
        {/* Offline notice */}
        {isOffline && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3 animate-slide-up">
            <WifiOff className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-700 dark:text-amber-500 text-sm">You're Offline</p>
              <p className="text-xs text-amber-600/80 mt-1">
                Your QR code is available from cache. Check-in may not work until you're back online.
              </p>
            </div>
          </div>
        )}

        {/* Warning for invalid QR */}
        {isInvalid && !isOffline && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-start gap-3 animate-slide-up">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-destructive text-sm">QR Code Invalid</p>
              <p className="text-xs text-destructive/80 mt-1">
                {isBlocked 
                  ? "Your account has been blocked. Contact your gym."
                  : "Your membership has expired. Please renew to use check-in."}
              </p>
            </div>
          </div>
        )}

        {/* QR Code Card - Clickable for fullscreen */}
        <div className="bg-card rounded-2xl border border-border p-5 sm:p-6">
          <div 
            className="flex flex-col items-center cursor-pointer" 
            ref={qrRef}
            onClick={() => {
              if (isInvalid) {
                // Trigger error haptic when tapping disabled QR
                if (isBlocked) {
                  triggerScanError();
                } else {
                  triggerScanWarning();
                }
                toast.error(isBlocked ? "Account blocked" : "Membership expired", {
                  description: "Please contact your gym to resolve this."
                });
              } else {
                setIsFullscreen(true);
              }
            }}
          >
            <QRContent size={Math.min(220, window.innerWidth - 120)} />
            <div className="mt-4 text-center">
              <p className="font-mono text-sm text-muted-foreground">{member.member_id}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isInvalid ? "QR disabled" : "Tap to view fullscreen"}
              </p>
            </div>
          </div>

          {/* Download Button */}
          <div className="mt-6">
            <Button
              className="w-full h-12 rounded-xl"
              onClick={handleDownload}
              disabled={isInvalid}
            >
              <Download className="h-4 w-4 mr-2" />
              Download QR Code
            </Button>
          </div>
        </div>

        {/* Member Info */}
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="font-semibold mb-3 text-sm">Member Details</h3>
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-xs sm:text-sm">Name</span>
              <span className="font-medium text-sm">{member.full_name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-xs sm:text-sm">Member ID</span>
              <span className="font-mono text-xs sm:text-sm">{member.member_id}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-xs sm:text-sm">Plan</span>
              <span className="text-sm">{member.plan_name || "Standard"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-xs sm:text-sm">Valid Until</span>
              <span className={`text-sm ${isExpired ? "text-destructive" : ""}`}>
                {format(expiryDate, "MMM d, yyyy")}
              </span>
            </div>
          </div>
        </div>

        {/* How to use */}
        <div className="bg-muted/50 rounded-xl p-4 border border-border">
          <h4 className="font-medium mb-3 text-sm">How to Check In</h4>
          <ol className="text-xs sm:text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <span className="bg-primary/10 text-primary text-[10px] sm:text-xs font-bold min-w-[20px] h-5 flex items-center justify-center rounded">1</span>
              <span>Open this page on your phone</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-primary/10 text-primary text-[10px] sm:text-xs font-bold min-w-[20px] h-5 flex items-center justify-center rounded">2</span>
              <span>Show the QR code to the scanner at entrance</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-primary/10 text-primary text-[10px] sm:text-xs font-bold min-w-[20px] h-5 flex items-center justify-center rounded">3</span>
              <span>Wait for confirmation beep</span>
            </li>
          </ol>
        </div>
      </div>

      {/* Fullscreen Modal - Click anywhere to close */}
      {isFullscreen && (
        <div 
          className="fixed inset-0 z-[100] bg-black flex items-center justify-center safe-area-pt safe-area-pb"
          onClick={() => setIsFullscreen(false)}
        >
          <button 
            className="absolute top-4 right-4 h-12 w-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors touch-target safe-area-pt"
            onClick={() => setIsFullscreen(false)}
          >
            <X className="h-6 w-6" />
          </button>
          <div className="text-center px-6" onClick={(e) => e.stopPropagation()}>
            <div id="member-qr-code-fullscreen" className="p-6 sm:p-8 bg-white rounded-3xl">
              <QRCodeCanvas
                value={member.qr_token}
                size={Math.min(300, window.innerWidth - 100)}
                level="H"
                includeMargin={false}
                bgColor="#FFFFFF"
                fgColor="#000000"
              />
            </div>
            <p className="text-white font-mono text-lg mt-4">{member.member_id}</p>
            <p className="text-white/60 text-sm mt-1">{member.full_name}</p>
            <p className="text-white/40 text-xs mt-4">Tap anywhere to close</p>
          </div>
        </div>
      )}
    </MemberLayout>
  );
}
