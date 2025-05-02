// server.ts
import express from 'express';
import cors from 'cors';
import { execSync } from 'child_process';
import * as snarkjs from 'snarkjs';
import { performance } from 'perf_hooks';
import fs from 'fs';

const app = express();
const port = 3000;

// Configure middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit for large inputs

// Route for generating proofs - fix the TypeScript issue with route handler
app.post('/generate-proof', function(req, res) {
  (async () => {
    try {
      console.log('Received proof generation request');
      
      const input = req.body;
      if (!input) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing circuit input' 
        });
      }
  
      console.log('Input received, generating witness...');
      
      // Define file paths
      const wasmPath = 'out/main_js/main.wasm';
      const witnessPath = 'out/witness.wtns';
      const zkeyPath = 'out/circuit_final.zkey';
      const proofPath = 'out/proof.json';
      const publicPath = 'out/public.json';
      
      // Generate witness
      try {
        await snarkjs.wtns.calculate(input, wasmPath, witnessPath);
        console.log('Witness generated, starting proof generation with rapidsnark...');
      } catch (error) {
        console.error("Error generating witness:", error);
        return res.status(500).json({ 
          success: false, 
          error: 'Witness generation failed',
          message: error instanceof Error ? error.message : String(error) 
        });
      }
      
      // Generate proof using rapidsnark
      const startTime = performance.now();
      try {
        // Adjust this path to match your rapidsnark installation
        const rapidsnarkPath = './rapidsnark/package/bin/prover';
        
        const command = `${rapidsnarkPath} ${zkeyPath} ${witnessPath} ${proofPath} ${publicPath}`;
        
        execSync(command, { encoding: 'utf8' });

        const endTime = performance.now();
        const timeElapsed = (endTime - startTime) / 1000; // convert to seconds
        console.log(`Rapidsnark proof generation completed in ${timeElapsed.toFixed(2)} seconds`);

        execSync("cat out/proof.json | tr -d '\\0' | sed -n '/{/,/}/p' > out/proof_fixed.json");
        execSync("cat out/public.json | tr -d '\\0' | sed -n '/[/,/]/p' > out/public_fixed.json");

        // Read generated proof and public signals
        const proof = JSON.parse(fs.readFileSync("out/proof_fixed.json", 'utf8'));
        const publicSignals = JSON.parse(fs.readFileSync("out/public_fixed.json", 'utf8'));
        
        // Return the proof and public signals
        return res.json({
          success: true,
          timeElapsed: timeElapsed.toFixed(2),
          proof,
          publicSignals
        });
      } catch (error) {
        console.error("Error executing rapidsnark:", error);
        return res.status(500).json({ 
          success: false, 
          error: 'Proof generation failed',
          message: error instanceof Error ? error.message : String(error) 
        });
      }
    } catch (error) {
      console.error('Server error:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : String(error)
      });
    }
  })().catch(error => {
    console.error('Unhandled promise rejection:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error', 
      message: error instanceof Error ? error.message : String(error)
    });
  });
});

// Health check endpoint
app.get('/health', function(req, res) {
  res.json({ status: 'ok' });
});

// Start the server
app.listen(port, () => {
  console.log(`ZK Proof server running at http://localhost:${port}`);
  console.log(`Send POST requests to /generate-proof with the circuit input as JSON body`);
});