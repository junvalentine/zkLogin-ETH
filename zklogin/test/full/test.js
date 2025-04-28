const chai = require("chai");
const path = require("path");
const circomlibjs = require("circomlibjs");
const wasm_tester = require("circom_tester").wasm;
const fs = require('fs');
const http = require('http');
const querystring = require('querystring');
const axios = require('axios');
const url = require('url');
require('dotenv').config({ path: path.join("/mnt/d/lv/zkLogin-ETH/zklogin",".env") });

const F1Field = require("ffjavascript").F1Field;
const ethers = require('ethers');
const { Scalar } = require('ffjavascript');
exports.p = Scalar.fromString("21888242871839275222246405745257275088548364400416034343698204186575808495617");
const Fr = new F1Field(exports.p);

const assert = chai.assert;

// JWT Helper Function
async function getJWT(nonce) {
    // === CONFIGURATION ===
    const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    const REDIRECT_URI = 'http://localhost:8080';
    const SCOPE = 'openid';
    const AUTH_URI = 'https://accounts.google.com/o/oauth2/v2/auth';
    const TOKEN_URI = 'https://oauth2.googleapis.com/token'

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
    return new Promise((resolve, reject) => {
        const server = http.createServer(async (req, res) => {
            const parsedUrl = url.parse(req.url, true);
            const query = parsedUrl.query;
            
            if (query.code) {
                // Close the server after getting the code
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end('Authorization successful. You can close this window.');
                server.close();
                
                try {
                    // === STEP 3: Exchange code for tokens ===
                    const data = {
                        'code': query.code,
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
function extractJWTFields(jwtPayload) {
    // Get the raw decoded payload as Buffer
    const decodedPayloadBuffer = Buffer.from(jwtPayload, 'base64url');
    const payloadAsString = decodedPayloadBuffer.toString();
    
    // Helper function to extract field information
    const extractField = (fieldName) => {
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
async function fetchRSAKeyFromJWT(jwt) {
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
    const matchingKey = googleCerts.keys.find(key => key.kid === kid);
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
    const modulusChunks = [];
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

describe("RSA", function () {
    this.timeout(300000); // Increased timeout for OAuth flow
    
    it("Should correctly verify the JWT", async function () {
        // Option 1: Use hardcoded JWT (faster for repeated testing)
        let jwt = "eyJhbGciOiJSUzI1NiIsImtpZCI6IjIzZjdhMzU4Mzc5NmY5NzEyOWU1NDE4ZjliMjEzNmZjYzBhOTY0NjIiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiIzMjEyOTQ2MTk3NzYtcGtybnFkaThyYTZndnN1MmZxZjdrN2VidDE3Nmlvc28uYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJhdWQiOiIzMjEyOTQ2MTk3NzYtcGtybnFkaThyYTZndnN1MmZxZjdrN2VidDE3Nmlvc28uYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMTI5NTIzNjA2NzQyMDUxNjM0MzkiLCJub25jZSI6ImNhOTc4MTEyY2ExYmJkY2FmYWMyMzFiMzlhMjNkYzRkYTc4NmVmZjgxNDdjNGU3MmI5ODA3Nzg1YWZlZTQ4YmIiLCJuYmYiOjE3NDU2MDY3NTgsImlhdCI6MTc0NTYwNzA1OCwiZXhwIjoxNzQ1NjEwNjU4LCJqdGkiOiIzYmE4ZmQ2MTc1MzhjOWEwMmNkZmFjMGE2NTkyNjUxOGVkZjZjYzFkIn0";
        
        // Load and test the circuit
        const circuit = await wasm_tester(
            path.join("/mnt/d/lv/zkLogin-ETH/zklogin/circuits", "main.circom"),
            {
                output: path.join(__dirname),
                recompile: false,
            }
        );

        // Generate key pair
        const wallet = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
        const privateKey = BigInt(wallet.privateKey);
        const publicKey = wallet._signingKey().publicKey.slice(4); // Remove '0x' prefix and 04 for uncompressed key

        console.log('Private key:', wallet.privateKey);
        console.log('Public key:', publicKey);

        // Split public key into 4 chunks of 16 bytes (32 hex chars each)
        const pubChunks = [];
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
        const nonce = poseidon.F.toString(poseidon([pubChunks[0], pubChunks[1], pubChunks[2], pubChunks[3], expiryTime, r]));
        console.log('Poseidon nonce:', nonce);
        
        // Get JWT using OAuth flow
        jwt = await getJWT(nonce);
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
        fs.writeFileSync('./test/full/json/jwtBytes.json', JSON.stringify(jwtBytes, null, 2));
        const maxJWTLen = 1536;
        while(jwtBytes.length < maxJWTLen) {
            jwtBytes.push("0");
        }
        
        // Process header
        const jwtH = Array.from(jwtHeader).map(char => char.charCodeAt(0).toString());
        fs.writeFileSync('./test/full/json/jwtHeader.json', JSON.stringify(jwtH, null, 2));
        const maxJWTHeaderLen = 300;
        while(jwtH.length < maxJWTHeaderLen) {
            jwtH.push("0");
        }
        console.log(jwtH.length, jwtH);
        // Process payload
        const jwtP = Array.from(jwtPayload).map(char => char.charCodeAt(0).toString());
        fs.writeFileSync('./test/full/json/jwtPayload.json', JSON.stringify(jwtP, null, 2));
        const maxJWTPayloadLen = 1472;
        while(jwtP.length < maxJWTPayloadLen) {
            jwtP.push("0");
        }
        // Process signature
        // Decode the base64url signature directly with Buffer
        // Process signature by converting base64url to binary
        const rawSignature = Buffer.from(jwtSignature, 'base64url');
        
        console.log("Raw signature length:", rawSignature.length);
        fs.writeFileSync('./test/full/json/rawSignature.json', JSON.stringify(Array.from(rawSignature), null, 2));

        // Convert signature to integer (big-endian byte array to BigInt)
        let signatureInt = BigInt('0x' + rawSignature.toString('hex'));
        console.log("Signature as BigInt:", signatureInt.toString());
        
        // Split into 32 chunks of 64 bits each (little-endian)
        const signatureChunks = [];
        const mask = BigInt('0xFFFFFFFFFFFFFFFF'); // 64-bit mask
        for (let i = 0; i < 32; i++) {
            const chunk = (signatureInt & mask).toString(); // Extract lowest 64 bits as string
            signatureChunks.push(chunk);
            signatureInt = signatureInt >> BigInt(64); // Shift right by 64 bits
        }
        
        console.log("Signature chunks:", signatureChunks);
        fs.writeFileSync('./test/full/json/signatureChunks.json', JSON.stringify(signatureChunks, null, 2));
    
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
        const input = {
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
        
        const witness = await circuit.calculateWitness(input);
        await circuit.checkConstraints(witness);
        // const outputs = await circuit.getOutput(witness, {"iss": 1, "computedZkAddr": 1});
        // console.log("Outputs:", outputs);
        console.log("Circuit constraints verified successfully!");
    });
});