import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { PublicKey } from "@solana/web3.js";
import { verify as ed25519Verify } from "@noble/ed25519";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export interface GuiAuthChallenge {
  wallet: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
  message: string;
  challengeToken: string;
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
): string {
  return [
    "AICW Node GUI Login",
    `Wallet: ${wallet}`,
    `Nonce: ${nonce}`,
    `Issued: ${issuedAt}`,
    `Expires: ${expiresAt}`,
  ].join("\n");
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

export function createGuiAuthChallenge(wallet: string): GuiAuthChallenge {
  const nonce = randomUUID();
  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS).toISOString();
  const message = buildChallengeMessage(wallet, nonce, issuedAt, expiresAt);
  const payload = JSON.stringify({ wallet, nonce, issuedAt, expiresAt, message });
  const challengeToken = encodeChallengeToken(payload);

  return {
    wallet,
    nonce,
    issuedAt,
    expiresAt,
    message,
    challengeToken,
  };
}

export function parseChallengeToken(challengeToken: string): {
  wallet: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
  message: string;
} | null {
  try {
    const payload = decodeChallengeToken(challengeToken);
    if (!payload) return null;

    const parsed = JSON.parse(payload) as {
      wallet?: string;
      nonce?: string;
      issuedAt?: string;
      expiresAt?: string;
      message?: string;
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

    return {
      wallet: parsed.wallet,
      nonce: parsed.nonce,
      issuedAt: parsed.issuedAt,
      expiresAt: parsed.expiresAt,
      message: parsed.message,
    };
  } catch {
    return null;
  }
}

/** Solana wallet signMessage uses a prefixed UTF-8 payload. */
function solanaSignedMessageBytes(message: string): Uint8Array {
  const messageBytes = new TextEncoder().encode(message);
  const prefix = new TextEncoder().encode("Solana Signed Message:\n");
  const lengthBytes = new Uint8Array(2);
  lengthBytes[0] = messageBytes.length & 0xff;
  lengthBytes[1] = (messageBytes.length >> 8) & 0xff;
  const out = new Uint8Array(prefix.length + 2 + messageBytes.length);
  out.set(prefix, 0);
  out.set(lengthBytes, prefix.length);
  out.set(messageBytes, prefix.length + 2);
  return out;
}

export async function verifyGuiWalletSignature(input: {
  challengeToken: string;
  wallet: string;
  signatureBase64: string;
  message: string;
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

  const payload = solanaSignedMessageBytes(input.message);
  const rawPayload = new TextEncoder().encode(input.message);
  const verifiedPrefixed = await ed25519Verify(signature, payload, publicKey.toBytes());
  const verifiedRaw = await ed25519Verify(signature, rawPayload, publicKey.toBytes());
  if (!verifiedPrefixed && !verifiedRaw) {
    return { ok: false, error: "Signature verification failed" };
  }

  return { ok: true, wallet: publicKey.toBase58() };
}
