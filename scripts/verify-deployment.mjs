#!/usr/bin/env node
// Read-only verification of a deployed LayBy contract on Avalanche Fuji.
// Usage:
//   node scripts/verify-deployment.mjs <contractAddress> [--rpc <url>] [--artifact <path>]
//   node scripts/verify-deployment.mjs --self-test [--artifact <path>]
//
// Default artifact: contracts/deployed/LayBy.fuji.json (the verified build of the
// repo-root LayBy.sol). NOTE: contracts/artifacts/LayBy.json is the build of
// contracts/LayBy.sol, which is NOT what is deployed on Fuji.
//
// It never signs or sends transactions. It only uses eth_chainId, eth_getCode,
// eth_call, eth_getBlockByNumber, eth_getTransactionByHash, eth_getTransactionReceipt
// and the public Routescan (Etherscan-compatible) contract-creation lookup.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const argvAll = process.argv.slice(2);
const artIdx = argvAll.indexOf("--artifact");
const artifactPath =
  artIdx >= 0
    ? resolve(argvAll[artIdx + 1])
    : join(here, "..", "contracts", "deployed", "LayBy.fuji.json");
const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));

const FUJI_CHAIN_ID = 43113;
const DEFAULT_RPC = "https://api.avax-test.network/ext/bc/C/rpc";
const ROUTESCAN =
  "https://api.routescan.io/v2/network/testnet/evm/43113/etherscan/api";

const runtimeHex = artifact.data.deployedBytecode.object.toLowerCase();
const creationHex = artifact.data.bytecode.object.toLowerCase();
const immutableRanges = Object.values(
  artifact.data.deployedBytecode.immutableReferences ?? {},
).flat(); // [{start, length}] in bytes
const selectors = artifact.data.methodIdentifiers; // { "graceSeconds()": "xxxxxxxx", ... }

// ---------- bytecode helpers (hex strings without 0x) ----------

/** Split runtime code into [executable, cborMetadata] using the trailing 2-byte length. */
function splitMetadata(hex) {
  const len = parseInt(hex.slice(-4), 16);
  const metaChars = (len + 2) * 2;
  if (!Number.isFinite(len) || metaChars > hex.length) return [hex, ""];
  return [hex.slice(0, -metaChars), hex.slice(-metaChars)];
}

function maskImmutables(hex) {
  let out = hex;
  for (const { start, length } of immutableRanges) {
    const a = start * 2;
    const b = a + length * 2;
    out = out.slice(0, a) + "0".repeat(b - a) + out.slice(b);
  }
  return out;
}

function readImmutable(hex) {
  const r = immutableRanges[0];
  if (!r) return null;
  const values = immutableRanges.map(({ start, length }) =>
    BigInt("0x" + hex.slice(start * 2, (start + length) * 2)),
  );
  // All references of the same immutable must hold the same value.
  return values.every((v) => v === values[0]) ? values[0] : null;
}

/**
 * Compare deployed runtime code to the artifact.
 * - exact: identical after masking immutables, including the metadata hash
 *          (the metadata hash commits to the source + compiler settings).
 * - compatible: executable code identical, metadata differs (e.g. whitespace/comments changed).
 */
export function compareRuntime(deployedHex) {
  const d = deployedHex.replace(/^0x/, "").toLowerCase();
  if (d.length !== runtimeHex.length) {
    return { exact: false, compatible: false, reason: `length differs (${d.length / 2} vs ${runtimeHex.length / 2} bytes)` };
  }
  const [dExec, dMeta] = splitMetadata(maskImmutables(d));
  const [aExec, aMeta] = splitMetadata(maskImmutables(runtimeHex));
  const compatible = dExec === aExec;
  const exact = compatible && dMeta === aMeta;
  return {
    exact,
    compatible,
    graceSecondsFromCode: readImmutable(d),
    reason: exact ? "identical (immutables masked)" : compatible ? "executable identical, metadata hash differs" : "executable code differs",
  };
}

// ---------- RPC ----------

async function rpc(url, method, params) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(`${method}: ${json.error.message}`);
  return json.result;
}

async function callUint(url, address, signature) {
  const sel = selectors[signature];
  if (!sel) throw new Error(`selector for ${signature} not in artifact`);
  const out = await rpc(url, "eth_call", [{ to: address, data: "0x" + sel }, "latest"]);
  return BigInt(out);
}

async function findCreation(address) {
  try {
    const res = await fetch(
      `${ROUTESCAN}?module=contract&action=getcontractcreation&contractaddresses=${address}`,
    );
    const json = await res.json();
    if (json.status === "1" && json.result?.[0]) return { ...json.result[0], source: "routescan" };
  } catch {
    // fall through to the RPC search
  }
  return null;
}

/** Fallback: binary-search the first block with code (needs an archive RPC; Fuji's public RPC is). */
async function findCreationViaRpc(url, address) {
  const hasCode = async (b) =>
    (await rpc(url, "eth_getCode", [address, "0x" + b.toString(16)])) !== "0x";
  let hi = Number(await rpc(url, "eth_blockNumber", []));
  let lo = 0;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (await hasCode(mid)) hi = mid;
    else lo = mid;
  }
  const block = await rpc(url, "eth_getBlockByNumber", ["0x" + hi.toString(16), true]);
  for (const tx of block.transactions) {
    const rc = await rpc(url, "eth_getTransactionReceipt", [tx.hash]);
    if (rc?.contractAddress?.toLowerCase() === address.toLowerCase()) {
      return { txHash: tx.hash, contractCreator: tx.from, source: "rpc-binary-search" };
    }
  }
  return null; // created by a factory/internal call; not a top-level creation tx
}

// ---------- main ----------

async function verify(address, url) {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) throw new Error("Invalid address format");
  const report = { address, rpc: url };

  report.chainId = Number(await rpc(url, "eth_chainId", []));
  if (report.chainId !== FUJI_CHAIN_ID) throw new Error(`RPC chain ID ${report.chainId} is not Fuji (43113)`);

  const code = await rpc(url, "eth_getCode", [address, "latest"]);
  report.hasCode = code !== "0x";
  if (!report.hasCode) {
    report.verdict = "NO CONTRACT: address has no bytecode on Fuji";
    return report;
  }
  report.bytecode = compareRuntime(code);

  for (const sig of ["graceSeconds()", "nextId()", "MAX_FEE_BPS()"]) {
    try {
      report[sig] = (await callUint(url, address, sig)).toString();
    } catch (e) {
      report[sig] = `ERROR ${e.message}`;
    }
  }

  report.artifact = artifactPath;
  const creation = (await findCreation(address)) ?? (await findCreationViaRpc(url, address));
  if (creation) {
    report.creationSource = creation.source;
    report.creator = creation.contractCreator;
    report.deploymentTx = creation.txHash;
    const [tx, receipt] = await Promise.all([
      rpc(url, "eth_getTransactionByHash", [creation.txHash]),
      rpc(url, "eth_getTransactionReceipt", [creation.txHash]),
    ]);
    report.deploymentBlock = receipt ? Number(receipt.blockNumber) : null;
    const input = (tx?.input ?? "").replace(/^0x/, "").toLowerCase();
    if (input.startsWith(creationHex)) {
      const args = input.slice(creationHex.length);
      report.creationCodeMatches = true;
      report.constructorGraceSeconds = args.length >= 64 ? BigInt("0x" + args.slice(0, 64)).toString() : null;
    } else {
      // Metadata-only differences also change creation code; report, don't guess.
      report.creationCodeMatches = false;
    }
  } else {
    report.deploymentTx = "NOT FOUND (look it up in the deployer wallet history)";
  }

  const b = report.bytecode;
  report.verdict = b.exact
    ? `VERIFIED MATCH: runtime bytecode and metadata hash identical to ${artifactPath}`
    : b.compatible
      ? "COMPATIBLE: same executable code, different metadata (source text/settings differ cosmetically)"
      : "MISMATCH: deployed code is not this artifact. Do not integrate until resolved.";
  return report;
}

function selfTest() {
  // Inject an arbitrary immutable value (120) into the artifact's runtime code and confirm it matches.
  let hex = runtimeHex;
  const v = (120n).toString(16).padStart(64, "0");
  for (const { start, length } of immutableRanges) {
    hex = hex.slice(0, start * 2) + v + hex.slice((start + length) * 2);
  }
  const ok = compareRuntime(hex);
  const tampered = compareRuntime(hex.slice(0, 200) + (hex[200] === "0" ? "1" : "0") + hex.slice(201));
  const results = [
    ["artifact with immutable=120 is exact match", ok.exact === true],
    ["grace seconds read back as 120", ok.graceSecondsFromCode === 120n],
    ["one-nibble change is detected", tampered.compatible === false],
    ["immutable refs found", immutableRanges.length === 2],
  ];
  for (const [name, pass] of results) console.log(`${pass ? "PASS" : "FAIL"}  ${name}`);
  process.exit(results.every(([, p]) => p) ? 0 : 1);
}

const argv = argvAll;
if (argv[0] === "--self-test") selfTest();
else if (!argv[0]) {
  console.error("Usage: node scripts/verify-deployment.mjs <contractAddress> [--rpc <url>]");
  process.exit(2);
} else {
  const rpcIdx = argv.indexOf("--rpc");
  const url = rpcIdx >= 0 ? argv[rpcIdx + 1] : DEFAULT_RPC;
  verify(argv[0], url)
    .then((r) => {
      console.log(JSON.stringify(r, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2));
      process.exit(r.bytecode?.exact || r.bytecode?.compatible ? 0 : 1);
    })
    .catch((e) => {
      console.error("Verification failed:", e.message);
      process.exit(1);
    });
}
