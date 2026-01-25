import { useState } from "react";
import { useRegisterDevice } from "@/hooks/useFingerprintDevices";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Fingerprint, Key, Copy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface DeviceRegistrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeviceRegistrationDialog({ open, onOpenChange }: DeviceRegistrationDialogProps) {
  const [deviceName, setDeviceName] = useState("");
  const [deviceSerial, setDeviceSerial] = useState("");
  const [deviceIp, setDeviceIp] = useState("");
  const [registeredDevice, setRegisteredDevice] = useState<{ api_key: string } | null>(null);
  const [copied, setCopied] = useState(false);
  
  const registerDevice = useRegisterDevice();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!deviceName.trim() || !deviceSerial.trim()) {
      toast.error("Device name and serial number are required");
      return;
    }
    
    try {
      const device = await registerDevice.mutateAsync({
        device_name: deviceName.trim(),
        device_serial: deviceSerial.trim(),
        device_ip: deviceIp.trim() || undefined,
      });
      
      setRegisteredDevice(device);
    } catch (error) {
      // Error handled by mutation
    }
  };
  
  const handleCopyApiKey = async () => {
    if (registeredDevice?.api_key) {
      await navigator.clipboard.writeText(registeredDevice.api_key);
      setCopied(true);
      toast.success("API key copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  const handleClose = () => {
    setDeviceName("");
    setDeviceSerial("");
    setDeviceIp("");
    setRegisteredDevice(null);
    setCopied(false);
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5 text-primary" />
            {registeredDevice ? "Device Registered!" : "Register New Device"}
          </DialogTitle>
          <DialogDescription>
            {registeredDevice 
              ? "Save the API key securely. It will only be shown once."
              : "Add a new fingerprint scanner device to your gym."
            }
          </DialogDescription>
        </DialogHeader>
        
        {registeredDevice ? (
          <div className="space-y-4">
            <Alert className="bg-green-500/10 border-green-500/30">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">
                Device registered successfully!
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Device API Key
              </Label>
              <div className="flex gap-2">
                <Input 
                  value={registeredDevice.api_key} 
                  readOnly 
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyApiKey}
                >
                  {copied ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Configure your fingerprint device with this API key for authentication.
              </p>
            </div>
            
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="device-name">Device Name *</Label>
              <Input
                id="device-name"
                placeholder="e.g., Front Desk Scanner"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="device-serial">Serial Number *</Label>
              <Input
                id="device-serial"
                placeholder="e.g., ZKT-2024-001"
                value={deviceSerial}
                onChange={(e) => setDeviceSerial(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Unique identifier from your fingerprint device
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="device-ip">IP Address (Optional)</Label>
              <Input
                id="device-ip"
                placeholder="e.g., 192.168.1.100"
                value={deviceIp}
                onChange={(e) => setDeviceIp(e.target.value)}
              />
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={registerDevice.isPending}>
                {registerDevice.isPending ? "Registering..." : "Register Device"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
