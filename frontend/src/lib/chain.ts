import type { Address } from "./contract/types";

/**
 * Network constants. Verified in Phase 0 (docs/contract-integration.md).
 * Phase 2 moves these behind zod-validated NEXT_PUBLIC_* env vars.
 */
export const FUJI = {
  chainId: 43113,
  name: "Avalanche Fuji",
  rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
  explorerUrl: "https://testnet.snowtrace.io",
  layByAddress: "0xb124C7778D0715ad1D51e22a18cDb95Cd23d2936" as Address,
  deploymentBlock: 61758464n,
} as const;
