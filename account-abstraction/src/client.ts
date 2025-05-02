// client.ts
import axios from 'axios';

const SERVER_URL = 'http://0.0.0.0:3001';

async function deployWallet(ownerAddr: string, salt: string) {
  try {
    
    const response = await axios.post(`${SERVER_URL}/deploy`, {
      ownerAddr,
      salt
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 1 minute
    });
    
    if (response.data.success) {
      return response.data;
    } else {
      throw new Error(response.data.error || 'Unknown error');
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
    throw error;
  }
}

// Example usage with random address and salt
const ownerAddr = "0x7f3b4c8d2e5a1c6f9e4b8c3d2e5a1c6f9e4b8c3d";
const salt = "10403319527500853175486048825814520397993154997605732805524347897534756194923";
deployWallet(ownerAddr, salt)
  .then((result) => {
    console.log('Result:', result);
  })
  .catch((error) => {
    console.error('Error during wallet deployment:', error);
  });