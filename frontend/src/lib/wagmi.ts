import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { avalancheFuji } from "viem/chains";
import { FUJI } from "@/lib/chain";

/** Fuji only. Browser wallets (Core, MetaMask…) via the injected connector. */
export const wagmiConfig = createConfig({
  chains: [avalancheFuji],
  connectors: [injected()],
  transports: { [avalancheFuji.id]: http(FUJI.rpcUrl) },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
