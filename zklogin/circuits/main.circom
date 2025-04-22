pragma circom 2.0.0;

include "./sha.circom"
include "./rsa/rsa_verify.circom"
include "./circomlib/circuits/comparators.circom";
include "./base64.circom";

template zkLogin(
    maxJWTLen, // Max byte length of the full base64 JWT, without padding
    maxJWTPayloadLen, // Max byte length of the payload in base64 JWT, without padding
    maxJWTHeaderLen, // Max byte length of the header in base64 JWT, without padding
){  
    // public
    signal input pubOPModulus[32]; // OP modulus, 32 chunks of 64 bits = 2048 bits number
    signal input iss;
    signal input zkaddr;
    signal input expiryTime;
    signal input pubUser;
    // witness
    signal input salt;
    signal input r;
    signal input jwt[maxJWTLen]; // header + payload in base64, no padding
    signal input jwtPayload[maxJWTPayloadLen]; // payload in base64, no padding
    signal input jwtHeader[maxJWTHeaderLen]; // header with '.' in base64, no padding
    
    // 1. Verify JWT signature
    // compute max blocks in jwt (after padding)
    var maxJWTBlocks = (maxJWTLen * 8) \ 512; // \ is division with result round up instead of round down
    // hash of JWT
    signal jwtHash[256] <== sha256(maxJWTLen, maxJWTBlocks)(jwt);

    signal input signature[32]; // JWT signature , 32 chunks of 64 bits = 2048 bits number
    // check valid signature, all chunk < 2**64
    for (var i = 0; i < 32; i++) {
        var is_byte = LessThan(65)([in[i], 2**64]);
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
        bits2Num[3 - (i / 64)].in[63 - (i % 64)] <== jwtHash[i];
    }
    for (var i = 0; i < 4; i++){
        jwtHashLE[i] <== bits2Num[i].out;
    }
    // verify signature, PKCS1v15-sha256 scheme
    rsaVerifyPKCS1v15(64, 32)(signature, pubOPModulus, jwtHashLE);

    // 2. Parse and verify jwt.nonce = H(pku, Tmax, r)
    // Instead of parsing the jwt into header and payload, we can check jwt = header + payload
    concatCheck(maxJWTLen, maxJWTHeaderLen, maxJWTPayloadLen)(jwt, jwtHeader, jwtPayload);

    var maxAsciiJwtPayloadLen = (3*maxJWTPayloadLen) \ 4;
    var maxAsciiJwtHeaderLen = (3*maxJWTHeaderLen) \ 4;
    // decode base64 to ascii
    signal ascii_jwt_payload[maxAsciiJwtPayloadLen] <== Base64Decode(maxAsciiJwtPayloadLen)(jwtPayload);
    // signal ascii_jwt_header[maxAsciiJwtHeaderLen] <== Base64Decode(maxAsciiJwtHeaderLen)(jwtHeader[]);
    
    // parse jwt nonce
     
    

    // 3. Parse and verify zkaddr = H(jwt.sub, jwt.iss, jwt.aud, salt)

}

component main {} = zkLogin();