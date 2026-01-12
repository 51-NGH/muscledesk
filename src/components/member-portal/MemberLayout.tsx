import { ReactNode, RefObject } from "react";
import { useMemberAuth } from "@/contexts/MemberAuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { OfflineIndicator } from "@/components/offline/OfflineIndicator";
import { 
  Home, 
  QrCode, 
  Clock, 
  CreditCard, 
  LogOut,
  WifiOff
} from "lucide-react";
import muscledeskLogo from "@/assets/muscledesk-logo.png";

interface MemberLayoutProps {
  children: ReactNode;
  title: string;
  showBack?: boolean;
  containerRef?: RefObject<HTMLDivElement>;
}

const navItems = [
  { icon: Home, label: "Home", path: "/member" },
  { icon: QrCode, label: "QR Code", path: "/member/qr" },
  { icon: Clock, label: "Attendance", path: "/member/attendance" },
  { icon: CreditCard, label: "Payments", path: "/member/payments" },
];

export function MemberLayout({ children, title, showBack, containerRef }: MemberLayoutProps) {
  const { signOut, isOffline } = useMemberAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate("/member/login");
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-gradient-to-br from-background via-background to-muted flex flex-col">
      {/* Offline Indicator */}
      <OfflineIndicator />
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border safe-area-pt">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={muscledeskLogo} alt="MuscleDesk" className="h-8 w-8" />
            <h1 className="font-semibold text-lg">{title}</h1>
            {isOffline && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-xs font-medium">
                <WifiOff className="h-3 w-3" />
                Offline
              </span>
            )}
          </div>
          <button 
            onClick={handleSignOut}
            className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors touch-target"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main 
        ref={containerRef}
        className="flex-1 px-4 py-5 pb-24 overflow-auto scrollbar-hide relative"
      >
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-xl border-t border-border safe-area-pb z-50">
        <div className="flex items-center justify-around py-2 px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path === "/member" && location.pathname === "/member");
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-1 min-w-[64px] py-2 px-3 rounded-xl transition-all touch-target ${
                  isActive 
                    ? "text-primary bg-primary/10" 
                    : "text-muted-foreground hover:text-foreground active:scale-95"
                }`}
              >
                <item.icon className={`h-5 w-5 ${isActive ? "scale-110" : ""} transition-transform`} />
                <span className="text-[11px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
