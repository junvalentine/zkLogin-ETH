import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, CheckCircle, Shield, ArrowRight, CreditCard, RefreshCw, Send, Loader2, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
// Import ZKProofDemo component
import ZKProofDemo from "./ZKProofDemo";
import axios from "axios";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import * as crypto from 'crypto-js';

interface UserInfo {
  name: string;
  email: string;
  picture: string;
}

const UserDashboard = () => {
  const { walletAddress } = useAuth();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [hasCopied, setHasCopied] = useState(false);
  const [isProofValid, setIsProofValid] = useState<boolean | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [currentProof, setCurrentProof] = useState<any>(null);

  const [recipientAddress, setRecipientAddress] = useState("");
  const [sendAmount, setSendAmount] = useState("0.01");
  const [txError, setTxError] = useState("");

  useEffect(() => {
    // Load user info
    const loadUserInfo = () => {
      try {
        const storedInfo = localStorage.getItem('user_info');
        if (storedInfo) {
          const parsedInfo = JSON.parse(storedInfo);
          if (parsedInfo.name) {
            try {
              parsedInfo.name = decodeURIComponent(escape(parsedInfo.name));
            } catch (e) {
              console.warn("Could not decode name, using as is");
            }
          }
          setUserInfo(parsedInfo);
        }
      } catch (e) {
        console.error("Error loading user info:", e);
      }
    };
    
    // Load wallet balance
    const loadBalance = async () => {
      if (!walletAddress) return;

      try {
        setIsRefreshing(true);
        
        const response = await axios.post('http://localhost:3001/balance', {
          walletAddress
        }, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 seconds
        });
        
        if (response.data.success) {
          const balanceInEth = parseFloat(response.data.balance);
          setBalance(balanceInEth);
          console.log(`Wallet balance loaded: ${balanceInEth} ETH`);
        } else {
          console.error('Failed to load balance:', response.data.error);
          toast.error("Could not load wallet balance");
        }
      } catch (error) {
        console.error("Error loading balance:", error);        
        toast.error("Could not connect to blockchain. Using cached balance.");
      } finally {
        setIsRefreshing(false);
      }
    };
    
    // Check if we have a valid ZK proof
    const checkProof = async () => {
      try {
        // First check if we have a token with sub
        const tokenData = localStorage.getItem('token');
        if (!tokenData) {
          setIsProofValid(false);
          setCurrentProof(null);
          return;
        }
    
        // Extract sub from token
        const { idToken } = JSON.parse(tokenData);
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
    
        // Fetch proof from server API
        const response = await axios.get(`http://localhost:3001/api/zkproof?sub=${encodeURIComponent(sub)}`);
        
        if (response.data.success && response.data.proofData) {
          const serverProof = response.data.proofData;
          const now = Date.now();
          
          // Check if proof is still valid
          const isValid = now < serverProof.expiresAt;
          
          setIsProofValid(isValid);
          
          if (isValid) {
            setCurrentProof(serverProof);
            // Update localStorage for backward compatibility
            localStorage.setItem('zk_proof', JSON.stringify(serverProof));
          } else {
            setCurrentProof(null);
            localStorage.removeItem('zk_proof');
          }
        } else {
          console.error("Failed to fetch proof data:", response.data.error);
          setIsProofValid(false);
          setCurrentProof(null);
          toast.error("Failed to fetch ZK proof data from server");
        }
      } catch (error) {
        console.error("Error checking proof validity:", error);
        
        setIsProofValid(false);
        setCurrentProof(null);
        
        // Show error notification to user
        if (axios.isAxiosError(error)) {
          if (error.response) {
            toast.error(`Proof validation failed: ${error.response.data.error || 'Server error'}`);
          } else if (error.request) {
            toast.error("Network error. Please check your connection.");
          } else {
            toast.error("Error verifying proof. Please try again.");
          }
        } else {
          toast.error("Failed to verify ZK proof");
        }
      }
    };
    
    const runCheckProof = async () => {
      try {
        await checkProof();
      } catch (error) {
        console.error("Error in checkProof:", error);
      }
    };
    
    const fetchBalance = () => {
      loadBalance().catch(error => {
        console.error("Error in loadBalance:", error);
      });
    };

    loadUserInfo();
    fetchBalance();
    runCheckProof();
    
    // Check proof validity every minute
    const proofInterval = setInterval(runCheckProof, 10000);
    
    // Add event listener for ZKProofDemo component events
    const handleProofStatusChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      setIsProofValid(customEvent.detail.verified);
      if (customEvent.detail.verified) {
        runCheckProof(); // Re-check to update currentProof
      }
    };
    
    window.addEventListener("zkproof-status-change", handleProofStatusChange);
    
    return () => {
      clearInterval(proofInterval);
      window.removeEventListener("zkproof-status-change", handleProofStatusChange);
    };
  }, []);

  const handleLogout = () => {
    // Clear all stored data
    localStorage.removeItem('token');
    localStorage.removeItem('user_info');
    localStorage.removeItem('wallet_address');
    localStorage.removeItem('zk_proof');
    localStorage.removeItem('walletAddress');
    localStorage.removeItem('zkp_credentials');
    localStorage.removeItem('session_keys');
    localStorage.removeItem('nonce');
    localStorage.removeItem('wallet');
    
    toast.success("Successfully logged out");
    
    // Reload the page to reset all app state
    setTimeout(() => {
      window.location.href = '/';
    }, 1000);
  };

  const handleCopyAddress = () => {
    if (!walletAddress) return;
    
    navigator.clipboard.writeText(walletAddress);
    setHasCopied(true);
    toast.success("Wallet address copied to clipboard");
    
    setTimeout(() => {
      setHasCopied(false);
    }, 2000);
  };

  const handleGetCoins = async () => {
    if (!walletAddress) return;
    
    setIsRefreshing(true);
    
    try {
      // Request ETH from the faucet
      const response = await axios.post('http://localhost:3001/faucet', {
        address: walletAddress
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 seconds
      });
      
      if (response.data.success) {
        toast.success(`Received ${response.data.amount} from faucet`);
        
        // Refresh balance after successful faucet request
        const balanceResponse = await axios.post('http://localhost:3001/balance', {
          walletAddress
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (balanceResponse.data.success) {
          const newBalance = parseFloat(balanceResponse.data.balance);
          setBalance(newBalance);
        }
      } else {
        toast.error("Failed to receive funds from faucet");
      }
    } catch (error) {
      console.error("Faucet error:", error);
      toast.error("Failed to request funds from faucet");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSendTransaction = async () => {
    if (!walletAddress || !isProofValid) {
      toast.error("Valid proof required for transactions");
      return;
    }
    
    // Validate inputs
    setTxError("");
    const amount = parseFloat(sendAmount);
    
    if (!recipientAddress || recipientAddress.length !== 42 || !recipientAddress.startsWith('0x')) {
      setTxError("Please enter a valid Ethereum address");
      return;
    }
    
    if (isNaN(amount) || amount <= 0) {
      setTxError("Please enter a valid amount");
      return;
    }
    
    if (amount > balance) {
      setTxError("Insufficient balance for this transaction");
      return;
    }
    
    setIsSending(true);
    
    try {
      // Call the backend to send the transaction
      const sessionKeysData = localStorage.getItem('session_keys');
      const sessionKeys = JSON.parse(sessionKeysData);

      const bytes = crypto.AES.decrypt(sessionKeys.ss_sk_enc, sessionKeys.ss_pk);
      const privkey = bytes.toString(crypto.enc.Utf8);

      const zkProofData = currentProof.proof;
      const publicData = currentProof.publicSignals;

      console.log("Sending transaction with proof data:", zkProofData);
      console.log("Public signals:", publicData);
      
      // Format the proof data
      const zkProof = {
        pA: zkProofData.pi_a.slice(0, 2).map((x: any) => x.toString()),
        pB: [
          [zkProofData.pi_b[0][1].toString(), zkProofData.pi_b[0][0].toString()],
          [zkProofData.pi_b[1][1].toString(), zkProofData.pi_b[1][0].toString()]
        ],
        pC: zkProofData.pi_c.slice(0, 2).map((x: any) => x.toString()),
        pubSignals: publicData.map((x: any) => x.toString())
      };

      const response = await axios.post('http://localhost:3001/sendTransaction', {
        walletAddress, 
        privkey,
        destinationAddress: recipientAddress, 
        amount, 
        zkProof
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 seconds
      });
      
      if (response.data.success) {
        toast.success(`Successfully sent ${sendAmount} ETH to ${recipientAddress.substring(0, 6)}...${recipientAddress.substring(38)}`);
        
        // Refresh balance after transaction
        const balanceResponse = await axios.post('http://localhost:3001/balance', {
          walletAddress
        });
        
        if (balanceResponse.data.success) {
          const newBalance = parseFloat(balanceResponse.data.balance);
          setBalance(newBalance);
        }
        
        // Clear fields
        setRecipientAddress("");
        setSendAmount("0.01");
      } else {
        toast.error("Transaction failed: " + (response.data.error || "Unknown error"));
        setTxError(response.data.error || "Transaction failed");
      }
    } catch (error) {
      console.error("Transaction error:", error);
      toast.error("Transaction failed to process");
      if (axios.isAxiosError(error) && error.response) {
        setTxError(error.response.data.error || "Network error");
      } else {
        setTxError("Failed to send transaction");
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="grid gap-6">
      {/* User Profile Section */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {userInfo && userInfo.picture && (
                <img 
                  src={userInfo.picture} 
                  alt={userInfo?.name || "User"} 
                  className="w-16 h-16 rounded-full" 
                />
              )}
              <div>
                <CardTitle>{userInfo?.name || "User"}</CardTitle>
                <CardDescription>{userInfo?.email || "No email"}</CardDescription>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-1"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Wallet Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" /> Wallet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-sm text-muted-foreground mb-1">Address</div>
            <div className="bg-muted p-3 rounded-md flex items-center justify-between">
              <code className="text-xs sm:text-sm font-mono truncate">
                {walletAddress}
              </code>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleCopyAddress} 
                className="text-muted-foreground hover:text-primary"
              >
                {hasCopied ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          
          <div>
            <div className="text-sm text-muted-foreground mb-1">Balance</div>
            <div className="bg-muted p-3 rounded-md flex items-center justify-between">
              <span className="font-semibold text-lg">{balance} ETH</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleGetCoins}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-1" />
                )}
                {isRefreshing ? "Adding..." : "Get coins"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ZK Proof Section - Using ZKProofDemo component */}
      <ZKProofDemo />

      {/* Transaction Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" /> Send ETH
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Send ETH to another address with your ZK-verified identity.
          </p>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient Address</Label>
              <Input
                id="recipient"
                placeholder="0x..."
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                disabled={isSending}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (ETH)</Label>
              <Input
                id="amount"
                type="number"
                min="0.001"
                step="0.001"
                placeholder="0.01"
                value={sendAmount}
                onChange={(e) => setSendAmount(e.target.value)}
                disabled={isSending}
              />
            </div>
            
            {txError && (
              <p className="text-xs text-red-500 mt-2">
                {txError}
              </p>
            )}
            
            <Button 
              className="w-full" 
              disabled={!isProofValid || isSending || balance <= 0.001}
              onClick={handleSendTransaction}
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {isSending ? "Sending..." : "Send ETH"}
            </Button>
            
            {!isProofValid && (
              <p className="text-xs text-amber-500 mt-2">
                You need a valid zero-knowledge proof to execute transactions.
              </p>
            )}
            
            {balance <= 0.001 && (
              <p className="text-xs text-amber-500 mt-2">
                Insufficient balance to execute transaction.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserDashboard;