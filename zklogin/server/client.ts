import axios from 'axios';
import fs from 'fs';

async function testProofGeneration() {
  try {
    // Load your circuit input file 
    // (You can adapt this to send the input directly from your main.ts)
    const input = JSON.parse(fs.readFileSync("out/input.json", 'utf8'));
    
    console.log('Sending input to proof generation server...');
    
    // Send the input to the server
    const response = await axios.post('http://34.80.24.2:3000/generate-proof', input, {
      headers: {
        'Content-Type': 'application/json'
      },
      // Increase timeout for large proofs
      timeout: 300000 // 5 minutes
    });
    
    if (response.data.success) {
      console.log(`Proof generated successfully in ${response.data.timeElapsed} seconds`);
      
      // Save the proof and public signals to files
      fs.writeFileSync('proof.json', JSON.stringify(response.data.proof, null, 2));
      fs.writeFileSync('public.json', JSON.stringify(response.data.publicSignals, null, 2));
      
      console.log('Proof and public signals saved to files');
      
      // Now you can use these files for verification
      console.log('Proof:', response.data.proof);
      console.log('Public Signals:', response.data.publicSignals);
    } else {
      console.error('Proof generation failed:', response.data.error);
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Request failed:', error.message);
      if (error.response) {
        console.error('Server response:', error.response.data);
      }
    } else {
      console.error('Error:', error);
    }
  }
}

testProofGeneration();