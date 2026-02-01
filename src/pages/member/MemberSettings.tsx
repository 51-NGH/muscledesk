import { useState } from "react";
import { MemberLayout } from "@/components/member-portal/MemberLayout";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { 
  Vibrate, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Smartphone,
  Volume2,
  Moon,
  Sun
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

export default function MemberSettings() {
  const { triggerHaptic, triggerScanSuccess, triggerScanError, triggerScanWarning, isSupported } = useHapticFeedback();
  const [lastTested, setLastTested] = useState<string | null>(null);
  const { theme, setTheme, actualTheme } = useTheme();

  const hapticTests = [
    {
      id: 'success',
      label: 'Success',
      description: 'Sweet double-tap for check-ins',
      icon: CheckCircle2,
      color: 'text-md-green',
      bgColor: 'bg-md-green/10',
      action: () => triggerScanSuccess(),
    },
    {
      id: 'warning',
      label: 'Warning',
      description: 'Triple pulse for expired membership',
      icon: AlertTriangle,
      color: 'text-md-orange',
      bgColor: 'bg-md-orange/10',
      action: () => triggerScanWarning(),
    },
    {
      id: 'error',
      label: 'Error',
      description: 'Long buzz for blocked accounts',
      icon: XCircle,
      color: 'text-md-red',
      bgColor: 'bg-md-red/10',
      action: () => triggerScanError(),
    },
    {
      id: 'light',
      label: 'Light Tap',
      description: 'Subtle feedback for buttons',
      icon: Vibrate,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
      action: () => triggerHaptic('light'),
    },
  ];

  const handleTest = (test: typeof hapticTests[0]) => {
    const result = test.action();
    setLastTested(test.id);
    
    if (result) {
      toast.success(`${test.label} haptic triggered!`, {
        description: "Did you feel it?",
        duration: 2000,
      });
    } else {
      toast.error("Haptic not supported", {
        description: "Your device doesn't support vibration.",
        duration: 3000,
      });
    }

    // Clear highlight after animation
    setTimeout(() => setLastTested(null), 500);
  };

  return (
    <MemberLayout title="Settings">
      <div className="space-y-6 animate-fade-in">
        {/* Haptic Feedback Section */}
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center",
              isSupported ? "bg-primary/10" : "bg-muted"
            )}>
              <Vibrate className={cn(
                "h-5 w-5",
                isSupported ? "text-primary" : "text-muted-foreground"
              )} />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold">Haptic Feedback</h2>
              <p className="text-xs text-muted-foreground">
                {isSupported 
                  ? "Your device supports vibration" 
                  : "Vibration not available on this device"}
              </p>
            </div>
            {isSupported ? (
              <span className="px-2 py-1 rounded-full bg-md-green/10 text-md-green text-xs font-medium">
                Supported
              </span>
            ) : (
              <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                Unavailable
              </span>
            )}
          </div>

          {/* Device Note */}
          <div className="bg-muted/50 rounded-lg p-3 mb-4 flex items-start gap-2">
            <Smartphone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Haptic feedback works best on mobile devices. Desktop browsers typically don't support vibration.
            </p>
          </div>

          {/* Test Buttons */}
          <div className="space-y-2">
            <p className="text-sm font-medium mb-3">Test Patterns</p>
            <div className="grid grid-cols-2 gap-2">
              {hapticTests.map((test) => (
                <button
                  key={test.id}
                  onClick={() => handleTest(test)}
                  disabled={!isSupported}
                  className={cn(
                    "p-3 rounded-xl border border-border transition-all text-left",
                    "hover:border-primary/50 active:scale-[0.98]",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    lastTested === test.id && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  )}
                >
                  <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center mb-2", test.bgColor)}>
                    <test.icon className={cn("h-4 w-4", test.color)} />
                  </div>
                  <p className="text-sm font-medium">{test.label}</p>
                  <p className="text-[10px] text-muted-foreground line-clamp-1">{test.description}</p>
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Appearance Section */}
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              {actualTheme === 'dark' ? (
                <Moon className="h-5 w-5 text-primary" />
              ) : (
                <Sun className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="flex-1">
              <h2 className="font-semibold">Appearance</h2>
              <p className="text-xs text-muted-foreground">Customize the app theme</p>
            </div>
          </div>

          <div className="space-y-3">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={cn(
                  "w-full p-3 rounded-xl border transition-all flex items-center justify-between",
                  theme === t 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/30"
                )}
              >
                <div className="flex items-center gap-3">
                  {t === 'light' && <Sun className="h-4 w-4" />}
                  {t === 'dark' && <Moon className="h-4 w-4" />}
                  {t === 'system' && <Smartphone className="h-4 w-4" />}
                  <span className="text-sm font-medium capitalize">{t}</span>
                </div>
                {theme === t && (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                )}
              </button>
            ))}
          </div>
        </Card>

        {/* Sound Section */}
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Volume2 className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold">Sound Effects</h2>
              <p className="text-xs text-muted-foreground">Audio feedback for actions</p>
            </div>
            <Switch defaultChecked />
          </div>
        </Card>

        {/* App Info */}
        <div className="text-center pt-4 pb-8">
          <p className="text-xs text-muted-foreground">MuscleDesk Members v1.0.0</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">Made with 💪 for gym members</p>
        </div>
      </div>
    </MemberLayout>
  );
}
