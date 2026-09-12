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
    <div className="mt-6 overflow-x-auto rounded-xl border border-surface-border bg-surface-panel">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-surface-border bg-surface-elevated/40 text-xs uppercase tracking-wide text-content-muted">
            <th className="px-4 py-3 font-medium">API</th>
            <th className="px-4 py-3 font-medium">Action</th>
            <th className="px-4 py-3 font-medium">Description</th>
            <th className="px-4 py-3 font-medium text-right">{tokenSymbol}</th>
          </tr>
        </thead>
        <tbody>
          {MPC_OPERATION_ROWS.map((row, index) => (
            <tr
              key={`${row.api}-${row.action}`}
              className={
                index === MPC_OPERATION_ROWS.length - 1
                  ? ""
                  : "border-b border-surface-border/60"
              }
            >
              <td className="px-4 py-3 align-middle font-medium text-content-primary whitespace-nowrap">
                {row.api}
              </td>
              <td className="px-4 py-3 align-middle font-mono text-content-primary whitespace-nowrap">
                {row.action}
              </td>
              <td className="px-4 py-3 align-middle text-content-secondary">
                {row.description}
              </td>
              <td className="px-4 py-3 align-middle text-right tabular-nums text-content-primary">
                {row.amount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
