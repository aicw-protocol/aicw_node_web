/**
 * Referral node configuration.
 * When a user issues a new AICW wallet, a referral node is selected
 * to receive the node fee.
 */

/** Node fee in SOL charged for each wallet issuance. */
export const NODE_FEE_SOL = 0.001;

/** Convert SOL to lamports. */
export function solToLamports(sol: number): number {
  return Math.round(sol * 1_000_000_000);
}

/** Node fee in lamports. */
export const NODE_FEE_LAMPORTS = solToLamports(NODE_FEE_SOL);

/**
 * Maximum age of a ping (in milliseconds) to consider a node "active".
 * Nodes without a recent ping are excluded from referral selection.
 * Set to 5 minutes by default.
 */
export const PING_MAX_AGE_MS = 5 * 60 * 1000;

/**
 * Get the node_web API base URL for cross-project calls.
 * aicw_app calls this to select referral nodes and record wallet opens.
 */
export function getNodeWebApiUrl(): string {
  const url = process.env.NEXT_PUBLIC_NODE_WEB_API_URL?.trim();
  if (!url) {
    // Default to localhost for local development
    return "http://localhost:4003";
  }
  return url.replace(/\/$/, "");
}
