// Decoder + reconciliation tests with logs encoded from the real ABI. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeAbiParameters, encodeEventTopics, parseEther, type Hex, type Log } from "viem";
import { layByAbi, LAYBY_ADDRESS } from "../src/lib/contract/abi.ts";
import { decodeLogs, eventsFromJson, eventsToJson, reconcile } from "../src/lib/contract/events.ts";

const SHOP = "0x0000000000000000000000000000000000000a01";
const CUSTOMER = "0x000000000000000000000000000000000000c001";
let n = 0;

function log(eventName: string, args: Record<string, unknown>, block: bigint): Log {
  const ev = layByAbi.find((x) => x.type === "event" && x.name === eventName)!;
  if (ev.type !== "event") throw new Error();
  const topics = encodeEventTopics({ abi: [ev], eventName: ev.name, args } as never) as [Hex, ...Hex[]];
  const nonIndexed = ev.inputs.filter((i) => !i.indexed);
  const data = encodeAbiParameters(nonIndexed, nonIndexed.map((i) => args[i.name!]) as never);
  return {
    address: LAYBY_ADDRESS,
    topics,
    data,
    blockNumber: block,
    blockHash: null,
    transactionHash: `0x${(++n).toString(16).padStart(64, "0")}`,
    transactionIndex: 0,
    logIndex: 0,
    removed: false,
  } as Log;
}

const A = parseEther;
const logs = [
  log("LayByCreated", { id: 1n, shop: SHOP, customer: CUSTOMER, item: "TV", price: A("0.1"), completionDate: 2_000_000_000n, feeBps: 100 }, 10n),
  log("LayByCreated", { id: 2n, shop: SHOP, customer: CUSTOMER, item: "Fridge", price: A("0.08"), completionDate: 2_000_000_000n, feeBps: 100 }, 11n),
  log("PaymentRecorded", { id: 1n, shop: SHOP, payer: CUSTOMER, amount: A("0.06"), newBalance: A("0.04"), timestamp: 1_800_000_000n }, 12n),
  log("PaymentRecorded", { id: 2n, shop: SHOP, payer: CUSTOMER, amount: A("0.02"), newBalance: A("0.06"), timestamp: 1_800_000_100n }, 13n),
  log("DepositMoved", { fromId: 1n, toId: 2n, customer: CUSTOMER, amount: A("0.01"), fromPaid: A("0.05"), toPaid: A("0.03") }, 14n),
  log("LayByCancelled", { id: 2n, cancelledBy: CUSTOMER, amountPaid: A("0.03"), fee: A("0.0008"), refund: A("0.0292") }, 15n),
].reverse(); // out of order on purpose

test("decodes every event kind, sorted by block", () => {
  const events = decodeLogs(logs);
  assert.deepEqual(
    events.map((e) => `${e.id}:${e.kind}`),
    ["1:Created", "2:Created", "1:Payment", "2:Payment", "1:DepositMovedOut", "2:DepositMovedIn", "2:Cancelled"],
  );
  const created = events[0];
  assert.equal(created.kind === "Created" && created.item, "TV");
  const pay = events[2];
  assert.equal(pay.kind === "Payment" && pay.timestamp, 1_800_000_000n, "falls back to the event's own timestamp");
});

test("reconcile: payments ± moved deposits equal stored paid", () => {
  const events = decodeLogs(logs);
  assert.equal(reconcile(events, 1n, A("0.05")), true); // 0.06 − 0.01
  assert.equal(reconcile(events, 2n, A("0.03")), true); // 0.02 + 0.01, still 0.03 after cancel
  assert.equal(reconcile(events, 1n, A("0.06")), false); // missing the move → history incomplete
  assert.equal(reconcile([], 1n, 0n), false); // lagging index: no Created event, even though paid = 0
});

test("bigint JSON round-trip", () => {
  const events = decodeLogs(logs);
  const back = (eventsFromJson(`{"source":"x","events":${eventsToJson(events)}}`) as { events: typeof events }).events;
  // JSON drops undefined keys, so compare serialized forms; bigints must survive exactly.
  assert.equal(eventsToJson(back), eventsToJson(events));
  assert.equal(typeof back[0].id, "bigint");
});
