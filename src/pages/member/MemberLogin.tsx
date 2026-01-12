import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useMemberAuth } from "@/contexts/MemberAuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Dumbbell, Lock, Mail, Loader2 } from "lucide-react";
import muscledeskLogo from "@/assets/muscledesk-logo.png";

export default function MemberLogin() {
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useMemberAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/member";

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
    <div className="min-h-screen min-h-[100dvh] flex flex-col bg-gradient-to-br from-background via-background to-muted safe-area-pt">
      {/* Header */}
      <div className="p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <img src={muscledeskLogo} alt="MuscleDesk" className="h-8 w-8" />
          <span className="font-bold text-lg">MuscleDesk</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-6 sm:px-6">
        <div className="w-full max-w-[400px] animate-slide-up">
          {/* Hero Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary/10 mb-4">
              <Dumbbell className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Member Portal</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Sign in with your email and 4-digit PIN
            </p>
          </div>

          {/* Login Form */}
          <div className="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-lg shadow-primary/5">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 sm:h-11 pl-10 rounded-xl bg-background text-base"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pin" className="text-sm font-medium">
                  4-Digit PIN
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="pin"
                    type="password"
                    inputMode="numeric"
                    pattern="\d{4}"
                    maxLength={4}
                    placeholder="••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    className="h-12 sm:h-11 pl-10 rounded-xl bg-background text-center text-xl tracking-[0.5em] font-mono"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 sm:h-11 rounded-xl text-base font-semibold"
                disabled={isLoading || pin.length !== 4}
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
          </div>

          {/* Info Note */}
          <div className="mt-6 p-4 rounded-xl bg-muted/50 border border-border">
            <p className="text-sm text-muted-foreground text-center">
              <span className="font-medium text-foreground">First time?</span>
              <br />
              Check your email for the PIN setup link from your gym.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 text-center safe-area-pb">
        <p className="text-xs text-muted-foreground">
          Powered by MuscleDesk • Member Portal
        </p>
      </div>
    </div>
  );
}
