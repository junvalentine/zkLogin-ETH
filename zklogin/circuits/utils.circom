pragma circom 2.0.0;

include "./circomlib/circuits/bitify.circom";
include "./circomlib/circuits/comparators.circom";
include "./hashtofield.circom"

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

// QuinSelector allow a signal to be value of array at index
// https://www.rareskills.io/post/quin-selector
template quinSelector(maxLen) {
  signal input in[maxLen];
  signal input index;
  signal output out;

  // Ensure that index < maxLen
  component lessThan = LessThan(252);
  lessThan.in[0] <== index;
  lessThan.in[1] <== maxLen;
  lessThan.out === 1;

  component calcTotal = calculateTotal(maxLen);
  component eqs[maxLen];

  // For each item, check whether its index equals the input index.
  for (var i = 0; i < maxLen; i ++) {
    eqs[i] = IsEqual();
    eqs[i].in[0] <== i;
    eqs[i].in[1] <== index;

    // eqs[i].out is 1 if the index matches. As such, at most one input to
    // calcTotal is not 0.
    calcTotal.in[i] <== eqs[i].out * in[i];
  }

  // Returns 0 + 0 + 0 + item
  out <== calcTotal.out;
}

// Circuit to calculate the length of a message
template msgLen(maxLen){
    signal input inp[maxLen];
    signal output out;

    signal is_zero[maxLen];
    signal is_nonzero[maxLen];

    component iz[maxLen];
    // For each character position, check if it's zero or non-zero
    for (var i = 0; i < maxLen; i++) {
        iz[i] = IsZero();
        iz[i].in <== characters[i];
        is_zero[i] <== iz[i].out;
        is_nonzero[i] <== 1 - is_zero[i];
    }
    
    // Sum up all the non-zero positions to get the string length
    var totalLength = 0;
    for (var i = 0; i < maxLen; i++) {
        totalLength += is_nonzero[i];
    }
    // Set the output length
    length <== totalLength;
    // Ensure that the characters after the first 0 are also 0
    component selector[maxLen];
    for (var i = 0; i < maxLen; i++) {
        selector[i] = GreaterEqThan(11);
        selector[i].in[0] <== i;
        selector[i].in[1] <== length;
    }

    for (var i = 0; i < maxLen; i++) {
        selector[i].out * inp[i] === 0;
    }
}

// long_to_bytes function, big endian
template longToBytes(byteLength){
    signal input inp; // inp < p
    signal output out[byteLength]; // each out is < 256

    // Rangecheck in and out?

    // convert inp to binary
    component nbytes = Num2Bits(8 * byteLength); // Num2Bits is binary presentation, LSB is on the left
    nbytes.in <== inp;

    component bytes[byteLength];

    for (var k = 0; k < byteLength; k++){
        out[k] <-- (inp >> ((byteLength - k - 1) * 8)) % 256;

        // Constrain out to match Num2Bits output
        bytes[k] = Num2Bits(8);
        bytes[k].in <== out[k];
        for (var j = 0; j < 8; j++) {
            nbytes.out[(byteLength - k - 1) * 8 + j] === bytes[k].out[j];
        }
    }
}

// Converts byte array `in` into a bit array. All values in `in` are
// assumed to be one byte each, i.e. between 0 and 255 inclusive.
// These bytes are also assumed to be in big endian order
template bytesToBits(maxInputLen) {
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

// check full == left || right
// concatCheck(maxJWTLen, maxJWTHeaderLen, maxJWTPayloadLen)(jwt, headerLen, jwtHeader, payloadLen, jwtPayload);
template concatCheck(maxFullLen, maxLeftLen, maxRightLen){
    signal input full[maxFullLen];
    signal input leftStr[maxLeftLen];
    signal input rightStr[maxRightLen];

    signal leftLen <== msgLen(maxLeftLen)(leftStr);
    signal rightLen <== msgLen(maxRightLen)(rightStr);
    assert(leftLen + rightLen <= maxFullLen);

    signal leftHash <== HashBytesToFieldWithLen(maxLeftLen)(left, leftLen); 
    signal rightHash <== HashBytesToFieldWithLen(maxRightLen)(right, rightLen);
    signal fullHash <== HashBytesToFieldWithLen(maxFullLen)(full, leftLen + rightLen);
    signal randomChallenge <== Poseidon(4)([leftHash, rightHash, fullHash, leftLen]);

    // Enforce that all values to the right of `left_len` in `left` are 0-padding. Otherwise an attacker could place the leftmost part of `right` at the end of `left` and still have the polynomial check pass
    // signal left_selector[maxLeftLen] <== RightArraySelector(maxLeftLen)(leftLen-1);
    component leftSelector[maxLeftLen];
    for (var i = 0; i < maxLeftLen; i++) {
        leftSelector[i] = GreaterEqThan(11);
        leftSelector[i].in[0] <== i;
        leftSelector[i].in[1] <== leftLen;
    }

    for (var i = 0; i < maxLeftLen; i++) {
        leftSelector[i].out * left[i] === 0;
    }
    // Compute x^i for i = 0, 1, ..., maxFullLen-1
    signal challengePowers[maxFullLen];
    challengePowers[0] <== 1;
    challengePowers[1] <== randomChallenge;
    for (var i = 2; i < maxFullLen; i++) {
       challengePowers[i] <== challengePowers[i-1] * randomChallenge; 
    }
    // Compute left(x)
    signal leftPoly[maxLeftLen];
    for (var i = 0; i < maxLeftLen; i++) {
       leftPoly[i] <== left[i] * challengePowers[i];
    }
    // Compute right(x)
    signal rightPoly[maxRightLen];
    for (var i = 0; i < maxRightLen; i++) {
        rightPoly[i] <== right[i] * challengePowers[i];
    }
    // Compute full(x)
    signal fullPoly[maxFullLen];
    for (var i = 0; i < maxFullLen; i++) {
        fullPoly[i] <== full[i] * challengePowers[i];
    }

    signal leftPolyEval <== calculateTotal(maxLeftLen)(leftPoly);
    signal rightPolyEval <== calculateTotal(maxRightLen)(rightPoly);
    signal fullPolyEval <== calculateTotal(maxFullLen)(fullPoly);

    component distinguishingValue= quinSelector(maxFullLen);
    distinguishingValue.in <== challengePowers;
    distinguishingValue.index <== leftLen;
    
    fullPolyEval === leftPolyEval + distinguishingValue.out * rightPolyEval;
}

