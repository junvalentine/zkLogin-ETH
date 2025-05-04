/// <reference path="./types/declarations.d.ts"/>

import axios from 'axios';
import { ethers } from 'ethers';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import { exit } from 'process';
import * as crypto from 'crypto-js';
import { F1Field, Scalar } from "ffjavascript";
import * as circomlibjs from "circomlibjs";
import { exec } from 'child_process';
import * as http from 'http';
import { URL } from 'url';
import { promises } from 'dns';

interface OAuthProvider {
  id: string;
  name: string;
  icon: string;
  color: string;
}

// Configuration
const p: string = "21888242871839275222246405745257275088548364400416034343698204186575808495617";
const Fr = new F1Field(Scalar.fromString(p));
const r = "3659223378583281288382466761057059667531020964863187428997366717821886225150"; // Random number for Poseidon using F1Field instance

const SERVER_URL = 'http://localhost:3001';
const salt = "15312324828406009709813974727844425265238503524289951805375643942590854933508";
const RECEIVER_ADDRESS = "0x64137119737515Ca3463f42aCC29356a1aadb873"; // Example address
const TRANSFER_AMOUNT = "0.01"; // ETH
const wallet = JSON.parse(fs.readFileSync(path.join(__dirname, 'wallet.json'), 'utf-8'));
const VITE_GOOGLE_CLIENT_ID = "321294619776-fo492d5rebkgg4vltbvq2sreqa2kqa13.apps.googleusercontent.com"
const VITE_ZK_API_URL = "http://34.80.24.2:3000"
const redirect_uri = `http://localhost:8080/oauth-callback`;
const expiryTime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const sessionKeys = JSON.parse(fs.readFileSync(path.join(__dirname, 'sessionKeys.json'), 'utf-8'));
const idtoken = fs.readFileSync(path.join(__dirname, 'idtoken.txt'), 'utf-8').trim();


const generateSessionKeypair = () => {
    // Generate a cryptographically secure random session secret key (32 bytes)
    // Remove '0x' prefix and 04 for uncompressed key
    const publicKey = wallet.signingKey.publicKey.slice(4); 
    return {
    ss_pk: publicKey,
    ss_sk: wallet.privateKey, // Secret key (private key)
    };
};

async function getWalletAddr(ownerAddr: string, salt: string) {
    try {
        console.log('Sending owneraddr and salt to deploy endpoint...'); // Updated log message
        
        const response = await axios.post('http://localhost:3001/deploy', {
        ownerAddr,
        salt
        }, {
        headers: {
            'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 seconds
        });
        
        if (response.data.success) {
        return response.data.walletAddress; // Fixed: return wallet_address, not zkaddr_salt
        } else {
        console.error('wallet addr calculation failed:', response.data.error);
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

async function calculateZkAddrSaltFromServer(jwt: string, salt: string | number) {
    try {
      console.log('Sending JWT and salt to zkaddr_salt endpoint...');
      
      const response = await axios.post('http://localhost:3001/zkaddr_salt', {
        jwt,
        salt
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 seconds
      });
      
      if (response.data.success) {
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

const generateWalletFromToken = async (token: string, salt: string): Promise<string> => {    
    try {
      const zkaddr_salt = await calculateZkAddrSaltFromServer(token, salt);
      const walletdata = wallet;
      const identityHash = await getWalletAddr(walletdata.address, zkaddr_salt);
      
      console.log("Secure identity created successfully");
      console.log("Wallet address:", identityHash);
      return identityHash;
    } catch (error) {
      console.error("Error generating identity from token:", error);
      throw error;
    }
  };


const loadBalance = async (walletAddress:string) => {
    try {
      
      const response = await axios.post('http://localhost:3001/balance', {
        walletAddress
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 seconds
      });
      
      if (response.data.success) {
        const balanceInEth = parseFloat(response.data.balance);
        return balanceInEth;
      } else {
        console.error('Failed to load balance:', response.data.error);
      }
    } catch (error) {
      console.error("Error loading balance:", error);        
    }
  };




interface CircuitInput {
    pubOPModulus: string[];  // Modulus chunks
    expiryTime: string;      // Expiry time
    pubUser: string[];       // Public user data chunks
    jwt: string[];           // JWT bytes
    jwtHeader: string[];     // JWT header
    jwtPayload: string[];    // JWT payload
    salt: string;            // Salt
    r: string;               // Random value
    signature: string[];     // Signature chunks
    nonceKeyStartIndex: string;
    nonceLength: string;
    subKeyStartIndex: string;
    subLength: string;
    issKeyStartIndex: string;
    issLength: string;
    audKeyStartIndex: string;
    audLength: string;
  }


  interface ProofData {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
    protocol: string;
  }

interface Proof {
    proof: ProofData;
    publicSignals: string[];
    expiresAt?: number;
    createdAt?: number;
}

  
  interface ProofResponse {
    success: boolean;
    proof: ProofData | null;
    publicSignals: string[] | null;
    expiresAt?: number;
    createdAt?: number;
    error?: string;
  }
  
  interface JWTFieldInfo {
    startIndex: number;
    length: number;
    value: string;
  }
  
  interface JWTFields {
    nonce: JWTFieldInfo;
    sub: JWTFieldInfo;
    aud: JWTFieldInfo;
    iss: JWTFieldInfo;
  }

  const base64UrlToBase64 = (base64url: string): string => {
    // Convert base64url to standard base64
    let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    while (base64.length % 4) {
      base64 += '=';
    }
    return base64;
  };

  const prepareCircuitInput = async (
    idToken: string, 
    expiryTime: string,
    salt: string,
    r: string,
    sessionKeys: { ss_pk: string; ss_sk: string; }
  ): Promise<CircuitInput> => {
  
    // Process JWT for circuit input
    const jwtParts = idToken.split('.');
    idToken = jwtParts[0] + '.' + jwtParts[1];
    const jwtHeader = jwtParts[0] + '.';
    const jwtPayload = jwtParts[1];
    const jwtSignature = jwtParts[2];
    const jwtBytes = Array.from(idToken).map(char => char.charCodeAt(0).toString());
    const maxJWTLen = 1536;
    while (jwtBytes.length < maxJWTLen) {
      jwtBytes.push("0");
    }
  
    // Split public key into 4 chunks of 16 bytes (32 hex chars each)
    const publicKey = sessionKeys.ss_pk;
  
    const pubChunks: bigint[] = [];
    for (let i = 0; i < 4; i++) {
      const start = i * 32;
      const chunk = publicKey.slice(start, start + 32);
      pubChunks.push(BigInt('0x' + chunk));
    }
  
    // Process header
    const jwtH = Array.from(jwtHeader).map(char => char.charCodeAt(0).toString());
    const maxJWTHeaderLen = 300;
    while (jwtH.length < maxJWTHeaderLen) {
      jwtH.push("0");
    }
    
    // Process payload
    const jwtP = Array.from(jwtPayload).map(char => char.charCodeAt(0).toString());
    const maxJWTPayloadLen = 1472;
    while (jwtP.length < maxJWTPayloadLen) {
      jwtP.push("0");
    }
  
    // Process signature by converting base64url to binary
    // Process signature by converting base64url to binary
    const standardBase64 = base64UrlToBase64(jwtSignature);
    const rawSignature = Buffer.from(standardBase64, 'base64');
  
    // Convert signature to integer (big-endian byte array to BigInt)
    let signatureInt = BigInt('0x' + rawSignature.toString('hex'));
  
    // Split into 32 chunks of 64 bits each (little-endian)
    const signatureChunks: string[] = [];
    const mask = BigInt('0xFFFFFFFFFFFFFFFF'); // 64-bit mask
    for (let i = 0; i < 32; i++) {
      const chunk = (signatureInt & mask).toString(); // Extract lowest 64 bits as string
      signatureChunks.push(chunk);
      signatureInt = signatureInt >> BigInt(64); // Shift right by 64 bits
    }
  
    // Check the JWT payload
    const decodedPayload = JSON.parse(Buffer.from(base64UrlToBase64(jwtPayload), 'base64').toString());
  
    // Use the helper function to get the matching key
    const modulusChunks = await fetchRSAKeyFromJWT(idToken);
  
    // Extract field information
    const fieldInfo = extractJWTFields(jwtPayload);
    const nonceKeyStartIndex = fieldInfo.nonce.startIndex;
    const nonceLength = fieldInfo.nonce.length;
  
    const subKeyStartIndex = fieldInfo.sub.startIndex;
    const subLength = fieldInfo.sub.length;
  
    const audKeyStartIndex = fieldInfo.aud.startIndex;
    const audLength = fieldInfo.aud.length;
  
    const issKeyStartIndex = fieldInfo.iss.startIndex;
    const issLength = fieldInfo.iss.length;
    
    return {
      pubOPModulus: modulusChunks,
      expiryTime,
      pubUser: pubChunks.map(chunk => chunk.toString()),
      jwt: jwtBytes,
      jwtHeader: jwtH,
      jwtPayload: jwtP,
      salt,
      r,
      signature: signatureChunks,
      nonceKeyStartIndex: nonceKeyStartIndex.toString(),
      nonceLength: nonceLength.toString(),
      subKeyStartIndex: subKeyStartIndex.toString(),
      subLength: subLength.toString(),
      issKeyStartIndex: issKeyStartIndex.toString(),
      issLength: issLength.toString(),
      audKeyStartIndex: audKeyStartIndex.toString(),
      audLength: audLength.toString(),
    };
  };
  
  async function fetchRSAKeyFromJWT(jwt: string): Promise<string[]> {
    // Extract JWT parts
    const jwtParts = jwt.split('.');
  
    // Extract kid from JWT header
    const decodedHeader = JSON.parse(Buffer.from(base64UrlToBase64(jwtParts[0]), 'base64').toString());
    const kid = decodedHeader.kid;
  
    // Fetch Google's public keys
    const googleCertsResponse = await axios.get('https://www.googleapis.com/oauth2/v3/certs');
    const googleCerts = googleCertsResponse.data;
  
    // Find the matching certificate using kid
    interface GoogleKeyInfo {
      kid: string;
      n: string;
      n_int?: bigint;
      [key: string]: any;
    }
  
    const matchingKey = googleCerts.keys.find((key: GoogleKeyInfo) => key.kid === kid);
    if (!matchingKey) {
      throw new Error("No matching key found for kid: " + kid);
    }
  
    // Convert modulus (n) from base64url to integer
    const modulusBinary = Buffer.from(base64UrlToBase64(matchingKey.n), 'base64');
    const modulusHex = modulusBinary.toString('hex');
    matchingKey.n_int = BigInt('0x' + modulusHex);
  
    // Split modulus into 32 chunks of 64 bits each (little-endian order)
    const modulusChunks: string[] = [];
    const mask = BigInt('0xFFFFFFFFFFFFFFFF'); // 64-bit mask
    let n = matchingKey.n_int;
  
    for (let i = 0; i < 32; i++) {
      const chunk = (n & mask).toString(); // Extract lowest 64 bits as string
      modulusChunks.push(chunk);
      n = n >> BigInt(64); // Shift right by 64 bits
    }
    return modulusChunks;
  }
  
  function extractJWTFields(jwtPayload: string): JWTFields {
    // Get the raw decoded payload as Buffer
    const decodedPayloadBuffer = Buffer.from(base64UrlToBase64(jwtPayload), 'base64');
    const payloadAsString = decodedPayloadBuffer.toString();
  
    // Helper function to extract field information
    const extractField = (fieldName: string): JWTFieldInfo => {
      const fieldIndex = payloadAsString.indexOf(`"${fieldName}"`);
  
      const valueStart = payloadAsString.indexOf(':', fieldIndex) + 1;
      // Skip whitespace
      let adjustedStart = valueStart;
      while (payloadAsString[adjustedStart] === ' ') adjustedStart++;
      // Check if value is in quotes
      const isQuoted = payloadAsString[adjustedStart] === '"';
      const realStart = isQuoted ? adjustedStart + 1 : adjustedStart;
      // Find end of value
      let valueEnd = isQuoted ?
        payloadAsString.indexOf('"', realStart) :
        payloadAsString.indexOf(',', adjustedStart);
      if (valueEnd === -1) {
        valueEnd = payloadAsString.indexOf('}', adjustedStart);
      }
      const value = payloadAsString.substring(realStart, valueEnd);
  
      return {
        startIndex: fieldIndex, // +1 to skip the initial quote of field name
        length: value.length,
        value: value
      };
    };
  
    // Extract information for each field
    const nonceInfo = extractField('nonce');
    const subInfo = extractField('sub');
    const audInfo = extractField('aud');
    const issInfo = extractField('iss');
  
    // Log the information
    return {
      nonce: nonceInfo,
      sub: subInfo,
      aud: audInfo,
      iss: issInfo
    };
  }


  const getProofSize = (proof: ProofData, publicSignals: string[]): { 
    sizeInBytes: number, 
    details: { proofBytes: number, signalsBytes: number } 
  } => {
    // Convert proof to JSON string to measure actual serialized size
    const proofJson = JSON.stringify(proof);
    const signalsJson = JSON.stringify(publicSignals);
    
    // Calculate sizes
    const proofBytes = Buffer.from(proofJson).length;
    const signalsBytes = Buffer.from(signalsJson).length;
    
    return {
      sizeInBytes: proofBytes + signalsBytes,
      details: {
        proofBytes,
        signalsBytes
      }
    };
  };


const generateZKProof = async (input: CircuitInput): Promise<ProofResponse> => {
    try {
      const apiUrl = VITE_ZK_API_URL;
      
      console.time("ZkProof Generation Time");
      // Call the API endpoint to generate and verify proof
      const response = await axios.post(
        `${apiUrl}/generate-proof`, input,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 300000 // 60 seconds timeout for proof generation
        }
      );
      console.timeEnd("ZkProof Generation Time");

      if (response.status !== 200) {
        console.error("Error response from ZKP service:", response.data);
        return {
          success: false,
          proof: null,
          publicSignals: null,
          error: response.data.message || "Failed to generate proof"
        };
      }
      
      return {
        success: true,
        proof: {
          ...response.data.proof,
        },
        publicSignals: response.data.publicSignals,
        expiresAt: response.data.expiresAt || (Date.now() + 24 * 60 * 60 * 1000),
        createdAt: response.data.createdAt || Date.now(),
      };
    } catch (error) {
      console.error("ZK proof generation error:", error);
      
      // Provide more specific error message based on the error type
      let errorMessage = "Failed to generate zero-knowledge proof";
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          errorMessage = "Proof generation timed out. Please try again.";
        } else if (error.response) {
          // Server returned an error response
          errorMessage = error.response.data?.message || 
                        `Server error: ${error.response.status}`;
        } else if (error.request) {
          // Request was made but no response received
          errorMessage = "No response from server. Check your connection.";
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        proof: null,
        publicSignals: null,
        error: errorMessage
      };
    }
  };

  const handleGetCoins = async (walletAddress:string) => {
    try {
      // Request ETH from the faucet
      const response = await axios.post('http://localhost:3001/faucet', {
        address: walletAddress
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 seconds
      });
      
      if (response.data.success) {
        console.log(`Received ${response.data.amount} from faucet`);
        
        // Refresh balance after successful faucet request
        const balanceResponse = await axios.post('http://localhost:3001/balance', {
          walletAddress
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (balanceResponse.data.success) {
          const newBalance = parseFloat(balanceResponse.data.balance);
          console.log(`New balance: ${newBalance} ETH`);
        }
      } else {
        console.error("Failed to receive funds from faucet");
      }
    } catch (error) {
      console.error("Faucet error:", error);
    }
  };

  const handleSendTransaction = async (walletAddress:string, sendAmount:string, recipientAddress:string, currentProof:Proof) => {
      
    try {
      // Call the backend to send the transaction

      const bytes = crypto.AES.decrypt(sessionKeys.ss_sk_enc, sessionKeys.ss_pk);
      const privkey = bytes.toString(crypto.enc.Utf8);

      const zkProofData = currentProof.proof;
      const publicData = currentProof.publicSignals;

      const proofSize = getProofSize(zkProofData, publicData);
      console.log(`ZK Proof Size: ${proofSize.sizeInBytes} bytes (${(proofSize.sizeInBytes / 1024).toFixed(2)} KB)`);
      console.log(`  - Proof: ${proofSize.details.proofBytes} bytes`);
      console.log(`  - Public Signals: ${proofSize.details.signalsBytes} bytes`);


      console.log("Sending transaction...");
      
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

      const response = await axios.post('http://localhost:3001/sendTransaction', {
        walletAddress, 
        privkey,
        destinationAddress: recipientAddress, 
        amount: sendAmount, 
        zkProof
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 seconds
      });
      
      if (response.data.success) {
        console.timeEnd("Transaction Execution Time");
        console.log(`Successfully sent ${sendAmount} ETH to ${recipientAddress.substring(0, 6)}...${recipientAddress.substring(38)}`);
        
        // Refresh balance after transaction
        const balanceResponse = await axios.post('http://localhost:3001/balance', {
          walletAddress
        });
        
        if (balanceResponse.data.success) {
          const newBalance = parseFloat(balanceResponse.data.balance);
          console.log(`New balance: ${newBalance} ETH`);
        }

      } else {
        console.error("Transaction failed: " + (response.data.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Transaction error:", error);
      if (axios.isAxiosError(error) && error.response) {
        console.error(error.response.data.error || "Network error");
      } else {
        console.error("Failed to send transaction");
      }
    }
  };

// Wrap all the code that uses top-level await in an async IIFE
(async function main() {
  try {
    const walletAddress = await generateWalletFromToken(idtoken, salt.toString());
    
    const balance = await loadBalance(walletAddress);
    console.log(`Wallet balance: ${balance} ETH`);
    
    const input = await prepareCircuitInput(
      idtoken, 
      expiryTime.toString(),
      salt.toString(),
      r.toString(),
      sessionKeys
    );
    
    const { success, proof, publicSignals, expiresAt, createdAt, error } = await generateZKProof(input);
    
    const completeProofData = {
      proof: proof || { pi_a: [], pi_b: [[]], pi_c: [], protocol: '' },
      publicSignals: publicSignals || [],
      expiresAt: expiresAt,
      createdAt: createdAt,
    };
    console.log("Generated proof successfully!"); 
    console.log("Retrieving coins from faucet...");
    await handleGetCoins(walletAddress);

    console.time("Transaction Execution Time");
    await handleSendTransaction(walletAddress, TRANSFER_AMOUNT, RECEIVER_ADDRESS, completeProofData);

  } catch (error) {
    console.error("Error in main execution:", error);
    process.exit(1);
  }
})().catch(console.error);


