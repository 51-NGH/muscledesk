import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  UserPlus, Search, LayoutGrid, List, TrendingUp, Users, 
  Flame, Clock, Target,
} from "lucide-react";
import { useLeads, useLeadAnalytics } from "@/hooks/useLeads";
import { useGymPlanFeatures } from "@/hooks/useGymPlanFeatures";
import { StatCard } from "@/components/ui/stat-card";
import { LeadKanbanBoard } from "@/components/leads/LeadKanbanBoard";
import { LeadTableView } from "@/components/leads/LeadTableView";
import { AddLeadDialog } from "@/components/leads/AddLeadDialog";
import { LeadDetailDrawer } from "@/components/leads/LeadDetailDrawer";
import { TodayFollowUps } from "@/components/leads/TodayFollowUps";
import type { Lead } from "@/hooks/useLeads";

export default function Leads() {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [addOpen, setAddOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const { data: features } = useGymPlanFeatures();
  const { data: leads = [], isLoading } = useLeads();
  const { data: analytics } = useLeadAnalytics();

  const filteredLeads = useMemo(() => {
    if (!search) return leads;
    const q = search.toLowerCase();
    return leads.filter(l =>
      l.full_name.toLowerCase().includes(q) ||
      l.phone.includes(q) ||
      l.email?.toLowerCase().includes(q)
    );
  }, [leads, search]);

  const showAnalytics = features?.plan !== "lite";

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Lead Tracking"
          description="Track inquiries, follow-ups, and convert prospects into members"
        >
          <Button onClick={() => setAddOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Add Lead
          </Button>
        </PageHeader>

        {/* Today's Follow-ups */}
        {leads.length > 0 && (
          <TodayFollowUps leads={leads} onSelectLead={setSelectedLead} />
        )}

        {/* Analytics Cards */}
        {showAnalytics && analytics && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <StatCard title="Total Leads" value={analytics.total_leads} icon={Users} iconVariant="teal" />
            <StatCard title="New This Month" value={analytics.new_leads_this_month} icon={UserPlus} iconVariant="blue" />
            <StatCard title="Converted" value={analytics.converted_leads_this_month} icon={Target} iconVariant="green" />
            <StatCard title="Conversion Rate" value={`${analytics.conversion_rate}%`} icon={TrendingUp} iconVariant="teal" />
            <StatCard title="Hot Leads" value={analytics.hot_leads_count} icon={Flame} iconVariant="orange" />
            <StatCard title="Overdue Follow-ups" value={analytics.overdue_followups_count} icon={Clock} iconVariant="red" />
          </div>
        )}

        {/* Search + View Toggle */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            <Button variant={view === "kanban" ? "default" : "ghost"} size="sm" onClick={() => setView("kanban")} className="gap-1.5">
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Board</span>
            </Button>
            <Button variant={view === "table" ? "default" : "ghost"} size="sm" onClick={() => setView("table")} className="gap-1.5">
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Table</span>
            </Button>
          </div>
        </div>

        {view === "kanban" ? (
          <LeadKanbanBoard leads={filteredLeads} isLoading={isLoading} onSelectLead={setSelectedLead} />
        ) : (
          <LeadTableView leads={filteredLeads} isLoading={isLoading} onSelectLead={setSelectedLead} />
        )}

        <AddLeadDialog open={addOpen} onOpenChange={setAddOpen} />
        <LeadDetailDrawer lead={selectedLead} open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)} />
      </div>
    </DashboardLayout>
  );
}
