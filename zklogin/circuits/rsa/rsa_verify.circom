pragma circom 2.0.0;

// Copied from https://github.com/aptos-labs/keyless-zk-proofs/tree/main/circuit/templates/helpers/rsa
// File copied and modified from https://github.com/zkp-application/circom-rsa-verify/blob/main/circuits/rsa_verify.circom, except for the `FpPow65537Mod` template. The only difference is using `FpPow65537Mod` for exponentiation instead of the tempalte provided in the original repo, as it is more efficient
include "./fp.circom";
include "../circomlib/circuits/bitify.circom";

// Template copied from c
template FpPow65537Mod(n, k) {
    signal input base[k];
    // Exponent is hardcoded at 65537
    signal input modulus[k];
    signal output out[k];

    component doublers[16];
    component adder = FpMul(n, k);
    for (var i = 0; i < 16; i++) {
        doublers[i] = FpMul(n, k);
    }

    for (var j = 0; j < k; j++) {
        adder.p[j] <== modulus[j];
        for (var i = 0; i < 16; i++) {
            doublers[i].p[j] <== modulus[j];
        }
    }
    for (var j = 0; j < k; j++) {
        doublers[0].a[j] <== base[j];
        doublers[0].b[j] <== base[j];
    }
    for (var i = 0; i + 1 < 16; i++) {
        for (var j = 0; j < k; j++) {
            doublers[i + 1].a[j] <== doublers[i].out[j];
            doublers[i + 1].b[j] <== doublers[i].out[j];
        }
    }
    for (var j = 0; j < k; j++) {
        adder.a[j] <== base[j];
        adder.b[j] <== doublers[15].out[j];
    }
    for (var j = 0; j < k; j++) {
        out[j] <== adder.out[j];
    }
}
// https://datatracker.ietf.org/doc/html/rfc8017#section-9.2
// PKCS1-v1.5 with sha256
// exponent is assume to be 65537
// tlen = 51, emLen = 256
template rsaVerifyPKCS1v15(w, nb) {
    signal input signature[nb];      // least-significant-limb first
    signal input modulus[nb];   // least-significant-limb first
    signal input hashed[4];     // least-significant-limb first

    // signature ** 65537 mod modulus
    component pm = FpPow65537Mod(w, nb);
    for (var i  = 0; i < nb; i++) {
        pm.base[i] <== signature[i];
        pm.modulus[i] <== modulus[i];
    }

    // 1. Check hashed data
    // 64 * 4 = 256 bit. the first 4 numbers
    for (var i = 0; i < 4; i++) {
        hashed[i] === pm.out[i];
    }
    
    // 2. Check hash prefix and 1 byte 0x00
    // sha256/152 bit
    // SHA-256: 30 31 30 0d 06 09 60 86 48 01 65 03 04 02 01 05 00 04 20 || H   
    pm.out[4] === 217300885422736416; //0304020105000420
    pm.out[5] === 938447882527703397; //0d06096086480165
    // 0x00 + remain 24 bit  (00303130)
    component num2bits_6 = Num2Bits(w);
    num2bits_6.in <== pm.out[6];
    var remainsBits[32] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0];
    // compare 32 lsb of chunk 6 with remainsBits
    for (var i = 0; i < 32; i++) {
        num2bits_6.out[i] === remainsBits[31 - i];
    }

    // 3. Check PS and em[1] = 1. the same code like golang std lib rsa.VerifyPKCS1v15
    for (var i = 32; i < w; i++) {
        num2bits_6.out[i] === 1;
    }

    for (var i = 7; i < 31; i++) {
        // 0b1111111111111111111111111111111111111111111111111111111111111111
        pm.out[i] === 18446744073709551615;
    }
    // 0b1111111111111111111111111111111111111111111111111
    pm.out[31] === 562949953421311;
}

