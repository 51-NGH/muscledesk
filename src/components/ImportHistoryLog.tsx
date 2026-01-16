import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { History, CheckCircle, XCircle, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ImportLog {
  id: string;
  file_name: string;
  file_type: string;
  total_rows: number;
  success_count: number;
  failure_count: number;
  plans_created: number;
  created_at: string;
}

export function ImportHistoryLog() {
  const { gymId } = useAuth();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["import-logs", gymId],
    queryFn: async () => {
      if (!gymId) return [];
      const { data, error } = await supabase
        .from("import_logs")
        .select("*")
        .eq("gym_id", gymId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as ImportLog[];
    },
    enabled: !!gymId,
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="hidden sm:flex">
          <History className="mr-2 h-4 w-4" />
          Import History
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Import History
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[500px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No imports yet</p>
              <p className="text-sm">Your import history will appear here</p>
            </div>
          ) : (
            <div className="space-y-3 pr-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center gap-4 p-4 rounded-lg border bg-card"
                >
                  <div className="p-2 rounded-lg bg-muted">
                    {log.file_type === "xlsx" || log.file_type === "xls" ? (
                      <FileSpreadsheet className="h-5 w-5 text-green-600" />
                    ) : (
                      <FileText className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{log.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(log.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="gap-1 bg-md-green/10 text-md-green border-md-green/20">
                      <CheckCircle className="h-3 w-3" />
                      {log.success_count}
                    </Badge>
                    {log.failure_count > 0 && (
                      <Badge variant="outline" className="gap-1 bg-destructive/10 text-destructive border-destructive/20">
                        <XCircle className="h-3 w-3" />
                        {log.failure_count}
                      </Badge>
                    )}
                  </div>
                  {log.plans_created > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      +{log.plans_created} plans
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
