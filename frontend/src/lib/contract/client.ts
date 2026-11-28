import { createPublicClient, http } from "viem";
import { avalancheFuji } from "viem/chains";
import { FUJI } from "@/lib/chain";

/** Read-only client for Fuji. Used by browser hooks and the history route alike. */
export const publicClient = createPublicClient({
  chain: avalancheFuji,
  transport: http(FUJI.rpcUrl, { batch: true }),
});
