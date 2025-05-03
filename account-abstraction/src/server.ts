// server.ts
import express from 'express';
import cors from 'cors';
import { ethers } from 'hardhat';
import { BigNumber } from 'ethers';
import { WalletContractFactory__factory } from '../typechain';
import { buildPoseidon } from "circomlibjs";
import { Buffer } from 'buffer';
import { EntryPoint__factory, WalletContract__factory } from '../typechain';
import { signUserOpWithZkProof, packUserOp } from '../test/zklogin/UserOp';
import { Wallet } from 'ethers';
import fs from 'fs';
import path from 'path';

const app = express();
const port = 3001;

// Configure middleware
app.use(cors());
app.use(express.json());

// Connect to contracts
const provider = new ethers.providers.JsonRpcProvider('http://34.80.24.2:8545');
const signer = provider.getSigner();
const signerAddress =  signer.getAddress();
const factoryAddress = "0xdC914F2dd90DA2f6A9E392cd7A871877C39530AD";
const factory = WalletContractFactory__factory.connect(factoryAddress, signer);

const entryPointAddress = "0x0000000071727De22E5E9d8BAf0edAc6f37da032";
const entryPoint = EntryPoint__factory.connect(entryPointAddress, signer);
const chainId = 31337; // Update with your actual chain ID

// Simple in-memory store for ZK proofs
// For persistence between restarts, we'll use a JSON file
const PROOFS_FILE_PATH = path.join(__dirname, '../data/zkproofs.json');

// Ensure the data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize proofs store
let zkProofsStore: Record<string, any> = {};

// Load existing proofs if available
try {
  if (fs.existsSync(PROOFS_FILE_PATH)) {
    const data = fs.readFileSync(PROOFS_FILE_PATH, 'utf8');
    zkProofsStore = JSON.parse(data);
    console.log('Loaded existing ZK proofs from file');
  }
} catch (error) {
  console.error('Error loading ZK proofs from file:', error);
  // Continue with empty store
}

// Save proofs to file
function saveProofsToFile() {
  try {
    fs.writeFileSync(PROOFS_FILE_PATH, JSON.stringify(zkProofsStore, null, 2));
  } catch (error) {
    console.error('Error saving ZK proofs to file:', error);
  }
}

// API endpoints for ZK proofs management

// Store a ZK proof
app.post('/api/zkproof', async (req, res) => {
  try {
    const { sub, proofData } = req.body;
    
    if (!sub || !proofData) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing sub or proofData in the request body' 
      });
    }
    
    // Store the proof
    zkProofsStore[sub] = proofData;
    
    // Save to file
    saveProofsToFile();
    
    console.log(`Stored proof for sub: ${sub}`);
    
    return res.json({
      success: true,
      message: 'Proof stored successfully'
    });
  } catch (error) {
    console.error('Error storing proof:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get a ZK proof
app.get('/api/zkproof', async (req, res) => {
  try {
    const sub = req.query.sub as string;
    
    if (!sub) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing sub parameter' 
      });
    }
    
    const proofData = zkProofsStore[sub];
    
    if (!proofData) {
      return res.status(404).json({
        success: false,
        error: 'Proof not found for this subject'
      });
    }
    
    return res.json({
      success: true,
      proofData
    });
  } catch (error) {
    console.error('Error retrieving proof:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Delete a ZK proof
app.delete('/api/zkproof', async (req, res) => {
  try {
    const sub = req.query.sub as string;
    
    if (!sub) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing sub parameter' 
      });
    }
    
    // Check if proof exists
    if (!(sub in zkProofsStore)) {
      return res.status(404).json({
        success: false,
        error: 'Proof not found for this subject'
      });
    }
    
    // Delete the proof
    delete zkProofsStore[sub];
    
    // Save to file
    saveProofsToFile();
    
    console.log(`Deleted proof for sub: ${sub}`);
    
    return res.json({
      success: true,
      message: 'Proof deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting proof:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

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
// Get balance endpoint
app.post('/balance', async (req, res) => {
  try {
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ success: false, error: 'Missing walletAddress' });
    }
    
    const balance = await provider.getBalance(walletAddress);
    return res.json({
      success: true,
      balance: ethers.utils.formatEther(balance)
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
})

app.post('/zkaddr_salt', function(req, res) {
  (async () => {
    try {
      const { jwt, salt } = req.body;
      
      if (!jwt || !salt) {
        return res.status(400).json({
          success: false,
          error: 'Missing JWT or salt in request body'
        });
      }

      console.log('Calculating zkaddr_salt...');
      const zkaddr_salt = await calculateZkAddrSalt(jwt, salt);
      
      return res.json({
        success: true,
        zkaddr_salt
      });
    } catch (error) {
      console.error('Error in /zkaddr_salt:', error);
      return res.status(500).json({
        success: false,
        error: 'Calculation failed',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  })().catch(error => {
    console.error('Unhandled promise rejection in /zkaddr_salt:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error', 
      message: error instanceof Error ? error.message : String(error)
    });
  });
});

app.post('/faucet', async (req, res) => {
  try {
    const { address } = req.body;
    
    if (!address) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing address parameter' 
      });
    }

    // Create a transaction to send 1 ETH
    const tx = await signer.sendTransaction({
      to: address,
      value: ethers.utils.parseEther("1.0")
    });
    
    console.log(`Transaction sent: ${tx.hash}`);
    
    // Wait for the transaction to be mined
    const receipt = await tx.wait();
    
    return res.json({
      success: true,
      transactionHash: tx.hash,
      amount: "1.0 ETH",
      recipient: address
    });
    
  } catch (error) {
    console.error('Error in faucet endpoint:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

app.post('/sendTransaction', async (req, res) => {
  try {
    const { walletAddress, privkey, destinationAddress, amount, zkProof } = req.body;
    
    if (!walletAddress || !privkey || !destinationAddress || !amount || !zkProof) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters (walletAddress, privkey, destinationAddress, amount, zkProof)' 
      });
    }

    console.log(`Sending ${amount} ETH from ${walletAddress} to ${destinationAddress}`);
    
    // Check if wallet is deployed
    const isWalletDeployed = await isDeployed(walletAddress);
    if (!isWalletDeployed) {
      return res.status(400).json({ 
        success: false, 
        error: 'Wallet not deployed' 
      });
    }
    
    // Check wallet balance
    const walletBalance = await provider.getBalance(walletAddress);
    console.log(`Wallet balance: ${ethers.utils.formatEther(walletBalance)} ETH`);
    
    const amountStr = amount.toString();
    const transferAmount = ethers.utils.parseEther(amountStr);
    if (walletBalance.lt(transferAmount)) {
      return res.status(400).json({ 
        success: false, 
        error: `Insufficient balance: ${ethers.utils.formatEther(walletBalance)} ETH` 
      });
    }
  
    // Connect to the deployed wallet
    const wallet = WalletContract__factory.connect(walletAddress, signer);
    
    // Create calldata for the transfer
    const callData = wallet.interface.encodeFunctionData('execute', [
      destinationAddress,
      transferAmount,
      "0x" // No additional calldata needed for simple ETH transfer
    ]);
    
    // Get wallet nonce
    const nonce = await entryPoint.getNonce(walletAddress, 1);
    console.log(`Wallet nonce: ${nonce.toString()}`);
    
    // Create UserOp
    let userOp = {
      sender: walletAddress,
      nonce: nonce,
      initCode: "0x", // Empty since wallet is already deployed
      callData: callData,
      callGasLimit: BigNumber.from(200000),
      verificationGasLimit: BigNumber.from(1000000),
      preVerificationGas: BigNumber.from(50000),
      maxFeePerGas: BigNumber.from(ethers.utils.parseUnits("1", "wei")),
      maxPriorityFeePerGas: BigNumber.from(ethers.utils.parseUnits("1", "wei")),
      paymasterAndData: "0x", // No paymaster
      signature: "0x" // Use provided zkProof if available
    };
    
    const accountOwner= new Wallet(privkey);
    console.log(`zkProof: ${zkProof}`);
    
    userOp = signUserOpWithZkProof(
      userOp,
      accountOwner,
      entryPointAddress,
      chainId,
      zkProof
    );

    const packedUserOp = packUserOp(userOp);
    const gasEstimate = await entryPoint.estimateGas.handleOps([packedUserOp], signerAddress);

    const gasLimit = gasEstimate.mul(120).div(100);
    
    // Send with specific gas limit
    const tx = await entryPoint.handleOps([packedUserOp], signerAddress, {
      gasLimit: gasLimit
    });
    const receipt = await tx.wait();
    console.log(`Transaction mined, status: ${receipt.status === 1 ? 'SUCCESS' : 'FAILED'}`);
    return res.json({
      success: true,
      transferAmount: amount,
      from: walletAddress,
      to: destinationAddress
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * Extracts fields from JWT, converts them to required formats, and calculates zkaddr_salt
 * @param jwt The JWT token string
 * @param salt The salt value as a number or string
 * @returns The calculated zkaddr_salt as a string
 */
async function calculateZkAddrSalt(jwt: string, salt: string | number): Promise<string> {
  // Ensure poseidon is initialized
  try {
    // 1. Parse JWT (header.payload.signature)
    const parts = jwt.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    // 2. Decode the payload
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    // 3. Extract and convert sub from string to number
    const sub = payload.sub ? BigInt(payload.sub) : 0n;
    // 4. Extract and convert iss from string to bytes to long (similar to Python)
    const issStr = payload.iss || '';
    let iss = 0n;
    for (let i = 0; i < issStr.length; i++) {
      iss = (iss << 8n) | BigInt(issStr.charCodeAt(i));
    }
    
    // 5. Extract and convert aud from string to bytes to long
    const audStr = payload.aud || '';
    let aud = 0n;
    for (let i = 0; i < audStr.length; i++) {
      aud = (aud << 8n) | BigInt(audStr.charCodeAt(i));
    }
    
    // 6. Convert salt to BigInt
    const saltBigInt = typeof salt === 'string' ? BigInt(salt) : BigInt(salt);
    
    // 7. Calculate poseidon hash
    const poseidon = await buildPoseidon();
    const zkaddr_salt = poseidon.F.toString(poseidon([sub, iss, aud, saltBigInt]));
    return zkaddr_salt;
    
  } catch (error) {
    console.error('Error calculating zkaddr_salt:', error);
    throw error;
  }
}
// Start the server
app.listen(port, () => {
  console.log(`Wallet deployment server running at http://localhost:${port}`);
});