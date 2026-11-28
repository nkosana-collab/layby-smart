// Expiry test script for LayBy contract on a live testnet (e.g. Fuji)
// Deploys a fresh LayBy with a short grace period, creates a lay-by,
// waits for expiry, then calls expire().
//
// Run with: npx hardhat run scripts/test-expiry.js --network fuji

import 'dotenv/config';
import { ethers } from 'ethers';
import hre from 'hardhat';

// ── Config ────────────────────────────────────────────────────────────────
const GRACE_SECONDS   = 60;  // grace period after completionDate (seconds)
const BUFFER_SECONDS  = 10;  // extra wait after expiry to account for block time

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForExpiry(expiryTimestamp) {
  const totalWait = GRACE_SECONDS + BUFFER_SECONDS;
  console.log(`\n⏳ Waiting ${totalWait}s for expiry (completionDate + ${GRACE_SECONDS}s grace + ${BUFFER_SECONDS}s buffer)...`);

  for (let remaining = totalWait; remaining > 0; remaining -= 5) {
    process.stdout.write(`   ${remaining}s remaining...\r`);
    await sleep(Math.min(5000, remaining * 1000));
  }
  console.log('\n✓ Expiry time reached.');
}

async function main() {
  const rpcUrl = process.env.FUJI_RPC_URL || 'http://127.0.0.1:8545';
  const ethersProvider = new ethers.JsonRpcProvider(rpcUrl);

  const shop     = new ethers.Wallet(process.env.PRIVATE_KEY,          ethersProvider);
  const customer = new ethers.Wallet(process.env.CUSTOMER_PRIVATE_KEY, ethersProvider);

  console.log('Shop address:    ', shop.address);
  console.log('Customer address:', customer.address);

  // ── 1. Deploy a fresh LayBy with a short grace period ───────────────────
  console.log(`\n--- Deploying LayBy with graceSeconds=${GRACE_SECONDS} ---`);
  const artifact = await hre.artifacts.readArtifact('LayBy');
  const factory  = new ethers.ContractFactory(artifact.abi, artifact.bytecode, shop);
  const layby    = await factory.deploy(GRACE_SECONDS);
  await layby.waitForDeployment();
  const laybyAddress = await layby.getAddress();
  console.log('✓ LayBy deployed to', laybyAddress);

  // ── 2. Create a lay-by with completionDate = now + 1 (expires ASAP) ─────
  const now            = Math.floor(Date.now() / 1000);
  const completionDate = now + 1;   // 1 second in the future
  const price          = ethers.parseEther('0.01'); // small amount for testing
  const feeBps         = 50; // 0.5% fee

  console.log('\n--- Creating lay-by with completionDate = now + 1s ---');
  const txCreate = await layby.connect(shop).createLayBy(
    customer.address,
    'Expiry Test Item',
    price,
    completionDate,
    feeBps
  );
  const receiptCreate = await txCreate.wait();
  const created = receiptCreate.logs
    .map(log => { try { return layby.interface.parseLog(log); } catch { return null; } })
    .find(e => e && e.name === 'LayByCreated');
  const laybyId = created.args.id;
  console.log('✓ Lay-by created. ID:', laybyId.toString());

  // ── 3. Make a small partial payment so there's something to refund/fee ──
  console.log('\n--- Customer makes a partial payment (0.005 AVAX) ---');
  const partial = ethers.parseEther('0.005');
  const txPay   = await layby.connect(customer).pay(laybyId, { value: partial });
  await txPay.wait();
  const remaining = await layby.remainingBalance(laybyId);
  console.log('✓ Paid 0.005 AVAX. Remaining:', ethers.formatEther(remaining), 'AVAX');

  const expiryTime = await layby.expiryTime(laybyId);
  console.log('  Expiry timestamp:', expiryTime.toString(), `(now=${now})`);

  // ── 4. Wait for real time to pass ───────────────────────────────────────
  await waitForExpiry(Number(expiryTime));

  // ── 5. Check expiry time is reached ─────────────────────────────────────
  const currentBlock     = await ethersProvider.getBlock('latest');
  const currentTimestamp = currentBlock.timestamp;
  console.log(`\n  Current block timestamp: ${currentTimestamp}`);
  console.log(`  Expiry timestamp:        ${expiryTime.toString()}`);

  if (currentTimestamp < expiryTime) {
    const diff = Number(expiryTime) - currentTimestamp;
    console.log(`⚠ Block time hasn't caught up yet (${diff}s short). Waiting another ${diff + 5}s...`);
    await sleep((diff + 5) * 1000);
  }

  // ── 6. Call expire() ─────────────────────────────────────────────────────
  console.log('\n--- Calling expire() as shop ---');
  const fee    = await layby.feeIfCancelled(laybyId);
  const refund = partial - fee;
  console.log(`  Expected fee:    ${ethers.formatEther(fee)} AVAX`);
  console.log(`  Expected refund: ${ethers.formatEther(refund)} AVAX`);

  const customerBalBefore = await ethersProvider.getBalance(customer.address);
  const shopBalBefore     = await ethersProvider.getBalance(shop.address);

  const txExpire   = await layby.connect(shop).expire(laybyId);
  const receiptExp = await txExpire.wait();
  console.log('✓ expire() called. Tx:', receiptExp.hash);

  const customerBalAfter = await ethersProvider.getBalance(customer.address);
  const shopBalAfter     = await ethersProvider.getBalance(shop.address);

  console.log('\n  Customer balance change:', ethers.formatEther(customerBalAfter - customerBalBefore), 'AVAX (refund)');
  console.log('  Shop balance change:    ', ethers.formatEther(shopBalAfter - shopBalBefore), 'AVAX (fee, net of gas)');

  // ── 7. Verify final status ────────────────────────────────────────────────
  const record = await layby.getLayBy(laybyId);
  const STATUS = ['Active', 'Completed', 'Collected', 'Cancelled', 'Expired'];
  console.log('\n  Final lay-by status:', STATUS[Number(record.status)]);

  if (Number(record.status) === 4) {
    console.log('\n✅ Expiry test passed!');
  } else {
    console.log('\n❌ Unexpected status – check the contract.');
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
