pragma circom 2.0.0;


include "../../../circuits/sha.circom";
include "../../../circuits/rsa/rsa_verify.circom";
include "../../../circuits/circomlib/circuits/comparators.circom";
include "../../../circuits/base64.circom";
include "../../../circuits/fields.circom";
include "../../../circuits/circomlib/circuits/poseidon.circom";

template rsaTest(){  
    signal input a[6];

    signal output out <== Poseidon(6)([a[0], a[1], a[2], a[3], a[4], a[5]]);  
}

component main = rsaTest();