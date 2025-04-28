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

describe("Sha256", function () {
    this.timeout(100000);
    it("Should correctly compute the SHA-256 hash of a JWT", async function () {
        // The JWT from the prompt
        const jwt = "eyJhbGciOiJSUzI1NiIsImtpZCI6IjIzZjdhMzU4Mzc5NmY5NzEyOWU1NDE4ZjliMjEzNmZjYzBhOTY0NjIiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiIzMjEyOTQ2MTk3NzYtcGtybnFkaThyYTZndnN1MmZxZjdrN2VidDE3Nmlvc28uYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJhdWQiOiIzMjEyOTQ2MTk3NzYtcGtybnFkaThyYTZndnN1MmZxZjdrN2VidDE3Nmlvc28uYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMTI5NTIzNjA2NzQyMDUxNjM0MzkiLCJub25jZSI6ImNhOTc4MTEyY2ExYmJkY2FmYWMyMzFiMzlhMjNkYzRkYTc4NmVmZjgxNDdjNGU3MmI5ODA3Nzg1YWZlZTQ4YmIiLCJuYmYiOjE3NDU2MDY3NTgsImlhdCI6MTc0NTYwNzA1OCwiZXhwIjoxNzQ1NjEwNjU4LCJqdGkiOiIzYmE4ZmQ2MTc1MzhjOWEwMmNkZmFjMGE2NTkyNjUxOGVkZjZjYzFkIn0";
        // Convert JWT string to array of bytes as strings
        const jwtBytes = Array.from(jwt).map(char => char.charCodeAt(0).toString());
        fs.writeFileSync('./jwt-bytes.json', JSON.stringify(jwtBytes, null, 2));
        console.log("JWT bytes written to jwt-bytes.json");
        // Calculate max JWT length and blocks
        const maxJWTLen = 1536;
        
        while(jwtBytes.length < maxJWTLen) {
            jwtBytes.push("0");
        }
        // Create input object for the circuit
        const input = {
            jwt: jwtBytes
        };
        
        // Load and test the circuit
        const circuit = await wasm_tester(
            path.join(__dirname, "sha.circom"),
            {
                output: path.join(__dirname),
                recompile: false,
            }
        );
        
        const witness = await circuit.calculateWitness(input);
        await circuit.checkConstraints(witness);
        // Get the output hash
        const outputs = await circuit.getOutput(witness, {"jwt": [1536], "jwtHash": [256]});
        console.log("JWT SHA-256 Hash:", outputs);
        // Convert output bit array to hexadecimal string
        const hashBits = outputs.jwtHash;
        fs.writeFileSync('./output.json', JSON.stringify(hashBits, null, 2));
        console.log("Hash bits:", hashBits);
        // Convert bit array to a decimal number (big integer)
        let hashDecimal = BigInt(0);
        for (let i = 0; i < hashBits.length; i++) {
            hashDecimal = (hashDecimal << BigInt(1)) | BigInt(Number(hashBits[i]));
        }
        
        console.log("Hash as decimal:", hashDecimal.toString());
        const expectedHashDecimal = "75982967283796070257171996156856819389476856108342592990274227587746301431275";
        assert.equal(hashDecimal.toString(), expectedHashDecimal, "SHA-256 hash does not match expected value");
    });

});