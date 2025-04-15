pragma circom 2.0.0;

include "circomlib/circuits/bitify.circom";

// Circuit to calculate the sum of the inputs.
template calculateTotal(n) {
    signal input nums[n];
    signal output sum;

    signal sums[n];
    sums[0] <== nums[0];

    for (var i=1; i < n; i++) {
        sums[i] <== sums[i - 1] + nums[i];
    }

    sum <== sums[n - 1];
}

// Circuit to calculate the length of a message
template msgLen(maxLen){
    signal input inp[maxLen];
    signal output out;

    var i = 0;
    while (i < maxLen) {
        if (inp[i] == 0) {
            break;
        }
        i++;
    }
    out <== i;
}

// long_to_bytes function, big endian
template longToBytes(byteLength){
    signal input inp; // inp < p
    signal output out[byteLength]; // each out is < 256

    // Rangecheck in and out?

    // convert inp to binary
    component nbytes = Num2Bits(8 * n); // Num2Bits is binary presentation, LSB is on the left
    nbytes.in <== inp;

    component bytes[n];

    for (var k = 0; k < byteLength; k++){
        out[k] <-- (in >> ((byteLength - k - 1) * 8)) % 256;

        // Constrain out to match Num2Bits output
        bytes[k] = Num2Bits(8);
        bytes[k].in <== out[k];
        for (var j = 0; j < 8; j++) {
            nbytes.out[(n - k - 1) * 8 + j] === bytes[k].out[j];
        }
    }
}

// Converts byte array `in` into a bit array. All values in `in` are
// assumed to be one byte each, i.e. between 0 and 255 inclusive.
// These bytes are also assumed to be in big endian order
template BytesToBits(maxInputLen) {
    signal input inp[maxInputLen];
    signal output out[maxInputLen*8];

    component num2bits[maxInputLen];

    for (var i = 0; i < maxInputLen; i++) {
        num2bits[i] = Num2Bits(8);
        num2bits[i].in <== inp[i];
        for (var j = 0; j < 8; j++) {
            var index = (i*8) + j;
            num2bits[i].out[7-j] ==> out[index];
        }
    }
}