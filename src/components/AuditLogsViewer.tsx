import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  Search,
  History,
  User,
  Edit,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_data: any;
  new_data: any;
  user_id: string | null;
  created_at: string;
}

interface AuditLogsViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

const actionIcons: Record<string, any> = {
  INSERT: Plus,
  UPDATE: Edit,
  DELETE: Trash2,
};

const actionColors: Record<string, string> = {
  INSERT: "bg-md-green/10 text-md-green",
  UPDATE: "bg-md-blue/10 text-md-blue",
  DELETE: "bg-md-red/10 text-md-red",
};

export function AuditLogsViewer({ isOpen, onClose }: AuditLogsViewerProps) {
  const { gymId } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ["audit_logs", gymId],
    queryFn: async () => {
      if (!gymId) return [];
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("gym_id", gymId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as AuditLog[];
    },
    enabled: !!gymId && isOpen,
  });

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedLogs(newExpanded);
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      log.entity_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      JSON.stringify(log.new_data || log.old_data).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEntity = entityFilter === "all" || log.entity_type === entityFilter;
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    return matchesSearch && matchesEntity && matchesAction;
  });

  const uniqueEntities = [...new Set(logs.map((l) => l.entity_type))];

  const getChangedFields = (oldData: any, newData: any): string[] => {
    if (!oldData || !newData) return [];
    const changes: string[] = [];
    const allKeys = new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]);
    
    allKeys.forEach((key) => {
      if (key === "updated_at" || key === "created_at") return;
      if (JSON.stringify(oldData?.[key]) !== JSON.stringify(newData?.[key])) {
        changes.push(key);
      }
    });
    
    return changes;
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return "—";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Audit Logs
          </DialogTitle>
          <DialogDescription>
            Track all changes made to members, payments, and equipment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {uniqueEntities.map((entity) => (
                  <SelectItem key={entity} value={entity}>
                    {entity.charAt(0).toUpperCase() + entity.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="INSERT">Created</SelectItem>
                <SelectItem value="UPDATE">Updated</SelectItem>
                <SelectItem value="DELETE">Deleted</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Logs List */}
          <ScrollArea className="h-[500px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No audit logs found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredLogs.map((log) => {
                  const Icon = actionIcons[log.action] || Edit;
                  const isExpanded = expandedLogs.has(log.id);
                  const changedFields = getChangedFields(log.old_data, log.new_data);
                  
                  return (
                    <div
                      key={log.id}
                      className="rounded-lg border border-border bg-card overflow-hidden"
                    >
                      <div
                        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => toggleExpanded(log.id)}
                      >
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${actionColors[log.action]}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {log.entity_type}
                            </Badge>
                            <span className="text-sm font-medium">
                              {log.action === "INSERT" && "Created"}
                              {log.action === "UPDATE" && "Updated"}
                              {log.action === "DELETE" && "Deleted"}
                            </span>
                            {log.action === "UPDATE" && changedFields.length > 0 && (
                              <span className="text-xs text-muted-foreground">
                                ({changedFields.join(", ")})
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(log.created_at), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>

                      {isExpanded && (
                        <div className="border-t border-border p-3 bg-muted/30">
                          {log.action === "UPDATE" && log.old_data && log.new_data ? (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground mb-2">Changes:</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {changedFields.map((field) => (
                                  <div key={field} className="text-xs space-y-0.5">
                                    <span className="font-medium text-foreground">{field}:</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground line-through">
                                        {formatValue(log.old_data?.[field])}
                                      </span>
                                      <span className="text-foreground">→</span>
                                      <span className="text-md-green">
                                        {formatValue(log.new_data?.[field])}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground mb-2">
                                {log.action === "INSERT" ? "Created with:" : "Deleted data:"}
                              </p>
                              <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
                                {JSON.stringify(log.new_data || log.old_data, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}