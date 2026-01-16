import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users, BarChart3, CreditCard, Layers } from "lucide-react";
import { GymManagement } from "@/components/super-admin/GymManagement";
import { UserRoleManagement } from "@/components/super-admin/UserRoleManagement";
import { SystemAnalytics } from "@/components/super-admin/SystemAnalytics";
import { PlanManagement } from "@/components/super-admin/PlanManagement";
import { BrandManagement } from "@/components/super-admin/BrandManagement";

export default function SuperAdmin() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Super Admin Panel"
          description="Manage gyms, users, roles, and system-wide settings"
        />

        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="gyms" className="gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Gyms</span>
            </TabsTrigger>
            <TabsTrigger value="brands" className="gap-2">
              <Layers className="h-4 w-4" />
              <span className="hidden sm:inline">Brands</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Users & Roles</span>
            </TabsTrigger>
            <TabsTrigger value="plans" className="gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Plans</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics">
            <SystemAnalytics />
          </TabsContent>

          <TabsContent value="gyms">
            <GymManagement />
          </TabsContent>

          <TabsContent value="brands">
            <BrandManagement />
          </TabsContent>

          <TabsContent value="users">
            <UserRoleManagement />
          </TabsContent>

          <TabsContent value="plans">
            <PlanManagement />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
