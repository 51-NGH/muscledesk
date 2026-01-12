import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Eye, EyeOff, Loader2, User, TrendingUp, Users, Calendar, ChartBar } from "lucide-react";
import { toast } from "sonner";
import muscleDeskLogo from "@/assets/muscledesk-logo.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState("");
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success("Account created successfully! You can now log in.");
          setIsSignUp(false);
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success("Welcome back!");
          navigate("/");
        }
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col lg:flex-row">
      {/* Left Side - Form */}
      <div className="flex-1 flex flex-col bg-background safe-area-pt">
        {/* Header */}
        <div className="p-6 lg:p-8">
          <div className="flex items-center gap-2.5">
            <img src={muscleDeskLogo} alt="MuscleDesk" className="h-9 w-9" />
            <span className="font-bold text-xl tracking-tight">MuscleDesk</span>
          </div>
        </div>

        {/* Form Container */}
        <div className="flex-1 flex items-center justify-center px-6 py-8 lg:px-12 xl:px-20">
          <div className="w-full max-w-[420px] animate-fade-in">
            {/* Welcome Text */}
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
                {isSignUp ? "Create Account" : "Welcome Back!"}
              </h1>
              <p className="text-muted-foreground text-base lg:text-lg">
                {isSignUp
                  ? "Start managing your gym with powerful tools"
                  : "Sign in to access your dashboard and manage your gym"}
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-sm font-medium">
                    Full Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="h-12 pl-11 rounded-xl bg-muted/50 border-border/50 focus:bg-background transition-colors text-base"
                      required={isSignUp}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    className="h-12 pl-11 rounded-xl bg-muted/50 border-border/50 focus:bg-background transition-colors text-base"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  {!isSignUp && (
                    <button
                      type="button"
                      className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className="h-12 pl-11 pr-12 rounded-xl bg-muted/50 border-border/50 focus:bg-background transition-colors text-base"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded-lg"
                  >
                    {showPassword ? (
                      <EyeOff className="h-[18px] w-[18px]" />
                    ) : (
                      <Eye className="h-[18px] w-[18px]" />
                    )}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Please wait...
                  </>
                ) : isSignUp ? (
                  "Create Account"
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            {/* Toggle Sign Up / Sign In */}
            <div className="mt-8 text-center">
              <span className="text-muted-foreground text-sm">
                {isSignUp ? "Already have an account?" : "Don't have an account?"}
              </span>{" "}
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-primary font-semibold text-sm hover:underline underline-offset-4"
              >
                {isSignUp ? "Sign in" : "Sign up"}
              </button>
            </div>

            {/* Terms */}
            <p className="text-center text-xs text-muted-foreground mt-8">
              By continuing, you agree to our{" "}
              <span className="text-foreground/70 hover:text-primary cursor-pointer transition-colors">Terms of Service</span>
              {" "}and{" "}
              <span className="text-foreground/70 hover:text-primary cursor-pointer transition-colors">Privacy Policy</span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 text-center safe-area-pb lg:hidden">
          <p className="text-xs text-muted-foreground">
            © 2025 MuscleDesk • Admin Portal
          </p>
        </div>
      </div>

      {/* Right Side - Hero (Hidden on mobile) */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/70">
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
              Effortlessly manage your gym and members.
            </h2>
            <p className="text-white/80 text-lg mb-12">
              Access your dashboard to track attendance, manage memberships, and grow your fitness business.
            </p>

            {/* Stats Preview Cards */}
            <div className="grid grid-cols-2 gap-4 mb-12">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-white/70 text-sm font-medium">Active Members</span>
                </div>
                <p className="text-3xl font-bold text-white">2,847</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-white/70 text-sm font-medium">Revenue</span>
                </div>
                <p className="text-3xl font-bold text-white">₹4.2L</p>
              </div>
            </div>

            {/* Feature List */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-white/90">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <span className="text-sm font-medium">Automated expiry reminders</span>
              </div>
              <div className="flex items-center gap-3 text-white/90">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                  <ChartBar className="w-3.5 h-3.5" />
                </div>
                <span className="text-sm font-medium">Advanced analytics & insights</span>
              </div>
              <div className="flex items-center gap-3 text-white/90">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <span className="text-sm font-medium">Multi-branch management</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="absolute bottom-8 left-12 xl:left-20 right-12 xl:right-20">
            <p className="text-white/50 text-xs">
              © 2025 MuscleDesk • Trusted by 500+ gyms across India
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
