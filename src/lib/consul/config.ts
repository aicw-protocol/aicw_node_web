/** Consul KV settings for server-side MPC membership whitelist writes. */

export const DEFAULT_MEMBERSHIP_WHITELIST_PREFIX =
  "mpc_eligibility/membership_whitelist/";

function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}

export function isConsulWhitelistEnabled(): boolean {
  const flag = process.env.CONSUL_AUTO_WHITELIST?.trim().toLowerCase();
  if (flag === "false" || flag === "0" || flag === "off") {
    return false;
  }
  return Boolean(getConsulHttpAddr());
}

export function getConsulHttpAddr(): string | null {
  const raw = process.env.CONSUL_HTTP_ADDR?.trim() || "";

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

/**
 * Refuse Consul whitelist writes when production auto-whitelist is enabled
 * without an ACL token.
 */
export function assertConsulWriteSecurity(): void {
  if (!isConsulWhitelistEnabled()) {
    return;
  }

  if (getConsulAclToken()) {
    return;
  }

  if (isProductionRuntime()) {
    throw new Error(
      "CONSUL_HTTP_TOKEN is required when CONSUL_AUTO_WHITELIST is enabled in production",
    );
  }

  console.warn(
    "[consul] CONSUL_AUTO_WHITELIST is enabled without CONSUL_HTTP_TOKEN; whitelist writes may fail or be insecure",
  );
}
