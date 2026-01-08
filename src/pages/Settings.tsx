import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";

export default function Settings() {
  return (
    <DashboardLayout>
      <PageHeader title="Settings" description="Manage your gym settings" />
      <div className="rounded-xl border border-border bg-card p-10 text-center">
        <p className="text-muted-foreground">Settings page coming soon</p>
      </div>
    </DashboardLayout>
  );
}
