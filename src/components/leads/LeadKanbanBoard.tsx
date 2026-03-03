import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Phone, Mail, Clock, Flame, Snowflake, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Lead, LeadStatus } from "@/hooks/useLeads";
import { useUpdateLead } from "@/hooks/useLeads";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const KANBAN_COLUMNS: { status: LeadStatus; label: string; color: string }[] = [
  { status: "new", label: "New", color: "bg-[hsl(var(--md-blue))]" },
  { status: "contacted", label: "Contacted", color: "bg-[hsl(var(--md-purple))]" },
  { status: "trial_booked", label: "Trial Booked", color: "bg-[hsl(var(--md-orange))]" },
  { status: "trial_done", label: "Trial Done", color: "bg-[hsl(var(--md-teal))]" },
  { status: "interested", label: "Interested", color: "bg-[hsl(var(--md-yellow))]" },
  { status: "converted", label: "Converted", color: "bg-[hsl(var(--md-green))]" },
];

const tempIcons = {
  hot: <Flame className="h-3.5 w-3.5 text-[hsl(var(--md-red))]" />,
  warm: <Zap className="h-3.5 w-3.5 text-[hsl(var(--md-orange))]" />,
  cold: <Snowflake className="h-3.5 w-3.5 text-[hsl(var(--md-blue))]" />,
};

interface Props {
  leads: Lead[];
  isLoading: boolean;
  onSelectLead: (lead: Lead) => void;
}

export function LeadKanbanBoard({ leads, isLoading, onSelectLead }: Props) {
  const updateLead = useUpdateLead();
  const grouped = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    KANBAN_COLUMNS.forEach(c => { map[c.status] = []; });
    leads.forEach(l => {
      if (map[l.status]) map[l.status].push(l);
    });
    return map;
  }, [leads]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {KANBAN_COLUMNS.map(c => (
          <div key={c.status} className="space-y-3">
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-4 pb-4 min-w-[900px]">
        {KANBAN_COLUMNS.map(col => (
          <div key={col.status} className="flex-1 min-w-[180px] space-y-3">
            {/* Column Header */}
            <div className="flex items-center gap-2 px-2">
              <div className={`h-2.5 w-2.5 rounded-full ${col.color}`} />
              <span className="text-sm font-semibold text-foreground">{col.label}</span>
              <Badge variant="secondary" className="ml-auto text-xs px-1.5 py-0">
                {grouped[col.status]?.length || 0}
              </Badge>
            </div>

            {/* Cards */}
            <div className="space-y-2 min-h-[100px]">
              {grouped[col.status]?.map((lead) => (
                <Card
                  key={lead.id}
                  className="p-3 cursor-pointer hover:shadow-md hover:border-primary/20 transition-all duration-200 active:scale-[0.98]"
                  onClick={() => onSelectLead(lead)}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-sm font-medium text-foreground leading-tight truncate">
                        {lead.full_name}
                      </span>
                      {tempIcons[lead.temperature]}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <span className="truncate">{lead.phone}</span>
                    </div>

                    {lead.email && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{lead.email}</span>
                      </div>
                    )}

                    {lead.interest_plan && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {lead.interest_plan}
                      </Badge>
                    )}

                    {lead.next_follow_up_at && col.status !== "converted" && (
                      <div className={`flex items-center gap-1 text-[10px] ${
                        new Date(lead.next_follow_up_at) < new Date()
                          ? "text-[hsl(var(--md-red))] font-medium"
                          : "text-muted-foreground"
                      }`}>
                        <Clock className="h-3 w-3" />
                        {new Date(lead.next_follow_up_at) < new Date()
                          ? "Overdue"
                          : `Due ${formatDistanceToNow(new Date(lead.next_follow_up_at), { addSuffix: true })}`
                        }
                      </div>
                    )}

                    <div className="text-[10px] text-muted-foreground/60">
                      {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                    </div>
                  </div>
                </Card>
              ))}

              {(grouped[col.status]?.length || 0) === 0 && (
                <div className="text-xs text-muted-foreground/50 text-center py-6 border border-dashed rounded-lg">
                  No leads
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
