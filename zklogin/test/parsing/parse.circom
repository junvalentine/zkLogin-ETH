pragma circom 2.0.0;


include "../../../circuits/sha.circom";
include "../../../circuits/rsa/rsa_verify.circom";
include "../../../circuits/circomlib/circuits/comparators.circom";
include "../../../circuits/base64.circom";
include "../../../circuits/fields.circom";
include "../../../circuits/circomlib/circuits/poseidon.circom";

template parseTest(
    maxJWTLen, // Max byte length of the full base64 JWT, without padding
    maxJWTPayloadLen, // Max byte length of the payload in base64 JWT, without padding
    maxJWTHeaderLen,
    maxNonceLen // Max byte length of the nonce in base64 JWT, without padding
){  
    signal input jwt[maxJWTLen]; // full JWT in base64, no padding
    signal input pubOPModulus[32];
    signal input jwtHash[256]; // header + payload in base64, no padding
    signal input signature[32]; // JWT signature , 32 chunks of 64 bits = 2048 bits number
    signal input jwtPayload[maxJWTPayloadLen]; // payload in base64, no padding
    signal input jwtHeader[maxJWTHeaderLen];
    // signal input pubUser[4];

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
    // // assert each chunk < 2**128
    // for (var i = 0; i < 4; i++) {
    //     var is_byte = LessThan(129)([pubUser[i], 2**128]);
    //     is_byte === 1;
    // }
    // // compute intended nonce
    // signal computedNonce <== Poseidon(6)([pubUser[0], pubUser[1], pubUser[2], pubUser[3], expiryTime, r]);
    // log("computedNonce: ", computedNonce);
    // // assert jwt.nonce = H(pku, Tmax, r)
    // extractedNonce === computedNonce;
}

component main = parseTest(1536, 1472, 300, 256);