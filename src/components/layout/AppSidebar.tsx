import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Calendar,
  BarChart3,
  DollarSign,
  Settings,
  LogOut,
  Receipt,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useGymData";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import muscleDeskLogo from "@/assets/muscledesk-logo.png";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Members", url: "/members", icon: Users },
  { title: "Attendance", url: "/attendance", icon: Calendar },
  { title: "Plans", url: "/plans", icon: CreditCard },
  { title: "Payments", url: "/payments", icon: DollarSign },
  { title: "Expenses", url: "/expenses", icon: Receipt },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Settings", url: "/settings", icon: Settings },
];

const superAdminNavItem = { title: "Super Admin", url: "/super-admin", icon: Shield };

interface AppSidebarProps {
  onNavigate?: () => void;
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, role } = useAuth();
  const { data: profile } = useUserProfile();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const handleNavClick = () => {
    onNavigate?.();
  };

  // Get initials from name or email
  const getInitials = () => {
    if (profile?.full_name) {
      return profile.full_name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
    }
    if (!user?.email) return "U";
    return user.email.substring(0, 2).toUpperCase();
  };

  // Get display name
  const getDisplayName = () => {
    if (profile?.full_name) {
      return profile.full_name.split(" ")[0];
    }
    return user?.email?.split("@")[0] || "User";
  };

  const getRoleLabel = () => {
    switch (role) {
      case "super_admin":
        return "Super Admin";
      case "gym_owner":
        return "Gym Owner";
      case "staff":
        return "Staff";
      default:
        return "User";
    }
  };

  return (
    <aside className="lg:fixed lg:left-0 lg:top-0 lg:z-40 h-full lg:h-screen w-full lg:w-[220px] border-r border-border bg-card flex flex-col transition-colors duration-300">
      {/* Logo/Brand Section */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
        <img 
          src={muscleDeskLogo} 
          alt="MuscleDesk" 
          className="h-10 w-10 object-contain transition-transform duration-300 hover:scale-110"
        />
        <div className="flex flex-col">
          <span className="font-bold text-foreground tracking-tight">MuscleDesk</span>
          <span className="text-xs text-muted-foreground">{getRoleLabel()}</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {/* Super Admin link - only for super_admin */}
          {role === "super_admin" && (
            <li>
              <NavLink
                to={superAdminNavItem.url}
                onClick={handleNavClick}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors mb-2",
                  location.pathname === superAdminNavItem.url
                    ? "bg-destructive text-destructive-foreground"
                    : "text-destructive hover:bg-destructive/10"
                )}
              >
                <superAdminNavItem.icon className="h-5 w-5" />
                <span>{superAdminNavItem.title}</span>
              </NavLink>
            </li>
          )}
          {navItems.map((item) => {
            const isActive = location.pathname === item.url;
            
            // Staff can only see Dashboard, Members (readonly), and Attendance
            if (role === "staff" && !["Dashboard", "Members", "Attendance"].includes(item.title)) {
              return null;
            }
            
            return (
              <li key={item.title}>
                <NavLink
                  to={item.url}
                  onClick={handleNavClick}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.title}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Theme Toggle */}
      <div className="border-t border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Theme</span>
          <ThemeToggle />
        </div>
      </div>

      {/* User Profile */}
      <div className="border-t border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="member-avatar h-9 w-9 text-sm transition-transform duration-300 hover:scale-105">{getInitials()}</div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-foreground truncate max-w-[100px]">
                {getDisplayName()}
              </span>
              <span className="text-xs text-muted-foreground">{getRoleLabel()}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:text-destructive transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
