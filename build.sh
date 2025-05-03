#!/bin/bash

# Deploy contracts
anvil --host 0.0.0.0 --port 8545
cd account-abstraction
npx hardhat deploy --network localhost
cd ..

## run bundler
cd skandha
nvm use v18.0.0
./skandha standalone
cd ..

## run prover service
cd zklogin
ts-node src/server.ts 
cd ..