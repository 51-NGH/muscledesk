import { useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import muscleDeskLogo from "@/assets/muscledesk-logo.png";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Subscribe to real-time database changes
  useRealtimeSubscription();

  return (
    <div className="min-h-screen min-h-[100dvh] bg-background transition-colors duration-300">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <AppSidebar />
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-14 px-4 border-b border-border bg-card/95 backdrop-blur-xl supports-[backdrop-filter]:bg-card/80 transition-colors duration-300 safe-area-pt">
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10 touch-target">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[280px]">
            <AppSidebar onNavigate={() => setIsMobileMenuOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2">
          <img 
            src={muscleDeskLogo} 
            alt="MuscleDesk" 
            className="h-8 w-8 object-contain"
          />
          <span className="font-bold text-foreground tracking-tight">MuscleDesk</span>
        </div>
        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      {/* Main Content */}
      <main className="lg:ml-[220px] min-h-screen min-h-[100dvh] px-4 pt-[70px] pb-6 lg:pt-6 lg:px-8 lg:pb-6 transition-colors duration-300">
        <div className="mx-auto max-w-[1400px]">
          {children}
        </div>
      </main>
    </div>
  );
}
