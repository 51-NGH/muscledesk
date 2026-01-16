import { useState, useMemo, useCallback, memo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { MemberAvatar } from "@/components/ui/member-avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useMembers, useCreateMember, useUpdateMember, useDeleteMember, useMembershipPlans, MemberStatus, Member } from "@/hooks/useGymData";
import { MemberProfile } from "@/components/MemberProfile";
import { format } from "date-fns";
import { 
  Users, 
  UserPlus, 
  TrendingUp, 
  UserX, 
  Search, 
  Download, 
  MoreVertical,
  Phone,
  Mail,
  Calendar,
  Ban,
  Edit,
  Trash2,
  Eye,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const filterTabs = ["All", "Active", "Expiring", "Expired"] as const;

const statusMap: Record<string, MemberStatus> = {
  Active: "active",
  Expiring: "expiring_soon",
  Expired: "expired",
};

export default function Members() {
  const { gymId } = useAuth();
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [newMember, setNewMember] = useState({
    full_name: "",
    phone: "",
    email: "",
    start_date: new Date().toISOString().split("T")[0],
    expiry_date: "",
    plan_id: "",
    notes: "",
  });

  const { data: members = [], isLoading } = useMembers();
  const { data: plans = [] } = useMembershipPlans();
  const createMember = useCreateMember();
  const updateMember = useUpdateMember();
  const deleteMember = useDeleteMember();

  // Helper function to calculate real-time status based on expiry date
  const getRealTimeStatus = useCallback((member: Member): MemberStatus => {
    if (member.is_blocked) return "blocked";
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiryDate = new Date(member.expiry_date);
    expiryDate.setHours(0, 0, 0, 0);
    
    if (expiryDate < today) return "expired";
    
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    if (expiryDate <= sevenDaysFromNow) return "expiring_soon";
    
    return "active";
  }, []);

  // Memoize expensive computations with real-time status calculation
  const filteredMembers = useMemo(() => {
    const searchLower = searchQuery.toLowerCase();
    
    const filtered = members.filter((member) => {
      const matchesSearch =
        member.full_name.toLowerCase().includes(searchLower) ||
        member.phone.includes(searchQuery) ||
        member.member_id.toLowerCase().includes(searchLower);

      if (activeFilter === "All") return matchesSearch;

      const realStatus = getRealTimeStatus(member);
      const targetStatus = statusMap[activeFilter];
      return matchesSearch && realStatus === targetStatus;
    });

    // Sort by joining date (newest first)
    return filtered.sort((a, b) => {
      return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
    });
  }, [members, searchQuery, activeFilter, getRealTimeStatus]);

  const stats = useMemo(() => ({
    total: members.length,
    active: members.filter((m) => getRealTimeStatus(m) === "active").length,
    expiring: members.filter((m) => getRealTimeStatus(m) === "expiring_soon").length,
    expired: members.filter((m) => {
      const status = getRealTimeStatus(m);
      return status === "expired" || status === "blocked";
    }).length,
  }), [members, getRealTimeStatus]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMember.full_name || !newMember.phone || !newMember.expiry_date) {
      toast.error("Please fill all required fields");
      return;
    }

    const plan = plans.find((p) => p.id === newMember.plan_id);

    try {
      await createMember.mutateAsync({
        full_name: newMember.full_name,
        phone: newMember.phone,
        email: newMember.email || undefined,
        start_date: newMember.start_date,
        expiry_date: newMember.expiry_date,
        plan_id: newMember.plan_id || undefined,
        plan_name: plan?.name,
        notes: newMember.notes || undefined,
      });
      setIsAddDialogOpen(false);
      resetNewMember();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleEditMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;

    const plan = plans.find((p) => p.id === newMember.plan_id);

    try {
      await updateMember.mutateAsync({
        id: selectedMember.id,
        full_name: newMember.full_name,
        phone: newMember.phone,
        email: newMember.email || null,
        expiry_date: newMember.expiry_date,
        plan_id: newMember.plan_id || null,
        plan_name: plan?.name || null,
        notes: newMember.notes || null,
      });
      setIsEditDialogOpen(false);
      setSelectedMember(null);
      resetNewMember();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDeleteMember = async () => {
    if (!selectedMember) return;

    try {
      await deleteMember.mutateAsync(selectedMember.id);
      setIsDeleteDialogOpen(false);
      setSelectedMember(null);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleBlockMember = async (member: Member) => {
    try {
      await updateMember.mutateAsync({
        id: member.id,
        is_blocked: !member.is_blocked,
        block_reason: member.is_blocked ? null : "Blocked by admin",
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const openViewDialog = (member: Member) => {
    setSelectedMember(member);
    setIsViewDialogOpen(true);
  };

  const openEditDialog = (member: Member) => {
    setSelectedMember(member);
    setNewMember({
      full_name: member.full_name,
      phone: member.phone,
      email: member.email || "",
      start_date: member.start_date,
      expiry_date: member.expiry_date,
      plan_id: member.plan_id || "",
      notes: member.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (member: Member) => {
    setSelectedMember(member);
    setIsDeleteDialogOpen(true);
  };

  const resetNewMember = () => {
    setNewMember({ full_name: "", phone: "", email: "", start_date: new Date().toISOString().split("T")[0], expiry_date: "", plan_id: "", notes: "" });
  };

  const handleExport = () => {
    const headers = ["Member ID", "Name", "Phone", "Email", "Status", "Plan", "Expiry Date", "Total Visits"];
    const rows = filteredMembers.map((m) => [
      m.member_id,
      m.full_name,
      m.phone,
      m.email || "",
      m.status,
      m.plan_name || "-",
      m.expiry_date,
      m.total_visits,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `members-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export downloaded!");
  };

  const handlePlanSelect = (planId: string) => {
    const plan = plans.find((p) => p.id === planId);
    if (plan) {
      const startDate = newMember.start_date ? new Date(newMember.start_date) : new Date();
      const expiryDate = new Date(startDate);
      expiryDate.setDate(expiryDate.getDate() + plan.duration_days);
      setNewMember({
        ...newMember,
        plan_id: planId,
        expiry_date: expiryDate.toISOString().split("T")[0],
      });
    }
  };

  const handleStartDateChange = (dateStr: string) => {
    const plan = plans.find((p) => p.id === newMember.plan_id);
    let expiryDate = newMember.expiry_date;
    
    if (plan && dateStr) {
      const startDate = new Date(dateStr);
      const expiry = new Date(startDate);
      expiry.setDate(expiry.getDate() + plan.duration_days);
      expiryDate = expiry.toISOString().split("T")[0];
    }
    
    setNewMember({
      ...newMember,
      start_date: dateStr,
      expiry_date: expiryDate,
    });
  };

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
      <PageHeader title="Members" description="Manage your gym members and memberships">
        <Button variant="outline" size="sm" onClick={handleExport} className="hidden sm:flex">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
        <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Add Member</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </PageHeader>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard title="Total Members" value={stats.total} icon={Users} iconVariant="teal" />
        <StatCard title="Active Members" value={stats.active} icon={Users} iconVariant="green" />
        <StatCard title="Expiring Soon" value={stats.expiring} icon={TrendingUp} iconVariant="orange" />
        <StatCard title="Expired" value={stats.expired} icon={UserX} iconVariant="red" />
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, or ID..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center rounded-lg border border-border p-1 overflow-x-auto">
          {filterTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                activeFilter === tab
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Member Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 sm:p-5 animate-pulse">
              <div className="flex flex-col items-center">
                <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-muted" />
                <div className="h-4 w-24 bg-muted rounded mt-3" />
                <div className="h-3 w-32 bg-muted rounded mt-2" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 sm:p-10 text-center">
          <Users className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">No Members Found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {searchQuery ? "Try adjusting your search" : "Add your first member to get started"}
          </p>
          {!searchQuery && (
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add First Member
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {filteredMembers.map((member) => (
            <div
              key={member.id}
              className="rounded-xl border border-border bg-card p-4 sm:p-5 hover:border-primary/50 transition-colors group relative"
            >
              {/* Action Menu */}
              <div className="absolute top-2 right-2 sm:top-3 sm:right-3 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openViewDialog(member)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openEditDialog(member)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleBlockMember(member)}>
                      <Ban className="mr-2 h-4 w-4" />
                      {member.is_blocked ? "Unblock" : "Block"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openDeleteDialog(member)} className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div
                className="flex flex-col items-center text-center mb-3 sm:mb-4 cursor-pointer"
                onClick={() => openViewDialog(member)}
              >
                <MemberAvatar name={member.full_name} size="lg" />
                <h3 className="mt-2 sm:mt-3 font-semibold text-sm sm:text-base text-foreground">{member.full_name}</h3>
                <p className="text-xs text-muted-foreground font-mono">{member.member_id}</p>
              </div>

              <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status={getRealTimeStatus(member)} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="font-medium text-foreground">{member.plan_name || "Standard"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Visits</span>
                  <span className="font-medium text-foreground">{member.total_visits}</span>
                </div>
              </div>

              <div className="mt-3 sm:mt-4 pt-2 sm:pt-3 border-t border-border text-center">
                <span className="text-xs text-muted-foreground">Expires</span>
                <p className="text-xs sm:text-sm font-medium text-foreground">{format(new Date(member.expiry_date), "MMM d, yyyy")}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Member Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddMember} className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input
                value={newMember.full_name}
                onChange={(e) => setNewMember({ ...newMember, full_name: e.target.value })}
                placeholder="John Doe"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Phone Number *</Label>
              <Input
                type="tel"
                maxDigits={10}
                value={newMember.phone}
                onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                placeholder="9876543210"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Email (Optional)</Label>
              <Input
                type="email"
                value={newMember.email}
                onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Membership Plan</Label>
              <Select value={newMember.plan_id} onValueChange={handlePlanSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a plan..." />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - ₹{plan.price} ({plan.duration_days} days)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Joining Date *</Label>
                <Input
                  type="date"
                  value={newMember.start_date}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Expiry Date *</Label>
                <Input
                  type="date"
                  value={newMember.expiry_date}
                  onChange={(e) => setNewMember({ ...newMember, expiry_date: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={newMember.notes}
                onChange={(e) => setNewMember({ ...newMember, notes: e.target.value })}
                placeholder="Any additional notes..."
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMember.isPending}>
                {createMember.isPending ? "Adding..." : "Add Member"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Member Profile */}
      {selectedMember && (
        <MemberProfile
          member={selectedMember}
          isOpen={isViewDialogOpen}
          onClose={() => {
            setIsViewDialogOpen(false);
            setSelectedMember(null);
          }}
          onEdit={(member) => {
            setIsViewDialogOpen(false);
            openEditDialog(member);
          }}
        />
      )}

      {/* Edit Member Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditMember} className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name *</Label>
              <Input
                value={newMember.full_name}
                onChange={(e) => setNewMember({ ...newMember, full_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Phone Number *</Label>
              <Input
                type="tel"
                maxDigits={10}
                value={newMember.phone}
                onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={newMember.email}
                onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Membership Plan</Label>
              <Select value={newMember.plan_id} onValueChange={(v) => setNewMember({ ...newMember, plan_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a plan..." />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - ₹{plan.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Expiry Date *</Label>
              <Input
                type="date"
                value={newMember.expiry_date}
                onChange={(e) => setNewMember({ ...newMember, expiry_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={newMember.notes}
                onChange={(e) => setNewMember({ ...newMember, notes: e.target.value })}
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMember.isPending}>
                {updateMember.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <strong>{selectedMember?.full_name}</strong> from your gym. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMember} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
