/** Consul KV settings for server-side MPC membership whitelist writes. */

export const DEFAULT_MEMBERSHIP_WHITELIST_PREFIX =
  "mpc_eligibility/membership_whitelist/";

export function isConsulWhitelistEnabled(): boolean {
  const flag = process.env.CONSUL_AUTO_WHITELIST?.trim().toLowerCase();
  if (flag === "false" || flag === "0" || flag === "off") {
    return false;
  }
  return Boolean(getConsulHttpAddr());
}

export function getConsulHttpAddr(): string | null {
  const raw =
    process.env.CONSUL_HTTP_ADDR?.trim() ||
    process.env.NEXT_PUBLIC_CONSUL_HTTP_ADDR?.trim() ||
    "";

  if (!raw) return null;

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw.replace(/\/$/, "");
  }

  return `http://${raw.replace(/\/$/, "")}`;
}

export function getMembershipWhitelistPrefix(): string {
  const prefix =
    process.env.CONSUL_MEMBERSHIP_WHITELIST_PREFIX?.trim() ||
    DEFAULT_MEMBERSHIP_WHITELIST_PREFIX;

  return prefix.endsWith("/") ? prefix : `${prefix}/`;
}

export function getConsulAclToken(): string | undefined {
  const token = process.env.CONSUL_HTTP_TOKEN?.trim();
  return token || undefined;
}

export function getWhitelistAddedBy(): string {
  return process.env.CONSUL_WHITELIST_ADDED_BY?.trim() || "aicw_node_web";
}
