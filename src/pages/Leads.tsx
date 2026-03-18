import { useState, useMemo, useEffect } from "react";
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
import { useIsMobile } from "@/hooks/use-mobile";
import type { Lead } from "@/hooks/useLeads";

export default function Leads() {
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"kanban" | "table">(isMobile ? "table" : "kanban");
  const [addOpen, setAddOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const { data: features } = useGymPlanFeatures();
  const { data: leads = [], isLoading } = useLeads();
  const { data: analytics } = useLeadAnalytics();

  // Auto-switch to table on mobile
  useEffect(() => {
    if (isMobile && view === "kanban") setView("table");
  }, [isMobile]);

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
      <div className="space-y-4 md:space-y-6 animate-fade-in">
        <PageHeader
          title="Lead Tracking"
          description="Track inquiries, follow-ups, and convert prospects into members"
        >
          <Button onClick={() => setAddOpen(true)} size={isMobile ? "sm" : "default"} className="gap-2">
            <UserPlus className="h-4 w-4" />
            {isMobile ? "Add" : "Add Lead"}
          </Button>
        </PageHeader>

        {/* Today's Follow-ups */}
        {leads.length > 0 && (
          <TodayFollowUps leads={leads} onSelectLead={setSelectedLead} />
        )}

        {/* Analytics Cards */}
        {showAnalytics && analytics && (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
            <StatCard title="Total" value={analytics.total_leads} icon={Users} iconVariant="teal" />
            <StatCard title="New" value={analytics.new_leads_this_month} icon={UserPlus} iconVariant="blue" />
            <StatCard title="Converted" value={analytics.converted_leads_this_month} icon={Target} iconVariant="green" />
            <StatCard title="Rate" value={`${analytics.conversion_rate}%`} icon={TrendingUp} iconVariant="teal" className="hidden md:flex" />
            <StatCard title="Hot" value={analytics.hot_leads_count} icon={Flame} iconVariant="orange" className="hidden md:flex" />
            <StatCard title="Overdue" value={analytics.overdue_followups_count} icon={Clock} iconVariant="red" className="hidden md:flex" />
          </div>
        )}

        {/* Search + View Toggle */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
          <div className="flex gap-0.5 bg-muted rounded-lg p-0.5">
            <Button variant={view === "kanban" ? "default" : "ghost"} size="icon" onClick={() => setView("kanban")} className="h-8 w-8">
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button variant={view === "table" ? "default" : "ghost"} size="icon" onClick={() => setView("table")} className="h-8 w-8">
              <List className="h-4 w-4" />
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
