// Run: npm test   (Node 24 strips TypeScript types natively; no test framework needed)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bpsToPercent,
  feeIfCancelled,
  formatAvax,
  parseAvax,
  percentPaid,
  percentToBps,
  remainingBalance,
  toAvaxDecimal,
} from "../src/lib/money.ts";

const A = (s: string) => parseAvax(s)!;

test("parseAvax is exact and rejects junk", () => {
  assert.equal(A("0.1"), 10n ** 17n);
  assert.equal(A(".5"), 5n * 10n ** 17n);
  assert.equal(A("1.000000000000000001"), 10n ** 18n + 1n);
  for (const bad of ["", "-1", "1e3", "1.2.3", "abc", "0.0000000000000000001", "1,5"]) {
    assert.equal(parseAvax(bad), null, bad);
  }
});

test("toAvaxDecimal round-trips", () => {
  for (const s of ["0.02", "1", "12345.000000000000000001"]) assert.equal(A(toAvaxDecimal(A(s))), A(s));
});

test("percentToBps uses 0.01% steps", () => {
  assert.equal(percentToBps("1"), 100);
  assert.equal(percentToBps("0.25"), 25);
  assert.equal(percentToBps("0.5"), 50);
  assert.equal(percentToBps("0.001"), null);
  assert.equal(bpsToPercent(100), "1%");
  assert.equal(bpsToPercent(25), "0.25%");
  assert.equal(bpsToPercent(50), "0.5%");
});

test("pitch demo amounts match the contract's feeIfCancelled formula", () => {
  // Fridge #2: price 0.08, paid 0.02, 1% -> fee 0.0008, refund 0.0192
  const fridge = { price: A("0.08"), paid: A("0.02"), feeBps: 100 };
  assert.equal(feeIfCancelled(fridge), A("0.0008"));
  assert.equal(fridge.paid - feeIfCancelled(fridge), A("0.0192"));
  // Sofa #3: price 0.06, paid 0.01 -> fee 0.0006, refund 0.0094
  const sofa = { price: A("0.06"), paid: A("0.01"), feeBps: 100 };
  assert.equal(feeIfCancelled(sofa), A("0.0006"));
  assert.equal(sofa.paid - feeIfCancelled(sofa), A("0.0094"));
  // The fee is capped at what has been paid
  assert.equal(feeIfCancelled({ price: A("10"), paid: A("0.01"), feeBps: 100 }), A("0.01"));
  assert.equal(feeIfCancelled({ price: A("10"), paid: 0n, feeBps: 100 }), 0n);
});

test("balances and display", () => {
  assert.equal(remainingBalance({ price: A("0.10"), paid: A("0.06") }), A("0.04"));
  assert.equal(percentPaid({ price: A("0.10"), paid: A("0.06") }), 60);
  assert.equal(formatAvax(A("0.06")), "0.06 AVAX");
  assert.equal(formatAvax(A("0.0192"), 18), "0.0192 AVAX");
  assert.equal(formatAvax(0n), "0 AVAX");
});
