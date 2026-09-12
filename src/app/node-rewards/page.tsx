import { AppLayout, PageShell } from "@/components/PageShell";
import { NodeRewardsOverview } from "@/components/node-rewards/NodeRewardsOverview";

export default function NodeRewardsPage() {
  return (
    <AppLayout>
      <PageShell
        title="Node Rewards"
        description="SOL and TAICW rewards earned by MPC committee nodes for wallet issuances, signing, and will operations."
      >
        <NodeRewardsOverview />
      </PageShell>
    </AppLayout>
  );
}
