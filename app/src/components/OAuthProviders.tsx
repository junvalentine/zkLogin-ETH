import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link2, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import * as crypto from 'crypto-js';
import { ethers } from "ethers";
import { F1Field, Scalar } from "ffjavascript";
import * as circomlibjs from "circomlibjs";

interface OAuthProvider {
  id: string;
  name: string;
  icon: string;
  color: string;
}

// Helper function to generate a secure session keypair
const generateSessionKeypair = () => {
  // Generate a cryptographically secure random session secret key (32 bytes)
  const wallet = ethers.Wallet.createRandom();
  localStorage.setItem('wallet', JSON.stringify(wallet)); // Store wallet in localStorage

  // Remove '0x' prefix and 04 for uncompressed key
  const publicKey = wallet.signingKey.publicKey.slice(4); 
  return {
    ss_pk: publicKey,
    ss_sk: wallet.privateKey, // Secret key (private key)
  };
};

// Set up field parameters
const p: string = "21888242871839275222246405745257275088548364400416034343698204186575808495617";
const Fr = new F1Field(Scalar.fromString(p));

// Create a nonce that embeds the session secret key
const createSecureNonce = async (publicKey: string) => {  
  // Split public key into 4 chunks of 16 bytes (32 hex chars each)
  const pubChunks: bigint[] = [];
  for (let i = 0; i < 4; i++) {
    const start = i * 32;
    const chunk = publicKey.slice(start, start + 32);
    pubChunks.push(BigInt('0x' + chunk));
  }

  // Set parameters for Poseidon hash
  const expiryTime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  const r = Fr.random(); // Random number for Poseidon using F1Field instance

  localStorage.setItem('zk_expiry_time', expiryTime.toString());
  localStorage.setItem('r', r.toString());

  // Calculate Poseidon hash: Poseidon(pub[0],..., pub[3], expiryTime, r)
  const poseidon = await circomlibjs.buildPoseidon();
  const nonce = poseidon.F.toString(
    poseidon([pubChunks[0], pubChunks[1], pubChunks[2], pubChunks[3], expiryTime, r])
  );
  
  return nonce;
};

const OAuthProviders = () => {
  const [authenticating, setAuthenticating] = useState<string | null>(null);
  const [connectedProviders, setConnectedProviders] = useState<string[]>([]);
  
  const providers: OAuthProvider[] = [
    {
      id: "google",
      name: "Google",
      icon: "G",
      color: "bg-white text-black",
    }
  ];

  // Check if user is already logged in on component mount
  useEffect(() => {
    const checkExistingSession = () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const tokenData = JSON.parse(token);
          if (tokenData.provider && tokenData.expiresAt > Date.now()) {
            setConnectedProviders([tokenData.provider]);
          } else {
            localStorage.removeItem('token');
          }
        } catch (e) {
          localStorage.removeItem('token');
        }
      }
    };
    
    checkExistingSession();
  }, []);

  // Notify the dashboard when connection status changes
  useEffect(() => {
    const isConnected = connectedProviders.length > 0;
    const event = new CustomEvent("oauth-status-change", { 
      detail: { connected: isConnected } 
    });
    window.dispatchEvent(event);
  }, [connectedProviders]);

  useEffect(() => {
    // Handle messages from popup window
    const handleMessage = (event: MessageEvent) => {
      // Verify origin for security
      if (event.origin !== window.location.origin) return;
      
      // Handle successful OAuth
      if (event.data?.type === "OAUTH_SUCCESS" && event.data?.provider) {
        setAuthenticating(null);
        setConnectedProviders(prev => [...prev, event.data.provider]);
        toast.success(`Connected to ${event.data.provider} successfully`);
      }
    };
  
    // Add event listener
    window.addEventListener('message', handleMessage);
    
    // Clean up on unmount
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const handleGoogleLogin = async () => {
    const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!CLIENT_ID) {
      toast.error("Google Client ID is missing");
      return;
    }

    // Generate salt
    const salt = localStorage.getItem('salt');
    if (!salt) {
      const salt = Fr.random();
      localStorage.setItem('salt', salt);
    }
  
    // Generate a secure session keypair
    const sessionKeys = generateSessionKeypair();
    
    // Create a nonce that embeds the session secret key
    const secureNonce = await createSecureNonce(sessionKeys.ss_pk);
    
    // Store the session keys and nonce securely
    const ss_sk_enc = crypto.AES.encrypt(
      sessionKeys.ss_sk, 
      sessionKeys.ss_pk,
    ).toString();

    localStorage.setItem('session_keys', JSON.stringify({
      ss_pk: sessionKeys.ss_pk,
      // Store hashed version of secret key for verification
      ss_sk_enc: ss_sk_enc,
      created_at: Date.now()
    }));
    
    localStorage.setItem('nonce', secureNonce);
    
    // Save current URL for redirect back after authentication
    localStorage.setItem('redirect', window.location.href);
  
    // Configure OAuth parameters - include profile and email for user info
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: `${window.location.origin}/oauth-callback`,
      response_type: 'token id_token',
      scope: 'openid email profile',
      nonce: secureNonce,
      prompt: 'consent',
    });
  
    // Open Google's OAuth endpoint in a new tab
    window.open(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`, '_blank');
    
    // Inform user about the new tab
    toast.info("Login window opened in a new tab. Please complete authentication there.");
  };
  
  const handleConnect = async (providerId: string) => {
    if (connectedProviders.includes(providerId)) {
      // Disconnect logic
      setAuthenticating(providerId);
      
      setTimeout(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user_info');
        localStorage.removeItem('session_keys'); // Remove session keys
        localStorage.removeItem('nonce'); // Remove nonce
        setConnectedProviders(prev => prev.filter(id => id !== providerId));
        setAuthenticating(null);
        toast.success(`Logged out from ${providerId} successfully`);
        
        // Refresh page to clear all states
        window.location.href = '/';
      }, 500);
      
      return;
    }
    
    // Connect logic
    setAuthenticating(providerId);
    
    if (providerId === 'google') {
      handleGoogleLogin();
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Link2 className="h-5 w-5" /> Authentication
      </h3>
      
      <p className="text-sm text-muted-foreground mb-4">
        {connectedProviders.length > 0 
          ? "You are currently authenticated with Google." 
          : "Sign in with Google to access your wallet and blockchain features."}
      </p>
      
      <div className="flex justify-center">
        {providers.map((provider) => {
          const isConnected = connectedProviders.includes(provider.id);
          const isAuthenticating = authenticating === provider.id;
          
          return (
            <Button
              key={provider.id}
              variant={isConnected ? "default" : "outline"}
              className={`justify-start gap-3 w-full max-w-sm ${isConnected ? "bg-muted hover:bg-muted/80" : ""}`}
              onClick={() => handleConnect(provider.id)}
              disabled={isAuthenticating}
            >
              <span className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold ${provider.color}`}>
                {provider.icon}
              </span>
              <span className="flex-1 text-left">
                {provider.name}
              </span>
              <span className="text-xs opacity-70">
                {isAuthenticating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : isConnected ? (
                  "Sign Out"
                ) : (
                  "Sign In"
                )}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default OAuthProviders;
