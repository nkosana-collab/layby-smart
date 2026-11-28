// READ-ONLY live check against the deployed contract on Fuji. Sends no transactions.
// Simulations are eth_call: they run the contract code without a signature or gas.
// Run: npm run check:live
import { readFileSync } from "node:fs";
import { BaseError, ContractFunctionRevertedError, createPublicClient, http, parseEther } from "viem";
import { avalancheFuji } from "viem/chains";

const artifact = JSON.parse(readFileSync(new URL("../../contracts/deployed/LayBy.fuji.json", import.meta.url), "utf8"));
const client = createPublicClient({ chain: avalancheFuji, transport: http() });
const c = { address: artifact.address, abi: artifact.abi };
const SHOP = artifact.deployer; // any address works for eth_call
const CUSTOMER = "0x000000000000000000000000000000000000c001";
let failures = 0;

const reason = (e) => {
  const r = e instanceof BaseError ? e.walk((x) => x instanceof ContractFunctionRevertedError) : null;
  return r?.reason ?? e.shortMessage ?? String(e);
};
const check = (label, ok, detail) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  → " + detail : ""}`);
  if (!ok) failures++;
};
const expectRevert = async (label, call, expected) => {
  try {
    await call();
    check(label, false, "did not revert");
  } catch (e) {
    check(label, reason(e) === expected, `"${reason(e)}"`);
  }
};

const [chainId, code, grace, maxFee, nextId, now] = await Promise.all([
  client.getChainId(),
  client.getCode({ address: c.address }),
  client.readContract({ ...c, functionName: "graceSeconds" }),
  client.readContract({ ...c, functionName: "MAX_FEE_BPS" }),
  client.readContract({ ...c, functionName: "nextId" }),
  client.getBlock().then((b) => b.timestamp),
]);
check("chain is Fuji 43113", chainId === 43113, String(chainId));
check("contract has code", !!code && code.length > 2, `${(code.length - 2) / 2} bytes`);
check("graceSeconds = 120", grace === 120n, String(grace));
check("MAX_FEE_BPS = 100", maxFee === 100, String(maxFee));
console.log(`INFO  nextId = ${nextId} (${nextId - 1n} lay-bys created so far)`);

const future = now + 86_400n;
const sim = await client.simulateContract({ ...c, functionName: "createLayBy", args: [CUSTOMER, "TV", parseEther("0.1"), future, 100], account: SHOP });
check("simulate createLayBy returns next ID", sim.result === nextId, String(sim.result));

await expectRevert("fee above 1% rejected", () =>
  client.simulateContract({ ...c, functionName: "createLayBy", args: [CUSTOMER, "TV", parseEther("0.1"), future, 101], account: SHOP }), "Fee exceeds 1% of price");
await expectRevert("shop as own customer rejected", () =>
  client.simulateContract({ ...c, functionName: "createLayBy", args: [SHOP, "TV", parseEther("0.1"), future, 100], account: SHOP }), "Invalid customer");
await expectRevert("past completion date rejected", () =>
  client.simulateContract({ ...c, functionName: "createLayBy", args: [CUSTOMER, "TV", parseEther("0.1"), now - 10n, 100], account: SHOP }), "Completion date must be in the future");
await expectRevert("zero price rejected", () =>
  client.simulateContract({ ...c, functionName: "createLayBy", args: [CUSTOMER, "TV", 0n, future, 100], account: SHOP }), "Price must be above zero");

const missing = nextId + 1000n;
// A payable simulation needs an account that holds the value, so use the (funded) deployer.
await expectRevert("pay on unknown ID rejected", () =>
  client.simulateContract({ ...c, functionName: "pay", args: [missing], value: 1n, account: SHOP }), "Lay-by not found");

if (nextId > 1n) {
  const l = await client.readContract({ ...c, functionName: "getLayBy", args: [1n] });
  console.log("INFO  lay-by #1:", { ...l, price: String(l.price), paid: String(l.paid), completionDate: String(l.completionDate) });
  await expectRevert("stranger can't pay lay-by #1", () =>
    client.simulateContract({ ...c, functionName: "pay", args: [1n], value: 1n, account: "0x000000000000000000000000000000000000dEaD" }), "Only the customer can pay");
}

const url = `https://api.routescan.io/v2/network/testnet/evm/43113/etherscan/api?module=logs&action=getLogs&address=${c.address}&fromBlock=${artifact.deploymentBlock}&toBlock=999999999&page=1&offset=1000`;
const rs = await fetch(url).then((r) => r.json()).catch((e) => ({ message: String(e) }));
check("Routescan returns our logs", (Array.isArray(rs.result) ? rs.result.length : 0) >= (nextId > 1n ? 1 : 0), `${rs.message}, ${Array.isArray(rs.result) ? rs.result.length : 0} logs`);

console.log(failures ? `\n${failures} check(s) failed` : "\nAll live checks passed");
process.exit(failures ? 1 : 0);
