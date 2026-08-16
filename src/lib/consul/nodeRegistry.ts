import {
  assertConsulWriteSecurity,
  getConsulAclToken,
  getConsulHttpAddr,
  getMembershipWhitelistPrefix,
  isConsulWhitelistEnabled,
} from "./config";

/** Matches aicw_node/pkg/identity/dynamic_store.go ConsulPeerIdentityPrefix */
export const PEER_IDENTITY_PREFIX = "mpc_node_identity/";

/** Matches mpcium/aicw_node ready liveness keys (ready/{nodeId}). */
export const READY_PREFIX = "ready/";

function consulDeleteHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const token = getConsulAclToken();
  if (token) {
    headers["X-Consul-Token"] = token;
  }
  return headers;
}

async function deleteConsulKey(key: string): Promise<void> {
  const baseUrl = getConsulHttpAddr();
  if (!baseUrl) {
    throw new Error("Consul is not configured (CONSUL_HTTP_ADDR)");
  }

  const url = `${baseUrl}/v1/kv/${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: consulDeleteHeaders(),
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Consul delete failed for ${key} (${res.status})${detail ? `: ${detail}` : ""}`,
    );
  }
}

/**
 * Remove all Consul registry state for an offboarded node so peers and the
 * orchestrator do not treat it as a live mesh member (ready/ identity ghosts).
 */
export async function purgeNodeFromConsul(
  nodeId: string,
): Promise<{ skipped: boolean; keys: string[] }> {
  if (!isConsulWhitelistEnabled()) {
    return { skipped: true, keys: [] };
  }

  assertConsulWriteSecurity();

  const trimmedNodeId = nodeId?.trim();
  if (!trimmedNodeId) {
    throw new Error("nodeId is required for Consul node purge");
  }

  const whitelistPrefix = getMembershipWhitelistPrefix();
  const keys = [
    `${whitelistPrefix}${trimmedNodeId}`,
    `${PEER_IDENTITY_PREFIX}${trimmedNodeId}`,
    `${READY_PREFIX}${trimmedNodeId}`,
  ];

  for (const key of keys) {
    await deleteConsulKey(key);
  }

  return { skipped: false, keys };
}
