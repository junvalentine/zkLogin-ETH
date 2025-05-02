import * as snarkjs from "snarkjs";
import * as chai from "chai";
import * as path from "path";
import * as circomlibjs from "circomlibjs";
import * as http from 'http';
import * as querystring from 'querystring';
import axios from 'axios';
import * as url from 'url';
import dotenv from 'dotenv';
import { F1Field, Scalar } from "ffjavascript";
import { Wallet } from 'ethers';
import { execSync } from 'child_process';
import { performance } from 'perf_hooks';
const fs = require('fs');

// Dynamic import for the 'open' package
import('open').then((module) => {
  const open = module.default;
});

// Initialize environment variables
dotenv.config({ path: path.join("/home/lehongminh9203/thesis/zkLogin-ETH/zklogin", ".env") });

// Set up field parameters
const p: string = "21888242871839275222246405745257275088548364400416034343698204186575808495617";
const Fr = new F1Field(Scalar.fromString(p));

const assert = chai.assert;

// Interface definitions
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

interface GoogleKeyInfo {
  kid: string;
  n: string;
  n_int?: bigint;
  [key: string]: any;
}

// JWT Helper Function
async function getJWT(nonce: string): Promise<string> {
  // === CONFIGURATION ===
  const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const REDIRECT_URI = 'http://localhost:8080';
  const SCOPE = 'openid';
  const AUTH_URI = 'https://accounts.google.com/o/oauth2/v2/auth';
  const TOKEN_URI = 'https://oauth2.googleapis.com/token';

  // Check if credentials are available
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('OAuth credentials not found. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env file');
  }

  // === STEP 1: Generate auth URL ===
  const params = {
    'client_id': CLIENT_ID,
    'redirect_uri': REDIRECT_URI,
    'response_type': 'code',
    'scope': SCOPE,
    'access_type': 'offline',
    'prompt': 'consent',
    'nonce': nonce
  };
  const auth_url = `${AUTH_URI}?${querystring.stringify(params)}`;
  console.log("Opening browser for authorization...");

  // Use dynamic import for open
  const open = (await import('open')).default;
  await open(auth_url);

  // === STEP 2: Handle redirect and extract auth code ===
  return new Promise<string>((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const parsedUrl = url.parse(req.url || '', true);
      const query = parsedUrl.query;

      if (query.code) {
        // Close the server after getting the code
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('Authorization successful. You can close this window.');
        server.close();

        try {
          // === STEP 3: Exchange code for tokens ===
          const data = {
            'code': query.code as string,
            'client_id': CLIENT_ID,
            'client_secret': CLIENT_SECRET,
            'redirect_uri': REDIRECT_URI,
            'grant_type': 'authorization_code'
          };

          const response = await axios.post(TOKEN_URI, querystring.stringify(data), {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          });

          // === STEP 4: Output JWT ID Token ===
          const id_token = response.data.id_token;
          resolve(id_token);
        } catch (error) {
          reject(error);
        }
      } else {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('Authorization failed.');
        server.close();
        reject(new Error('Authorization failed'));
      }
    });

    server.listen(8080);
    console.log('Waiting for authorization...');
  });
}

function extractJWTFields(jwtPayload: string): JWTFields {
  // Get the raw decoded payload as Buffer
  const decodedPayloadBuffer = Buffer.from(jwtPayload, 'base64url');
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
  console.log(`Nonce: start=${nonceInfo.startIndex}, length=${nonceInfo.length}, value=${nonceInfo.value}`);
  console.log(`Sub: start=${subInfo.startIndex}, length=${subInfo.length}, value=${subInfo.value}`);
  console.log(`Aud: start=${audInfo.startIndex}, length=${audInfo.length}, value=${audInfo.value}`);
  console.log(`Iss: start=${issInfo.startIndex}, length=${issInfo.length}, value=${issInfo.value}`);

  return {
    nonce: nonceInfo,
    sub: subInfo,
    aud: audInfo,
    iss: issInfo
  };
}

// Helper function to fetch and extract RSA key
async function fetchRSAKeyFromJWT(jwt: string): Promise<string[]> {
  // Extract JWT parts
  const jwtParts = jwt.split('.');

  // Extract kid from JWT header
  const decodedHeader = JSON.parse(Buffer.from(jwtParts[0], 'base64url').toString());
  console.log("Decoded JWT header:", decodedHeader);
  const kid = decodedHeader.kid;
  console.log("KID:", kid);

  // Fetch Google's public keys
  console.log("Fetching public keys from Google...");
  const googleCertsResponse = await axios.get('https://www.googleapis.com/oauth2/v3/certs');
  const googleCerts = googleCertsResponse.data;
  console.log("Google certificates received:", googleCerts);

  // Find the matching certificate using kid
  const matchingKey = googleCerts.keys.find((key: GoogleKeyInfo) => key.kid === kid);
  if (!matchingKey) {
    throw new Error("No matching key found for kid: " + kid);
  }
  console.log("Matching key found:", matchingKey);

  // Convert modulus (n) from base64url to integer
  const modulusBinary = Buffer.from(matchingKey.n, 'base64url');
  const modulusHex = modulusBinary.toString('hex');
  matchingKey.n_int = BigInt('0x' + modulusHex);

  console.log("Modulus as integer:", matchingKey.n_int.toString());
  // Split modulus into 32 chunks of 64 bits each (little-endian order)
  const modulusChunks: string[] = [];
  const mask = BigInt('0xFFFFFFFFFFFFFFFF'); // 64-bit mask
  let n = matchingKey.n_int;

  for (let i = 0; i < 32; i++) {
    const chunk = (n & mask).toString(); // Extract lowest 64 bits as string
    modulusChunks.push(chunk);
    n = n >> BigInt(64); // Shift right by 64 bits
  }
  console.log("Modulus chunks (least significant first):", modulusChunks);
  return modulusChunks;
}

interface CircuitInput {
  pubOPModulus: string[];
  expiryTime: string;
  pubUser: string[];
  jwt: string[];
  jwtHeader: string[];
  jwtPayload: string[];
  salt: string;
  r: string;
  signature: string[];
  nonceKeyStartIndex: string;
  nonceLength: string;
  subKeyStartIndex: string;
  subLength: string;
  issKeyStartIndex: string;
  issLength: string;
  audKeyStartIndex: string;
  audLength: string;
}

async function run(): Promise<void> {
  /////////////// Step 1. Generate key pair
  // Counter to ensure deterministic account generation
  const wallet = new Wallet("0x5fe7f977e71dba2ea1a68e21057beebb9be2ac30c6410aa38d4f3fbe41dcffd2");
  // Remove '0x' prefix and 04 for uncompressed key
  const publicKey = wallet._signingKey().publicKey.slice(4); 

  console.log('Private key:', wallet.privateKey);
  console.log('Public key:', publicKey);

  // Split public key into 4 chunks of 16 bytes (32 hex chars each)
  const pubChunks: bigint[] = [];
  for (let i = 0; i < 4; i++) {
    const start = i * 32;
    const chunk = publicKey.slice(start, start + 32);
    pubChunks.push(BigInt('0x' + chunk));
    console.log(`Chunk ${i}:`, chunk);
  }
  
  // Set parameters for Poseidon hash
  const expiryTime = BigInt(1000000000);
  const r = Fr.random(); // Random number for Poseidon using F1Field instance
  const salt = Fr.random(); // Random salt for Poseidon hash
  
  // Calculate Poseidon hash: Poseidon(pub[0],..., pub[3], expiryTime, r)
  console.log('Calculating Poseidon hash with inputs:', pubChunks, expiryTime, r);
  const poseidon = await circomlibjs.buildPoseidon();
  const nonce = poseidon.F.toString(
    poseidon([pubChunks[0], pubChunks[1], pubChunks[2], pubChunks[3], expiryTime, r])
  );
  console.log('Poseidon nonce:', nonce);

  // Get JWT using OAuth flow
  let jwt = await getJWT(nonce);
  console.log("JWT received:", jwt);

  const jwtParts = jwt.split('.');
  jwt = jwtParts[0] + '.' + jwtParts[1];
  const jwtHeader = jwtParts[0] + '.';
  const jwtPayload = jwtParts[1];
  const jwtSignature = jwtParts[2];
  console.log("JWT header:", jwtHeader);
  console.log("JWT payload:", jwtPayload);
  console.log("JWT signature:", jwtSignature);

  // Process JWT for circuit input
  const jwtBytes = Array.from(jwt).map(char => char.charCodeAt(0).toString());
  const maxJWTLen = 1536;
  while (jwtBytes.length < maxJWTLen) {
    jwtBytes.push("0");
  }

  // Process header
  const jwtH = Array.from(jwtHeader).map(char => char.charCodeAt(0).toString());
  const maxJWTHeaderLen = 300;
  while (jwtH.length < maxJWTHeaderLen) {
    jwtH.push("0");
  }
  console.log(jwtH.length, jwtH);
  
  // Process payload
  const jwtP = Array.from(jwtPayload).map(char => char.charCodeAt(0).toString());
  const maxJWTPayloadLen = 1472;
  while (jwtP.length < maxJWTPayloadLen) {
    jwtP.push("0");
  }
  
  // Process signature by converting base64url to binary
  const rawSignature = Buffer.from(jwtSignature, 'base64url');
  console.log("Raw signature length:", rawSignature.length);

  // Convert signature to integer (big-endian byte array to BigInt)
  let signatureInt = BigInt('0x' + rawSignature.toString('hex'));
  console.log("Signature as BigInt:", signatureInt.toString());

  // Split into 32 chunks of 64 bits each (little-endian)
  const signatureChunks: string[] = [];
  const mask = BigInt('0xFFFFFFFFFFFFFFFF'); // 64-bit mask
  for (let i = 0; i < 32; i++) {
    const chunk = (signatureInt & mask).toString(); // Extract lowest 64 bits as string
    signatureChunks.push(chunk);
    signatureInt = signatureInt >> BigInt(64); // Shift right by 64 bits
  }

  console.log("Signature chunks:", signatureChunks);

  // Check the JWT payload
  const decodedPayload = JSON.parse(Buffer.from(jwtPayload, 'base64url').toString());
  console.log("Decoded JWT payload:", decodedPayload);

  // Use the helper function to get the matching key
  const modulusChunks = await fetchRSAKeyFromJWT(jwt);

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
  
  // Create input object for the circuit
  const input: CircuitInput = {
    "pubOPModulus": modulusChunks, // Already strings from previous conversion
    "expiryTime": expiryTime.toString(),
    "pubUser": pubChunks.map(chunk => chunk.toString()),
    "jwt": jwtBytes, // Already strings
    "jwtHeader": jwtH, // Already strings
    "jwtPayload": jwtP, // Already strings
    "salt": salt.toString(),
    "r": r.toString(),
    "signature": signatureChunks, // Already strings
    "nonceKeyStartIndex": nonceKeyStartIndex.toString(),
    "nonceLength": nonceLength.toString(),
    "subKeyStartIndex": subKeyStartIndex.toString(),
    "subLength": subLength.toString(),
    "issKeyStartIndex": issKeyStartIndex.toString(),
    "issLength": issLength.toString(),
    "audKeyStartIndex": audKeyStartIndex.toString(),
    "audLength": audLength.toString()
  };
  console.log("Circuit input:", input);
  // Write input to JSON file
  fs.writeFileSync("out/input.json", JSON.stringify(input, null, 2));
  // Calculate witness first (optional but useful to separate steps)
  await snarkjs.wtns.calculate(input, "out/main_js/main.wasm", "out/witness.wtns");
  console.log("Starting proof generation with rapidsnark...");

  const startTime = performance.now();
  try {
    const output = execSync('./rapidsnark/package/bin/prover out/circuit_final.zkey out/witness.wtns out/proof.json out/public.json', { encoding: 'utf8' });
    console.log(output);
    
    const endTime = performance.now();
    const timeElapsed = (endTime - startTime) / 1000; // convert to seconds
    console.log(`Rapidsnark proof generation completed in ${timeElapsed.toFixed(2)} seconds`);
  } catch (error) {
    console.error("Error executing rapidsnark:", (error as Error).message);
  }
  
  // Alternative snarkjs proof generation (commented out)
  /*
  console.log("Starting proof generation...");
  const startTime = performance.now();
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, "out/main_js/main.wasm", "out/circuit_final.zkey");
  
  const endTime = performance.now();
  const timeElapsed = (endTime - startTime) / 1000; // convert to seconds
  console.log(`Proof generation completed in ${timeElapsed.toFixed(2)} seconds`);

  console.log("Proof: ");
  console.log(JSON.stringify(proof, null, 1));

  const vKey = JSON.parse(fs.readFileSync("out/verification_key.json").toString());

  const res = await snarkjs.groth16.verify(vKey, publicSignals, proof);

  if (res === true) {
    console.log("Verification OK");
  } else {
    console.log("Invalid proof");
  }
  */
}

run().then(() => {
  process.exit(0);
}).catch(error => {
  console.error("Error in main execution:", error);
  process.exit(1);
});