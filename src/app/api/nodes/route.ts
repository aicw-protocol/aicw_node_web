import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { isDatabaseConfigured } from "@/lib/db/config";
import { listNodes, registerNode, deleteNodeById } from "@/lib/db/nodes";
import { assertCanRegisterNode } from "@/lib/nodeEligibility";
import { addNodeToMembershipWhitelist } from "@/lib/consul/membershipWhitelist";
import { isConsulWhitelistEnabled } from "@/lib/consul/config";

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
  const ownerWallet = body.ownerWallet?.trim();

  if (!nodeId || !ownerWallet) {
    return NextResponse.json(
      { error: "nodeId and ownerWallet are required" },
      { status: 400 },
    );
  }

  if (isConsulWhitelistEnabled() && !publicKey) {
    return NextResponse.json(
      {
        error:
          "publicKey is required when Consul auto-whitelist is enabled (Create node flow provides it automatically)",
      },
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
      try {
        await deleteNodeById(node.id);
      } catch (rollbackError) {
        console.error("Failed to rollback node after whitelist error:", rollbackError);
      }

      const message =
        whitelistError instanceof Error
          ? whitelistError.message
          : "Failed to add node to Consul membership whitelist";
      console.error("POST /api/nodes whitelist failed:", whitelistError);
      return NextResponse.json({ error: message }, { status: 502 });
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to register node";
    const status = message.includes("already registered") ? 409 : 400;
    console.error("POST /api/nodes failed:", error);
    return NextResponse.json({ error: message }, { status });
  }
}
