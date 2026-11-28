// Server-only: imported by /api/history. Browsers can't call Routescan (CORS) or afford 100-block RPC scans.
import type { Hex, Log } from "viem";
import { FUJI, ROUTESCAN_API_URL } from "@/lib/chain";
import { createPublicClient, http } from "viem";
import { avalancheFuji } from "viem/chains";
import { decodeLogs, type RawLog } from "./events";
import type { LayByEvent } from "./types";

/** The public Fuji RPC caps eth_getLogs at 100 blocks per request. */
const RPC_LOG_WINDOW = 100n;
const RPC_MAX_WINDOWS = 2_000n; // ≈200k blocks (~4–5 days on Fuji). Beyond that, rely on Routescan.

// No JSON-RPC batching here: the Fuji RPC sums block ranges across a batch, so batched
// 100-block getLogs calls are rejected ("total block range ... exceeds 100 blocks").
const logClient = createPublicClient({ chain: avalancheFuji, transport: http(FUJI.rpcUrl, { batch: false, retryCount: 2 }) });

export type HistorySource = "routescan" | "rpc";

interface RoutescanLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: string;
  timeStamp: string;
  transactionHash: string;
  transactionIndex: string;
  logIndex: string;
}

/** Etherscan-style numbers: hex ("0x1f"), decimal ("31"), and zero written as a bare "0x" or "". */
export function num(v: string | undefined): bigint {
  if (!v || v === "0x") return 0n;
  return BigInt(v);
}

async function fromRoutescan(): Promise<RawLog[]> {
  const logs: RawLog[] = [];
  for (let page = 1; page <= 10; page++) {
    const url = new URL(ROUTESCAN_API_URL);
    url.search = new URLSearchParams({
      module: "logs",
      action: "getLogs",
      address: FUJI.layByAddress,
      fromBlock: FUJI.deploymentBlock.toString(),
      toBlock: "999999999", // Routescan returns an empty OK for toBlock=latest
      page: String(page),
      offset: "1000",
    }).toString();
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`Routescan HTTP ${res.status}`);
    const body = (await res.json()) as { status: string; message: string; result: RoutescanLog[] | string };
    if (!Array.isArray(body.result)) {
      if (/no records found/i.test(body.message) || /no records found/i.test(String(body.result))) break;
      throw new Error(`Routescan: ${body.message} ${body.result}`);
    }
    for (const r of body.result) {
      logs.push({
        address: r.address as Hex,
        topics: r.topics.filter(Boolean) as [Hex, ...Hex[]],
        data: r.data as Hex,
        blockNumber: num(r.blockNumber),
        blockHash: null,
        transactionHash: r.transactionHash as Hex,
        transactionIndex: Number(num(r.transactionIndex)),
        logIndex: Number(num(r.logIndex)),
        removed: false,
        timestamp: num(r.timeStamp),
      } as RawLog);
    }
    if (body.result.length < 1000) break;
  }
  return logs;
}

// The public RPC rate-limits (HTTP 429), so never rescan from the deployment block twice:
// keep what we've scanned in server memory and only scan blocks newer than `scannedTo`.
// Finalised Avalanche blocks don't reorg, so cached logs stay valid.
const rpcCache: { scannedTo: bigint; logs: RawLog[] } = { scannedTo: FUJI.deploymentBlock - 1n, logs: [] };
let rpcScan: Promise<RawLog[]> | null = null; // one scan at a time; concurrent callers share it

function fromRpc(): Promise<RawLog[]> {
  rpcScan ??= scanNewBlocks().finally(() => (rpcScan = null));
  return rpcScan;
}

async function scanNewBlocks(): Promise<RawLog[]> {
  const latest = await logClient.getBlockNumber();
  let from = rpcCache.scannedTo + 1n;
  const floor = latest - RPC_LOG_WINDOW * RPC_MAX_WINDOWS;
  if (from < floor) from = floor; // history older than this needs Routescan
  const windows: Array<[bigint, bigint]> = [];
  for (let start = from; start <= latest; start += RPC_LOG_WINDOW) {
    const end = start + RPC_LOG_WINDOW - 1n;
    windows.push([start, end > latest ? latest : end]);
  }
  const fresh: Log[] = [];
  const CONCURRENCY = 4;
  for (let i = 0; i < windows.length; i += CONCURRENCY) {
    const batch = await Promise.all(
      windows.slice(i, i + CONCURRENCY).map(([fromBlock, toBlock]) =>
        logClient.getLogs({ address: FUJI.layByAddress, fromBlock, toBlock }),
      ),
    );
    fresh.push(...batch.flat());
  }
  // Only blocks that actually hold our events need a timestamp lookup.
  const blocks = [...new Set(fresh.map((l) => l.blockNumber!))];
  const times = new Map<bigint, bigint>();
  await Promise.all(blocks.map(async (b) => times.set(b, (await logClient.getBlock({ blockNumber: b })).timestamp)));
  // Commit only after the whole range succeeded, so a failed scan is retried next time.
  rpcCache.logs.push(...fresh.map((l) => ({ ...l, timestamp: times.get(l.blockNumber!) })));
  rpcCache.scannedTo = latest;
  return rpcCache.logs;
}

/** Every decoded event of the contract, oldest first. */
export async function loadHistory(prefer: HistorySource = "routescan"): Promise<{ events: LayByEvent[]; source: HistorySource }> {
  if (prefer === "routescan") {
    try {
      return { events: decodeLogs(await fromRoutescan()), source: "routescan" };
    } catch (err) {
      console.warn("[history] Routescan failed, falling back to RPC:", err instanceof Error ? err.message : err);
    }
  }
  return { events: decodeLogs(await fromRpc()), source: "rpc" };
}
