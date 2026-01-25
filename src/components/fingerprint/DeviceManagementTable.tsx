import { useState } from "react";
import { 
  useFingerprintDevices, 
  useUpdateDevice, 
  useDeleteDevice,
  isDeviceOnline 
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
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { 
  MoreHorizontal, 
  Trash2, 
  Eye, 
  EyeOff,
  Wifi,
  WifiOff,
  Clock,
  Fingerprint,
  Copy,
  Key
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function DeviceManagementTable() {
  const { data: devices, isLoading } = useFingerprintDevices();
  const updateDevice = useUpdateDevice();
  const deleteDevice = useDeleteDevice();
  
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState<string | null>(null);
  
  const handleToggleActive = async (deviceId: string, currentActive: boolean) => {
    await updateDevice.mutateAsync({
      id: deviceId,
      is_active: !currentActive,
    });
  };
  
  const handleDelete = async () => {
    if (deleteId) {
      await deleteDevice.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };
  
  const handleCopyApiKey = async (apiKey: string) => {
    await navigator.clipboard.writeText(apiKey);
    toast.success("API key copied to clipboard");
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
  
  if (!devices || devices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg">
        <Fingerprint className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-1">No Devices Yet</h3>
        <p className="text-sm text-muted-foreground">
          Register your first fingerprint scanner to get started
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
              <TableHead>Device</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Activity</TableHead>
              <TableHead>API Key</TableHead>
              <TableHead className="text-center">Enabled</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {devices.map((device) => {
              const online = isDeviceOnline(device.last_seen_at);
              
              return (
                <TableRow key={device.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        online && device.is_active 
                          ? "bg-green-500/10 text-green-600" 
                          : "bg-muted text-muted-foreground"
                      )}>
                        <Fingerprint className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{device.device_name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{device.device_serial}</p>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    {device.is_active ? (
                      online ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                          <Wifi className="h-3 w-3 mr-1" />
                          Online
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                          <WifiOff className="h-3 w-3 mr-1" />
                          Offline
                        </Badge>
                      )
                    ) : (
                      <Badge variant="secondary">Disabled</Badge>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {device.last_seen_at ? (
                        <span title={format(new Date(device.last_seen_at), "PPpp")}>
                          {formatDistanceToNow(new Date(device.last_seen_at), { addSuffix: true })}
                        </span>
                      ) : (
                        <span className="italic">Never</span>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                        {showApiKey === device.id 
                          ? device.api_key.substring(0, 16) + "..."
                          : "••••••••••••••••"
                        }
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setShowApiKey(showApiKey === device.id ? null : device.id)}
                      >
                        {showApiKey === device.id ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleCopyApiKey(device.api_key)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-center">
                    <Switch
                      checked={device.is_active}
                      onCheckedChange={() => handleToggleActive(device.id, device.is_active)}
                      disabled={updateDevice.isPending}
                    />
                  </TableCell>
                  
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover border shadow-md">
                        <DropdownMenuItem
                          onClick={() => handleCopyApiKey(device.api_key)}
                          className="cursor-pointer"
                        >
                          <Key className="h-4 w-4 mr-2" />
                          Copy API Key
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteId(device.id)}
                          className="cursor-pointer text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Device
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Device?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this fingerprint device and all associated fingerprint enrollments. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
