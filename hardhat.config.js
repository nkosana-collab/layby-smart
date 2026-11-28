import 'dotenv/config';
import { defineConfig } from 'hardhat/config';

export default defineConfig({
  plugins: [{ id: 'hardhat-ethers', npmPackage: '@nomicfoundation/hardhat-ethers' }],
  solidity: '0.8.20',
  networks: {
    localhost: {
      type: 'http',
      url: process.env.RPC_URL || 'http://127.0.0.1:8545',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : undefined,
    },
    fuji: {
      type: 'http',
      url: process.env.FUJI_RPC_URL || 'https://avax-fuji.g.alchemy.com/v2/OUmAO0aMObyuVwZEYB4Cb',
      chainId: 43113,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : undefined,
      gasPrice: 25000000000,
    },
  },
});
