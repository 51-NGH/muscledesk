import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Flame, Snowflake, Zap, Clock, Phone, MessageCircle, ChevronRight } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Lead } from "@/hooks/useLeads";

const statusColors: Record<string, string> = {
  new: "status-active",
  contacted: "bg-[hsl(var(--md-purple-light))] text-[hsl(var(--md-purple))]",
  trial_booked: "status-pending",
  trial_done: "bg-[hsl(var(--md-teal-light))] text-[hsl(var(--md-teal))]",
  interested: "bg-[hsl(var(--md-yellow-light))] text-[hsl(var(--md-yellow))]",
  not_interested: "status-inactive",
  converted: "status-completed",
};

const statusLabels: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  trial_booked: "Trial Booked",
  trial_done: "Trial Done",
  interested: "Interested",
  not_interested: "Not Interested",
  converted: "Converted",
};

const tempIcons = {
  hot: <Flame className="h-3.5 w-3.5 text-[hsl(var(--md-red))]" />,
  warm: <Zap className="h-3.5 w-3.5 text-[hsl(var(--md-orange))]" />,
  cold: <Snowflake className="h-3.5 w-3.5 text-[hsl(var(--md-blue))]" />,
};

const normalizePhone = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits;
};

interface Props {
  leads: Lead[];
  isLoading: boolean;
  onSelectLead: (lead: Lead) => void;
}

function MobileLeadCard({ lead, onSelectLead }: { lead: Lead; onSelectLead: (lead: Lead) => void }) {
  const isOverdue = lead.next_follow_up_at && new Date(lead.next_follow_up_at) < new Date();

  return (
    <div
      className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl active:scale-[0.98] transition-transform cursor-pointer"
      onClick={() => onSelectLead(lead)}
    >
      {/* Left: Temp icon */}
      <div className="flex-shrink-0">{tempIcons[lead.temperature]}</div>

      {/* Center: Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">{lead.full_name}</span>
          <span className={`inline-flex items-center rounded-full px-2 py-0 text-[10px] font-medium ${statusColors[lead.status]}`}>
            {statusLabels[lead.status]}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-muted-foreground">{lead.phone}</span>
          {lead.next_follow_up_at && lead.status !== "converted" && lead.status !== "not_interested" && (
            <span className={`flex items-center gap-0.5 text-[10px] ${isOverdue ? "text-[hsl(var(--md-red))] font-medium" : "text-muted-foreground"}`}>
              <Clock className="h-2.5 w-2.5" />
              {isOverdue ? "Overdue" : formatDistanceToNow(new Date(lead.next_follow_up_at), { addSuffix: true })}
            </span>
          )}
        </div>
      </div>

      {/* Right: Quick actions */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-[hsl(var(--md-green))]"
          onClick={(e) => {
            e.stopPropagation();
            window.open(`https://wa.me/${normalizePhone(lead.phone)}`, "_blank");
          }}
        >
          <MessageCircle className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-[hsl(var(--md-blue))]"
          onClick={(e) => {
            e.stopPropagation();
            window.open(`tel:${lead.phone}`);
          }}
        >
          <Phone className="h-4 w-4" />
        </Button>
        <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
      </div>
    </div>
  );
}

export function LeadTableView({ leads, isLoading, onSelectLead }: Props) {
  const isMobile = useIsMobile();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border border-dashed rounded-xl">
        No leads yet. Click "Add Lead" to get started.
      </div>
    );
  }

  // Mobile: Card list
  if (isMobile) {
    return (
      <div className="space-y-2">
        {leads.map((lead) => (
          <MobileLeadCard key={lead.id} lead={lead} onSelectLead={onSelectLead} />
        ))}
      </div>
    );
  }

  // Desktop: Table
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Temp</TableHead>
            <TableHead>Follow-up</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow
              key={lead.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => onSelectLead(lead)}
            >
              <TableCell>
                <div>
                  <span className="font-medium text-foreground">{lead.full_name}</span>
                  {lead.email && (
                    <p className="text-xs text-muted-foreground">{lead.email}</p>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-sm">{lead.phone}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs capitalize">
                  {lead.source.replace('_', ' ')}
                </Badge>
              </TableCell>
              <TableCell>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[lead.status]}`}>
                  {statusLabels[lead.status]}
                </span>
              </TableCell>
              <TableCell>{tempIcons[lead.temperature]}</TableCell>
              <TableCell>
                {lead.next_follow_up_at && lead.status !== "converted" && lead.status !== "not_interested" ? (
                  <div className={`flex items-center gap-1 text-xs ${
                    new Date(lead.next_follow_up_at) < new Date()
                      ? "text-[hsl(var(--md-red))] font-medium"
                      : "text-muted-foreground"
                  }`}>
                    <Clock className="h-3 w-3" />
                    {new Date(lead.next_follow_up_at) < new Date()
                      ? "Overdue"
                      : formatDistanceToNow(new Date(lead.next_follow_up_at), { addSuffix: true })
                    }
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {format(new Date(lead.created_at), "dd MMM yy")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
