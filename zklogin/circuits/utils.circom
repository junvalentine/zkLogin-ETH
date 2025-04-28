pragma circom 2.0.0;

include "./circomlib/circuits/bitify.circom";
include "./circomlib/circuits/comparators.circom";
include "./circomlib/circuits/gates.circom";
include "./hashtofield.circom";

function log2Ceil(a) {
    var n = a - 1;
    var r = 0;

    while (n > 0) {
        r++;
        n \= 2;
    }

    return r;
}

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
    calcTotal.nums[i] <== eqs[i].out * in[i];
  }

  // Returns 0 + 0 + 0 + item
  out <== calcTotal.sum;
}

// Circuit to calculate the length of a message
template msgLen(maxLen){
    signal input inp[maxLen];
    signal output out;

    signal is_nonzero[maxLen];
    component iz[maxLen];
    // For each character position, check if it's zero or non-zero
    for (var i = 0; i < maxLen; i++) {
        iz[i] = IsZero();
        iz[i].in <== inp[i];
        is_nonzero[i] <== 1 - iz[i].out;
    }
    
    // Sum up all the non-zero positions to get the string length
    var totalLength = 0;
    for (var i = 0; i < maxLen; i++) {
        totalLength += is_nonzero[i];
    }
    // Set the output length
    out <== totalLength;
    // Ensure that the characters after the first 0 are also 0
    component selector[maxLen];
    for (var i = 0; i < maxLen; i++) {
        selector[i] = GreaterEqThan(11);
        selector[i].in[0] <== i;
        selector[i].in[1] <== out;
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

template bytesToLong(maxLen){
    signal input inp[maxLen]; // each inp is < 256
    signal input len;
    signal output out;

    // check if all bytes are less than 256
    for (var i = 0; i < maxLen; i++) {
        var is_byte = LessThan(9)([inp[i], 256]);
        is_byte === 1;
    }

    // Set to 0 everywhere except len-1, which is 1
    signal index_eq[maxLen - 1];
    // For ASCII digits ['1','2','3','4','5'], acc_shifts[0..3] is [12,123,1234]
    signal acc_shifts[maxLen - 1];
    // accumulators[i] = acc_shifts[i-1] for all i < len, otherwise accumulators[i] = accumulators[i-1]
    signal accumulators[maxLen];

    signal success;
    var index_eq_sum = 0;
    // `s` is initally set to 1 and is 0 after len == i
    var s = 1; 

    accumulators[0] <== inp[0];
    for (var i=1; i< maxLen; i++) {
        index_eq[i-1] <-- (len == i) ? 1 : 0;
        index_eq[i-1] * (len-i) === 0;

        s = s - index_eq[i-1];
        index_eq_sum = index_eq_sum + index_eq[i-1];

        acc_shifts[i-1] <== 256 * accumulators[i-1] + (inp[i]);
        // // This implements a conditional assignment: accumulators[i] = (s == 0 ? accumulators[i-1] : acc_shifts[i-1]);
        accumulators[i] <== (acc_shifts[i-1] - accumulators[i-1])*s + accumulators[i-1];
    }

    index_eq_sum ==> success;
    // Guarantee at most one element of index_eq is equal to 1
    success === 1;

    out <== accumulators[maxLen - 1];

}

template strToInt(maxLen) {
    signal input digits[maxLen]; 
    signal input len; 
    signal output out;

    // CheckAreASCIIDigits(maxLen)(digits, len);
    // check or digits or 0
    for (var i = 0; i < maxLen; i++) {
        var is_less_than_max = LessThan(9)([digits[i], 58]);
        var is_greater_than_min = GreaterThan(9)([digits[i], 47]);
        var is_ascii_digit = AND()(is_less_than_max, is_greater_than_min);
        (1-is_ascii_digit) * digits[i] === 0;
    }

    // Set to 0 everywhere except len-1, which is 1
    signal index_eq[maxLen - 1];
    // For ASCII digits ['1','2','3','4','5'], acc_shifts[0..3] is [12,123,1234]
    signal acc_shifts[maxLen - 1];
    // accumulators[i] = acc_shifts[i-1] for all i < len, otherwise accumulators[i] = accumulators[i-1]
    signal accumulators[maxLen];

    signal success;
    var index_eq_sum = 0;
    // `s` is initally set to 1 and is 0 after len == i
    var s = 1; 

    accumulators[0] <== digits[0]-48;
    for (var i=1; i< maxLen; i++) {
        index_eq[i-1] <-- (len == i) ? 1 : 0;
        index_eq[i-1] * (len-i) === 0;

        s = s - index_eq[i-1];
        index_eq_sum = index_eq_sum + index_eq[i-1];

        acc_shifts[i-1] <== 10 * accumulators[i-1] + (digits[i]-48);
        // // This implements a conditional assignment: accumulators[i] = (s == 0 ? accumulators[i-1] : acc_shifts[i-1]);
        accumulators[i] <== (acc_shifts[i-1] - accumulators[i-1])*s + accumulators[i-1];
    }

    index_eq_sum ==> success;
    // Guarantee at most one element of index_eq is equal to 1
    success === 1;

    out <== accumulators[maxLen - 1];
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
    signal input fullStr[maxFullLen];
    signal input leftStr[maxLeftLen];
    signal input rightStr[maxRightLen];

    signal leftLen <== msgLen(maxLeftLen)(leftStr);
    signal rightLen <== msgLen(maxRightLen)(rightStr);
    assert(leftLen + rightLen <= maxFullLen);

    signal leftHash <== HashBytesToFieldWithLen(maxLeftLen)(leftStr, leftLen); 
    signal rightHash <== HashBytesToFieldWithLen(maxRightLen)(rightStr, rightLen);
    signal fullHash <== HashBytesToFieldWithLen(maxFullLen)(fullStr, leftLen + rightLen);
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
        leftSelector[i].out * leftStr[i] === 0;
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
       leftPoly[i] <== leftStr[i] * challengePowers[i];
    }
    // Compute right(x)
    signal rightPoly[maxRightLen];
    for (var i = 0; i < maxRightLen; i++) {
        rightPoly[i] <== rightStr[i] * challengePowers[i];
    }
    // Compute full(x)
    signal fullPoly[maxFullLen];
    for (var i = 0; i < maxFullLen; i++) {
        fullPoly[i] <== fullStr[i] * challengePowers[i];
    }

    signal leftPolyEval <== calculateTotal(maxLeftLen)(leftPoly);
    signal rightPolyEval <== calculateTotal(maxRightLen)(rightPoly);
    signal fullPolyEval <== calculateTotal(maxFullLen)(fullPoly);

    component distinguishingValue= quinSelector(maxFullLen);
    distinguishingValue.in <== challengePowers;
    distinguishingValue.index <== leftLen;
    
    fullPolyEval === leftPolyEval + distinguishingValue.out * rightPolyEval;
}
// taken from zk-email
// Shift left array by `shift` indices
template varShiftLeft(maxArrayLen, maxOutArrayLen) {
    assert(maxOutArrayLen <= maxArrayLen);

    var bitLength = log2Ceil(maxArrayLen);

    signal input in[maxArrayLen];
    signal input shift;

    signal output out[maxOutArrayLen];

    component n2b = Num2Bits(bitLength);
    n2b.in <== shift;

    signal tmp[bitLength][maxArrayLen];
    for (var j = 0; j < bitLength; j++) {
        for (var i = 0; i < maxArrayLen; i++) {
            var offset = (i + (1 << j)) % maxArrayLen;
            // Shift left by 2^j indices if bit is 1
            if (j == 0) {
                tmp[j][i] <== n2b.out[j] * (in[offset] - in[i]) + in[i];
            } else {
                tmp[j][i] <== n2b.out[j] * (tmp[j-1][offset] - tmp[j-1][i]) + tmp[j-1][i];
            }
        }
    }

    // Return last row
    for (var i = 0; i < maxOutArrayLen; i++) {
        out[i] <== tmp[bitLength - 1][i];
    }
}

// taken from zk-email
// output array[startIndex, startIndex + length - 1]
template selectSubArray(maxArrayLen, maxSubArrayLen) {
    assert(maxSubArrayLen < maxArrayLen);

    signal input in[maxArrayLen];
    signal input startIndex;
    signal input length;

    signal output out[maxSubArrayLen];

    component shifter = varShiftLeft(maxArrayLen, maxSubArrayLen);
    shifter.in <== in;
    shifter.shift <== startIndex;

    // Set value after length to zero
    component gts[maxSubArrayLen];
    for (var i = 0; i < maxSubArrayLen; i++) {
        gts[i] = GreaterThan(log2Ceil(maxSubArrayLen));
        gts[i].in[0] <== length;
        gts[i].in[1] <== i;

        out[i] <== gts[i].out * shifter.out[i];
    }
}

// taken from zk-email
// template revealSubstring(maxLength, maxSubstringLength, shouldCheckUniqueness) {
// doesnt check uniqueness
template revealSubstring(maxLength, maxSubstringLength) {
    assert(maxSubstringLength < maxLength);

    signal input in[maxLength];
    signal input substringStartIndex;
    signal input substringLength;

    signal output out[maxSubstringLength];

    // Substring start index should be less than maxLength
    signal isSubstringStartIndexValid <== LessThan(log2Ceil(maxLength))([substringStartIndex, maxLength]);
    isSubstringStartIndexValid === 1;

    // Substring length should be less than maxSubstringLength + 1
    signal isSubstringLengthValid <== LessThan(log2Ceil(maxSubstringLength + 1))([substringLength, maxSubstringLength + 1]);
    isSubstringLengthValid === 1;

    // substring index + substring length should be less than maxLength + 1
    signal sum <== substringStartIndex + substringLength;
    signal isSumValid <== LessThan(log2Ceil(maxLength + 1))([sum, maxLength + 1]);
    isSumValid === 1;

    // Extract the substring
    out <== selectSubArray(maxLength, maxSubstringLength)(in, substringStartIndex, substringLength);

    // if (shouldCheckUniqueness) {
    //     // Check if the substring occurs exactly once in the input
    //     component countSubstringOccurrences = CountSubstringOccurrences(maxLength, maxSubstringLength);
    //     countSubstringOccurrences.in <== in;
    //     countSubstringOccurrences.substring <== selectSubArray.out;
    //     countSubstringOccurrences.count === 1;
    // }
}

