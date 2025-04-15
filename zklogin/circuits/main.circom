pragma circom 2.0.0;

include "./sha.circom"

template zkLogin(
    maxJWTLen, // Max byte length of the full base64 JWT, without padding

){  
    // public
    signal input pub_OP;
    signal input iss;
    signal input zkaddr;
    signal input expiry_time;
    signal input pub_user;
    // witness
    
    signal input salt;
    signal input r;

    // 1. Verify JWT
    signal input jwt[maxJWTLen]; // header + payload in base64
    // compute max blocks in jwt (after padding)
    var maxJWTBlocks = (maxJWTLen*8)\512; // \ is division with result round up instead of round down
    // hash of JWT
    signal jwt_hash[256] <== sha256(maxJWTLen, maxJWTBlocks)(jwt);


}