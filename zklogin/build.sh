#!/bin/bash

echo "1. clearing files to rebuild"
rm -rf ./out && mkdir ./out

echo "2. compiling circuit to snarkjs..."
circom circuit.circom --r1cs --wasm --sym --output=out

echo "3. groth16 setup"
snarkjs groth16 setup out/main.r1cs pot14_final.ptau out/circuit_0001.zkey

echo "4. export verification key"
snarkjs zkey export verificationkey target/circuit_0001.zkey target/verification_key.json

