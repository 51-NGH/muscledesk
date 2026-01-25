import { useFingerprintDevices, isDeviceOnline } from "@/hooks/useFingerprintDevices";
import { DeviceStatusCard } from "./DeviceStatusCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Fingerprint, Wifi, WifiOff, AlertCircle } from "lucide-react";

interface DeviceStatusDashboardProps {
  onDeviceClick?: (deviceId: string) => void;
}

export function DeviceStatusDashboard({ onDeviceClick }: DeviceStatusDashboardProps) {
  const { data: devices, isLoading, error } = useFingerprintDevices();
  
  const onlineCount = devices?.filter(d => d.is_active && isDeviceOnline(d.last_seen_at)).length || 0;
  const offlineCount = devices?.filter(d => d.is_active && !isDeviceOnline(d.last_seen_at)).length || 0;
  const disabledCount = devices?.filter(d => !d.is_active).length || 0;
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="flex items-center gap-3 p-6 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>Failed to load devices. Please try again.</span>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Online Devices</p>
                <p className="text-2xl font-bold text-foreground">{onlineCount}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-500/10">
                <Wifi className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Offline Devices</p>
                <p className="text-2xl font-bold text-foreground">{offlineCount}</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/10">
                <WifiOff className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-muted">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Devices</p>
                <p className="text-2xl font-bold text-foreground">{devices?.length || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted">
                <Fingerprint className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Device Cards */}
      {devices && devices.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map(device => (
            <DeviceStatusCard 
              key={device.id} 
              device={device}
              onClick={() => onDeviceClick?.(device.id)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Fingerprint className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">No Devices Registered</h3>
            <p className="text-sm text-muted-foreground">
              Register your first fingerprint device to start tracking attendance
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
