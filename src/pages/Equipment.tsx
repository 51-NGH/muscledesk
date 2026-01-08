import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/ui/page-header";

export default function Equipment() {
  return (
    <DashboardLayout>
      <PageHeader title="Equipment" description="Track gym equipment and maintenance" />
      <div className="rounded-xl border border-border bg-card p-10 text-center">
        <p className="text-muted-foreground">Equipment management coming soon</p>
      </div>
    </DashboardLayout>
  );
}
