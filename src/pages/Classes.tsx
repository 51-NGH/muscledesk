import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";

export default function Classes() {
  return (
    <DashboardLayout>
      <PageHeader title="Classes" description="Manage gym classes and schedules" />
      <div className="rounded-xl border border-border bg-card p-10 text-center">
        <p className="text-muted-foreground">Classes management coming soon</p>
      </div>
    </DashboardLayout>
  );
}
