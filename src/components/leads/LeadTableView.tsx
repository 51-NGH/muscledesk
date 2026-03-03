import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Flame, Snowflake, Zap, Clock } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
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

interface Props {
  leads: Lead[];
  isLoading: boolean;
  onSelectLead: (lead: Lead) => void;
}

export function LeadTableView({ leads, isLoading, onSelectLead }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

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
          {leads.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                No leads yet. Click "Add Lead" to get started.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
