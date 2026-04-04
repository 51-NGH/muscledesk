import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Mail, RefreshCw, Search, Settings2, Filter,
  Flame, Clock, UserPlus, CheckCircle, XCircle,
  MessageSquare, ArrowRight,
} from "lucide-react";
import { useEmailLeads, type EmailLead, type EmailLeadStatus } from "@/hooks/useEmailLeads";
import { useGmailIntegration, useSyncGmail } from "@/hooks/useGmailIntegration";
import { EmailLeadDetailDrawer } from "@/components/gmail/EmailLeadDetailDrawer";
import { GmailConnectCard } from "@/components/gmail/GmailConnectCard";
import { FilterManagementDialog } from "@/components/gmail/FilterManagementDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

const statusTabs: { value: string; label: string; icon: React.ElementType }[] = [
  { value: "all", label: "All", icon: Mail },
  { value: "new", label: "New", icon: UserPlus },
  { value: "contacted", label: "Contacted", icon: MessageSquare },
  { value: "interested", label: "Interested", icon: Flame },
  { value: "trial", label: "Trial", icon: ArrowRight },
  { value: "converted", label: "Converted", icon: CheckCircle },
  { value: "not_interested", label: "Closed", icon: XCircle },
];

const temperatureColors = {
  hot: "text-red-500",
  warm: "text-orange-500",
  cold: "text-blue-500",
};

const statusBadgeColors: Record<EmailLeadStatus, string> = {
  new: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  contacted: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  interested: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  trial: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  negotiation: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  converted: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  not_interested: "bg-gray-100 text-gray-500 dark:bg-gray-900/30 dark:text-gray-400",
};

export default function GmailLeads() {
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedLead, setSelectedLead] = useState<EmailLead | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  const statusFilter = activeTab === "all" ? null : activeTab as EmailLeadStatus;
  const { data: leads = [], isLoading } = useEmailLeads(statusFilter);
  const { data: integration, isLoading: integrationLoading } = useGmailIntegration();
  const syncGmail = useSyncGmail();

  const filteredLeads = search
    ? leads.filter(l =>
        l.sender_name?.toLowerCase().includes(search.toLowerCase()) ||
        l.sender_email.toLowerCase().includes(search.toLowerCase()) ||
        l.subject?.toLowerCase().includes(search.toLowerCase())
      )
    : leads;

  // Stats
  const newCount = leads.filter(l => l.lead_status === "new").length;
  const hotCount = leads.filter(l => l.temperature === "hot").length;

  if (integrationLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!integration) {
    return (
      <DashboardLayout>
        <div className="space-y-6 animate-fade-in">
          <PageHeader
            title="Gmail Lead Engine"
            description="Connect your Gmail to automatically capture and manage leads from emails"
          />
          <GmailConnectCard />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 animate-fade-in">
        <PageHeader
          title="Gmail Leads"
          description={`Connected: ${integration.email_address}`}
        >
          <div className="flex gap-2">
            <Button
              variant="outline"
              size={isMobile ? "icon" : "default"}
              onClick={() => setFilterOpen(true)}
            >
              <Filter className="h-4 w-4" />
              {!isMobile && <span className="ml-2">Filters</span>}
            </Button>
            <Button
              variant="outline"
              size={isMobile ? "icon" : "default"}
              onClick={() => syncGmail.mutate()}
              disabled={syncGmail.isPending}
            >
              <RefreshCw className={`h-4 w-4 ${syncGmail.isPending ? "animate-spin" : ""}`} />
              {!isMobile && <span className="ml-2">Sync</span>}
            </Button>
          </div>
        </PageHeader>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 md:gap-3">
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-bold">{leads.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <UserPlus className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">New</p>
                <p className="text-lg font-bold">{newCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <Flame className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Hot</p>
                <p className="text-lg font-bold">{hotCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {/* Status Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start overflow-x-auto">
            {statusTabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="text-xs gap-1">
                <tab.icon className="h-3 w-3" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Lead List */}
        <div className="space-y-2">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))
          ) : filteredLeads.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No email leads found</p>
                <p className="text-sm mt-1">
                  {leads.length === 0
                    ? "Click Sync to fetch emails from Gmail"
                    : "Try adjusting your search or filters"}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredLeads.map((lead) => (
              <Card
                key={lead.id}
                className={`cursor-pointer hover:shadow-md transition-shadow ${
                  lead.lead_status === "new" ? "border-l-4 border-l-blue-500" : ""
                }`}
                onClick={() => setSelectedLead(lead)}
              >
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Flame className={`h-3 w-3 ${temperatureColors[lead.temperature]}`} />
                        <span className="font-medium text-sm truncate">
                          {lead.sender_name || lead.sender_email}
                        </span>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusBadgeColors[lead.lead_status]}`}>
                          {lead.lead_status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm text-foreground truncate">{lead.subject || "(No subject)"}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {lead.email_body?.substring(0, 100) || ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                      </p>
                      {lead.next_follow_up_at && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-orange-500">
                          <Clock className="h-3 w-3" />
                          Follow-up
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <EmailLeadDetailDrawer
          lead={selectedLead}
          open={!!selectedLead}
          onOpenChange={(open) => !open && setSelectedLead(null)}
        />
        <FilterManagementDialog open={filterOpen} onOpenChange={setFilterOpen} />
      </div>
    </DashboardLayout>
  );
}
