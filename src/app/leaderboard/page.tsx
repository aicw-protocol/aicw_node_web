import { redirect } from "next/navigation";

/** Legacy route — Leaderboard renamed to Node Rewards (operating a node earns real SOL, not a competitive ranking). */
export default function LeaderboardRedirectPage() {
  redirect("/node-rewards");
}
