pragma circom 2.0.0;


include "../../../circuits/sha.circom";

template shaTest(
    maxJWTLen // Max byte length of the full base64 JWT, without padding
){  
    signal input jwt[maxJWTLen]; // header + payload in base64, no padding

    // 1. Verify JWT signature
    // compute max blocks in jwt (after padding)
    var maxJWTBlocks = (maxJWTLen * 8) \ 512; 
    // hash of JWT
    signal output jwtHash[256] <== sha256(maxJWTLen, maxJWTBlocks)(jwt);
}

component main = shaTest(1536);