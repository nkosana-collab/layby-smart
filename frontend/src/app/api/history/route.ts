import type { NextRequest } from "next/server";
import { loadHistory, type HistorySource } from "@/lib/contract/history.server";
import { eventsToJson } from "@/lib/contract/events";

/**
 * READ-ONLY event history for the deployed contract.
 *   GET /api/history                 all events
 *   GET /api/history?id=3            one lay-by
 *   GET /api/history?source=rpc      skip Routescan (used when reconciliation fails)
 * Reading request.nextUrl makes this run at request time (Cache Components).
 */
let cache: { at: number; source: HistorySource; body: Awaited<ReturnType<typeof loadHistory>> } | null = null;
const TTL_MS = 4_000;

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const prefer: HistorySource = params.get("source") === "rpc" ? "rpc" : "routescan";
  const idParam = params.get("id");
  if (idParam !== null && !/^[1-9]\d{0,30}$/.test(idParam)) {
    return Response.json({ error: "id must be a positive integer" }, { status: 400 });
  }

  try {
    if (!cache || cache.source !== prefer || Date.now() - cache.at > TTL_MS) {
      cache = { at: Date.now(), source: prefer, body: await loadHistory(prefer) };
    }
    const { events, source } = cache.body;
    const id = idParam ? BigInt(idParam) : null;
    const selected = id === null ? events : events.filter((e) => e.id === id);
    return new Response(`{"source":"${source}","events":${eventsToJson(selected)}}`, {
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  } catch (err) {
    console.error("[history]", err);
    return Response.json({ error: "Couldn't load history from Routescan or the Fuji RPC." }, { status: 502 });
  }
}
