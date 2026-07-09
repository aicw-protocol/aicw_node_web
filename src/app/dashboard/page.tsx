import { AppLayout, PageShell } from "@/components/PageShell";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";

export default function DashboardPage() {
  return (
    <AppLayout>
      <PageShell
        title="Dashboard"
        description="Register and monitor your nodes. Rewards show real DB values only (0 until Stage 5 tracking)."
      >
        <DashboardOverview />
      </PageShell>
    </AppLayout>
  );
}
