import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";

ed.hashes.sha512 = sha512;
ed.hashes.sha512Async = (message: Uint8Array) => Promise.resolve(sha512(message));

const PING_TIMESTAMP_SKEW_MS = 5 * 60 * 1000;
const PUBLIC_KEY_PATTERN = /^[0-9a-f]{64}$/i;

export function buildNodePingMessage(nodeId: string, timestamp: string): string {
  return ["AICW Node Ping", `Node ID: ${nodeId}`, `Timestamp: ${timestamp}`].join(
    "\n",
  );
}

export async function verifyNodePingSignature(input: {
  nodeId: string;
  timestamp: string;
  signatureBase64: string;
  publicKeyHex: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const nodeId = input.nodeId.trim();
  const timestamp = input.timestamp.trim();
  const publicKeyHex = input.publicKeyHex.trim().toLowerCase();

  if (!nodeId) {
    return { ok: false, error: "nodeId is required" };
  }

  if (!timestamp) {
    return { ok: false, error: "timestamp is required" };
  }

  const parsedTimestamp = Date.parse(timestamp);
  if (Number.isNaN(parsedTimestamp)) {
    return { ok: false, error: "Invalid timestamp" };
  }

  const skew = Math.abs(Date.now() - parsedTimestamp);
  if (skew > PING_TIMESTAMP_SKEW_MS) {
    return { ok: false, error: "Ping timestamp is outside the allowed window" };
  }

  if (!PUBLIC_KEY_PATTERN.test(publicKeyHex)) {
    return { ok: false, error: "Node public key is not configured" };
  }

  let signature: Uint8Array;
  try {
    signature = Uint8Array.from(
      Buffer.from(input.signatureBase64.trim(), "base64"),
    );
  } catch {
    return { ok: false, error: "Invalid signature encoding" };
  }

  let publicKeyBytes: Uint8Array;
  try {
    publicKeyBytes = Uint8Array.from(Buffer.from(publicKeyHex, "hex"));
  } catch {
    return { ok: false, error: "Invalid public key encoding" };
  }

  const message = buildNodePingMessage(nodeId, timestamp);
  const messageBytes = new TextEncoder().encode(message);

  try {
    const verified = await ed.verify(signature, messageBytes, publicKeyBytes);
    if (!verified) {
      return { ok: false, error: "Ping signature verification failed" };
    }
  } catch {
    return { ok: false, error: "Ping signature verification failed" };
  }

  return { ok: true };
}
