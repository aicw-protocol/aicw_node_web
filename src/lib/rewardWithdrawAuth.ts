import { verifyWalletActionSignature } from "@/lib/guiAuth";

export type WithdrawAuthPurpose = "withdraw_sol" | "withdraw_token";

export interface WithdrawAuthPayload {
  ownerWallet: string;
  challengeToken: string;
  signatureBase64: string;
  signedMessageBase64?: string;
  message: string;
}

export async function verifyWithdrawAuth(
  purpose: WithdrawAuthPurpose,
  body: Partial<WithdrawAuthPayload>,
): Promise<{ wallet: string }> {
  const ownerWallet = body.ownerWallet?.trim();
  const challengeToken = body.challengeToken?.trim();
  const signatureBase64 = body.signatureBase64?.trim();
  const message = body.message;

  if (!ownerWallet || !challengeToken || !signatureBase64 || !message) {
    throw new Error(
      "ownerWallet, challengeToken, signatureBase64, and message are required",
    );
  }

  const result = await verifyWalletActionSignature({
    challengeToken,
    wallet: ownerWallet,
    signatureBase64,
    signedMessageBase64: body.signedMessageBase64?.trim(),
    message,
    expectedPurpose: purpose,
  });

  if (!result.ok) {
    throw new Error(result.error ?? "Wallet signature verification failed");
  }

  return { wallet: result.wallet };
}
