// scripts/e2e-targeted-fix.ts
import { ethers } from 'hardhat';
import { fillUserOpDefaults, signUserOpWithZkProof, packUserOp } from '../test/zklogin/UserOp';
import { createAccountOwner, isDeployed } from '../test/zklogin/testutils';
import { 
  EntryPoint__factory, 
  WalletContractFactory__factory, 
  WalletContract__factory 
} from '../typechain';
import fs from 'fs';
import { BigNumber } from 'ethers';
const { exec } = require('child_process');

async function main() {
  console.log("Starting targeted fix script...");
  
  // Get the network and provider
  const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
  const signer = provider.getSigner();
  const signerAddress = await signer.getAddress();
  const chainId = await provider.getNetwork().then(net => net.chainId);
  console.log(`Connected to local network with chainId: ${chainId}`);
  
  // Known contract addresses - replace with your actual addresses
  const entryPointAddress = "0x0000000071727De22E5E9d8BAf0edAc6f37da032";
  const factoryAddress = "0xFc14f760c3feC311D9Cf53313417Eab9d7F58bA5";
  
  // Connect to existing contracts
  const entryPoint = EntryPoint__factory.connect(entryPointAddress, signer);
  const factory = WalletContractFactory__factory.connect(factoryAddress, signer);
  
  console.log(`Using EntryPoint at: ${entryPointAddress}`);
  console.log(`Using WalletContractFactory at: ${factoryAddress}`);
  
  // 1. Use existing account and keys
  const accountOwner = createAccountOwner();
  const ownerAddr = accountOwner.address;
  console.log(`Using account owner: ${ownerAddr}`);
  
  // get Proof main.ts (using client code)


  // 2. Read ZK proof data
  const zkProofData = JSON.parse(fs.readFileSync('test/zklogin/proof.json', 'utf8'));
  const publicData = JSON.parse(fs.readFileSync('test/zklogin/public.json', 'utf8'));
  
  // Format the proof data
  const zkProof = {
    pA: zkProofData.pi_a.slice(0, 2).map(BigInt),
    pB: [
      [BigInt(zkProofData.pi_b[0][1]), BigInt(zkProofData.pi_b[0][0])],
      [BigInt(zkProofData.pi_b[1][1]), BigInt(zkProofData.pi_b[1][0])]
    ],
    pC: zkProofData.pi_c.slice(0, 2).map(BigInt),
    pubSignals: publicData.map(BigInt)
  };
  
  // 3. Get salt from proof
  const salt = BigNumber.from(publicData[1]);
  console.log(`Using salt from proof: ${salt.toString()}`);
  
  // 4. Calculate wallet address (show this address to the user)
  const walletAddress = await factory.getAddress(ownerAddr, salt);
  console.log(`Wallet address: ${walletAddress}`);
  
  // 5. Check if the wallet is already deployed
  const isWalletDeployed = await isDeployed(walletAddress);
  if (!isWalletDeployed) {
    console.log("Wallet not deployed. Deploying now...");
    const tx = await factory.createAccount(ownerAddr, salt);
    await tx.wait();
    console.log("Wallet deployed");
  } else {
    console.log("Wallet already deployed");
  }
  
  // 6. Ensure the wallet has enough ETH
  const walletBalance = await provider.getBalance(walletAddress);
  console.log(`Wallet balance: ${ethers.utils.formatEther(walletBalance)} ETH`);
  
  const requiredBalance = ethers.utils.parseEther("0.5"); // 0.5 ETH
  if (walletBalance.lt(requiredBalance)) {
    console.log(`Funding wallet with ${ethers.utils.formatEther(requiredBalance.sub(walletBalance))} ETH`);
    const fundTx = await signer.sendTransaction({
      to: walletAddress,
      value: requiredBalance.sub(walletBalance)
    });
    await fundTx.wait();
    console.log("Wallet funded");
  }
  
  // 7. Ensure EntryPoint has a deposit for this wallet
  const entryPointDeposit = await entryPoint.balanceOf(walletAddress);
  console.log(`EntryPoint deposit: ${ethers.utils.formatEther(entryPointDeposit)} ETH`);
  
  const requiredDeposit = ethers.utils.parseEther("0.1"); // 0.1 ETH
  if (entryPointDeposit.lt(requiredDeposit)) {
    console.log(`Adding ${ethers.utils.formatEther(requiredDeposit.sub(entryPointDeposit))} ETH to EntryPoint deposit`);
    const depositTx = await entryPoint.depositTo(walletAddress, {
      value: requiredDeposit.sub(entryPointDeposit)
    });
    await depositTx.wait();
    console.log("Deposit added");
  }
  
  // 8. Connect to the deployed wallet
  const wallet = WalletContract__factory.connect(walletAddress, signer);
  
  // 9. Verify wallet owner (sanity check)
  try {
    const walletOwner = await wallet.owner();
    console.log(`Wallet owner: ${walletOwner}`);
    if (walletOwner.toLowerCase() !== ownerAddr.toLowerCase()) {
      console.error(`ERROR: Wallet owner mismatch! Expected: ${ownerAddr}, Actual: ${walletOwner}`);
      return;
    }
  } catch (error) {
    console.error("Error checking wallet owner:", error);
  }
  
  // 10. Prepare a simple ETH transfer
  const destinationAddress = ethers.Wallet.createRandom().address;
  console.log(`Destination address: ${destinationAddress}`);
  
  // Create minimal calldata - just a simple transfer
  const transferAmount = ethers.utils.parseEther("0.01"); // 0.01 ETH
  const callData = wallet.interface.encodeFunctionData('execute', [
    destinationAddress,
    transferAmount,
    "0x" // No additional calldata needed for simple ETH transfer
  ]);
  
  // 11. Get wallet nonce
  const nonce = await entryPoint.getNonce(walletAddress, 1);
  console.log(`Wallet nonce: ${nonce.toString()}`);
  
  // 12. Create UserOp with minimal parameters, being explicit about gas limits
  let userOp = {
    sender: walletAddress,
    nonce: nonce,
    initCode: "0x", // Empty since wallet is already deployed
    callData: callData,
    callGasLimit: BigNumber.from(200000),    // Simple ETH transfer should need much less
    verificationGasLimit: BigNumber.from(1000000), // Verification with ZK could be expensive
    preVerificationGas: BigNumber.from(50000),  // Standard preVerificationGas
    maxFeePerGas: BigNumber.from(ethers.utils.parseUnits("30", "gwei")),
    maxPriorityFeePerGas: BigNumber.from(ethers.utils.parseUnits("5", "gwei")),
    paymasterAndData: "0x", // No paymaster
    signature: "0x" // Will be filled by signUserOpWithZkProof
  };
  
  // 13. Fill in any other defaults
  userOp = fillUserOpDefaults(userOp);
  
  // 14. Sign the UserOp with ZK proof
  console.log("Signing UserOp with ZK proof...");
  try {
    userOp = signUserOpWithZkProof(
      userOp,
      accountOwner,
      entryPointAddress,
      chainId,
      zkProof
    );
    console.log("UserOp signed successfully");
  } catch (error) {
    console.error("Error signing UserOp:", error);
    throw error;
  }
  
  // Format the UserOp in the format expected by the bundler
  const bundlerUserOp = {
    sender: userOp.sender,
    nonce: userOp.nonce.toString(),
    initCode: userOp.initCode,
    callData: userOp.callData,
    callGasLimit: userOp.callGasLimit.toString(),
    verificationGasLimit: userOp.verificationGasLimit.toString(),
    preVerificationGas: userOp.preVerificationGas.toString(),
    maxFeePerGas: userOp.maxFeePerGas.toString(),
    maxPriorityFeePerGas: userOp.maxPriorityFeePerGas.toString(),
    paymasterAndData: userOp.paymasterAndData,
    signature: userOp.signature
  };
  
  // Create the JSON-RPC request payload
  const bundlerPayload = {
    jsonrpc: "2.0",
    // method: "eth_estimateUserOperationGas",
    method: "eth_sendUserOperation",
    params: [bundlerUserOp, entryPointAddress],
    id: 123
  };
  
  // Use curl to send the request to the bundler
  const bundlerUrl = "http://0.0.0.0:14337/rpc";
  
  const curlCommand = `curl --request POST --url ${bundlerUrl} --header 'Content-Type: application/json' --data '${JSON.stringify(bundlerPayload)}'`;
  
  console.log("Sending UserOp to bundler...");
  console.log(`Sending request to bundler at ${bundlerUrl}`);
  
  try {
    const { stdout, stderr } = await new Promise((resolve, reject) => {
      exec(curlCommand, (error, stdout, stderr) => {
        if (error) reject(error);
        else resolve({ stdout, stderr });
      });
    });
    
    if (stderr) console.warn(`Bundler stderr: ${stderr}`);
    console.log(`Bundler response: ${stdout}`);
  } catch (execError) {
    console.error(`Request failed: ${execError.message}`);
  }
  // Parse the bundler response to get the UserOp hash
  const bundlerResponse = JSON.parse(stdout);
  const userOpHash = bundlerResponse.result;
  console.log(`UserOp hash: ${userOpHash}`);
  
  // Wait for the transaction to be mined
  console.log("Waiting for transaction to be mined...");
  await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
  
  // Get UserOp receipt
  const receiptPayload = {
    jsonrpc: "2.0",
    id: 3,
    method: "eth_getUserOperationReceipt",
    params: [userOpHash]
  };
  
  const receiptCommand = `curl --request POST --url ${bundlerUrl} --header 'Content-Type: application/json' --data '${JSON.stringify(receiptPayload)}'`;
  
  try {
    const { stdout: receiptStdout } = await new Promise((resolve, reject) => {
      exec(receiptCommand, (error, stdout, stderr) => {
        if (error) reject(error);
        else resolve({ stdout, stderr });
      });
    });
    
    console.log(`Receipt response: ${receiptStdout}`);
    
    // Log transaction hash if available
    const receipt = JSON.parse(receiptStdout);
    if (receipt.result && receipt.result.receipt) {
      console.log(`Transaction hash: ${receipt.result.receipt.transactionHash}`);
    }
  } catch (error) {
    console.error(`Failed to get receipt: ${error.message}`);
  }
  process.exit(0);
  // 15. Pack the UserOp
  const packedUserOp = packUserOp(userOp);
  // 16. Log a short version of the UserOp for debugging
  
  // 17. Send the UserOp to EntryPoint
  console.log("Sending UserOp to EntryPoint...");
  
  try {
    // Simple estimate of gas needed
    const gasEstimate = await entryPoint.estimateGas.handleOps([packedUserOp], signerAddress);
    console.log(`Gas estimate: ${gasEstimate.toString()}`);
    
    // Add a 20% buffer to gas estimate
    const gasLimit = gasEstimate.mul(120).div(100);
    console.log(`Using gas limit: ${gasLimit.toString()}`);
    
    // Send with specific gas limit
    const tx = await entryPoint.handleOps([packedUserOp], signerAddress, {
      gasLimit: gasLimit
    });
    
    console.log(`Transaction sent: ${tx.hash}`);
    console.log("Waiting for transaction to be mined...");
    
    const receipt = await tx.wait();
    console.log(`Transaction mined, status: ${receipt.status === 1 ? 'SUCCESS' : 'FAILED'}`);
    
    if (receipt.status === 0) {
      console.log("Transaction failed. Details:", receipt);
    } else {
      // Verify the transfer was successful
      const destinationBalance = await provider.getBalance(destinationAddress);
      console.log(`Destination balance: ${ethers.utils.formatEther(destinationBalance)} ETH`);
      
      if (destinationBalance.gte(transferAmount)) {
        console.log("Transfer successful!");
      } else {
        console.log("Transfer may have failed - destination does not have expected balance");
      }
    }
  } catch (error) {
    console.error("Error sending transaction:", error);
    
    if (error.message) {
      console.error("Error message:", error.message);
    }
    
    if (error.error && error.error.message) {
      console.error("Error details:", error.error.message);
    }
    
    throw error;
  }
  
  console.log("Script completed");
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });