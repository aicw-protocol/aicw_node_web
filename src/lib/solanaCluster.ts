export function getSolanaRpcUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_SOLANA_RPC ||
    process.env.SOLANA_RPC_URL ||
    "https://api.mainnet-beta.solana.com";
  return url;
}

export function getClusterLabel(): string {
  const rpc = getSolanaRpcUrl();
  if (rpc.includes("devnet")) return "Devnet";
  if (rpc.includes("testnet")) return "Testnet";
  return "Mainnet";
}
