import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Shield, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { generateZKProof, prepareCircuitInput } from "@/utils/zkUtils";
import { toast } from "sonner";
import axios from "axios";

interface ProofData {
  proof: {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
    protocol: string;
  };
  publicSignals: string[];
  expiresAt: number;
  createdAt: number;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const ZKProofDemo = () => {
  const { walletAddress } = useAuth();
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<boolean | null>(null);
  const [proofData, setProofData] = useState<ProofData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Notify the dashboard when the proof verification status changes
  useEffect(() => {
    const event = new CustomEvent("zkproof-status-change", {
      detail: { verified: verificationResult === true }
    });
    window.dispatchEvent(event);
  }, [verificationResult]);
  
  // Load existing proof from database on component mount
  useEffect(() => {
    const fetchStoredProof = async () => {
      try {
        setIsLoading(true);
        
        // Get user sub from stored token
        const tokenData = localStorage.getItem("token");
        if (!tokenData) {
          setIsLoading(false);
          return;
        }
        
        const { idToken } = JSON.parse(tokenData);
        const tokenParts = idToken.split('.');
        if (tokenParts.length !== 3) {
          throw new Error("Invalid token format");
        }
        
        const payload = JSON.parse(atob(tokenParts[1]));
        const sub = payload.sub;
        
        if (!sub) {
          console.error("No subject ID found in token");
          setIsLoading(false);
          return;
        }
        
        // Fetch proof from database via API
        const response = await axios.get(`${API_URL}/api/zkproof?sub=${encodeURIComponent(sub)}`);
        
        if (response.data.success && response.data.proof) {
          const savedProof = response.data.proof as ProofData;
          
          if (savedProof.expiresAt > Date.now()) {
            setProofData(savedProof);
            setVerificationResult(true);
          }
        }
      } catch (error) {
        console.error("Error loading saved proof:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStoredProof();
  }, []);
  
  const handleProofVerification = async () => {
    if (!walletAddress) {
      toast.error("Please connect your wallet first");
      return;
    }
    
    setIsVerifying(true);
    
    try {
      // Get token from localStorage
      const tokenData = localStorage.getItem("token");
      if (!tokenData) {
        throw new Error("Authentication token not found. Please login first");
      }
      
      const { idToken } = JSON.parse(tokenData);
      
      // Extract subject ID for database storage
      const tokenParts = idToken.split('.');
      if (tokenParts.length !== 3) {
        throw new Error("Invalid token format");
      }
      
      const payload = JSON.parse(
        decodeURIComponent(
          atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/'))
            .split('')
            .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        )
      );
      const sub = payload.sub;
      
      if (!sub) {
        throw new Error("No subject ID found in token");
      }
      
      // First, check if a valid proof exists in database
      try {
        const response = await axios.get(`${API_URL}/api/zkproof?sub=${encodeURIComponent(sub)}`);
        
        if (response.data.success && response.data.proofData) {
          const savedProof = response.data.proofData as ProofData;
          
          // If proof is still valid (not expired), use it
          if (savedProof.expiresAt > Date.now()) {
            setProofData(savedProof);
            setVerificationResult(true);
            // Also update localStorage for backward compatibility
            localStorage.setItem("zk_proof", JSON.stringify(savedProof));
            toast.success("Retrieved existing valid proof");
            console.log("Existing proof retrieved:", savedProof);
            return; // Exit early since we found a valid proof
          }
        }
      } catch (error) {
        // Continue with generating a new proof if retrieval fails
        console.log("No existing valid proof found, generating new one");
      }
      
      // If we reach here, we need to generate a new proof
      const userInfoData = localStorage.getItem("user_info");
      if (!userInfoData) {
        throw new Error("User information not found");
      }
      
      const expiryTime = localStorage.getItem("zk_expiry_time");
      const salt = localStorage.getItem("salt");
      const r = localStorage.getItem("r");
  
      if (!expiryTime || !salt || !r) {
        throw new Error("Missing ZK parameters. Please authenticate first.");
      }
  
      // Call the utility function to generate and verify proof
      const input = await prepareCircuitInput(
        idToken, 
        expiryTime,
        salt,
        r
      );
      console.log("ZK proof input:", input);
  
      const { success, proof, publicSignals, expiresAt, createdAt, error } = await generateZKProof(input);
      
      setVerificationResult(success);
      
      if (success && proof) {

        console.log("ZK proof generated successfully:", proof);
        const completeProofData: ProofData = {
          proof,
          publicSignals,  // Include the public signals here
          expiresAt: expiresAt,
          createdAt: createdAt,
        };
      
        setProofData(completeProofData);
        
        // Store in database
        await axios.post(`${API_URL}/api/zkproof`, {
          sub,
          proofData: completeProofData,
        });
        
        // Also store in localStorage for backward compatibility
        localStorage.setItem("zk_proof", JSON.stringify(completeProofData));
        toast.success("New zero-knowledge identity proof verified successfully");
      } else {
        toast.error(error || "Failed to verify zero-knowledge identity proof");
      }
    } catch (error) {
      console.error("ZK verification error:", error);
      toast.error(error instanceof Error ? error.message : "An error occurred during verification");
      setVerificationResult(false);
    } finally {
      setIsVerifying(false);
    }
  };
  
  const resetVerification = async () => {
    setIsVerifying(true);
    
    try {
      // Get user sub from token
      const tokenData = localStorage.getItem("token");
      if (tokenData) {
        const { idToken } = JSON.parse(tokenData);
        const tokenParts = idToken.split('.');
        
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          const sub = payload.sub;
          
          if (sub) {
            // Delete from database via API
            await axios.delete(`${API_URL}/api/zkproof?sub=${encodeURIComponent(sub)}`);
          }
        }
      }
      
      // Clear UI state and localStorage
      setVerificationResult(null);
      setProofData(null);
      localStorage.removeItem("zk_proof");
      toast.success("Proof has been reset");
    } catch (error) {
      console.error("Error resetting proof:", error);
      toast.error("Failed to reset proof");
    } finally {
      setIsVerifying(false);
    }
  };
  
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };
  
  const calculateExpiryTime = (expiryTimestamp: number) => {
    const now = Date.now();
    const diff = expiryTimestamp - now;
    
    if (diff < 0) return "Expired";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m remaining`;
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Shield className="h-5 w-5" /> Zero-Knowledge Verification
      </h3>
      
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Verify your identity without exposing personal identification documents.
        </p>
        
        {renderVerificationUI()}
      </div>
    </div>
  );
  
  function renderVerificationUI() {
    if (verificationResult === true && proofData) {
      return (
        <>
          <div className="bg-green-950/30 border border-green-600/30 rounded-md p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <div className="w-full">
              <div className="flex justify-between items-center w-full">
                <p className="font-medium">Generate Successful</p>
                <span className="text-xs text-green-500">{calculateExpiryTime(proofData.expiresAt)}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Zero-knowledge proof validated without revealing your data
              </p>
            </div>
          </div>
          
          <div className="border border-border rounded-md p-4">
            <h4 className="text-sm font-medium mb-3">Proof Details</h4>
            
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-muted-foreground">Type:</span>
                <span>Identity Verification</span>
              </div>
              
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-muted-foreground">Created:</span>
                <span>{formatTimestamp(proofData.createdAt)}</span>
              </div>
              
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <span className="text-muted-foreground">Expires:</span>
                <span>{formatTimestamp(proofData.expiresAt)}</span>
              </div>
              
              {proofData.publicSignals && (
                <div className="grid grid-cols-[120px_1fr] gap-2">
                  <span className="text-muted-foreground">Public Signals:</span>
                  <span className="font-mono text-xs truncate">
                    {proofData.publicSignals[0] ? `0x${proofData.publicSignals[0].substring(0, 12)}...` : 'N/A'}
                  </span>
                </div>
              )}
            </div>
            
            {/* // In the renderVerificationUI function, update the button section */}
            <div className="mt-4 pt-3 border-t border-border flex justify-between">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={resetVerification}
                disabled={isVerifying}
              >
                {isVerifying ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : null}
                Reset Proof
              </Button>
              
              <Button 
                size="sm"
                onClick={handleProofVerification} 
                disabled={isVerifying}
              >
                {isVerifying ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : null}
                Refresh Proof
              </Button>
            </div>
          </div>
        </>
      );
    } else if (verificationResult === false) {
      return (
        <div className="bg-red-950/30 border border-red-600/30 rounded-md p-4 flex flex-col">
          <div className="flex items-center gap-3">
            <XCircle className="h-5 w-5 text-red-500" />
            <div>
              <p className="font-medium">Verification Failed</p>
              <p className="text-sm text-muted-foreground">
                Unable to verify the zero-knowledge proof
              </p>
            </div>
          </div>
          
          <Button 
            onClick={handleProofVerification}
            disabled={isVerifying}
            variant="outline"
            className="ml-auto mt-3"
            size="sm"
          >
            {isVerifying ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin mr-1" /> Trying...
              </>
            ) : "Try Again"}
          </Button>
        </div>
      );
    }
    
    return (
      <div className="flex flex-col items-center py-4 gap-3">
        <p className="text-center text-sm text-muted-foreground">
          Generate a cryptographic proof of your identity without revealing your personal data
        </p>
        
        <Button 
          onClick={handleProofVerification} 
          disabled={!walletAddress || isVerifying}
          className="min-w-[200px]"
        >
          {isVerifying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Generating Proof...
            </>
          ) : "Generate Proof"}
        </Button>
      </div>
    );
  }
};

export default ZKProofDemo;