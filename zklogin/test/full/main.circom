pragma circom 2.0.0;

include "../../../circuits/sha.circom";
include "../../../circuits/rsa/rsa_verify.circom";
include "../../../circuits/circomlib/circuits/comparators.circom";
include "../../../circuits/base64.circom";
include "../../../circuits/fields.circom";
include "../../../circuits/circomlib/circuits/poseidon.circom";

template zkLogin(
    maxJWTLen, // Max byte length of the full base64 JWT, without padding
    maxJWTPayloadLen, // Max byte length of the payload in base64 JWT, without padding
    maxJWTHeaderLen, // Max byte length of the header in base64 JWT, without padding
    maxNonceLen, // Max byte length of the nonce
    maxSubLen, // Max byte length of the sub
    maxIssLen, // Max byte length of the iss
    maxAudLen // Max byte length of the aud
){  
    // public
    signal input pubOPModulus[32]; // OP modulus, 32 chunks of 64 bits = 2048 bits number
    signal input expiryTime; // 32 bits number, block.timestamp ?
    signal input pubUser[4]; // 4 chunks of up to 16 bytes = 128 bit element, as 32 bytes chunk will be greater than the zk modulus 
    // witness
    signal input jwt[maxJWTLen]; // header + payload in base64, no padding
    signal input jwtPayload[maxJWTPayloadLen]; // payload in base64, no padding
    signal input jwtHeader[maxJWTHeaderLen]; // header with '.' in base64, no padding
    signal input salt;
    signal input r; // randomness to be put in nonce hash
    
    // 1. Verify JWT signature
    // compute max blocks in jwt (after padding)
    var maxJWTBlocks = (maxJWTLen * 8) \ 512; 
    // hash of JWT
    signal jwtHash[256] <== sha256(maxJWTLen, maxJWTBlocks)(jwt);

    signal input signature[32]; // little endian, JWT signature , 32 chunks of 64 bits = 2048 bits number
    // check valid signature, all chunk < 2**64
    for (var i = 0; i < 32; i++) {
        var is_byte = LessThan(65)([signature[i], 2**64]);
        is_byte === 1;
    }
    // check signature < modulus
    signal sigCheck <== BigLessThan(252, 32)(signature, pubOPModulus);
    sigCheck === 1;
    // convert jwtHash to 4 chunks of 64 bits, Little Endian 
    component bits2Num[4];
    signal jwtHashLE[4];
    for (var i = 0; i < 4; i++){
        bits2Num[i] = Bits2Num(64);
    }
    for (var i = 0; i < 256; i++){
        bits2Num[3 - (i \ 64)].in[63 - (i % 64)] <== jwtHash[i];
    }
    for (var i = 0; i < 4; i++){
        jwtHashLE[i] <== bits2Num[i].out;
    }
    // verify signature, PKCS1v15-sha256 scheme
    rsaVerifyPKCS1v15(64, 32)(signature, pubOPModulus, jwtHashLE);
    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // 2. Parse and verify jwt.nonce = H(pku, Tmax, r)
    // Instead of parsing the jwt into header and payload, we can check jwt = header + payload
    concatCheck(maxJWTLen, maxJWTHeaderLen, maxJWTPayloadLen)(jwt, jwtHeader, jwtPayload);

    var maxAsciiJwtPayloadLen = (3*maxJWTPayloadLen) \ 4;
    var maxAsciiJwtHeaderLen = (3*maxJWTHeaderLen) \ 4;
    // decode base64 to ascii
    signal ascii_jwt_payload[maxAsciiJwtPayloadLen] <== Base64Decode(maxAsciiJwtPayloadLen)(jwtPayload);
    // signal ascii_jwt_header[maxAsciiJwtHeaderLen] <== Base64Decode(maxAsciiJwtHeaderLen)(jwtHeader[]);
    for (var i = 0; i < maxAsciiJwtPayloadLen; i++){
       log("ascii_jwt_payload: ", ascii_jwt_payload[i]);
    }
    
    // parse jwt nonce
    signal input nonceKeyStartIndex;
    signal input nonceLength;
    // extract nonce from JWT
    signal extractedNonce <== extractNonce(maxAsciiJwtPayloadLen, maxNonceLen)(ascii_jwt_payload, nonceKeyStartIndex, nonceLength);
    log("extractedNonce: ", extractedNonce);
    // assert each chunk < 2**128
    for (var i = 0; i < 4; i++) {
        var is_byte = LessThan(129)([pubUser[i], 2**128]);
        is_byte === 1;
    }
    // compute intended nonce
    signal computedNonce <== Poseidon(6)([pubUser[0], pubUser[1],pubUser[2], pubUser[3], expiryTime, r]);
    log("computedNonce: ", computedNonce);
    // assert jwt.nonce = H(pku, Tmax, r)
    extractedNonce === computedNonce;
    /////////////////////////////////////////////////////////////////////////////////////////////////////////
    // 3. Parse and verify zkaddr = H(jwt.sub, jwt.iss, jwt.aud, salt)
    // extract sub, iss, aud from JWT
    signal input subKeyStartIndex;
    signal input subLength;
    signal extractedSub <== extractSub(maxAsciiJwtPayloadLen, maxSubLen)(ascii_jwt_payload, subKeyStartIndex, subLength);
    log("extractedSub: ", extractedSub);
    signal input issKeyStartIndex;
    signal input issLength;
    signal extractedIss <== extractIss(maxAsciiJwtPayloadLen, maxIssLen)(ascii_jwt_payload, issKeyStartIndex, issLength);
    signal output iss <== extractedIss;
    log("extractedIss: ", extractedIss);
    signal input audKeyStartIndex;
    signal input audLength;
    signal extractedAud <== extractAud(maxAsciiJwtPayloadLen, maxAudLen)(ascii_jwt_payload, audKeyStartIndex, audLength);
    log("extractedAud: ", extractedAud);
    
    // zkaddr = H(jwt.sub, jwt.iss, jwt.aud, salt)
    // compute intended zkaddr
    signal output computedZkAddr <== Poseidon(4)([extractedSub, extractedIss, extractedAud, salt]);
    log("computedZkaddr: ", computedZkAddr);

}

component main {public [pubOPModulus, expiryTime, pubUser]} = zkLogin(1536, 1472, 300, 120, 120, 120, 120);