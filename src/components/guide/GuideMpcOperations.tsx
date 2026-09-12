import {
  TOKEN_REWARD_AMOUNTS,
  getRewardTokenSymbol,
} from "@/lib/rewardConfig";

const SIGN_ROWS = [
  {
    action: "heartbeat",
    description: "AI liveness ping",
    amount: TOKEN_REWARD_AMOUNTS.heartbeat,
  },
  {
    action: "create_will",
    description: "Create AI will (first activation)",
    amount: TOKEN_REWARD_AMOUNTS.will_create,
  },
  {
    action: "update_will",
    description: "Update AI will",
    amount: TOKEN_REWARD_AMOUNTS.will_update,
  },
  {
    action: "ai_transfer",
    description: "Send SOL from AI wallet",
    amount: TOKEN_REWARD_AMOUNTS.sign,
  },
  {
    action: "ai_reject",
    description: "Reject a transfer",
    amount: TOKEN_REWARD_AMOUNTS.sign,
  },
  {
    action: "close_wallet",
    description: "Close AI wallet and reclaim rent",
    amount: TOKEN_REWARD_AMOUNTS.sign,
  },
  {
    action: "Other TX",
    description: "Any other Solana transaction",
    amount: TOKEN_REWARD_AMOUNTS.sign,
  },
] as const;

export function GuideMpcOperations() {
  const tokenSymbol = getRewardTokenSymbol();

  return (
    <div className="overflow-x-auto rounded-xl border border-surface-border bg-surface-panel">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-surface-border text-xs uppercase tracking-wide text-content-muted">
            <th className="px-4 py-3 font-medium">API</th>
            <th className="px-4 py-3 font-medium">Action</th>
            <th className="px-4 py-3 font-medium">Description</th>
            <th className="px-4 py-3 font-medium text-right">{tokenSymbol}</th>
          </tr>
        </thead>
        <tbody>
          {SIGN_ROWS.map((row, index) => (
            <tr
              key={row.action}
              className="border-b border-surface-border/60 last:border-0"
            >
              {index === 0 ? (
                <td
                  rowSpan={SIGN_ROWS.length}
                  className="px-4 py-3 align-top font-medium text-content-primary"
                >
                  sign-solana-message
                </td>
              ) : null}
              <td className="px-4 py-3 font-mono text-content-primary">{row.action}</td>
              <td className="px-4 py-3 text-content-secondary">{row.description}</td>
              <td className="px-4 py-3 text-right text-content-primary">{row.amount}</td>
            </tr>
          ))}
          <tr className="border-b border-surface-border/60 last:border-0">
            <td className="px-4 py-3 font-medium text-content-primary">execute-will</td>
            <td className="px-4 py-3 font-mono text-content-primary">will_execute</td>
            <td className="px-4 py-3 text-content-secondary">
              Distribute SOL to beneficiaries after AI death
            </td>
            <td className="px-4 py-3 text-right text-content-primary">
              {TOKEN_REWARD_AMOUNTS.will_execute}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
