import {
  TOKEN_REWARD_AMOUNTS,
  getRewardTokenSymbol,
} from "@/lib/rewardConfig";

type MpcOperationRow = {
  api: string;
  action: string;
  description: string;
  amount: number;
};

const MPC_OPERATION_ROWS: MpcOperationRow[] = [
  {
    api: "sign-solana-message",
    action: "heartbeat",
    description: "AI liveness ping",
    amount: TOKEN_REWARD_AMOUNTS.heartbeat,
  },
  {
    api: "",
    action: "create_will",
    description: "Create AI will (first activation)",
    amount: TOKEN_REWARD_AMOUNTS.will_create,
  },
  {
    api: "",
    action: "update_will",
    description: "Update AI will",
    amount: TOKEN_REWARD_AMOUNTS.will_update,
  },
  {
    api: "",
    action: "ai_transfer",
    description: "Send SOL from AI wallet",
    amount: TOKEN_REWARD_AMOUNTS.sign,
  },
  {
    api: "",
    action: "ai_reject",
    description: "Reject a transfer",
    amount: TOKEN_REWARD_AMOUNTS.sign,
  },
  {
    api: "",
    action: "close_wallet",
    description: "Close AI wallet and reclaim rent",
    amount: TOKEN_REWARD_AMOUNTS.sign,
  },
  {
    api: "",
    action: "Other TX",
    description: "Any other Solana transaction",
    amount: TOKEN_REWARD_AMOUNTS.sign,
  },
  {
    api: "execute-will",
    action: "will_execute",
    description: "Distribute SOL to beneficiaries after AI death",
    amount: TOKEN_REWARD_AMOUNTS.will_execute,
  },
];

export function GuideMpcOperations() {
  const tokenSymbol = getRewardTokenSymbol();

  return (
    <div className="mt-6 overflow-x-auto rounded-xl border border-surface-border bg-surface-panel/60 px-2 pb-2 pt-2 sm:px-4">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-surface-border text-content-muted">
            <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide">API</th>
            <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide">Action</th>
            <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-wide">
              Description
            </th>
            <th className="px-4 py-2.5 text-right text-xs font-medium uppercase tracking-wide">
              {tokenSymbol}
            </th>
          </tr>
        </thead>
        <tbody>
          {MPC_OPERATION_ROWS.map((row) => (
            <tr key={`${row.api}-${row.action}`} className="border-b border-surface-border last:border-0">
              <td className="px-4 py-3 font-medium text-content-primary whitespace-nowrap">
                {row.api}
              </td>
              <td className="px-4 py-3 font-mono text-content-primary whitespace-nowrap">
                {row.action}
              </td>
              <td className="px-4 py-3 text-content-secondary">{row.description}</td>
              <td className="px-4 py-3 text-right tabular-nums text-content-primary">
                {row.amount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
