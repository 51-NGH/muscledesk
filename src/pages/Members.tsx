import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { MemberAvatar } from "@/components/ui/member-avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useMembers, useCreateMember, MemberStatus } from "@/hooks/useGymData";
import { Users, UserPlus, TrendingUp, UserX, Search, Filter, Download, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const filterTabs = ["All", "Active", "Expiring", "Inactive"] as const;

const statusMap: Record<string, MemberStatus> = {
  "Active": "active",
  "Expiring": "expiring_soon",
  "Inactive": "expired",
};

export default function Members() {
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newMember, setNewMember] = useState({
    full_name: "",
    phone: "",
    email: "",
    expiry_date: "",
  });

  const { gymId } = useAuth();
  const { data: members = [], isLoading } = useMembers();
  const createMember = useCreateMember();

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

    try {
      await createMember.mutateAsync({
        full_name: newMember.full_name,
        phone: newMember.phone,
        email: newMember.email || undefined,
        expiry_date: newMember.expiry_date,
      });
      setIsAddDialogOpen(false);
      setNewMember({ full_name: "", phone: "", email: "", expiry_date: "" });
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (!gymId) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2">No Gym Found</h2>
            <p className="text-muted-foreground">Please create a gym first in Settings.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader title="Members" description="Manage your gym members and memberships">
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Member</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddMember} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={newMember.full_name}
                  onChange={(e) => setNewMember({ ...newMember, full_name: e.target.value })}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  value={newMember.phone}
                  onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                  placeholder="+91 9876543210"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiry_date">Membership Expiry Date *</Label>
                <Input
                  id="expiry_date"
                  type="date"
                  value={newMember.expiry_date}
                  onChange={(e) => setNewMember({ ...newMember, expiry_date: e.target.value })}
                  required
                />
              </div>
              <div className="flex justify-end gap-3">
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
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          Filters
        </Button>
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
              className="rounded-xl border border-border bg-card p-5 hover:border-primary/50 transition-colors cursor-pointer"
            >
              <div className="flex flex-col items-center text-center mb-4">
                <MemberAvatar name={member.full_name} size="lg" />
                <h3 className="mt-3 font-semibold text-foreground">{member.full_name}</h3>
                <p className="text-sm text-muted-foreground">{member.phone}</p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status={member.status} />
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
                <p className="text-sm font-medium text-foreground">{member.expiry_date}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
