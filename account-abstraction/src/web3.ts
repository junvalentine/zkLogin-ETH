// deploy-wallet.ts
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

// Import ABIs directly from JSON files
const EntryPointABI = JSON.parse(fs.readFileSync(path.join(__dirname, '../artifacts/contracts/core/EntryPoint.sol/EntryPoint.json'), 'utf8')).abi;
const FactoryABI = JSON.parse(fs.readFileSync(path.join(__dirname, '../artifacts/contracts/samples/WalletContractFactory.sol/WalletContractFactory.json'), 'utf8')).abi;

// Setup provider and signer
const provider = new ethers.providers.JsonRpcProvider('http://0.0.0.0:8545');
const signer = provider.getSigner();

// Contract addresses
const entryPointAddress = "0x0000000071727De22E5E9d8BAf0edAc6f37da032";
const factoryAddress = "0xFc14f760c3feC311D9Cf53313417Eab9d7F58bA5";

// Connect to contracts
const entryPoint = new ethers.Contract(entryPointAddress, EntryPointABI, signer);
const factory = new ethers.Contract(factoryAddress, FactoryABI, signer);

// Check if an address has deployed code
async function isDeployed(address: string): Promise<boolean> {
  const code = await provider.getCode(address);
  return code !== '0x';
}

// Function to deploy a wallet for a given owner address and salt
export async function deployWallet(ownerAddr: string, salt: ethers.BigNumber): Promise<string> {
  // Get counterfactual address
  const walletAddress = await factory.getAddress(ownerAddr, salt);
  console.log(`Wallet address will be: ${walletAddress}`);
  
  // Check if already deployed
  const isWalletDeployed = await isDeployed(walletAddress);
  if (!isWalletDeployed) {
    console.log('Wallet not deployed. Deploying now...');
    const tx = await factory.createAccount(ownerAddr, salt);
    console.log(`Transaction hash: ${tx.hash}`);
    await tx.wait();
    console.log('Wallet deployed successfully');
  } else {
    console.log('Wallet already deployed');
  }
  
  return walletAddress;
}

// Main execution
async function main() {
  try {
    // Use provided address and salt or defaults
    const ownerAddr = process.env.OWNER_ADDRESS || "0xdFe5C8310696f7b1018D3b0cC2b5f2B96eBf17Fa";
    const saltStr = process.env.SALT || "10403319527500853175486048825814520397993154997605732805524347897534756194923";
    const salt = ethers.BigNumber.from(saltStr);
    
    console.log(`Using owner address: ${ownerAddr}`);
    console.log(`Using salt: ${salt.toString()}`);
    
    // Deploy the wallet
    const walletAddress = await deployWallet(ownerAddr, salt);
    
    // Get final wallet balance
    const balance = await provider.getBalance(walletAddress);
    console.log(`Wallet balance: ${ethers.utils.formatEther(balance)} ETH`);
    
    return walletAddress;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// Run the script
main()
  .then(address => {
    console.log(`\nSuccessfully deployed wallet at: ${address}`);
    process.exit(0);
  })
  .catch(error => {
    console.error(`\nDeployment failed: ${error}`);
    process.exit(1);
  });