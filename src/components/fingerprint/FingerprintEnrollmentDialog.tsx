import { useState, useMemo } from "react";
import { useMembers } from "@/hooks/useGymData";
import { 
  useFingerprintDevices, 
  useEnrollFingerprint,
  useFingerprintTemplates 
} from "@/hooks/useFingerprintDevices";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Fingerprint, 
  User, 
  Check, 
  ChevronsUpDown,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FingerprintEnrollmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedMemberId?: string;
}

export function FingerprintEnrollmentDialog({ 
  open, 
  onOpenChange,
  preselectedMemberId 
}: FingerprintEnrollmentDialogProps) {
  const [selectedMemberId, setSelectedMemberId] = useState(preselectedMemberId || "");
  const [fingerprintUid, setFingerprintUid] = useState("");
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [memberOpen, setMemberOpen] = useState(false);
  const [deviceOpen, setDeviceOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const { data: members } = useMembers();
  const { data: devices } = useFingerprintDevices();
  const { data: templates } = useFingerprintTemplates();
  const enrollFingerprint = useEnrollFingerprint();
  
  // Members who don't have a fingerprint enrolled yet
  const eligibleMembers = useMemo(() => {
    if (!members || !templates) return members || [];
    const enrolledMemberIds = new Set(templates.map(t => t.member_id));
    return members.filter(m => !enrolledMemberIds.has(m.id));
  }, [members, templates]);
  
  const selectedMember = members?.find(m => m.id === selectedMemberId);
  const selectedDevice = devices?.find(d => d.id === selectedDeviceId);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMemberId || !fingerprintUid.trim()) {
      return;
    }
    
    try {
      await enrollFingerprint.mutateAsync({
        member_id: selectedMemberId,
        fingerprint_uid: fingerprintUid.trim(),
        device_id: selectedDeviceId || undefined,
      });
      
      setSuccess(true);
    } catch (error) {
      // Error handled by mutation
    }
  };
  
  const handleClose = () => {
    setSelectedMemberId(preselectedMemberId || "");
    setFingerprintUid("");
    setSelectedDeviceId("");
    setSuccess(false);
    onOpenChange(false);
  };
  
  const alreadyEnrolled = templates?.find(t => t.member_id === selectedMemberId);
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5 text-primary" />
            {success ? "Enrollment Complete!" : "Enroll Member Fingerprint"}
          </DialogTitle>
          <DialogDescription>
            {success 
              ? "The member can now check in using the fingerprint scanner."
              : "Link a fingerprint UID from your scanner to a member's account."
            }
          </DialogDescription>
        </DialogHeader>
        
        {success ? (
          <div className="space-y-4">
            <Alert className="bg-green-500/10 border-green-500/30">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">
                Fingerprint enrolled successfully for {selectedMember?.full_name}!
              </AlertDescription>
            </Alert>
            
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Member Selection */}
            <div className="space-y-2">
              <Label>Select Member *</Label>
              <Popover open={memberOpen} onOpenChange={setMemberOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={memberOpen}
                    className="w-full justify-between"
                  >
                    {selectedMember ? (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{selectedMember.full_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {selectedMember.member_id}
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Search members...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 bg-popover border shadow-md" align="start">
                  <Command>
                    <CommandInput placeholder="Search by name or ID..." />
                    <CommandList>
                      <CommandEmpty>No members found.</CommandEmpty>
                      <CommandGroup>
                        {eligibleMembers?.map((member) => (
                          <CommandItem
                            key={member.id}
                            value={`${member.full_name} ${member.member_id}`}
                            onSelect={() => {
                              setSelectedMemberId(member.id);
                              setMemberOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedMemberId === member.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex items-center gap-2">
                              <span>{member.full_name}</span>
                              <Badge variant="outline" className="text-xs">
                                {member.member_id}
                              </Badge>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              
              {alreadyEnrolled && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    This member already has a fingerprint enrolled.
                  </AlertDescription>
                </Alert>
              )}
            </div>
            
            {/* Fingerprint UID */}
            <div className="space-y-2">
              <Label htmlFor="fingerprint-uid">Fingerprint UID *</Label>
              <Input
                id="fingerprint-uid"
                placeholder="e.g., FP-001 or device-generated ID"
                value={fingerprintUid}
                onChange={(e) => setFingerprintUid(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter the unique ID from your fingerprint scanner after capturing the member's fingerprint.
              </p>
            </div>
            
            {/* Device Selection (Optional) */}
            <div className="space-y-2">
              <Label>Scanner Device (Optional)</Label>
              <Popover open={deviceOpen} onOpenChange={setDeviceOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={deviceOpen}
                    className="w-full justify-between"
                  >
                    {selectedDevice ? (
                      <div className="flex items-center gap-2">
                        <Fingerprint className="h-4 w-4" />
                        <span>{selectedDevice.device_name}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Select device...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 bg-popover border shadow-md" align="start">
                  <Command>
                    <CommandInput placeholder="Search devices..." />
                    <CommandList>
                      <CommandEmpty>No devices found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="none"
                          onSelect={() => {
                            setSelectedDeviceId("");
                            setDeviceOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              !selectedDeviceId ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="text-muted-foreground">No specific device</span>
                        </CommandItem>
                        {devices?.filter(d => d.is_active).map((device) => (
                          <CommandItem
                            key={device.id}
                            value={device.device_name}
                            onSelect={() => {
                              setSelectedDeviceId(device.id);
                              setDeviceOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedDeviceId === device.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <Fingerprint className="mr-2 h-4 w-4" />
                            {device.device_name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={enrollFingerprint.isPending || !selectedMemberId || !fingerprintUid.trim() || !!alreadyEnrolled}
              >
                {enrollFingerprint.isPending ? "Enrolling..." : "Enroll Fingerprint"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
