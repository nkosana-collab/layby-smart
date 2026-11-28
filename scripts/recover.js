// Recovery script for LayBy contract
// Attaches to an existing deployed contract, lists all lay-bys for your accounts,
// and recovers funds from Active (cancel) or Completed (confirmCollection) lay-bys.
//
// Run with: npx hardhat run scripts/recover.js --network fuji

import 'dotenv/config';
import { ethers } from 'ethers';
import hre from 'hardhat';

const OLD_CONTRACT = '0xF5552b5b1b1338901088f804cfA0295fcAC6Dd62';

const STATUS = ['Active', 'Completed', 'Collected', 'Cancelled', 'Expired'];

async function main() {
  const rpcUrl = process.env.FUJI_RPC_URL || 'http://127.0.0.1:8545';
  const ethersProvider = new ethers.JsonRpcProvider(rpcUrl);

  const shop    = new ethers.Wallet(process.env.PRIVATE_KEY,          ethersProvider);
  const customer = new ethers.Wallet(process.env.CUSTOMER_PRIVATE_KEY, ethersProvider);

  console.log('Shop address:   ', shop.address);
  console.log('Customer address:', customer.address);

  const artifact = await hre.artifacts.readArtifact('LayBy');
  const layby = new ethers.Contract(OLD_CONTRACT, artifact.abi, shop);

  // ── Gather all relevant lay-by IDs ───────────────────────────────────────
  const [shopIds, customerIds] = await Promise.all([
    layby.layBysOfShop(shop.address),
    layby.layBysOfCustomer(customer.address),
  ]);

  // Deduplicate
  const allIds = [...new Set([...shopIds, ...customerIds].map(id => id.toString()))];
  console.log(`\nFound ${allIds.length} lay-by(s): ${allIds.join(', ') || 'none'}`);

  if (allIds.length === 0) {
    console.log('Nothing to recover.');
    return;
  }

  // ── Inspect and recover ──────────────────────────────────────────────────
  for (const id of allIds) {
    const record = await layby.getLayBy(id);
    const statusName = STATUS[Number(record.status)];
    const paid   = ethers.formatEther(record.paid);
    const price  = ethers.formatEther(record.price);

    console.log(`\nLay-by #${id}:`);
    console.log(`  Item   : ${record.item}`);
    console.log(`  Status : ${statusName}`);
    console.log(`  Paid   : ${paid} / ${price} AVAX`);
    console.log(`  Shop   : ${record.shop}`);
    console.log(`  Customer: ${record.customer}`);

    // ── Active: cancel to get refund (minus fee if customer cancels) ─────
    if (statusName === 'Active') {
      const isShop = record.shop.toLowerCase() === shop.address.toLowerCase();
      const isCustomer = record.customer.toLowerCase() === customer.address.toLowerCase();

      if (isShop) {
        // Shop cancels → full refund to customer, no fee
        console.log(`  → Cancelling as SHOP (full refund to customer)...`);
        const tx = await layby.connect(shop).cancel(id);
        const receipt = await tx.wait();
        console.log(`  ✓ Cancelled. Tx: ${receipt.hash}`);
      } else if (isCustomer) {
        const fee = await layby.feeIfCancelled(id);
        const refund = record.paid - fee;
        console.log(`  → Cancelling as CUSTOMER. Fee: ${ethers.formatEther(fee)} AVAX, Refund: ${ethers.formatEther(refund)} AVAX`);
        const tx = await layby.connect(customer).cancel(id);
        const receipt = await tx.wait();
        console.log(`  ✓ Cancelled. Tx: ${receipt.hash}`);
      } else {
        console.log(`  ⚠ Neither shop nor customer matches your wallets – skipping.`);
      }
    }

    // ── Completed (fully paid): confirm collection to send funds to shop ──
    else if (statusName === 'Completed') {
      const isCustomer = record.customer.toLowerCase() === customer.address.toLowerCase();
      if (isCustomer) {
        console.log(`  → Confirming collection (releases ${paid} AVAX to shop)...`);
        const tx = await layby.connect(customer).confirmCollection(id);
        const receipt = await tx.wait();
        console.log(`  ✓ Collected. Tx: ${receipt.hash}`);
      } else {
        console.log(`  ⚠ Customer address doesn't match your wallet – skipping.`);
      }
    }

    // ── Already resolved ──────────────────────────────────────────────────
    else {
      console.log(`  → Nothing to do (status is ${statusName}).`);
    }
  }

  console.log('\nRecovery complete.');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
