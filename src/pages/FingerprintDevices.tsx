import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  Fingerprint, 
  Monitor, 
  UserPlus, 
  Plus,
  Activity
} from "lucide-react";
import { DeviceStatusDashboard } from "@/components/fingerprint/DeviceStatusDashboard";
import { DeviceManagementTable } from "@/components/fingerprint/DeviceManagementTable";
import { DeviceRegistrationDialog } from "@/components/fingerprint/DeviceRegistrationDialog";
import { FingerprintEnrollmentDialog } from "@/components/fingerprint/FingerprintEnrollmentDialog";
import { EnrolledMembersTable } from "@/components/fingerprint/EnrolledMembersTable";
import { RecentFingerprintAttendance } from "@/components/fingerprint/RecentFingerprintAttendance";
import { useFingerprintRealtimeSubscription } from "@/hooks/useFingerprintRealtimeSubscription";

export default function FingerprintDevices() {
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  
  // Enable real-time updates for fingerprint attendance
  useFingerprintRealtimeSubscription();
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Fingerprint Devices"
          description="Manage fingerprint scanners and member enrollments"
        >
          <Button variant="outline" onClick={() => setShowEnrollDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Enroll Member
          </Button>
          <Button onClick={() => setShowRegisterDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Device
          </Button>
        </PageHeader>
        
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="dashboard" className="gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="devices" className="gap-2">
              <Monitor className="h-4 w-4" />
              <span className="hidden sm:inline">Devices</span>
            </TabsTrigger>
            <TabsTrigger value="enrollments" className="gap-2">
              <Fingerprint className="h-4 w-4" />
              <span className="hidden sm:inline">Enrollments</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2">
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Activity</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <DeviceStatusDashboard />
              </div>
              <div>
                <RecentFingerprintAttendance />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="devices">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-foreground">Registered Devices</h3>
                <Button size="sm" onClick={() => setShowRegisterDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Device
                </Button>
              </div>
              <DeviceManagementTable />
            </div>
          </TabsContent>
          
          <TabsContent value="enrollments">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-foreground">Enrolled Members</h3>
                <Button size="sm" onClick={() => setShowEnrollDialog(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Enroll Member
                </Button>
              </div>
              <EnrolledMembersTable />
            </div>
          </TabsContent>
          
          <TabsContent value="activity">
            <div className="max-w-2xl">
              <RecentFingerprintAttendance />
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      <DeviceRegistrationDialog 
        open={showRegisterDialog} 
        onOpenChange={setShowRegisterDialog} 
      />
      
      <FingerprintEnrollmentDialog 
        open={showEnrollDialog} 
        onOpenChange={setShowEnrollDialog} 
      />
    </DashboardLayout>
  );
}
