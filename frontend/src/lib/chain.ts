import { z } from "zod";
import type { Address } from "./contract/types";
import { LAYBY_ADDRESS, LAYBY_DEPLOYMENT_BLOCK } from "./contract/abi";

/**
 * Network config. Defaults are the values verified in Phase 0
 * (docs/contract-integration.md); NEXT_PUBLIC_* env vars may override them.
 * NEXT_PUBLIC_* must be referenced literally so Next inlines them in the browser bundle.
 */
const schema = z.object({
  chainId: z.literal(43113),
  rpcUrl: z.url(),
  explorerUrl: z.url(),
  layByAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  deploymentBlock: z.coerce.bigint().positive(),
});

const parsed = schema.parse({
  chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 43113),
  rpcUrl: process.env.NEXT_PUBLIC_FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc",
  explorerUrl: process.env.NEXT_PUBLIC_EXPLORER_URL || "https://testnet.snowtrace.io",
  layByAddress: process.env.NEXT_PUBLIC_LAYBY_CONTRACT_ADDRESS || LAYBY_ADDRESS,
  deploymentBlock: process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || LAYBY_DEPLOYMENT_BLOCK.toString(),
});

if (parsed.layByAddress.toLowerCase() !== LAYBY_ADDRESS.toLowerCase()) {
  // The ABI is generated for one verified deployment; a different address needs a new artifact.
  throw new Error(`NEXT_PUBLIC_LAYBY_CONTRACT_ADDRESS (${parsed.layByAddress}) does not match the verified artifact (${LAYBY_ADDRESS}).`);
}

export const FUJI = {
  ...parsed,
  name: "Avalanche Fuji",
  layByAddress: parsed.layByAddress as Address,
} as const;

/** Server-only: Etherscan-compatible log API (keyless). */
export const ROUTESCAN_API_URL =
  process.env.ROUTESCAN_API_URL || "https://api.routescan.io/v2/network/testnet/evm/43113/etherscan/api";
