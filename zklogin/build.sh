#!/bin/bash

echo "1. clearing files to rebuild"
rm -rf ./out && mkdir ./out

echo "2. compiling circuit to snarkjs..."
circom circuits/main.circom --r1cs --wasm --sym --output=out

echo "3. groth16 setup"
snarkjs groth16 setup out/main.r1cs powersOfTau28_hez_final_21.ptau out/circuit_final.zkey

echo "4. export verification key"
snarkjs zkey export verificationkey out/circuit_final.zkey out/verification_key.json

echo "5. generate contract"
snarkjs zkey export solidityverifier out/circuit_final.zkey out/verifier.sol