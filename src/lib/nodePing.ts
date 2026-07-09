import { PING_MAX_AGE_MS } from "./referralConfig";

/** True when the node has pinged within the referral active window. */
export function isNodePingActive(lastPingAt: string | null | undefined): boolean {
  if (!lastPingAt) return false;
  const pingTime = new Date(lastPingAt).getTime();
  if (Number.isNaN(pingTime)) return false;
  return Date.now() - pingTime <= PING_MAX_AGE_MS;
}
