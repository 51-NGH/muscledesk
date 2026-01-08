import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { MemberAvatar } from "@/components/ui/member-avatar";
import { StatusBadge, PlanBadge } from "@/components/ui/status-badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Users, UserPlus, TrendingUp, UserX, Search, Filter, Download } from "lucide-react";

type MemberStatus = "active" | "expiring" | "inactive" | "expired";
type PlanType = "premium" | "standard" | "basic";

interface Member {
  id: number;
  name: string;
  email: string;
  status: MemberStatus;
  plan: PlanType;
  visits: number;
  lastVisit: string;
}

const allMembers: Member[] = [
  { id: 1, name: "Sarah Johnson", email: "sarah.j@email.com", status: "active", plan: "premium", visits: 127, lastVisit: "2024-12-26" },
  { id: 2, name: "Mike Chen", email: "mike.c@email.com", status: "active", plan: "standard", visits: 98, lastVisit: "2024-12-27" },
  { id: 3, name: "Emma Wilson", email: "emma.w@email.com", status: "active", plan: "premium", visits: 156, lastVisit: "2024-12-27" },
  { id: 4, name: "David Brown", email: "david.b@email.com", status: "expiring", plan: "standard", visits: 76, lastVisit: "2024-12-25" },
  { id: 5, name: "Lisa Anderson", email: "lisa.a@email.com", status: "active", plan: "premium", visits: 142, lastVisit: "2024-12-26" },
  { id: 6, name: "James Wilson", email: "james.w@email.com", status: "active", plan: "basic", visits: 54, lastVisit: "2024-12-27" },
  { id: 7, name: "Maria Garcia", email: "maria.g@email.com", status: "inactive", plan: "standard", visits: 34, lastVisit: "2024-12-20" },
  { id: 8, name: "Robert Lee", email: "robert.l@email.com", status: "active", plan: "premium", visits: 89, lastVisit: "2024-12-26" },
];

const filterTabs = ["All", "Active", "Expiring", "Inactive"] as const;

export default function Members() {
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMembers = allMembers.filter((member) => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === "All" || member.status === activeFilter.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  return (
    <DashboardLayout>
      <PageHeader
        title="Members"
        description="Manage your gym members and memberships"
      >
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </PageHeader>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Members"
          value="2,847"
          icon={Users}
          iconVariant="teal"
        />
        <StatCard
          title="Active Members"
          value="2,654"
          icon={Users}
          iconVariant="green"
        />
        <StatCard
          title="New This Month"
          value="124"
          icon={TrendingUp}
          iconVariant="orange"
        />
        <StatCard
          title="Expired"
          value="193"
          icon={UserX}
          iconVariant="red"
        />
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search members..."
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
      <div className="grid grid-cols-4 gap-4">
        {filteredMembers.map((member) => (
          <div
            key={member.id}
            className="rounded-xl border border-border bg-card p-5 hover:border-primary/50 transition-colors"
          >
            <div className="flex flex-col items-center text-center mb-4">
              <MemberAvatar name={member.name} size="lg" />
              <h3 className="mt-3 font-semibold text-foreground">{member.name}</h3>
              <p className="text-sm text-muted-foreground">{member.email}</p>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge status={member.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-medium text-foreground capitalize">{member.plan}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Visits</span>
                <span className="font-medium text-foreground">{member.visits}</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border text-center">
              <span className="text-xs text-muted-foreground">Last visit</span>
              <p className="text-sm font-medium text-foreground">{member.lastVisit}</p>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
