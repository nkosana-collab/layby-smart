// Interact script for LayBy contract – Hardhat 3 / ESM / Fuji
// Run with: npx hardhat run scripts/interact.js --network fuji

import 'dotenv/config';
import { ethers } from 'ethers';
import hre from 'hardhat';

async function main() {
  // Build a standard JSON-RPC provider directly from the env var
  const rpcUrl = process.env.FUJI_RPC_URL || 'http://127.0.0.1:8545';
  const ethersProvider = new ethers.JsonRpcProvider(rpcUrl);

  // Shop wallet (deployer) – signs with PRIVATE_KEY from .env
  const shop = new ethers.Wallet(process.env.PRIVATE_KEY, ethersProvider);
  // Customer wallet – signs with CUSTOMER_PRIVATE_KEY from .env
  const customer = new ethers.Wallet(process.env.CUSTOMER_PRIVATE_KEY, ethersProvider);

  console.log('Shop address:   ', shop.address);
  console.log('Customer address:', customer.address);

  // ── Attach to existing LayBy deployment ──────────────────────────────────
  const LAYBY_ADDRESS = '0xb124C7778D0715ad1D51e22a18cDb95Cd23d2936';
  console.log('\nAttaching to LayBy at', LAYBY_ADDRESS);
  const artifact = await hre.artifacts.readArtifact('LayBy');
  const layby = new ethers.Contract(LAYBY_ADDRESS, artifact.abi, shop);

  // Helpers
  const now = Math.floor(Date.now() / 1000);
  const completionDate = now + 60 * 60 * 24 * 7; // 1 week from now
  const price = ethers.parseEther('0.1');           // 1 AVAX
  const feeBps = 50;                              // 0.5%

  // ── 1. Create a lay‑by ───────────────────────────────────────────────────
  console.log('\n--- Creating lay‑by ---');
  const txCreate = await layby.connect(shop).createLayBy(
    customer.address,
    'Cool Gadget',
    price,
    completionDate,
    feeBps
  );
  const receiptCreate = await txCreate.wait();
  const created = receiptCreate.logs
    .map(log => { try { return layby.interface.parseLog(log); } catch { return null; } })
    .find(e => e && e.name === 'LayByCreated');
  const laybyId = created.args.id;
  console.log('LayBy ID:', laybyId.toString());

  // ── 2. Partial payment ───────────────────────────────────────────────────
  console.log('\n--- Customer makes partial payment (0.04 AVAX) ---');
  const partial = ethers.parseEther('0.04');
  await (await layby.connect(customer).pay(laybyId, { value: partial })).wait();
  let remaining = await layby.remainingBalance(laybyId);
  console.log('Remaining after partial:', ethers.formatEther(remaining), 'AVAX');

  // ── 3. Pay the rest ──────────────────────────────────────────────────────
  console.log('\n--- Customer pays remaining balance ---');
  await (await layby.connect(customer).pay(laybyId, { value: remaining })).wait();
  remaining = await layby.remainingBalance(laybyId);
  console.log('Remaining after full payment:', ethers.formatEther(remaining), 'AVAX');

  // ── 4. Confirm collection ────────────────────────────────────────────────
  console.log('\n--- Customer confirms collection ---');
  const shopBalBefore = await ethersProvider.getBalance(shop.address);
  await (await layby.connect(customer).confirmCollection(laybyId)).wait();
  const shopBalAfter = await ethersProvider.getBalance(shop.address);
  console.log('Shop balance ↑', ethers.formatEther(shopBalAfter - shopBalBefore), 'AVAX');

  // ── 5. Cancellation before any payment ──────────────────────────────────
  console.log('\n--- Demonstrating cancellation before any payment ---');
  const tx2 = await layby.connect(shop).createLayBy(
    customer.address,
    'Another Gadget',
    price,
    completionDate,
    feeBps
  );
  const receipt2 = await tx2.wait();
  const created2 = receipt2.logs
    .map(log => { try { return layby.interface.parseLog(log); } catch { return null; } })
    .find(e => e && e.name === 'LayByCreated');
  const laybyId2 = created2.args.id;
  console.log('Second LayBy ID:', laybyId2.toString());
  await (await layby.connect(customer).cancel(laybyId2)).wait();
  console.log('Customer cancelled lay‑by before paying – no fee charged');

  // ── 6. Expiry (local only – evm_increaseTime not available on Fuji) ──────
  // Note: time manipulation is only possible on a local Hardhat node.
  // On Fuji, the lay‑by must naturally expire (completionDate + graceSeconds).
  if (hre.network.name === 'localhost' || hre.network.name === 'hardhat') {
    console.log('\n--- Demonstrating expiry after grace period ---');
    const tx3 = await layby.connect(shop).createLayBy(
      customer.address,
      'Expiring Item',
      price,
      now + 10,
      feeBps
    );
    const receipt3 = await tx3.wait();
    const created3 = receipt3.logs
      .map(log => { try { return layby.interface.parseLog(log); } catch { return null; } })
      .find(e => e && e.name === 'LayByCreated');
    const laybyId3 = created3.args.id;

    await hre.network.provider.send('evm_increaseTime', [graceSeconds + 1]);
    await hre.network.provider.send('evm_mine');

    await (await layby.connect(shop).expire(laybyId3)).wait();
    console.log('Lay‑by expired and refund processed.');
  } else {
    console.log('\n--- Skipping expiry test (time manipulation not available on live networks) ---');
  }

  console.log('\nAll interactions completed successfully.');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
