import { AppLayout, PageShell } from "@/components/PageShell";
import { NodeRewardsOverview } from "@/components/node-rewards/NodeRewardsOverview";

export default function NodeRewardsPage() {
  return (
    <AppLayout>
      <PageShell
        title="Node Rewards"
        description="SOL rewards earned by nodes for wallet issuances referred through them — recorded from actual on-chain transactions."
      >
        <NodeRewardsOverview />
      </PageShell>
    </AppLayout>
  );
}
