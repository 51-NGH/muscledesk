import { ReactNode } from "react";
import { useMemberAuth } from "@/contexts/MemberAuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Home, 
  QrCode, 
  Clock, 
  CreditCard, 
  LogOut,
  User,
  ChevronLeft
} from "lucide-react";
import muscledeskLogo from "@/assets/muscledesk-logo.png";

interface MemberLayoutProps {
  children: ReactNode;
  title: string;
  showBack?: boolean;
}

const navItems = [
  { icon: Home, label: "Home", path: "/member" },
  { icon: QrCode, label: "QR Code", path: "/member/qr" },
  { icon: Clock, label: "Attendance", path: "/member/attendance" },
  { icon: CreditCard, label: "Payments", path: "/member/payments" },
];

export function MemberLayout({ children, title, showBack }: MemberLayoutProps) {
  const { member, signOut } = useMemberAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate("/member/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {showBack ? (
              <button 
                onClick={() => navigate(-1)}
                className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            ) : (
              <img src={muscledeskLogo} alt="MuscleDesk" className="h-8 w-8" />
            )}
            <h1 className="font-semibold text-lg">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleSignOut}
              className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 pb-24 overflow-auto">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-xl border-t border-border safe-area-pb">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path === "/member" && location.pathname === "/member");
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                  isActive 
                    ? "text-primary bg-primary/10" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <item.icon className={`h-5 w-5 ${isActive ? "scale-110" : ""} transition-transform`} />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
