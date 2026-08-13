import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { PublicKey } from "@solana/web3.js";
import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";

ed.hashes.sha512 = sha512;
ed.hashes.sha512Async = (message: Uint8Array) => Promise.resolve(sha512(message));

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export type GuiAuthPurpose = "login" | "register";

export interface CreateGuiAuthChallengeOptions {
  purpose?: GuiAuthPurpose;
  nodeId?: string;
  nodeName?: string;
  publicKey?: string;
}

export interface ParsedGuiAuthChallenge {
  wallet: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
  message: string;
  purpose: GuiAuthPurpose;
  nodeId?: string;
  nodeName?: string;
  publicKey?: string;
}

export interface GuiAuthChallenge {
  wallet: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
  message: string;
  challengeToken: string;
  purpose: GuiAuthPurpose;
  nodeId?: string;
  nodeName?: string;
  publicKey?: string;
}

function getGuiAuthSecret(): string {
  return (
    process.env.GUI_AUTH_SECRET?.trim() ||
    process.env.DATABASE_PASSWORD?.trim() ||
    "aicw-gui-dev-secret"
  );
}

function signChallengePayload(payload: string): string {
  return createHmac("sha256", getGuiAuthSecret())
    .update(payload)
    .digest("base64url");
}

function buildChallengeMessage(
  wallet: string,
  nonce: string,
  issuedAt: string,
  expiresAt: string,
  options: CreateGuiAuthChallengeOptions = {},
): string {
  const purpose = options.purpose ?? "login";
  const lines =
    purpose === "register"
      ? ["AICW Node Registration", `Wallet: ${wallet}`, `Node ID: ${options.nodeId ?? ""}`]
      : ["AICW Node GUI Login", `Wallet: ${wallet}`];

  if (purpose === "register" && options.nodeName) {
    lines.push(`Node Name: ${options.nodeName}`);
  }
  if (purpose === "register" && options.publicKey) {
    lines.push(`Public Key: ${options.publicKey}`);
  }

  lines.push(
    `Nonce: ${nonce}`,
    `Issued: ${issuedAt}`,
    `Expires: ${expiresAt}`,
  );

  return lines.join("\n");
}

function encodeChallengeToken(payload: string): string {
  const payloadB64 = Buffer.from(payload, "utf8").toString("base64url");
  const sig = signChallengePayload(payload);
  return `${payloadB64}.${sig}`;
}

function decodeChallengeToken(challengeToken: string): string | null {
  const dot = challengeToken.lastIndexOf(".");
  if (dot <= 0) return null;
  const payloadB64 = challengeToken.slice(0, dot);
  const sig = challengeToken.slice(dot + 1);
  let payload: string;
  try {
    payload = Buffer.from(payloadB64, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const expected = signChallengePayload(payload);
  const actualBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (
    actualBuf.length !== expectedBuf.length ||
    !timingSafeEqual(actualBuf, expectedBuf)
  ) {
    return null;
  }
  return payload;
}

export function createGuiAuthChallenge(
  wallet: string,
  options: CreateGuiAuthChallengeOptions = {},
): GuiAuthChallenge {
  const purpose = options.purpose ?? "login";
  if (purpose === "register" && !options.nodeId?.trim()) {
    throw new Error("nodeId is required for registration challenges");
  }

  const nonce = randomUUID();
  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS).toISOString();
  const nodeId = options.nodeId?.trim();
  const nodeName = options.nodeName?.trim();
  const publicKey = options.publicKey?.trim();
  const message = buildChallengeMessage(wallet, nonce, issuedAt, expiresAt, {
    purpose,
    nodeId,
    nodeName,
    publicKey,
  });
  const payload = JSON.stringify({
    wallet,
    nonce,
    issuedAt,
    expiresAt,
    message,
    purpose,
    nodeId,
    nodeName,
    publicKey,
  });
  const challengeToken = encodeChallengeToken(payload);

  return {
    wallet,
    nonce,
    issuedAt,
    expiresAt,
    message,
    challengeToken,
    purpose,
    nodeId,
    nodeName,
    publicKey,
  };
}

export function parseChallengeToken(
  challengeToken: string,
): ParsedGuiAuthChallenge | null {
  try {
    const payload = decodeChallengeToken(challengeToken);
    if (!payload) return null;

    const parsed = JSON.parse(payload) as {
      wallet?: string;
      nonce?: string;
      issuedAt?: string;
      expiresAt?: string;
      message?: string;
      purpose?: GuiAuthPurpose;
      nodeId?: string;
      nodeName?: string;
      publicKey?: string;
    };

    if (
      !parsed.wallet ||
      !parsed.nonce ||
      !parsed.issuedAt ||
      !parsed.expiresAt ||
      !parsed.message
    ) {
      return null;
    }

    const purpose = parsed.purpose ?? "login";
    if (purpose === "register" && !parsed.nodeId?.trim()) {
      return null;
    }

    return {
      wallet: parsed.wallet,
      nonce: parsed.nonce,
      issuedAt: parsed.issuedAt,
      expiresAt: parsed.expiresAt,
      message: parsed.message,
      purpose,
      nodeId: parsed.nodeId?.trim(),
      nodeName: parsed.nodeName?.trim(),
      publicKey: parsed.publicKey?.trim(),
    };
  } catch {
    return null;
  }
}

function appendUtf8LengthPrefixedMessage(
  prefix: Uint8Array,
  messageBytes: Uint8Array,
): Uint8Array {
  const lengthBytes = new Uint8Array(2);
  lengthBytes[0] = messageBytes.length & 0xff;
  lengthBytes[1] = (messageBytes.length >> 8) & 0xff;
  const out = new Uint8Array(prefix.length + 2 + messageBytes.length);
  out.set(prefix, 0);
  out.set(lengthBytes, prefix.length);
  out.set(messageBytes, prefix.length + 2);
  return out;
}

/** Candidate payloads wallets may sign (raw, legacy Phantom, off-chain v0). */
function buildSignedMessageCandidates(message: string): Uint8Array[] {
  const messageBytes = new TextEncoder().encode(message);
  const legacyPrefix = new Uint8Array([
    0xff,
    ...new TextEncoder().encode("Solana Signed Message:\n"),
  ]);
  const offchainDomain = new Uint8Array([
    0xff, 0x73, 0x6f, 0x6c, 0x61, 0x6e, 0x61, 0x20, 0x6f, 0x66, 0x66, 0x63, 0x68, 0x61, 0x69,
    0x6e,
  ]);
  const offchainHeader = new Uint8Array(offchainDomain.length + 2);
  offchainHeader.set(offchainDomain, 0);

  return [
    messageBytes,
    appendUtf8LengthPrefixedMessage(
      new TextEncoder().encode("Solana Signed Message:\n"),
      messageBytes,
    ),
    appendUtf8LengthPrefixedMessage(legacyPrefix, messageBytes),
    appendUtf8LengthPrefixedMessage(offchainHeader, messageBytes),
  ];
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

async function verifyEd25519Signature(
  signature: Uint8Array,
  signedPayload: Uint8Array,
  publicKeyBytes: Uint8Array,
): Promise<boolean> {
  try {
    return await ed.verify(signature, signedPayload, publicKeyBytes);
  } catch {
    return false;
  }
}

export async function verifyGuiWalletSignature(input: {
  challengeToken: string;
  wallet: string;
  signatureBase64: string;
  message: string;
  signedMessageBase64?: string;
}): Promise<{ ok: true; wallet: string } | { ok: false; error: string }> {
  const challenge = parseChallengeToken(input.challengeToken);
  if (!challenge) {
    return { ok: false, error: "Invalid or expired challenge token" };
  }

  if (challenge.wallet !== input.wallet.trim()) {
    return { ok: false, error: "Wallet does not match challenge" };
  }

  if (challenge.message !== input.message) {
    return { ok: false, error: "Message does not match challenge" };
  }

  const expiresAt = Date.parse(challenge.expiresAt);
  if (Number.isNaN(expiresAt) || Date.now() > expiresAt) {
    return { ok: false, error: "Challenge expired" };
  }

  let publicKey: PublicKey;
  try {
    publicKey = new PublicKey(input.wallet.trim());
  } catch {
    return { ok: false, error: "Invalid wallet address" };
  }

  let signature: Uint8Array;
  try {
    signature = Uint8Array.from(Buffer.from(input.signatureBase64, "base64"));
  } catch {
    return { ok: false, error: "Invalid signature encoding" };
  }

  const publicKeyBytes = publicKey.toBytes();
  const candidates = buildSignedMessageCandidates(input.message);

  if (input.signedMessageBase64?.trim()) {
    let signedMessage: Uint8Array;
    try {
      signedMessage = Uint8Array.from(
        Buffer.from(input.signedMessageBase64.trim(), "base64"),
      );
    } catch {
      return { ok: false, error: "Invalid signed message encoding" };
    }

    const signedPayloadMatchesChallenge = candidates.some((candidate) =>
      bytesEqual(candidate, signedMessage),
    );
    if (!signedPayloadMatchesChallenge) {
      return { ok: false, error: "Signed message does not match challenge" };
    }

    const verifiedSignedMessage = await verifyEd25519Signature(
      signature,
      signedMessage,
      publicKeyBytes,
    );
    if (!verifiedSignedMessage) {
      return { ok: false, error: "Signature verification failed" };
    }

    return { ok: true, wallet: publicKey.toBase58() };
  }

  for (const candidate of candidates) {
    if (await verifyEd25519Signature(signature, candidate, publicKeyBytes)) {
      return { ok: true, wallet: publicKey.toBase58() };
    }
  }

  return { ok: false, error: "Signature verification failed" };
}

function normalizeOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function registrationFieldsMatch(
  challenge: ParsedGuiAuthChallenge,
  input: {
    nodeId: string;
    nodeName?: string;
    publicKey?: string;
  },
): string | null {
  if (challenge.purpose !== "register") {
    return "Challenge is not for node registration";
  }

  if (challenge.nodeId !== input.nodeId.trim()) {
    return "Node ID does not match challenge";
  }

  const expectedName = normalizeOptional(challenge.nodeName);
  const actualName = normalizeOptional(input.nodeName);
  if (expectedName && expectedName !== actualName) {
    return "Node name does not match challenge";
  }

  const expectedPublicKey = normalizeOptional(challenge.publicKey);
  const actualPublicKey = normalizeOptional(input.publicKey);
  if (expectedPublicKey && expectedPublicKey !== actualPublicKey) {
    return "Public key does not match challenge";
  }

  return null;
}

export async function verifyNodeRegistrationSignature(input: {
  challengeToken: string;
  wallet: string;
  signatureBase64: string;
  message: string;
  signedMessageBase64?: string;
  nodeId: string;
  nodeName?: string;
  publicKey?: string;
}): Promise<{ ok: true; wallet: string } | { ok: false; error: string }> {
  const challenge = parseChallengeToken(input.challengeToken);
  if (!challenge) {
    return { ok: false, error: "Invalid or expired challenge token" };
  }

  const mismatch = registrationFieldsMatch(challenge, input);
  if (mismatch) {
    return { ok: false, error: mismatch };
  }

  return verifyGuiWalletSignature({
    challengeToken: input.challengeToken,
    wallet: input.wallet,
    signatureBase64: input.signatureBase64,
    signedMessageBase64: input.signedMessageBase64,
    message: input.message,
  });
}
