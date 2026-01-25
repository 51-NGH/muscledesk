import { useState } from "react";
import { 
  useFingerprintTemplates, 
  useDeleteFingerprintTemplate 
} from "@/hooks/useFingerprintDevices";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Fingerprint, Trash2, User } from "lucide-react";
import { format } from "date-fns";

export function EnrolledMembersTable() {
  const { data: templates, isLoading } = useFingerprintTemplates();
  const deleteTemplate = useDeleteFingerprintTemplate();
  
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const handleDelete = async () => {
    if (deleteId) {
      await deleteTemplate.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };
  
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }
  
  if (!templates || templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg">
        <User className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-1">No Enrollments Yet</h3>
        <p className="text-sm text-muted-foreground">
          Enroll members to allow fingerprint check-in
        </p>
      </div>
    );
  }
  
  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Fingerprint UID</TableHead>
              <TableHead>Enrolled On</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((template) => (
              <TableRow key={template.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="member-avatar h-9 w-9 text-sm">
                      {template.member?.full_name?.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {template.member?.full_name || "Unknown Member"}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {template.member?.member_id}
                      </Badge>
                    </div>
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Fingerprint className="h-4 w-4 text-muted-foreground" />
                    <code className="text-sm bg-muted px-2 py-0.5 rounded font-mono">
                      {template.fingerprint_uid}
                    </code>
                  </div>
                </TableCell>
                
                <TableCell className="text-muted-foreground">
                  {format(new Date(template.created_at), "MMM d, yyyy")}
                </TableCell>
                
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteId(template.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Fingerprint Enrollment?</AlertDialogTitle>
            <AlertDialogDescription>
              This member will no longer be able to check in using the fingerprint scanner.
              You can re-enroll them later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
