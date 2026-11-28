/** Plain async reads against the deployed contract. Hooks wrap these in TanStack Query. */
import { FUJI } from "@/lib/chain";
import type { Address, LayBy, LayByStatus } from "./types";
import { layByAbi } from "./abi";
import { publicClient } from "./client";

const contract = { address: FUJI.layByAddress, abi: layByAbi } as const;

export async function readGraceSeconds(): Promise<bigint> {
  return publicClient.readContract({ ...contract, functionName: "graceSeconds" });
}

export async function readIdsOf(role: "customer" | "shop", wallet: Address): Promise<readonly bigint[]> {
  return role === "customer"
    ? publicClient.readContract({ ...contract, functionName: "layBysOfCustomer", args: [wallet] })
    : publicClient.readContract({ ...contract, functionName: "layBysOfShop", args: [wallet] });
}

/** Batched getLayBy via Multicall3. Missing IDs (shop == 0x0) are dropped. */
export async function readLayBys(ids: readonly bigint[]): Promise<LayBy[]> {
  if (ids.length === 0) return [];
  const results = await publicClient.multicall({
    contracts: ids.map((id) => ({ ...contract, functionName: "getLayBy", args: [id] }) as const),
    allowFailure: true,
  });
  const out: LayBy[] = [];
  results.forEach((r, i) => {
    if (r.status !== "success") return;
    const rec = r.result;
    if (/^0x0{40}$/i.test(rec.shop)) return;
    out.push({ ...rec, status: rec.status as LayByStatus, id: ids[i] });
  });
  return out;
}

export async function readLayBy(id: bigint): Promise<LayBy | null> {
  const [l] = await readLayBys([id]);
  return l ?? null;
}

/** Latest block timestamp: the clock the contract uses for expiry. */
export async function readChainTime(): Promise<bigint> {
  const block = await publicClient.getBlock({ blockTag: "latest" });
  return block.timestamp;
}
