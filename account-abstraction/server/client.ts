// client.ts
import axios from 'axios';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { Wallet } from 'ethers';

const SERVER_URL = 'http://0.0.0.0:3001';

async function deployWallet(ownerAddr: string, salt: string) {
  try {
    
    const response = await axios.post(`${SERVER_URL}/deploy`, {
      ownerAddr,
      salt
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 1 minute
    });
    
    if (response.data.success) {
      return response.data;
    } else {
      throw new Error(response.data.error || 'Unknown error');
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Request failed:', error.message);
      if (error.response) {
        console.error('Server response:', error.response.data);
      }
    } else {
      console.error('Error:', error);
    }
    throw error;
  }
}
async function getBalance(address: string) {
  try {
    console.log(`Fetching balance for address: ${address}`);
    
    const response = await axios.post(`${SERVER_URL}/balance`, {
      walletAddress: address // Changed from 'address' to 'walletAddress' to match server expectation
    }, { 
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000 // 15 seconds
    });
    
    if (response.data.success) {
      return response.data;
    } else {
      throw new Error(response.data.error || 'Unknown error');
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Request failed:', error.message);
      if (error.response) {
        console.error('Server response:', error.response.data);
      }
    } else {
      console.error('Error:', error);
    }
    throw error;
  }
}

async function requestFaucet(address: string) {
  try {
    console.log(`Requesting funds from faucet for address: ${address}`);
    
    const response = await axios.post(`${SERVER_URL}/faucet`, {
      address
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 seconds
    });
    
    if (response.data.success) {
      console.log(`Received ${response.data.amount} at ${address}`);
      console.log(`Transaction hash: ${response.data.transactionHash}`);
      return response.data;
    } else {
      throw new Error(response.data.error || 'Unknown error');
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Faucet request failed:', error.message);
      if (error.response) {
        console.error('Server response:', error.response.data);
      }
    } else {
      console.error('Error:', error);
    }
    throw error;
  }
}

async function calculateZkAddrSaltFromServer(jwt: string, salt: string ) {
  try {
    console.log('Sending JWT and salt to zkaddr_salt endpoint...');
    
    const response = await axios.post(`${SERVER_URL}/zkaddr_salt`, {
      jwt,
      salt
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 seconds
    });
    
    if (response.data.success) {
      console.log('zkaddr_salt:', response.data.zkaddr_salt);
      return response.data.zkaddr_salt;
    } else {
      console.error('zkaddr_salt calculation failed:', response.data.error);
      throw new Error(response.data.error || 'Unknown error');
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Request failed:', error.message);
      if (error.response) {
        console.error('Server response:', error.response.data);
      }
    } else {
      console.error('Error:', error);
    }
    throw error;
  }
}
async function sendTransaction(walletAddress: string, privkey: string, destinationAddress: string, amount: string, zkProof?: string) {
  try {
    console.log(`Sending transaction from ${walletAddress} to ${destinationAddress} for ${amount} ETH`);
    
    const response = await axios.post(`${SERVER_URL}/sendTransaction`, {
      walletAddress,
      privkey,
      destinationAddress,
      amount,
      zkProof
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 60 seconds
    });
    
    if (response.data.success) {
      console.log(`Transaction sent successfully!`);
      console.log(`Sent ${response.data.transferAmount} ETH from ${response.data.from} to ${response.data.to}`);
      return response.data;
    } else {
      throw new Error(response.data.error || 'Unknown error');
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Transaction request failed:', error.message);
      if (error.response) {
        console.error('Server response:', error.response.data);
      }
    } else {
      console.error('Error:', error);
    }
    throw error;
  }
}

// Example usage with random address and salt
const privkey="0x5fe7f977e71dba2ea1a68e21057beebb9be2ac30c6410aa38d4f3fbe41dcffd2";
const wallet = new Wallet(privkey);
const ownerAddr = wallet.address;
console.log('Owner address:', ownerAddr);
const salt = "10403319527500853175486048825814520397993154997605732805524347897534756194923";
deployWallet(ownerAddr, salt)
  .then((result) => {
    console.log('Wallet deployment result:', result);
    const walletAddress = result.walletAddress;
    console.log('Deployed wallet address:', walletAddress);
    
    // First get the initial balance
    return getBalance(walletAddress)
      .then((balanceResult) => {
        console.log('Initial balance:', balanceResult.balance);
        
        // Request funds from faucet
        return requestFaucet(walletAddress)
          .then((faucetResult) => {
            console.log('Faucet result:', faucetResult);
            
            // Get the updated balance after faucet
            return getBalance(walletAddress)
              .then((updatedBalanceResult) => {
                console.log('Updated balance after faucet:', updatedBalanceResult.balance);
                
                // Read and parse the zkProof data
                const zkProofData = JSON.parse(fs.readFileSync('test/zklogin/proof.json', 'utf8'));
                const publicData = JSON.parse(fs.readFileSync('test/zklogin/public.json', 'utf8'));
                
                // Format the proof data
                const zkProof = {
                  pA: zkProofData.pi_a.slice(0, 2).map((x: any) => x.toString()),
                  pB: [
                    [zkProofData.pi_b[0][1].toString(), zkProofData.pi_b[0][0].toString()],
                    [zkProofData.pi_b[1][1].toString(), zkProofData.pi_b[1][0].toString()]
                  ],
                  pC: zkProofData.pi_c.slice(0, 2).map((x: any) => x.toString()),
                  pubSignals: publicData.map((x: any) => x.toString())
                };
                
                // Random recipient address
                const randomRecipient = "0x" + crypto.randomBytes(20).toString('hex');
                const transferAmount = "0.55"; // amount to transfer in ETH
                // Send transaction using the wallet
                
                return sendTransaction(
                  walletAddress, 
                  privkey, 
                  randomRecipient, 
                  transferAmount, 
                  JSON.stringify(zkProof)
                ).then((txResult) => {
                  console.log('Transaction result:', txResult);

                  // Get final balance after transaction
                  return getBalance(walletAddress)
                    .then((finalBalanceResult) => {
                      console.log('Final balance after transaction:', finalBalanceResult.balance);
                      return finalBalanceResult;
                    });
                });
              });
          });
      });
  })
  .catch((error) => {
    console.error('Error during wallet operations:', error);
  });




