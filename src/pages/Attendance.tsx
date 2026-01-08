import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { MemberAvatar } from "@/components/ui/member-avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
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

export default function Attendance() {
  const { gymId } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isManualCheckInOpen, setIsManualCheckInOpen] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: attendance = [], isLoading, refetch } = useAttendance(selectedDate);
  const { data: members = [] } = useMembers();
  const { data: stats } = useDashboardStats();

  const activeMembers = members.filter((m) => m.status === "active" || m.status === "expiring_soon");

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
        refetch();
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
        refetch();
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

  return (
    <DashboardLayout>
      <PageHeader title="Attendance" description="Track member check-ins and attendance">
        <Button variant="outline" onClick={() => setIsQRScannerOpen(true)}>
          <Camera className="mr-2 h-4 w-4" />
          Scan QR
        </Button>
        <Button onClick={() => setIsManualCheckInOpen(true)}>
          <UserCheck className="mr-2 h-4 w-4" />
          Manual Check-In
        </Button>
      </PageHeader>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-6">
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

      {/* Date Navigation & Search */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2 rounded-lg border border-border p-1">
          <Button variant="ghost" size="icon" onClick={goToPreviousDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 px-3 py-1.5">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border-0 bg-transparent p-0 text-sm font-medium w-[130px]"
            />
          </div>
          <Button variant="ghost" size="icon" onClick={goToNextDay} disabled={isToday}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or ID..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {isToday && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-md-green animate-pulse" />
            Live
          </div>
        )}
      </div>

      {/* Attendance List */}
      <div className="rounded-xl border border-border bg-card">
        <div className="p-5 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">
            Check-ins for {format(new Date(selectedDate), "MMMM d, yyyy")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {filteredAttendance.length} member{filteredAttendance.length !== 1 ? "s" : ""} checked in
          </p>
        </div>

        {isLoading ? (
          <div className="p-10 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
          </div>
        ) : filteredAttendance.length === 0 ? (
          <div className="p-10 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Check-ins</h3>
            <p className="text-muted-foreground mb-4">
              {isToday ? "No members have checked in yet today" : "No attendance records for this date"}
            </p>
            {isToday && (
              <Button onClick={() => setIsManualCheckInOpen(true)}>
                <UserCheck className="mr-2 h-4 w-4" />
                Record Check-In
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredAttendance.map((record) => (
              <div key={record.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-4">
                  <MemberAvatar name={record.member?.full_name || "Unknown"} size="sm" />
                  <div>
                    <p className="font-medium text-foreground">{record.member?.full_name}</p>
                    <p className="text-sm text-muted-foreground">{record.member?.member_id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <StatusBadge status={record.member?.status || "active"} />
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-sm text-foreground">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {format(new Date(record.check_in_at), "h:mm a")}
                    </div>
                    <p className="text-xs text-muted-foreground capitalize">
                      via {record.source === "qr" ? "QR Scan" : "Manual"}
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

      {/* QR Scanner */}
      <QRScanner
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        onScan={handleQRScan}
      />
    </DashboardLayout>
  );
}
