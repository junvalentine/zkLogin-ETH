pragma circom 2.0.0;

include "./circomlib/circuits/sha256/constants.circom";
include "./circomlib/circuits/sha256/sha256compression.circom";
include "./circomlib/circuits/comparators.circom";
include "./utils.circom";

// https://github.com/TheFrozenFire/snark-jwt-verify/blob/master/circuits/sha256.circom
// https://www.rfc-editor.org/rfc/rfc4634.html
// This imple assume input alr been padded
// maxNumBlocks is the maximum number of blocks to be hashed, including padding. The input must be a multiple of 512 bits.
// in is the input to be hashed, which is a byte array. The input must be a multiple of 512 bits.
// tBlock is the index of terminating data block, which is the last block of the input.
// out is the output is the hash of the input, array of 256 bits.
template sha256Unsafe(maxNumBlocks) {
    signal input inp[maxNumBlocks * 512];
    signal input tBlock;
    
    signal output out[256];
    // section 6.1
    component ha0 = H(0);
    component hb0 = H(1);
    component hc0 = H(2);
    component hd0 = H(3);
    component he0 = H(4);
    component hf0 = H(5);
    component hg0 = H(6);
    component hh0 = H(7);

    component sha256Compression[maxNumBlocks];
    // section 6.2
    for(var i = 0; i < maxNumBlocks; i++) {
        sha256Compression[i] = Sha256compression();
        if (i==0) {
            for(var k = 0; k < 32; k++) {
                sha256Compression[i].hin[0*32+k] <== ha0.out[k];
                sha256Compression[i].hin[1*32+k] <== hb0.out[k];
                sha256Compression[i].hin[2*32+k] <== hc0.out[k];
                sha256Compression[i].hin[3*32+k] <== hd0.out[k];
                sha256Compression[i].hin[4*32+k] <== he0.out[k];
                sha256Compression[i].hin[5*32+k] <== hf0.out[k];
                sha256Compression[i].hin[6*32+k] <== hg0.out[k];
                sha256Compression[i].hin[7*32+k] <== hh0.out[k];
            }
        } else {
            for(var k = 0; k < 32; k++) {
                sha256Compression[i].hin[32*0+k] <== sha256Compression[i-1].out[32*0+31-k];
                sha256Compression[i].hin[32*1+k] <== sha256Compression[i-1].out[32*1+31-k];
                sha256Compression[i].hin[32*2+k] <== sha256Compression[i-1].out[32*2+31-k];
                sha256Compression[i].hin[32*3+k] <== sha256Compression[i-1].out[32*3+31-k];
                sha256Compression[i].hin[32*4+k] <== sha256Compression[i-1].out[32*4+31-k];
                sha256Compression[i].hin[32*5+k] <== sha256Compression[i-1].out[32*5+31-k];
                sha256Compression[i].hin[32*6+k] <== sha256Compression[i-1].out[32*6+31-k];
                sha256Compression[i].hin[32*7+k] <== sha256Compression[i-1].out[32*7+31-k];
            }
        }

        for (var k = 0; k < 512; k++) {
            sha256Compression[i].inp[k] <== inp[i * 512 + k];
        }
    }
    
    // Collapse the hashing result at the terminating data block
    component calcTotal[256];
    component eqs[maxNumBlocks];

    for (var i = 0; i < maxNumBlocks; i++) {
        // Determine if the given block index is equal to the terminating data block index
        eqs[i] = IsEqual();
        eqs[i].in[0] <== i;
        eqs[i].in[1] <== tBlock;
    }

    // For each bit of the output
    for(var k = 0; k < 256; k++) {
        calcTotal[k] = calculateTotal(maxNumBlocks);
        
        // For each possible block
        for (var i = 0; i < maxNumBlocks; i++) {
            // eqs[i].out is 1 if the index matches. As such, at most one input to calcTotal is not 0.
            // The bit corresponding to the terminating data block will be raised
            calcTotal[k].nums[i] <== eqs[i].out * sha256Compression[i].out[k];
        }
        out[k] <== calcTotal[k].sum;
    }
}
// Input padding according to https://www.rfc-editor.org/rfc/rfc4634.html#section-4.1
// https://github.com/yubing744/rooch/blob/feature-owen-zklogin-circuit-verify/sdk/zklogin/circuits/zklogin/helpers/sha256.circom
// IMO the padding does not need to be verify, cuz if its wrong, the hash will be wrong
template sha256Padding(maxInputLen){
    signal input inp[maxInputLen]; // byte array
    signal output paddedText[maxInputLen]; // padded text
    signal output numBlocks; // number of blocks
    
    // text length
    component len = msgLen(maxInputLen);
    len.inp <== inp;
    assert(len.out + 9 <= maxInputLen);

    // calculate paddedText length and number of blocks
    var paddedLen = len.out + (64 - (len.out % 64)); // calc paddedText length
    assert(paddedLen % 64 == 0);
    numBlocks <-- paddedLen / 64;
    assert(numBlocks*64 == paddedLen);
    // 4.1.c, compute 64-bit block that is L, big endian
    component len2bytes = longToBytes(8);
    len2bytes.inp <== len.out * 8;
    for (var i = 0; i < maxInputLen; i++) {
        // if (i < len.out){
        //     paddedText[i] <-- inp[i]; // Copy the input text
        // } else {
        //     if (i == len.out) {
        //         paddedText[i] <-- 128; // 4.1.a, add the 1 on the end
        //     } else {
        //         if (i < paddedLen){
        //             if (i % 64 < 56) {
        //                 paddedText[i] <-- 0; // 4.1.b, add 0s
        //             } else {
        //                 paddedText[i] <-- len2bytes.out[(i % 64 - 56)]; // 4.1.c, add the length
        //             }
        //         } else {
        //             paddedText[i] <-- 0; // Fulfill 0s
        //         }
        //     }
        // }
        paddedText[i] <-- i < len.out ? inp[i] : (i == len.out ? 128 : (i < paddedLen ? (i % 64 < 56 ? 0 : (i % 64 > 56 ? len2bytes.out[(i % 64 - 56)]: 0)) : 0)); 

        // paddedText[i] <-- i < len.out ? inp[i] : (i == len.out ? 128 : (i < padded_len ? (i % 64 < 56 ? 0 : (i % 64 > 56 ? len2bytes.out[(i % 64 - 56)]: 0)) : 0)); 
    }
}
// Compute sha256 hash of the input
template sha256(maxInputLen, maxBlocks) {
    signal input inp[maxInputLen];
    signal output out[256];
    
    // text padding
    component sha256Padding = sha256Padding(maxInputLen);
    sha256Padding.inp <== inp;
    // convert to bits
    signal paddedTextBits[maxInputLen*8] <== bytesToBits(maxInputLen)(sha256Padding.paddedText);
    
    // compute hash
    out <== sha256Unsafe(maxBlocks)(paddedTextBits, sha256Padding.numBlocks - 1);
}