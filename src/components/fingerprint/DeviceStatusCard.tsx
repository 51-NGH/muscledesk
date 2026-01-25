import { FingerprintDevice, isDeviceOnline } from "@/hooks/useFingerprintDevices";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Fingerprint, Wifi, WifiOff, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface DeviceStatusCardProps {
  device: FingerprintDevice;
  onClick?: () => void;
}

export function DeviceStatusCard({ device, onClick }: DeviceStatusCardProps) {
  const online = isDeviceOnline(device.last_seen_at);
  
  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md border-l-4",
        online ? "border-l-green-500" : "border-l-muted",
        !device.is_active && "opacity-60"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              online ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"
            )}>
              <Fingerprint className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-medium text-foreground">{device.device_name}</h4>
              <p className="text-xs text-muted-foreground font-mono">{device.device_serial}</p>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-1">
            {online ? (
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                <Wifi className="h-3 w-3 mr-1" />
                Online
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-muted text-muted-foreground">
                <WifiOff className="h-3 w-3 mr-1" />
                Offline
              </Badge>
            )}
            
            {!device.is_active && (
              <Badge variant="secondary" className="text-xs">Disabled</Badge>
            )}
          </div>
        </div>
        
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {device.last_seen_at ? (
              <span>Last seen {formatDistanceToNow(new Date(device.last_seen_at), { addSuffix: true })}</span>
            ) : (
              <span>Never connected</span>
            )}
          </div>
          
          {device.device_ip && (
            <span className="font-mono">{device.device_ip}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
