import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import { listNodes, registerNode } from "@/lib/db/nodes";
import { assertCanRegisterNode } from "@/lib/nodeEligibility";
import { addNodeToMembershipWhitelist } from "@/lib/consul/membershipWhitelist";
import { isConsulWhitelistEnabled } from "@/lib/consul/config";
import { verifyNodeRegistrationSignature } from "@/lib/guiAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Database is not configured" },
      { status: 503 },
    );
  }

  try {
    const data = await listNodes();
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/nodes failed:", error);
    return NextResponse.json(
      { error: "Failed to load nodes from database" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Database is not configured" },
      { status: 503 },
    );
  }

  let body: {
    nodeId?: string;
    nodeName?: string;
    publicKey?: string;
    privateKey?: string;
    ownerWallet?: string;
    challengeToken?: string;
    wallet?: string;
    signatureBase64?: string;
    signedMessageBase64?: string;
    message?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.privateKey) {
    return NextResponse.json(
      { error: "Private keys must not be sent to the server" },
      { status: 400 },
    );
  }

  const nodeId = body.nodeId?.trim();
  const nodeName = body.nodeName?.trim();
  const publicKey = body.publicKey?.trim();
  const challengeToken = body.challengeToken?.trim();
  const wallet = body.wallet?.trim();
  const signatureBase64 = body.signatureBase64?.trim();
  const signedMessageBase64 = body.signedMessageBase64?.trim();
  const message = body.message;

  if (!nodeId) {
    return NextResponse.json({ error: "nodeId is required" }, { status: 400 });
  }

  if (!challengeToken || !wallet || !signatureBase64 || !message) {
    return NextResponse.json(
      {
        error:
          "challengeToken, wallet, signatureBase64, and message are required to register a node",
      },
      { status: 400 },
    );
  }

  if (isConsulWhitelistEnabled() && !publicKey) {
    return NextResponse.json(
      {
        error:
          "publicKey is required when Consul auto-whitelist is enabled",
      },
      { status: 400 },
    );
  }

  let ownerWallet: string;
  try {
    const verified = await verifyNodeRegistrationSignature({
      challengeToken,
      wallet,
      signatureBase64,
      signedMessageBase64,
      message,
      nodeId,
      nodeName,
      publicKey,
    });

    if (!verified.ok) {
      return NextResponse.json({ error: verified.error }, { status: 401 });
    }

    ownerWallet = verified.wallet;
  } catch (error) {
    console.error("POST /api/nodes signature verification failed:", error);
    return NextResponse.json(
      { error: "Wallet signature verification failed" },
      { status: 500 },
    );
  }

  if (body.ownerWallet?.trim() && body.ownerWallet.trim() !== ownerWallet) {
    return NextResponse.json(
      { error: "ownerWallet does not match signed wallet" },
      { status: 400 },
    );
  }

  try {
    await assertCanRegisterNode(ownerWallet);
    const node = await registerNode({
      nodeId,
      nodeName,
      publicKey,
      ownerWallet,
    });

    try {
      const whitelist = await addNodeToMembershipWhitelist({
        nodeId: node.nodeId,
        publicKey: node.publicKey ?? publicKey ?? "",
        ownerWallet: node.ownerWallet,
        nodeName: node.nodeName,
      });

      return NextResponse.json(
        {
          node,
          whitelist: whitelist.skipped
            ? { added: false, reason: "consul_not_configured" }
            : { added: true, key: whitelist.key },
        },
        { status: 201 },
      );
    } catch (whitelistError) {
      console.error("POST /api/nodes whitelist failed:", whitelistError);
      return NextResponse.json(
        {
          node,
          whitelist: {
            added: false,
            reason:
              whitelistError instanceof Error
                ? whitelistError.message
                : "Failed to add node to Consul membership whitelist",
          },
        },
        { status: 201 },
      );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to register node";
    const status = message.includes("already registered") ? 409 : 400;
    console.error("POST /api/nodes failed:", error);
    return NextResponse.json({ error: message }, { status });
  }
}
