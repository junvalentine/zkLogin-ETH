import axios from "axios";
import { Buffer } from 'buffer';

// Make Buffer available globally for libraries that expect it
window.Buffer = Buffer;

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

// Process signature by converting base64url to standard base64 first
const base64UrlToBase64 = (base64url: string): string => {
  // Convert base64url to standard base64
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding if needed
  while (base64.length % 4) {
    base64 += '=';
  }
  return base64;
};

// Main function to generate and verify a ZK proof
export const generateZKProof = async (input: CircuitInput): Promise<ProofResponse> => {
  try {
    const apiUrl = import.meta.env.VITE_ZK_API_URL || "/api";
    
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

export const prepareCircuitInput = async (
  idToken: string, 
  expiryTime: string,
  salt: string,
  r: string
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
  const sessionKeysStr = localStorage.getItem('session_keys');
  const sessionKeys = JSON.parse(sessionKeysStr);
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
  console.log("Decoded JWT payload:", decodedPayload);

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
  console.log("Decoded JWT header:", decodedHeader);
  const kid = decodedHeader.kid;
  console.log("KID:", kid);

  // Fetch Google's public keys
  console.log("Fetching public keys from Google...");
  const googleCertsResponse = await axios.get('https://www.googleapis.com/oauth2/v3/certs');
  const googleCerts = googleCertsResponse.data;
  console.log("Google certificates received:", googleCerts);

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
  console.log("Matching key found:", matchingKey);

  // Convert modulus (n) from base64url to integer
  const modulusBinary = Buffer.from(base64UrlToBase64(matchingKey.n), 'base64');
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