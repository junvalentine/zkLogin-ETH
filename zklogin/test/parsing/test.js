const chai = require("chai");
const path = require("path");
const circomlibjs = require("circomlibjs");
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
    // it("Check Poseidon", async function () {
    //     // Create input object for the circuit
    //     const input = {
    //         "a": [1,1,1,1,1,1]
    //     };
    //     console.log(input);
    //     // Load and test the circuit
    //     const circuit = await wasm_tester(
    //         path.join(__dirname, "poseidontest.circom"),
    //         {
    //             output: path.join(__dirname),
    //             // recompile: false,
    //         }
    //     );
    //     const poseidon = await circomlibjs.buildPoseidon();
    //     const hash = poseidon.F.toString(poseidon([1,1,1,1,1,1]));
    //     console.log(hash);
    //     const witness = await circuit.calculateWitness(input);
    //     await circuit.checkConstraints(witness);
    //     const output = await circuit.getOutput(witness, {"out": 1});
    //     assert.equal(output.out, hash);
    // });
    it("Should correctly verify the JWT", async function () {
        const jwt = "eyJhbGciOiJSUzI1NiIsImtpZCI6IjIzZjdhMzU4Mzc5NmY5NzEyOWU1NDE4ZjliMjEzNmZjYzBhOTY0NjIiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiIzMjEyOTQ2MTk3NzYtcGtybnFkaThyYTZndnN1MmZxZjdrN2VidDE3Nmlvc28uYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJhdWQiOiIzMjEyOTQ2MTk3NzYtcGtybnFkaThyYTZndnN1MmZxZjdrN2VidDE3Nmlvc28uYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMTI5NTIzNjA2NzQyMDUxNjM0MzkiLCJub25jZSI6ImNhOTc4MTEyY2ExYmJkY2FmYWMyMzFiMzlhMjNkYzRkYTc4NmVmZjgxNDdjNGU3MmI5ODA3Nzg1YWZlZTQ4YmIiLCJuYmYiOjE3NDU2MDY3NTgsImlhdCI6MTc0NTYwNzA1OCwiZXhwIjoxNzQ1NjEwNjU4LCJqdGkiOiIzYmE4ZmQ2MTc1MzhjOWEwMmNkZmFjMGE2NTkyNjUxOGVkZjZjYzFkIn0";
        const jwtBytes = Array.from(jwt).map(char => char.charCodeAt(0).toString());
        fs.writeFileSync('./jwtBytes.json', JSON.stringify(jwtBytes, null, 2));
        const maxJWTLen = 1536;
        while(jwtBytes.length < maxJWTLen) {
            jwtBytes.push("0");
        }
        const jwtHeader = "eyJhbGciOiJSUzI1NiIsImtpZCI6IjIzZjdhMzU4Mzc5NmY5NzEyOWU1NDE4ZjliMjEzNmZjYzBhOTY0NjIiLCJ0eXAiOiJKV1QifQ.";
        const jwtH = Array.from(jwtHeader).map(char => char.charCodeAt(0).toString());
        fs.writeFileSync('./jwtHeader.json', JSON.stringify(jwtH, null, 2));
        const maxJWTHeaderLen = 300;
        while(jwtH.length < maxJWTHeaderLen) {
            jwtH.push("0");
        }
        const jwtPayload = "eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiIzMjEyOTQ2MTk3NzYtcGtybnFkaThyYTZndnN1MmZxZjdrN2VidDE3Nmlvc28uYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJhdWQiOiIzMjEyOTQ2MTk3NzYtcGtybnFkaThyYTZndnN1MmZxZjdrN2VidDE3Nmlvc28uYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMTI5NTIzNjA2NzQyMDUxNjM0MzkiLCJub25jZSI6ImNhOTc4MTEyY2ExYmJkY2FmYWMyMzFiMzlhMjNkYzRkYTc4NmVmZjgxNDdjNGU3MmI5ODA3Nzg1YWZlZTQ4YmIiLCJuYmYiOjE3NDU2MDY3NTgsImlhdCI6MTc0NTYwNzA1OCwiZXhwIjoxNzQ1NjEwNjU4LCJqdGkiOiIzYmE4ZmQ2MTc1MzhjOWEwMmNkZmFjMGE2NTkyNjUxOGVkZjZjYzFkIn0";        // Convert JWT string to array of bytes as strings
        const jwtP = Array.from(jwtPayload).map(char => char.charCodeAt(0).toString());
        fs.writeFileSync('./jwtPayload.json', JSON.stringify(jwtP, null, 2));
        const maxJWTPayloadLen = 1472;
        while(jwtP.length < maxJWTPayloadLen) {
            jwtP.push("0");
        }
        const inputData = JSON.parse(fs.readFileSync(
            path.join(__dirname, 'input.json'), 
            'utf8'
        ));
        // Create input object for the circuit
        const input = {
            jwt: jwtBytes,
            pubOPModulus: inputData.pubOPModulus,
            jwtHash: inputData.jwtHash,
            signature: inputData.signature,
            jwtHeader: jwtH,
            jwtPayload: jwtP,
            nonceKeyStartIndex: 229,
            nonceLength: 64,
        };

        // Load and test the circuit
        const circuit = await wasm_tester(
            path.join(__dirname, "parse.circom"),
            {
                output: path.join(__dirname),
                // recompile: false,
            }
        );
        
        const witness = await circuit.calculateWitness(input);
        await circuit.checkConstraints(witness);
    });

});