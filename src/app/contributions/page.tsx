import { redirect } from "next/navigation";

/** Legacy route — Contributions renamed to Node Rewards. */
export default function ContributionsRedirectPage() {
  redirect("/node-rewards");
}
