import { ReactNode, RefObject, useState } from "react";
import { useMemberAuth } from "@/contexts/MemberAuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { OfflineIndicator } from "@/components/offline/OfflineIndicator";
import { useServiceWorkerUpdate } from "@/hooks/useServiceWorkerUpdate";
import { useMemberRealtimeSubscription } from "@/hooks/useMemberRealtimeSubscription";
import { 
  Home, 
  QrCode, 
  Clock, 
  LogOut,
  WifiOff,
  Menu,
  Dumbbell,
  Ruler,
  Megaphone,
  Target,
  Calendar,
  RefreshCw,
  MessageCircle,
  X,
  Settings,
  ChevronRight
} from "lucide-react";
import muscledeskMembersDark from "@/assets/muscledesk-members-dark.png";
import muscledeskMembersLight from "@/assets/muscledesk-members-light.png";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface MemberLayoutProps {
  children: ReactNode;
  title: string;
  showBack?: boolean;
  containerRef?: RefObject<HTMLDivElement>;
}

const mainNavItems = [
  { icon: Home, label: "Home", path: "/member" },
  { icon: QrCode, label: "QR", path: "/member/qr" },
  { icon: Clock, label: "History", path: "/member/attendance" },
  { icon: Dumbbell, label: "Workout", path: "/member/workouts" },
  { icon: Menu, label: "More", path: "more" },
];

const moreMenuItems = [
  { icon: Ruler, label: "Body Stats", path: "/member/measurements", description: "Track weight, BMI & measurements" },
  { icon: Target, label: "Goals", path: "/member/goals", description: "Set attendance targets" },
  { icon: Calendar, label: "Classes", path: "/member/classes", description: "Book gym classes" },
  { icon: Megaphone, label: "Announcements", path: "/member/announcements", description: "Gym updates & news" },
  { icon: RefreshCw, label: "Renew", path: "/member/renewal", description: "Request membership renewal" },
  { icon: MessageCircle, label: "Support", path: "/member/support", description: "Contact gym staff" },
  { icon: Settings, label: "Settings", path: "/member/settings", description: "App preferences" },
];

export function MemberLayout({ children, title, showBack, containerRef }: MemberLayoutProps) {
  const { signOut, isOffline } = useMemberAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { resolvedTheme } = useTheme();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  
  // Listen for service worker updates and auto-refresh
  useServiceWorkerUpdate();
  
  // Subscribe to real-time updates for member data
  useMemberRealtimeSubscription();
  
  const memberLogo = resolvedTheme === "dark" ? muscledeskMembersDark : muscledeskMembersLight;

  const handleSignOut = async () => {
    await signOut();
    navigate("/member/login");
  };

  const handleNavClick = (path: string) => {
    if (path === "more") {
      setShowMoreMenu(true);
    } else {
      navigate(path);
    }
  };

  const isMorePageActive = moreMenuItems.some(item => location.pathname === item.path);

  return (
    <div className="min-h-screen min-h-[100dvh] bg-gradient-to-br from-background via-background to-muted flex flex-col">
      {/* Offline Indicator */}
      <OfflineIndicator />
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border safe-area-pt">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={memberLogo} alt="MuscleDesk Members" className="h-8 w-auto" />
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
          {mainNavItems.map((item) => {
            const isActive = item.path === "more" 
              ? isMorePageActive 
              : location.pathname === item.path || 
                (item.path === "/member" && location.pathname === "/member");
            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={cn(
                  "flex flex-col items-center gap-1 min-w-[56px] py-2 px-2 rounded-xl transition-all touch-target",
                  isActive 
                    ? "text-primary bg-primary/10" 
                    : "text-muted-foreground hover:text-foreground active:scale-95"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive && "scale-110", "transition-transform")} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* More Menu Sheet */}
      {showMoreMenu && (
        <div className="fixed inset-0 z-[100] animate-fade-in">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowMoreMenu(false)}
          />
          
          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-background rounded-t-3xl animate-slide-up safe-area-pb">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold text-lg">More Options</h3>
              <button 
                onClick={() => setShowMoreMenu(false)}
                className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4 grid grid-cols-1 gap-2 max-h-[60vh] overflow-auto">
              {moreMenuItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path);
                      setShowMoreMenu(false);
                    }}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl text-left transition-all",
                      isActive 
                        ? "bg-primary/10 border border-primary/30" 
                        : "hover:bg-muted border border-transparent"
                    )}
                  >
                    <div className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                      isActive ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}>
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.description}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
