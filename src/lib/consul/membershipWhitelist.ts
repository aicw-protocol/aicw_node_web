import {
  getConsulAclToken,
  getConsulHttpAddr,
  getMembershipWhitelistPrefix,
  getWhitelistAddedBy,
  isConsulWhitelistEnabled,
} from "./config";

/** Matches aicw_node cmd/operator MembershipEntry JSON format. */
export interface MembershipWhitelistEntry {
  node_id: string;
  public_key: string;
  registered_at: string;
  added_by: string;
  metadata?: Record<string, string>;
}

export interface AddMembershipWhitelistInput {
  nodeId: string;
  publicKey: string;
  ownerWallet?: string | null;
  nodeName?: string | null;
}

function normalizePublicKeyHex(publicKey: string): string {
  return publicKey.trim().toLowerCase();
}

function buildWhitelistKey(nodeId: string): string {
  const prefix = getMembershipWhitelistPrefix();
  return `${prefix}${nodeId}`;
}

function buildMembershipEntry(input: AddMembershipWhitelistInput): MembershipWhitelistEntry {
  const metadata: Record<string, string> = {};
  if (input.ownerWallet?.trim()) {
    metadata.owner_wallet = input.ownerWallet.trim();
  }
  if (input.nodeName?.trim()) {
    metadata.node_name = input.nodeName.trim();
  }

  return {
    node_id: input.nodeId.trim(),
    public_key: normalizePublicKeyHex(input.publicKey),
    registered_at: new Date().toISOString(),
    added_by: getWhitelistAddedBy(),
    ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
  };
}

/**
 * Write node membership to Consul KV (mpc_eligibility/membership_whitelist/{nodeId}).
 * Format must match aicw_node operator CLI / WhitelistMembershipVerifier.
 */
export async function addNodeToMembershipWhitelist(
  input: AddMembershipWhitelistInput,
): Promise<{ skipped: boolean; key?: string }> {
  if (!isConsulWhitelistEnabled()) {
    return { skipped: true };
  }

  const nodeId = input.nodeId?.trim();
  const publicKey = input.publicKey?.trim();

  if (!nodeId) {
    throw new Error("nodeId is required for Consul membership whitelist");
  }

  if (!publicKey || !/^[0-9a-fA-F]{64}$/.test(publicKey)) {
    throw new Error(
      "publicKey (64-char hex Ed25519) is required for Consul membership whitelist",
    );
  }

  const baseUrl = getConsulHttpAddr();
  if (!baseUrl) {
    throw new Error("Consul is not configured (CONSUL_HTTP_ADDR)");
  }

  const key = buildWhitelistKey(nodeId);
  const entry = buildMembershipEntry(input);
  const body = JSON.stringify(entry);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const token = getConsulAclToken();
  if (token) {
    headers["X-Consul-Token"] = token;
  }

  const url = `${baseUrl}/v1/kv/${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: "PUT",
    headers,
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Consul whitelist write failed (${res.status})${detail ? `: ${detail}` : ""}`,
    );
  }

  const result = (await res.text()).trim();
  if (result !== "true") {
    throw new Error("Consul whitelist write was not acknowledged");
  }

  return { skipped: false, key };
}

/**
 * Remove node membership from Consul KV when operator deletes registration.
 */
export async function removeNodeFromMembershipWhitelist(
  nodeId: string,
): Promise<{ skipped: boolean }> {
  if (!isConsulWhitelistEnabled()) {
    return { skipped: true };
  }

  const trimmedNodeId = nodeId?.trim();
  if (!trimmedNodeId) {
    throw new Error("nodeId is required for Consul membership whitelist removal");
  }

  const baseUrl = getConsulHttpAddr();
  if (!baseUrl) {
    throw new Error("Consul is not configured (CONSUL_HTTP_ADDR)");
  }

  const key = buildWhitelistKey(trimmedNodeId);
  const headers: Record<string, string> = {};
  const token = getConsulAclToken();
  if (token) {
    headers["X-Consul-Token"] = token;
  }

  const url = `${baseUrl}/v1/kv/${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Consul whitelist delete failed (${res.status})${detail ? `: ${detail}` : ""}`,
    );
  }

  return { skipped: false };
}
