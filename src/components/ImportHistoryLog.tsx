import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, differenceInMinutes } from "date-fns";
import { History, CheckCircle, XCircle, FileSpreadsheet, FileText, Loader2, Undo2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface ImportLog {
  id: string;
  file_name: string;
  file_type: string;
  total_rows: number;
  success_count: number;
  failure_count: number;
  plans_created: number;
  created_at: string;
  imported_member_ids: string[] | null;
  imported_attendance_ids: string[] | null;
  imported_payment_ids: string[] | null;
  reverted_at: string | null;
}

export function ImportHistoryLog() {
  const { gymId } = useAuth();
  const queryClient = useQueryClient();
  const [revertingId, setRevertingId] = useState<string | null>(null);
  const [confirmRevertLog, setConfirmRevertLog] = useState<ImportLog | null>(null);

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
      return data as unknown as ImportLog[];
    },
    enabled: !!gymId,
  });

  const canRevert = (log: ImportLog): boolean => {
    if (log.reverted_at) return false;
    const memberIds = log.imported_member_ids;
    if (!memberIds || memberIds.length === 0) return false;
    const minutesAgo = differenceInMinutes(new Date(), new Date(log.created_at));
    return minutesAgo <= 30;
  };

  const getTimeRemaining = (log: ImportLog): string => {
    const minutesAgo = differenceInMinutes(new Date(), new Date(log.created_at));
    const remaining = 30 - minutesAgo;
    if (remaining <= 0) return "Expired";
    return `${remaining}m left`;
  };

  const handleRevert = async (log: ImportLog) => {
    setRevertingId(log.id);
    try {
      // Delete attendance records first (due to foreign keys)
      if (log.imported_attendance_ids && log.imported_attendance_ids.length > 0) {
        const { error: attErr } = await supabase
          .from("attendance")
          .delete()
          .in("id", log.imported_attendance_ids);
        if (attErr) throw attErr;
      }

      // Delete payment records
      if (log.imported_payment_ids && log.imported_payment_ids.length > 0) {
        const { error: payErr } = await supabase
          .from("payments")
          .delete()
          .in("id", log.imported_payment_ids);
        if (payErr) throw payErr;
      }

      // Soft-delete imported members
      if (log.imported_member_ids && log.imported_member_ids.length > 0) {
        const { error: memErr } = await supabase
          .from("members")
          .update({ deleted_at: new Date().toISOString() })
          .in("id", log.imported_member_ids);
        if (memErr) throw memErr;
      }

      // Mark import log as reverted
      await supabase
        .from("import_logs")
        .update({ reverted_at: new Date().toISOString() } as any)
        .eq("id", log.id);

      toast.success(`Import reverted! ${log.imported_member_ids?.length || 0} members removed.`);
      queryClient.invalidateQueries({ queryKey: ["import-logs"] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    } catch (error: any) {
      toast.error("Failed to revert: " + error.message);
    } finally {
      setRevertingId(null);
      setConfirmRevertLog(null);
    }
  };

  return (
    <>
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
                    className={`flex items-center gap-4 p-4 rounded-lg border bg-card ${log.reverted_at ? "opacity-50" : ""}`}
                  >
                    <div className="p-2 rounded-lg bg-muted">
                      {log.file_type === "xlsx" || log.file_type === "xls" ? (
                        <FileSpreadsheet className="h-5 w-5 text-green-600" />
                      ) : (
                        <FileText className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {log.file_name}
                        {log.reverted_at && (
                          <Badge variant="outline" className="ml-2 text-xs text-muted-foreground">
                            Reverted
                          </Badge>
                        )}
                      </p>
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
                    {canRevert(log) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                        disabled={revertingId === log.id}
                        onClick={() => setConfirmRevertLog(log)}
                      >
                        {revertingId === log.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Undo2 className="h-3 w-3" />
                        )}
                        <span className="text-xs">{getTimeRemaining(log)}</span>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmRevertLog} onOpenChange={() => setConfirmRevertLog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert Import?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <strong>{confirmRevertLog?.imported_member_ids?.length || 0} members</strong>
              {(confirmRevertLog?.imported_attendance_ids?.length || 0) > 0 && (
                <>, <strong>{confirmRevertLog?.imported_attendance_ids?.length} attendance records</strong></>
              )}
              {(confirmRevertLog?.imported_payment_ids?.length || 0) > 0 && (
                <>, <strong>{confirmRevertLog?.imported_payment_ids?.length} payments</strong></>
              )} imported from <strong>{confirmRevertLog?.file_name}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmRevertLog && handleRevert(confirmRevertLog)}
            >
              Revert Import
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
