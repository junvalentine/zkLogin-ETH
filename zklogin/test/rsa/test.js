const chai = require("chai");
const path = require("path");
const wasm_tester = require("./../../index").wasm;
const c_tester = require("./../../index").c;
const fs = require('fs');

const F1Field = require("ffjavascript").F1Field;
const Scalar = require("ffjavascript").Scalar;
exports.p = Scalar.fromString("21888242871839275222246405745257275088548364400416034343698204186575808495617");
const Fr = new F1Field(exports.p);

const assert = chai.assert;

describe("RSA", function () {
    this.timeout(100000);
    it("Should correctly verify the JWT", async function () {
        const inputData = JSON.parse(fs.readFileSync(
            path.join(__dirname, 'input.json'), 
            'utf8'
        ));
        // Create input object for the circuit
        const input = {
            pubOPModulus: inputData.pubOPModulus,
            jwtHash: inputData.jwtHash,
            signature: inputData.signature
        };
        console.log(input);
        // Load and test the circuit
        const circuit = await wasm_tester(
            path.join(__dirname, "rsa.circom"),
            {
                output: path.join(__dirname),
                // recompile: false,
            }
        );
        
        const witness = await circuit.calculateWitness(input);
        await circuit.checkConstraints(witness);
    });

});