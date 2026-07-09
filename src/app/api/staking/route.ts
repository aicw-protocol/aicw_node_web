import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { Connection } from "@solana/web3.js";
import { isDatabaseConfigured } from "@/lib/db/config";
import { countRegisteredNodes } from "@/lib/db/nodes";
import {
  createStake,
  getActiveStakeByWallet,
  listStakesByWallet,
} from "@/lib/db/staking";
import { requiredStakeSol } from "@/lib/stakingCurve";
import { getStakingTreasuryWallet, isStakingTreasuryConfigured } from "@/lib/stakingConfig";
import { getSolanaRpcUrl } from "@/lib/solanaCluster";
import { verifyStakeTransaction } from "@/lib/verifyStakeTx";

export const dynamic = "force-dynamic";

function validateWallet(wallet: string): string | null {
  try {
    new PublicKey(wallet);
    return null;
  } catch {
    return "Invalid wallet address";
  }
}

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Database is not configured" },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet")?.trim();

  if (!wallet) {
    return NextResponse.json(
      { error: "wallet query parameter is required" },
      { status: 400 },
    );
  }

  const walletError = validateWallet(wallet);
  if (walletError) {
    return NextResponse.json({ error: walletError }, { status: 400 });
  }

  try {
    const [stakes, activeStake, registeredNodeCount] = await Promise.all([
      listStakesByWallet(wallet),
      getActiveStakeByWallet(wallet),
      countRegisteredNodes(),
    ]);

    return NextResponse.json({
      stakes,
      activeStake,
      registeredNodeCount,
      requiredStakeSol: requiredStakeSol(registeredNodeCount),
    });
  } catch (error) {
    console.error("GET /api/staking failed:", error);
    return NextResponse.json(
      { error: "Failed to load staking records" },
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

  if (!isStakingTreasuryConfigured()) {
    return NextResponse.json(
      { error: "STAKING_TREASURY_WALLET is not configured" },
      { status: 503 },
    );
  }

  let body: { wallet?: string; txSignature?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const wallet = body.wallet?.trim();
  const txSignature = body.txSignature?.trim();

  if (!wallet || !txSignature) {
    return NextResponse.json(
      { error: "wallet and txSignature are required" },
      { status: 400 },
    );
  }

  const walletError = validateWallet(wallet);
  if (walletError) {
    return NextResponse.json({ error: walletError }, { status: 400 });
  }

  try {
    const registeredNodeCount = await countRegisteredNodes();
    const minAmountSol = requiredStakeSol(registeredNodeCount);

    if (minAmountSol <= 0) {
      return NextResponse.json(
        {
          error:
            "Staking is not required while fewer than 30 nodes are registered",
        },
        { status: 400 },
      );
    }

    const treasuryWallet = getStakingTreasuryWallet();
    const connection = new Connection(getSolanaRpcUrl(), "confirmed");

    const { amountSol } = await verifyStakeTransaction({
      connection,
      txSignature,
      expectedSender: wallet,
      expectedRecipient: treasuryWallet,
      minAmountSol,
    });

    const stake = await createStake({ wallet, amountSol, txSignature });
    return NextResponse.json({ stake }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to record stake";
    console.error("POST /api/staking failed:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
