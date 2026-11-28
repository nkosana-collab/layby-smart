// test/LayBy.test.js
// Run with: npm test  (or: npx hardhat test)

import { expect } from 'chai';
import hre from 'hardhat';
import { ethers } from 'ethers';

// ── Helpers ──────────────────────────────────────────────────────────────────

async function deployLayBy(signer, graceSeconds = 86400) {
  const artifact = await hre.artifacts.readArtifact('LayBy');
  const factory  = new ethers.ContractFactory(artifact.abi, artifact.bytecode, signer);
  const contract = await factory.deploy(graceSeconds);
  await contract.waitForDeployment();
  return contract;
}

function futureDate(offsetSeconds = 60 * 60 * 24 * 7) {
  return Math.floor(Date.now() / 1000) + offsetSeconds;
}

const ONE_AVAX  = ethers.parseEther('1');
const FEE_BPS   = 50; // 0.5 %

// ── Test suite ───────────────────────────────────────────────────────────────

describe('LayBy', function () {
  let provider, shop, customer, other, layby;

  before(async function () {
    const rpcUrl  = process.env.RPC_URL || 'http://127.0.0.1:8545';
    provider      = new ethers.JsonRpcProvider(rpcUrl);
    const signers = await provider.listAccounts();

    // Use hardhat node's pre-funded accounts
    shop     = await provider.getSigner(signers[0]);
    customer = await provider.getSigner(signers[1]);
    other    = await provider.getSigner(signers[2]);
  });

  beforeEach(async function () {
    layby = await deployLayBy(shop);
  });

  // ── createLayBy ──────────────────────────────────────────────────────────

  describe('createLayBy()', function () {
    it('creates a lay-by and emits LayByCreated', async function () {
      const completionDate = futureDate();
      const tx      = await layby.connect(shop).createLayBy(customer, 'Widget', ONE_AVAX, completionDate, FEE_BPS);
      const receipt = await tx.wait();
      const log     = receipt.logs.map(l => { try { return layby.interface.parseLog(l); } catch { return null; } }).find(e => e?.name === 'LayByCreated');

      expect(log).to.not.be.null;
      expect(log.args.item).to.equal('Widget');
      expect(log.args.price).to.equal(ONE_AVAX);
    });

    it('assigns incrementing IDs', async function () {
      const d = futureDate();
      await layby.connect(shop).createLayBy(customer, 'A', ONE_AVAX, d, 0);
      await layby.connect(shop).createLayBy(customer, 'B', ONE_AVAX, d, 0);
      expect(await layby.nextId()).to.equal(3n);
    });

    it('reverts when price is zero', async function () {
      await expect(
        layby.connect(shop).createLayBy(customer, 'Item', 0, futureDate(), 0)
      ).to.be.revertedWith('Price must be above zero');
    });

    it('reverts when completionDate is in the past', async function () {
      const pastDate = Math.floor(Date.now() / 1000) - 1;
      await expect(
        layby.connect(shop).createLayBy(customer, 'Item', ONE_AVAX, pastDate, 0)
      ).to.be.revertedWith('Completion date must be in the future');
    });

    it('reverts when feeBps exceeds MAX_FEE_BPS', async function () {
      await expect(
        layby.connect(shop).createLayBy(customer, 'Item', ONE_AVAX, futureDate(), 101)
      ).to.be.revertedWith('Fee exceeds 1% of price');
    });

    it('reverts when customer is the shop', async function () {
      await expect(
        layby.connect(shop).createLayBy(shop, 'Item', ONE_AVAX, futureDate(), 0)
      ).to.be.revertedWith('Invalid customer');
    });
  });

  // ── pay ──────────────────────────────────────────────────────────────────

  describe('pay()', function () {
    let id;

    beforeEach(async function () {
      const tx      = await layby.connect(shop).createLayBy(customer, 'Widget', ONE_AVAX, futureDate(), FEE_BPS);
      const receipt = await tx.wait();
      const log     = receipt.logs.map(l => { try { return layby.interface.parseLog(l); } catch { return null; } }).find(e => e?.name === 'LayByCreated');
      id = log.args.id;
    });

    it('records partial payment and updates balance', async function () {
      const half = ethers.parseEther('0.5');
      await layby.connect(customer).pay(id, { value: half });
      expect(await layby.remainingBalance(id)).to.equal(half);
    });

    it('marks status Completed when fully paid', async function () {
      await layby.connect(customer).pay(id, { value: ONE_AVAX });
      const record = await layby.getLayBy(id);
      expect(record.status).to.equal(1n); // Status.Completed
    });

    it('reverts if non-customer tries to pay', async function () {
      await expect(
        layby.connect(other).pay(id, { value: ethers.parseEther('0.1') })
      ).to.be.revertedWith('Only the customer can pay');
    });

    it('reverts on overpayment', async function () {
      await expect(
        layby.connect(customer).pay(id, { value: ethers.parseEther('1.1') })
      ).to.be.revertedWith('Payment exceeds remaining balance');
    });

    it('reverts on zero payment', async function () {
      await expect(
        layby.connect(customer).pay(id, { value: 0n })
      ).to.be.revertedWith('Payment must be above zero');
    });
  });

  // ── confirmCollection ─────────────────────────────────────────────────────

  describe('confirmCollection()', function () {
    it('transfers funds to shop and marks status Collected', async function () {
      const tx1     = await layby.connect(shop).createLayBy(customer, 'Widget', ONE_AVAX, futureDate(), 0);
      const r1      = await tx1.wait();
      const log1    = r1.logs.map(l => { try { return layby.interface.parseLog(l); } catch { return null; } }).find(e => e?.name === 'LayByCreated');
      const id = log1.args.id;

      await layby.connect(customer).pay(id, { value: ONE_AVAX });

      const shopAddr    = await shop.getAddress();
      const balBefore   = await provider.getBalance(shopAddr);
      await layby.connect(customer).confirmCollection(id);
      const balAfter    = await provider.getBalance(shopAddr);

      expect(balAfter - balBefore).to.equal(ONE_AVAX);
      const record = await layby.getLayBy(id);
      expect(record.status).to.equal(2n); // Status.Collected
    });

    it('reverts if not yet completed', async function () {
      const tx  = await layby.connect(shop).createLayBy(customer, 'Widget', ONE_AVAX, futureDate(), 0);
      const r   = await tx.wait();
      const log = r.logs.map(l => { try { return layby.interface.parseLog(l); } catch { return null; } }).find(e => e?.name === 'LayByCreated');
      const id  = log.args.id;

      await expect(
        layby.connect(customer).confirmCollection(id)
      ).to.be.revertedWith('Lay-by is not completed');
    });
  });

  // ── cancel ────────────────────────────────────────────────────────────────

  describe('cancel()', function () {
    let id;
    const paid = ethers.parseEther('0.5');

    beforeEach(async function () {
      const tx  = await layby.connect(shop).createLayBy(customer, 'Widget', ONE_AVAX, futureDate(), FEE_BPS);
      const r   = await tx.wait();
      const log = r.logs.map(l => { try { return layby.interface.parseLog(l); } catch { return null; } }).find(e => e?.name === 'LayByCreated');
      id = log.args.id;
      await layby.connect(customer).pay(id, { value: paid });
    });

    it('customer cancel: refunds minus fee, marks Cancelled', async function () {
      const customerAddr = await customer.getAddress();
      const shopAddr     = await shop.getAddress();

      const customerBefore = await provider.getBalance(customerAddr);
      const shopBefore     = await provider.getBalance(shopAddr);

      const tx      = await layby.connect(customer).cancel(id);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const customerAfter = await provider.getBalance(customerAddr);
      const shopAfter     = await provider.getBalance(shopAddr);

      // fee = price * feeBps / 10000 = 1 AVAX * 50 / 10000 = 0.005 AVAX
      const fee    = ONE_AVAX * 50n / 10000n;
      const refund = paid - fee;

      expect(customerAfter - customerBefore + gasUsed).to.equal(refund);
      expect(shopAfter - shopBefore).to.equal(fee);

      const record = await layby.getLayBy(id);
      expect(record.status).to.equal(3n); // Status.Cancelled
    });

    it('shop cancel: full refund to customer, no fee', async function () {
      const customerAddr   = await customer.getAddress();
      const customerBefore = await provider.getBalance(customerAddr);

      await layby.connect(shop).cancel(id);

      const customerAfter = await provider.getBalance(customerAddr);
      expect(customerAfter - customerBefore).to.equal(paid);
    });

    it('reverts if neither shop nor customer calls cancel', async function () {
      await expect(layby.connect(other).cancel(id)).to.be.revertedWith(
        'Only the customer or shop can cancel'
      );
    });
  });

  // ── expire ────────────────────────────────────────────────────────────────

  describe('expire()', function () {
    it('allows shop to expire an overdue lay-by and refunds customer', async function () {
      // Deploy with 1-second grace period
      const shortGrace = await deployLayBy(shop, 1);

      const completionDate = Math.floor(Date.now() / 1000) + 1; // 1s in future
      const tx  = await shortGrace.connect(shop).createLayBy(customer, 'Expiring', ONE_AVAX, completionDate, FEE_BPS);
      const r   = await tx.wait();
      const log = r.logs.map(l => { try { return shortGrace.interface.parseLog(l); } catch { return null; } }).find(e => e?.name === 'LayByCreated');
      const id  = log.args.id;

      const half = ethers.parseEther('0.5');
      await shortGrace.connect(customer).pay(id, { value: half });

      // Fast-forward time on the local hardhat node
      await hre.network.provider.send('evm_increaseTime', [5]);
      await hre.network.provider.send('evm_mine');

      await shortGrace.connect(shop).expire(id);
      const record = await shortGrace.getLayBy(id);
      expect(record.status).to.equal(4n); // Status.Expired
    });

    it('reverts if expiry time has not been reached', async function () {
      const layby2 = await deployLayBy(shop, 86400);
      const tx     = await layby2.connect(shop).createLayBy(customer, 'Item', ONE_AVAX, futureDate(), 0);
      const r      = await tx.wait();
      const log    = r.logs.map(l => { try { return layby2.interface.parseLog(l); } catch { return null; } }).find(e => e?.name === 'LayByCreated');
      const id     = log.args.id;

      await expect(layby2.connect(shop).expire(id)).to.be.revertedWith('Expiry time not reached');
    });
  });

  // ── view helpers ──────────────────────────────────────────────────────────

  describe('view helpers', function () {
    it('layBysOfCustomer returns the customer\'s lay-by IDs', async function () {
      const d = futureDate();
      await layby.connect(shop).createLayBy(customer, 'A', ONE_AVAX, d, 0);
      await layby.connect(shop).createLayBy(customer, 'B', ONE_AVAX, d, 0);
      const customerAddr = await customer.getAddress();
      const ids = await layby.layBysOfCustomer(customerAddr);
      expect(ids.length).to.equal(2);
    });

    it('layBysOfShop returns the shop\'s lay-by IDs', async function () {
      const d = futureDate();
      const customerAddr = await customer.getAddress();
      await layby.connect(shop).createLayBy(customerAddr, 'A', ONE_AVAX, d, 0);
      const shopAddr = await shop.getAddress();
      const ids = await layby.layBysOfShop(shopAddr);
      expect(ids.length).to.equal(1);
    });

    it('feeIfCancelled returns correct fee capped at amount paid', async function () {
      const tx  = await layby.connect(shop).createLayBy(customer, 'Item', ONE_AVAX, futureDate(), FEE_BPS);
      const r   = await tx.wait();
      const log = r.logs.map(l => { try { return layby.interface.parseLog(l); } catch { return null; } }).find(e => e?.name === 'LayByCreated');
      const id  = log.args.id;

      // No payment yet – fee is capped at 0 (paid = 0)
      expect(await layby.feeIfCancelled(id)).to.equal(0n);

      // After paying, fee = price * feeBps / 10000
      await layby.connect(customer).pay(id, { value: ONE_AVAX });
      const expected = ONE_AVAX * BigInt(FEE_BPS) / 10000n;
      expect(await layby.feeIfCancelled(id)).to.equal(expected);
    });
  });
});
