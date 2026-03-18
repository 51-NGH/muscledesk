import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Phone, MessageCircle, Flame, Snowflake, Zap, Clock, CalendarCheck,
  ChevronRight, AlertTriangle,
} from "lucide-react";
import { format, isToday, isPast, isTomorrow } from "date-fns";
import type { Lead } from "@/hooks/useLeads";

const tempIcons = {
  hot: <Flame className="h-3.5 w-3.5 text-[hsl(var(--md-red))]" />,
  warm: <Zap className="h-3.5 w-3.5 text-[hsl(var(--md-orange))]" />,
  cold: <Snowflake className="h-3.5 w-3.5 text-[hsl(var(--md-blue))]" />,
};

interface Props {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
}

export function TodayFollowUps({ leads, onSelectLead }: Props) {
  const { overdue, today, tomorrow } = useMemo(() => {
    const now = new Date();
    const activeLeads = leads.filter(
      (l) => l.next_follow_up_at && l.status !== "converted" && l.status !== "not_interested"
    );

    const overdue: Lead[] = [];
    const today: Lead[] = [];
    const tomorrow: Lead[] = [];

    activeLeads.forEach((l) => {
      const d = new Date(l.next_follow_up_at!);
      if (isToday(d)) {
        today.push(l);
      } else if (isPast(d)) {
        overdue.push(l);
      } else if (isTomorrow(d)) {
        tomorrow.push(l);
      }
    });

    // Sort overdue oldest first, today/tomorrow earliest first
    overdue.sort((a, b) => new Date(a.next_follow_up_at!).getTime() - new Date(b.next_follow_up_at!).getTime());
    today.sort((a, b) => new Date(a.next_follow_up_at!).getTime() - new Date(b.next_follow_up_at!).getTime());
    tomorrow.sort((a, b) => new Date(a.next_follow_up_at!).getTime() - new Date(b.next_follow_up_at!).getTime());

    return { overdue, today, tomorrow };
  }, [leads]);

  const totalCount = overdue.length + today.length + tomorrow.length;

  if (totalCount === 0) return null;

  const normalizePhone = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 10) return `91${digits}`;
    return digits;
  };

  const renderLeadRow = (lead: Lead, isOverdue = false) => (
    <div
      key={lead.id}
      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-muted/60 ${
        isOverdue ? "bg-[hsl(var(--md-red-light))]/30" : "bg-muted/30"
      }`}
      onClick={() => onSelectLead(lead)}
    >
      <div className="flex-shrink-0">{tempIcons[lead.temperature]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{lead.full_name}</p>
        <p className="text-xs text-muted-foreground truncate">{lead.phone}</p>
      </div>
      {lead.trial_scheduled_at && isToday(new Date(lead.trial_scheduled_at)) && (
        <Badge variant="outline" className="text-[10px] gap-1 border-[hsl(var(--md-green))]/30 text-[hsl(var(--md-green))]">
          <CalendarCheck className="h-3 w-3" />
          Trial today
        </Badge>
      )}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-[hsl(var(--md-green))]"
          onClick={(e) => {
            e.stopPropagation();
            window.open(`https://wa.me/${normalizePhone(lead.phone)}`, "_blank");
          }}
          title="WhatsApp"
        >
          <MessageCircle className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-[hsl(var(--md-blue))]"
          onClick={(e) => {
            e.stopPropagation();
            window.open(`tel:${lead.phone}`);
          }}
          title="Call"
        >
          <Phone className="h-3.5 w-3.5" />
        </Button>
        <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
      </div>
    </div>
  );

  return (
    <Card className="p-4 space-y-3 border-[hsl(var(--md-orange))]/20 bg-card">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-[hsl(var(--md-orange))]" />
        <h3 className="text-sm font-semibold text-foreground">Today's Follow-ups</h3>
        <Badge variant="secondary" className="ml-auto text-xs">
          {totalCount}
        </Badge>
      </div>

      {overdue.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 px-1">
            <AlertTriangle className="h-3 w-3 text-[hsl(var(--md-red))]" />
            <span className="text-[11px] font-semibold text-[hsl(var(--md-red))] uppercase tracking-wider">
              Overdue ({overdue.length})
            </span>
          </div>
          {overdue.slice(0, 5).map((l) => renderLeadRow(l, true))}
          {overdue.length > 5 && (
            <p className="text-[10px] text-muted-foreground text-center">+{overdue.length - 5} more overdue</p>
          )}
        </div>
      )}

      {today.length > 0 && (
        <div className="space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Today ({today.length})
          </span>
          {today.map((l) => renderLeadRow(l))}
        </div>
      )}

      {tomorrow.length > 0 && (
        <div className="space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Tomorrow ({tomorrow.length})
          </span>
          {tomorrow.slice(0, 3).map((l) => renderLeadRow(l))}
          {tomorrow.length > 3 && (
            <p className="text-[10px] text-muted-foreground text-center">+{tomorrow.length - 3} more tomorrow</p>
          )}
        </div>
      )}
    </Card>
  );
}
