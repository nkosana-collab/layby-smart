"use client";

import { useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useConnect, useConnection, useConnectors, useDisconnect, useSwitchChain } from "wagmi";
import { getConnection, getWalletClient, switchChain } from "wagmi/actions";
import type { ContractFunctionArgs, ContractFunctionName } from "viem";
import { FUJI } from "@/lib/chain";
import { wagmiConfig } from "@/lib/wagmi";
import { layByAbi } from "./abi";
import { publicClient } from "./client";
import { decodeLogs, eventsFromJson, reconcile } from "./events";
import { readChainTime, readGraceSeconds, readIdsOf, readLayBy, readLayBys } from "./reads";
import type { Address, LayBy, LayByEvent, TxHash } from "./types";

/* ---------------- wallet ---------------- */

const noop = () => () => {};
/** False on the server and during hydration, true afterwards: wallet state only exists in the browser. */
function useMounted() {
  return useSyncExternalStore(noop, () => true, () => false);
}

export function useWallet() {
  const mounted = useMounted();
  const c = useConnection();
  const connectors = useConnectors();
  const connect = useConnect();
  const disconnect = useDisconnect();
  const sw = useSwitchChain();
  // Until mounted, report "reconnecting" so server HTML and the first client render match.
  const status = mounted ? c.status : "reconnecting";
  // The injected() connector always exists; whether a wallet extension is present is window.ethereum.
  const hasInjected = !mounted || (typeof window !== "undefined" && "ethereum" in window && !!window.ethereum);
  return {
    address: mounted ? (c.address as Address | undefined) : undefined,
    status,
    isConnected: status === "connected",
    onFuji: c.chainId === FUJI.chainId,
    hasInjected,
    connect: () => connectors[0] && connect.mutate({ connector: connectors[0], chainId: FUJI.chainId }),
    connectError: connect.error,
    isConnecting: connect.isPending || status === "connecting" || status === "reconnecting",
    disconnect: () => disconnect.mutate({}),
    switchToFuji: () => sw.mutate({ chainId: FUJI.chainId }),
    isSwitching: sw.isPending,
  };
}

/* ---------------- reads ---------------- */

export const keys = {
  grace: ["layby", "graceSeconds"] as const,
  time: ["chain", "time"] as const,
  list: (role: string, wallet?: string) => ["layby", "list", role, wallet?.toLowerCase()] as const,
  one: (id: bigint) => ["layby", "one", id.toString()] as const,
  history: (id?: bigint) => ["layby", "history", id?.toString() ?? "all"] as const,
};

export function useGraceSeconds() {
  return useQuery({ queryKey: keys.grace, queryFn: readGraceSeconds, staleTime: Infinity });
}

/** Latest block timestamp, refreshed every 5 s: the contract's clock for expiry. */
export function useChainTime() {
  return useQuery({ queryKey: keys.time, queryFn: readChainTime, refetchInterval: 5_000 });
}

export function useLayBysOf(role: "customer" | "shop", wallet: Address | undefined) {
  return useQuery({
    queryKey: keys.list(role, wallet),
    enabled: !!wallet,
    queryFn: async (): Promise<LayBy[]> => {
      const ids = await readIdsOf(role, wallet!);
      const layBys = await readLayBys(ids);
      return layBys.sort((a, b) => (a.id < b.id ? 1 : -1)); // newest first
    },
    refetchInterval: 15_000,
  });
}

export function useLayBy(id: bigint | null) {
  return useQuery({
    queryKey: keys.one(id ?? 0n),
    enabled: id !== null,
    queryFn: () => readLayBy(id!),
    refetchInterval: 10_000,
  });
}

async function fetchHistory(id?: bigint, source?: "rpc") {
  const qs = new URLSearchParams();
  if (id !== undefined) qs.set("id", id.toString());
  if (source) qs.set("source", source);
  const res = await fetch(`/api/history?${qs}`, { cache: "no-store" });
  const text = await res.text();
  if (!res.ok) throw new Error(JSON.parse(text).error ?? `History HTTP ${res.status}`);
  return eventsFromJson(text) as unknown as { source: string; events: LayByEvent[] };
}

/**
 * Event history. When a lay-by is given, payments are reconciled against its
 * on-chain `paid`; if Routescan is behind, it retries once straight from the RPC.
 */
export function useHistory(layBy?: Pick<LayBy, "id" | "paid"> | null, opts: { all?: boolean } = {}) {
  const id = opts.all ? undefined : layBy?.id;
  return useQuery({
    queryKey: [...keys.history(id), layBy?.paid.toString() ?? ""],
    enabled: opts.all || !!layBy,
    queryFn: async (): Promise<{ events: LayByEvent[]; source: string; reconciled: boolean }> => {
      const first = await fetchHistory(id);
      if (!layBy || reconcile(first.events, layBy.id, layBy.paid)) return { ...first, reconciled: true };
      const second = await fetchHistory(id, "rpc");
      return { ...second, reconciled: reconcile(second.events, layBy.id, layBy.paid) };
    },
    refetchInterval: 20_000,
  });
}

/* ---------------- writes ---------------- */

type WriteName = Exclude<ContractFunctionName<typeof layByAbi, "nonpayable" | "payable">, never>;

export interface WriteInput<N extends WriteName = WriteName> {
  functionName: N;
  args: ContractFunctionArgs<typeof layByAbi, "nonpayable" | "payable", N>;
  value?: bigint;
}

export interface WriteResult {
  txHash: TxHash;
  blockNumber: bigint;
  events: LayByEvent[];
}

/**
 * simulate → sign → wait → decode → refresh.
 * Simulation runs first so contract rejections ("Only the customer can pay")
 * show before the wallet asks for a signature, and no gas is spent on them.
 */
export function useLayByWrite() {
  const queryClient = useQueryClient();
  const { address } = useConnection();
  return useMutation({
    mutationFn: async (input: WriteInput): Promise<WriteResult> => {
      if (!address) throw new Error("Connect your wallet first.");
      const account = address as Address;
      const { request } = await publicClient.simulateContract({
        address: FUJI.layByAddress,
        abi: layByAbi,
        functionName: input.functionName,
        args: input.args,
        value: input.value,
        account,
      } as Parameters<typeof publicClient.simulateContract>[0]);
      if (getConnection(wagmiConfig).chainId !== FUJI.chainId) await switchChain(wagmiConfig, { chainId: FUJI.chainId });
      const wallet = await getWalletClient(wagmiConfig, { chainId: FUJI.chainId, account });
      const txHash = await wallet.writeContract(request as Parameters<typeof wallet.writeContract>[0]);
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      if (receipt.status !== "success") throw new Error("The transaction was included but reverted. No state changed.");
      const ours = receipt.logs.filter((l) => l.address.toLowerCase() === FUJI.layByAddress.toLowerCase());
      return { txHash, blockNumber: receipt.blockNumber, events: decodeLogs(ours) };
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["layby"] }),
  });
}

/** Simulate only (no signature). Used to check a call would succeed. */
export async function simulateLayBy(input: WriteInput, account: Address) {
  return publicClient.simulateContract({
    address: FUJI.layByAddress,
    abi: layByAbi,
    functionName: input.functionName,
    args: input.args,
    value: input.value,
    account,
  } as Parameters<typeof publicClient.simulateContract>[0]);
}
