import React, { createContext, useState, useContext, useEffect } from "react";
import { connectToWallet, detectWallet } from "@/utils/walletUtils";
import { toast } from "sonner";
import { ethers } from "ethers";  // Import ethers instead of utils
// import {buildPoseidon} from "circomlibjs";
// import { Buffer } from 'buffer';
import axios from "axios";

// @ts-ignore
//window.Buffer = Buffer;

interface AuthContextType {
  walletAddress: string | null;
  // isConnecting: boolean;
  isAuthenticated: boolean;
  hasWallet: boolean;
  // connectWallet: () => Promise<string>;
  // disconnectWallet: () => void;
  generateWalletFromToken: (token: string, userId: string) => Promise<string>;
}

const AuthContext = createContext<AuthContextType>({
  walletAddress: null,
  // isConnecting: false,
  isAuthenticated: false,
  hasWallet: false,
  // connectWallet: async () => "",
  // disconnectWallet: () => {},
  generateWalletFromToken: async () => "",
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [hasWallet, setHasWallet] = useState<boolean>(false);
  
  useEffect(() => {
    // Check if wallet is available in the browser
    const walletAvailable = detectWallet();
    setHasWallet(walletAvailable);
    
    // Check for stored wallet connections - also check for ZKP identity
    const savedAddress = localStorage.getItem("walletAddress") || localStorage.getItem("wallet_address");
    if (savedAddress) {
      setWalletAddress(savedAddress);
    }
  }, []);
  
  // const connectWallet = async () => {
  //   if (isConnecting) return "";
    
  //   setIsConnecting(true);
    
  //   try {
  //     const address = await connectToWallet();
  //     setWalletAddress(address);
  //     localStorage.setItem("walletAddress", address);
  //     return address;
  //   } catch (error) {
  //     console.error("Failed to connect wallet:", error);
  //     toast.error("Could not connect to wallet. Please try again.");
  //     throw error;
  //   } finally {
  //     setIsConnecting(false);
  //   }
  // };

  async function calculateZkAddrSaltFromServer(jwt: string, salt: string | number) {
    try {
      console.log('Sending JWT and salt to zkaddr_salt endpoint...');
      
      const response = await axios.post('http://localhost:3001/zkaddr_salt', {
        jwt,
        salt
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 seconds
      });
      
      if (response.data.success) {
        console.log('zkaddr_salt calculated successfully');
        console.log('zkaddr_salt:', response.data.zkaddr_salt);
        return response.data.zkaddr_salt;
      } else {
        console.error('zkaddr_salt calculation failed:', response.data.error);
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

  async function getWalletAddr(ownerAddr: string, salt: string) {
    try {
      console.log('Sending owneraddr and salt to deploy endpoint...'); // Updated log message
      
      const response = await axios.post('http://localhost:3001/deploy', {
        ownerAddr,
        salt
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 seconds
      });
      
      if (response.data.success) {
        console.log('walletaddr:', response.data.walletAddress); // Updated log message
        return response.data.walletAddress; // Fixed: return wallet_address, not zkaddr_salt
      } else {
        console.error('wallet addr calculation failed:', response.data.error);
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
  
  // Generate a zero-knowledge compatible identity from OAuth JWT token
  const generateWalletFromToken = async (token: string, salt: string): Promise<string> => {
    setIsConnecting(true);
    
    try {
      const zkaddr_salt = await calculateZkAddrSaltFromServer(token, salt);
      const wallet = localStorage.getItem('wallet');
      const walletdata = JSON.parse(wallet);
      const identityHash = await getWalletAddr(walletdata.address, zkaddr_salt);

      // Store the identity
      setWalletAddress(identityHash);
      localStorage.setItem("wallet_address", identityHash);
      
      toast.success("Secure identity created successfully");
      
      return identityHash;
    } catch (error) {
      console.error("Error generating identity from token:", error);
      toast.error("Failed to create secure identity");
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };
  
  // const disconnectWallet = () => {
  //   setWalletAddress(null);
  //   localStorage.removeItem("walletAddress");
  //   localStorage.removeItem("wallet_address");
  //   localStorage.removeItem("zkp_credentials");
  //   localStorage.removeItem("token");
  //   toast.success("Identity disconnected");
  // };
  
  const value = {
    walletAddress,
    // isConnecting,
    isAuthenticated: !!walletAddress,
    hasWallet,
    // connectWallet,
    // disconnectWallet,
    generateWalletFromToken,
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;