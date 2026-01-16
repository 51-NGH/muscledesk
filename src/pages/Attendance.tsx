import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { MemberAvatar } from "@/components/ui/member-avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useGymPlanFeatures } from "@/hooks/useGymPlanFeatures";
import { UpgradeRequiredPage } from "@/components/UpgradeOverlay";
import { useAttendance, useMembers, useDashboardStats } from "@/hooks/useGymData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QRScanner } from "@/components/QRScanner";
import {
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  Search,
  QrCode,
  UserCheck,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Camera,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, subDays, addDays } from "date-fns";

// Live Clock Component
function LiveClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border">
      <Clock className="h-4 w-4 text-md-teal" />
      <span className="text-sm font-mono font-medium text-foreground tabular-nums">
        {format(time, "h:mm:ss a")}
      </span>
    </div>
  );
}

export default function Attendance() {
  const { gymId } = useAuth();
  const queryClient = useQueryClient();
  const { data: features } = useGymPlanFeatures();
  const getTodayDate = () => new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(getTodayDate);
  const [wasViewingToday, setWasViewingToday] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isManualCheckInOpen, setIsManualCheckInOpen] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Check if QR attendance is available
  const hasQRAttendance = features?.hasQRAttendance ?? true;

  // Auto-update date at midnight if user was viewing today
  useEffect(() => {
    const checkDateChange = () => {
      const today = getTodayDate();
      if (wasViewingToday && selectedDate !== today) {
        setSelectedDate(today);
      }
    };

    // Check every 10 seconds for date change
    const timer = setInterval(checkDateChange, 10000);
    return () => clearInterval(timer);
  }, [selectedDate, wasViewingToday]);

  // Track if user is viewing today
  useEffect(() => {
    setWasViewingToday(selectedDate === getTodayDate());
  }, [selectedDate]);

  const { data: attendance = [], isLoading } = useAttendance(selectedDate);
  const { data: members = [] } = useMembers();
  const { data: stats } = useDashboardStats();

  // Real-time subscription for attendance updates - instant refresh
  useEffect(() => {
    if (!gymId) return;

    const channel = supabase
      .channel(`attendance-page-${gymId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance',
          filter: `gym_id=eq.${gymId}`,
        },
        () => {
          console.log('Attendance page: Real-time update detected, refetching...');
          // Force immediate refetch with refetchType: 'all'
          queryClient.invalidateQueries({ queryKey: ['attendance'], refetchType: 'all' });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'], refetchType: 'all' });
          queryClient.invalidateQueries({ queryKey: ['daily-attendance'], refetchType: 'all' });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gymId, queryClient]);

  // Calculate real-time active members (not expired based on actual date)
  const activeMembers = members.filter((m) => {
    if (m.is_blocked) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiryDate = new Date(m.expiry_date);
    expiryDate.setHours(0, 0, 0, 0);
    return expiryDate >= today; // Only members whose membership hasn't expired
  });

  const filteredAttendance = attendance.filter((a) =>
    a.member?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.member?.member_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleManualCheckIn = async () => {
    if (!selectedMember || !gymId) {
      toast.error("Please select a member");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("attendance").insert([
        {
          gym_id: gymId,
          member_id: selectedMember,
          source: "manual",
        },
      ]);

      if (error) {
        if (error.message.includes("duplicate")) {
          toast.error("Member already checked in today");
        } else {
          throw error;
        }
      } else {
        toast.success("Check-in recorded successfully!");
        setIsManualCheckInOpen(false);
        setSelectedMember("");
        // Realtime will handle the refresh automatically
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to record check-in");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQRScan = async (qrToken: string) => {
    if (!gymId) {
      return { success: false, error: "No gym selected" };
    }

    try {
      const { data, error } = await supabase.rpc("ingest_attendance", {
        _qr_token: qrToken,
        _gym_id: gymId,
      });

      if (error) throw error;

      const result = data as {
        success: boolean;
        message?: string;
        error?: string;
        member_name?: string;
        member_id?: string;
      };

      if (result.success) {
        // Realtime will handle the refresh automatically
        toast.success(`${result.member_name} checked in!`);
      }

      return result;
    } catch (error: any) {
      return { success: false, error: error.message || "Scan failed" };
    }
  };

  const goToPreviousDay = () => {
    const prev = subDays(new Date(selectedDate), 1);
    setSelectedDate(prev.toISOString().split("T")[0]);
  };

  const goToNextDay = () => {
    const next = addDays(new Date(selectedDate), 1);
    if (next <= new Date()) {
      setSelectedDate(next.toISOString().split("T")[0]);
    }
  };

  const isToday = selectedDate === new Date().toISOString().split("T")[0];

  // Check if Lite plan - block attendance page
  const isLitePlan = features?.plan === 'lite';

  if (!gymId) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2">No Gym Found</h2>
            <p className="text-muted-foreground">Please wait for your gym to be assigned.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Block attendance page for Lite plan
  if (isLitePlan) {
    return (
      <DashboardLayout>
        <UpgradeRequiredPage
          feature="Attendance Tracking"
          description="Track member check-ins with QR codes and manual entry. Get insights into attendance patterns."
          benefits={[
            "QR code check-in scanning",
            "Manual attendance recording",
            "Daily attendance history",
            "Real-time attendance stats",
            "Attendance rate analytics",
            "Member visit tracking"
          ]}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader title="Attendance" description="Track member check-ins and attendance">
        {hasQRAttendance ? (
          <Button variant="outline" size="sm" onClick={() => setIsQRScannerOpen(true)}>
            <Camera className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Scan QR</span>
            <span className="sm:hidden">Scan</span>
          </Button>
        ) : (
          <Button 
            variant="outline" 
            size="sm" 
            disabled 
            className="opacity-50 cursor-not-allowed"
            title="Upgrade to Standard or Pro for QR scanning"
          >
            <Camera className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">QR (Upgrade)</span>
            <span className="sm:hidden">QR</span>
          </Button>
        )}
        <Button size="sm" onClick={() => setIsManualCheckInOpen(true)}>
          <UserCheck className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Manual Check-In</span>
          <span className="sm:hidden">Check-In</span>
        </Button>
      </PageHeader>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard
          title="Today's Check-ins"
          value={isToday ? (stats?.todayAttendance || 0) : filteredAttendance.length}
          icon={CheckCircle2}
          iconVariant="green"
        />
        <StatCard
          title="Active Members"
          value={stats?.activeMembers || 0}
          icon={Users}
          iconVariant="teal"
        />
        <StatCard
          title="Attendance Rate"
          value={stats?.activeMembers ? `${Math.round(((stats?.todayAttendance || 0) / stats.activeMembers) * 100)}%` : "0%"}
          icon={TrendingUp}
          iconVariant="orange"
        />
        <StatCard
          title="QR Scans Today"
          value={attendance.filter((a) => a.source === "qr").length}
          icon={QrCode}
          iconVariant="blue"
        />
      </div>

      {/* Date Navigation & Search - Mobile Optimized */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <div className="flex items-center gap-1 sm:gap-2 rounded-lg border border-border p-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToPreviousDay}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1 sm:gap-2 px-1 sm:px-2 py-1">
              <Calendar className="h-4 w-4 text-muted-foreground hidden sm:block" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="border-0 bg-transparent p-0 text-xs sm:text-sm font-medium w-[110px] sm:w-[130px]"
              />
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToNextDay} disabled={isToday}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {isToday && (
            <div className="flex sm:hidden items-center gap-2 text-xs text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-md-green animate-pulse" />
              Live
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {isToday && (
            <div className="hidden sm:flex items-center gap-3 shrink-0">
              <LiveClock />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-2 w-2 rounded-full bg-md-green animate-pulse" />
                Live
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Attendance List */}
      <div className="rounded-xl border border-border bg-card">
        <div className="p-4 sm:p-5 border-b border-border">
          <h3 className="text-base sm:text-lg font-semibold text-foreground">
            Check-ins for {format(new Date(selectedDate), "MMM d, yyyy")}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {filteredAttendance.length} member{filteredAttendance.length !== 1 ? "s" : ""} checked in
          </p>
        </div>

        {isLoading ? (
          <div className="p-8 sm:p-10 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
          </div>
        ) : filteredAttendance.length === 0 ? (
          <div className="p-8 sm:p-10 text-center">
            <Calendar className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">No Check-ins</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {isToday ? "No members have checked in yet" : "No attendance records for this date"}
            </p>
            {isToday && (
              <Button size="sm" onClick={() => setIsManualCheckInOpen(true)}>
                <UserCheck className="mr-2 h-4 w-4" />
                Record Check-In
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredAttendance.map((record) => (
              <div key={record.id} className="flex items-center justify-between p-3 sm:p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <MemberAvatar name={record.member?.full_name || "Unknown"} size="sm" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{record.member?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{record.member?.member_id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                  <div className="hidden sm:block">
                    <StatusBadge status={record.member?.status || "active"} />
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-foreground">
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                      {format(new Date(record.check_in_at), "h:mm a")}
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground capitalize">
                      {record.source === "qr" ? "QR" : "Manual"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manual Check-In Dialog */}
      <Dialog open={isManualCheckInOpen} onOpenChange={setIsManualCheckInOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manual Check-In</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Member</label>
              <Select value={selectedMember} onValueChange={setSelectedMember}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a member..." />
                </SelectTrigger>
                <SelectContent>
                  {activeMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center gap-2">
                        <span>{member.full_name}</span>
                        <span className="text-muted-foreground">({member.member_id})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsManualCheckInOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleManualCheckIn} disabled={isSubmitting || !selectedMember}>
                {isSubmitting ? "Recording..." : "Record Check-In"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Scanner - only show if feature is available */}
      {hasQRAttendance && (
        <QRScanner
          isOpen={isQRScannerOpen}
          onClose={() => setIsQRScannerOpen(false)}
          onScan={handleQRScan}
        />
      )}
    </DashboardLayout>
  );
}
