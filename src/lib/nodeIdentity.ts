/**
 * Browser-side node identity generation.
 * Matches aicw-node init / pkg/identity/generate.go exactly:
 * - Ed25519 keypair (crypto/ed25519 compatible 64-byte private key hex)
 * - UUID node_id
 * - Same JSON field names and on-disk layout
 *
 * Private keys are generated and returned to the caller only — never sent to the server.
 */

import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";

ed.hashes.sha512 = sha512;
ed.hashes.sha512Async = (message: Uint8Array) => Promise.resolve(sha512(message));

export interface NodeIdentityFiles {
  nodeName: string;
  nodeId: string;
  publicKey: string;
  createdAt: string;
  identityJson: string;
  privateKeyHex: string;
  identityFilename: string;
  privateKeyFilename: string;
}

const NODE_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,63}$/;

export function validateNodeName(nodeName: string): string | null {
  const trimmed = nodeName.trim();
  if (!trimmed) return "Node name is required";
  if (!NODE_NAME_PATTERN.test(trimmed)) {
    return "Node name must be 2–64 characters (letters, numbers, ., _, -)";
  }
  return null;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Generate node identity files in the same format as `aicw-node init`.
 */
export async function generateNodeIdentity(nodeName: string): Promise<NodeIdentityFiles> {
  const nameError = validateNodeName(nodeName);
  if (nameError) throw new Error(nameError);

  const trimmedName = nodeName.trim();
  const seed = ed.utils.randomSecretKey();
  const publicKeyBytes = ed.getPublicKey(seed);

  // Go crypto/ed25519 private key = 64 bytes: seed || publicKey
  const fullPrivateKey = new Uint8Array(64);
  fullPrivateKey.set(seed, 0);
  fullPrivateKey.set(publicKeyBytes, 32);

  const nodeId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const publicKey = bytesToHex(publicKeyBytes);
  const privateKeyHex = bytesToHex(fullPrivateKey);

  const identity = {
    node_name: trimmedName,
    node_id: nodeId,
    public_key: publicKey,
    created_at: createdAt,
  };

  return {
    nodeName: trimmedName,
    nodeId,
    publicKey,
    createdAt,
    identityJson: `${JSON.stringify(identity, null, 2)}\n`,
    privateKeyHex,
    identityFilename: `${trimmedName}_identity.json`,
    privateKeyFilename: `${trimmedName}_private_key.txt`,
  };
}
