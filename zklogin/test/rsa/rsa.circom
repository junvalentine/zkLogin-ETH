pragma circom 2.0.0;


include "../../../circuits/sha.circom";
include "../../../circuits/rsa/rsa_verify.circom";
include "../../../circuits/circomlib/circuits/comparators.circom";
include "../../../circuits/base64.circom";
include "../../../circuits/fields.circom";
include "../../../circuits/circomlib/circuits/poseidon.circom";
template rsaTest(){  
    signal input pubOPModulus[32];
    signal input jwtHash[256]; // header + payload in base64, no padding
    signal input signature[32]; // JWT signature , 32 chunks of 64 bits = 2048 bits number
    
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
}

component main = rsaTest();