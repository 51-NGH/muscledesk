import { useState } from "react";
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
  QrCode,
  Ban,
  Edit,
  Trash2,
  Eye,
  X,
  CheckCircle,
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

  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.phone.includes(searchQuery) ||
      member.member_id.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeFilter === "All") return matchesSearch;

    const targetStatus = statusMap[activeFilter];
    return matchesSearch && member.status === targetStatus;
  });

  const stats = {
    total: members.length,
    active: members.filter((m) => m.status === "active").length,
    expiring: members.filter((m) => m.status === "expiring_soon").length,
    expired: members.filter((m) => m.status === "expired" || m.status === "blocked").length,
  };

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
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </PageHeader>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Members" value={stats.total} icon={Users} iconVariant="teal" />
        <StatCard title="Active Members" value={stats.active} icon={Users} iconVariant="green" />
        <StatCard title="Expiring Soon" value={stats.expiring} icon={TrendingUp} iconVariant="orange" />
        <StatCard title="Expired" value={stats.expired} icon={UserX} iconVariant="red" />
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, or ID..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center rounded-lg border border-border p-1">
          {filterTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
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
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 animate-pulse">
              <div className="flex flex-col items-center">
                <div className="h-16 w-16 rounded-full bg-muted" />
                <div className="h-4 w-24 bg-muted rounded mt-3" />
                <div className="h-3 w-32 bg-muted rounded mt-2" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Members Found</h3>
          <p className="text-muted-foreground mb-4">
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
        <div className="grid grid-cols-4 gap-4">
          {filteredMembers.map((member) => (
            <div
              key={member.id}
              className="rounded-xl border border-border bg-card p-5 hover:border-primary/50 transition-colors group relative"
            >
              {/* Action Menu */}
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
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
                className="flex flex-col items-center text-center mb-4 cursor-pointer"
                onClick={() => openViewDialog(member)}
              >
                <MemberAvatar name={member.full_name} size="lg" />
                <h3 className="mt-3 font-semibold text-foreground">{member.full_name}</h3>
                <p className="text-xs text-muted-foreground font-mono">{member.member_id}</p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status={member.is_blocked ? "blocked" : member.status} />
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

              <div className="mt-4 pt-3 border-t border-border text-center">
                <span className="text-xs text-muted-foreground">Expires</span>
                <p className="text-sm font-medium text-foreground">{format(new Date(member.expiry_date), "MMM d, yyyy")}</p>
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
                value={newMember.phone}
                onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                placeholder="+91 9876543210"
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

      {/* View Member Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Member Details</DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <MemberAvatar name={selectedMember.full_name} size="lg" />
                <div>
                  <h3 className="font-semibold text-lg">{selectedMember.full_name}</h3>
                  <p className="text-sm text-muted-foreground font-mono">{selectedMember.member_id}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedMember.phone}</span>
                </div>
                {selectedMember.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedMember.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Expires: {format(new Date(selectedMember.expiry_date), "MMM d, yyyy")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedMember.total_visits} visits</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <span className="text-sm font-medium">Status</span>
                <StatusBadge status={selectedMember.is_blocked ? "blocked" : selectedMember.status} />
              </div>

              <div className="p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-2 mb-2">
                  <QrCode className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">QR Token</span>
                </div>
                <p className="text-xs font-mono text-muted-foreground break-all">{selectedMember.qr_token}</p>
              </div>

              {selectedMember.notes && (
                <div className="p-3 rounded-lg bg-muted">
                  <span className="text-sm font-medium">Notes</span>
                  <p className="text-sm text-muted-foreground mt-1">{selectedMember.notes}</p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => openEditDialog(selectedMember)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
