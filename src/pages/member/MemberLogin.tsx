import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useMemberAuth } from "@/contexts/MemberAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Dumbbell, Lock, Mail, Loader2, Activity, Calendar, QrCode, Trophy, WifiOff } from "lucide-react";
import muscledeskMembersDark from "@/assets/muscledesk-members-dark.png";
import muscledeskMembersLight from "@/assets/muscledesk-members-light.png";
import { useTheme } from "next-themes";

export default function MemberLogin() {
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const { signIn } = useMemberAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { resolvedTheme } = useTheme();
  
  const memberLogo = resolvedTheme === "dark" ? muscledeskMembersDark : muscledeskMembersLight;

  const from = location.state?.from?.pathname || "/member";

  // Listen for online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (pin.length !== 4) {
      toast.error("PIN must be 4 digits");
      return;
    }
    
    setIsLoading(true);

    const { error } = await signIn(email, pin);

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
      return;
    }

    toast.success("Welcome back!");
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col lg:flex-row">
      {/* Left Side - Form */}
      <div className="flex-1 flex flex-col bg-background safe-area-pt">
        {/* Header */}
        <div className="p-6 lg:p-8">
          <div className="flex items-center gap-3">
            <img src={memberLogo} alt="MuscleDesk Members" className="h-10 w-auto" />
          </div>
        </div>

        {/* Form Container */}
        <div className="flex-1 flex items-center justify-center px-6 py-8 lg:px-12 xl:px-20">
          <div className="w-full max-w-[420px] animate-fade-in">
            {/* Welcome Text */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                <Dumbbell className="w-4 h-4" />
                Member Portal
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
                Welcome Back!
              </h1>
              <p className="text-muted-foreground text-base lg:text-lg">
                Sign in with your email and 4-digit PIN to access your membership
              </p>
            </div>

            {/* Offline Warning */}
            {isOffline && (
              <div className="mb-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
                <WifiOff className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-700 dark:text-amber-500 text-sm">You're Offline</p>
                  <p className="text-xs text-amber-600/80 mt-1">
                    Please connect to the internet to sign in.
                  </p>
                </div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 pl-11 rounded-xl bg-muted/50 border-border/50 focus:bg-background transition-colors text-base"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pin" className="text-sm font-medium">
                  4-Digit PIN
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="pin"
                    type="password"
                    inputMode="numeric"
                    pattern="\d{4}"
                    maxLength={4}
                    placeholder="••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    className="h-12 pl-11 rounded-xl bg-muted/50 border-border/50 focus:bg-background transition-colors text-center text-xl tracking-[0.5em] font-mono"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300"
                disabled={isLoading || pin.length !== 4 || isOffline}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            {/* Info Note */}
            <div className="mt-8 p-4 rounded-xl bg-muted/50 border border-border/50">
              <p className="text-sm text-muted-foreground text-center">
                <span className="font-semibold text-foreground">First time?</span>
                <br />
                Check your email for the PIN setup link from your gym.
              </p>
            </div>

            {/* Terms */}
            <p className="text-center text-xs text-muted-foreground mt-8">
              By signing in, you agree to our{" "}
              <span className="text-foreground/70 hover:text-primary cursor-pointer transition-colors">Terms</span>
              {" "}and{" "}
              <span className="text-foreground/70 hover:text-primary cursor-pointer transition-colors">Privacy Policy</span>
            </p>
          </div>
        </div>

        {/* Footer - Mobile Only */}
        <div className="p-6 text-center safe-area-pb lg:hidden">
          <p className="text-xs text-muted-foreground">
            © 2025 MuscleDesk • Member Portal
          </p>
        </div>
      </div>

      {/* Right Side - Hero (Hidden on mobile) */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white rounded-full blur-3xl opacity-50" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 py-12">
          <div className="max-w-lg">
            {/* Hero Title */}
            <h2 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-6">
              Your fitness journey, all in one place.
            </h2>
            <p className="text-white/80 text-lg mb-12">
              Track your attendance, view payment history, and stay connected with your gym.
            </p>

            {/* Feature Cards */}
            <div className="grid grid-cols-2 gap-4 mb-12">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mb-4">
                  <QrCode className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-white font-semibold mb-1">Quick Check-in</h3>
                <p className="text-white/70 text-sm">Scan QR code for instant attendance</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mb-4">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-white font-semibold mb-1">Track Progress</h3>
                <p className="text-white/70 text-sm">View your attendance history</p>
              </div>
            </div>

            {/* Feature List */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-white/90">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <span className="text-sm font-medium">View membership status</span>
              </div>
              <div className="flex items-center gap-3 text-white/90">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                  <Trophy className="w-3.5 h-3.5" />
                </div>
                <span className="text-sm font-medium">Track your fitness goals</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="absolute bottom-8 left-12 xl:left-20 right-12 xl:right-20">
            <p className="text-white/50 text-xs">
              © 2025 MuscleDesk • Member Portal
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
