
// Simple wallet connection simulation

// This is a simulated wallet connection utility
// In a real app, you would use libraries like ethers.js, web3.js or wagmi
export const ERROR_CODES = {
  USER_REJECTED: "USER_REJECTED",
  UNSUPPORTED_CHAIN: "UNSUPPORTED_CHAIN",
  WALLET_NOT_FOUND: "WALLET_NOT_FOUND",
};

// Simulate the detection of browser wallet
export const detectWallet = (): boolean => {
  // In reality, you would check for injected providers like window.ethereum
  return true;
};

// Simulate connecting to a wallet
export const connectToWallet = async (): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Simulate network delay
    setTimeout(() => {
      // Simulate 90% success rate
      if (Math.random() > 0.1) {
        // Generate a random wallet address
        const address = "wallet.address"; // Use the wallet instance from OAuthProviders
        resolve(address);
      } else {
        reject(new Error(ERROR_CODES.USER_REJECTED));
      }
    }, 1000);
  });
};

// Simulate getting current chain ID
export const getChainId = async (): Promise<number> => {
  return Promise.resolve(1); // Ethereum Mainnet
};

// Simulate signing a message
export const signMessage = async (
  address: string,
  message: string
): Promise<string> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // In reality, this would be a proper signature
      const signature = `0x${Array.from({ length: 130 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join("")}`;
      resolve(signature);
    }, 1000);
  });
};
