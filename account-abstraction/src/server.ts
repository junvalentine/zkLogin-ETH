// server.ts
import express from 'express';
import cors from 'cors';
import { ethers } from 'hardhat';
import { BigNumber } from 'ethers';
import { WalletContractFactory__factory } from '../typechain';

const app = express();
const port = 3001;

// Configure middleware
app.use(cors());
app.use(express.json());

// Connect to contracts
const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
const signer = provider.getSigner();
const factoryAddress = "0xFc14f760c3feC311D9Cf53313417Eab9d7F58bA5";
const factory = WalletContractFactory__factory.connect(factoryAddress, signer);

// Check if address has deployed code
async function isDeployed(address: string): Promise<boolean> {
  const code = await provider.getCode(address);
  return code !== '0x';
}

// Simple endpoint to deploy a wallet
app.post('/deploy', async (req, res) => {
  try {
    const { ownerAddr, salt } = req.body;
    
    if (!ownerAddr || !salt) {
      return res.status(400).json({ success: false, error: 'Missing ownerAddr or salt' });
    }
    
    const saltBN = BigNumber.from(salt);
    const walletAddress = await factory.getAddress(ownerAddr, saltBN);
    
    const isWalletDeployed = await isDeployed(walletAddress);
    if (!isWalletDeployed) {
      console.log(`Deploying wallet for ${ownerAddr} with salt ${salt}...`);
      const tx = await factory.createAccount(ownerAddr, saltBN);
      await tx.wait();
      console.log(`Wallet deployed at ${walletAddress}`);
    } else {
      console.log(`Wallet already deployed at ${walletAddress}`);
    }
    
    return res.json({
      success: true,
      walletAddress,
      isNewlyDeployed: !isWalletDeployed
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Wallet deployment server running at http://localhost:${port}`);
});