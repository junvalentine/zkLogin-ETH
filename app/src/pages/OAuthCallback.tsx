import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const OAuthCallback = () => {
  const [status, setStatus] = useState("Processing authentication response...");
  const navigate = useNavigate();
  const { generateWalletFromToken } = useAuth();

  const verifySecureNonce = (receivedNonce: string): boolean => {
    try {
      // Get the saved nonce
      const savedNonce = localStorage.getItem('nonce');
      if (!savedNonce || savedNonce !== receivedNonce) {
        console.error("Nonce mismatch:", savedNonce, receivedNonce);
        return false;
      }
      
      // Get the stored session keys
      const sessionKeysData = localStorage.getItem('session_keys');
      if (!sessionKeysData) {
        console.error("No session keys found");
        return false;
      }
      
      // Check if the nonce was created recently enough
      const sessionKeys = JSON.parse(sessionKeysData);
      const createdAt = sessionKeys.created_at || 0;
      const currentTime = Date.now();
      
      // Verify the session wasn't created too long ago (10 minutes max)
      if (currentTime - createdAt > 10 * 60 * 1000) {
        console.error("Session key too old");
        return false;
      }
      
      return true;
    } catch (e) {
      console.error("Error verifying nonce:", e);
      return false;
    }
  };

  useEffect(() => {
    const processOAuthResponse = async () => {
      try {
        // Extract hash fragment (Google OAuth returns tokens in URL hash)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        // Get the ID token and validate it
        const idToken = hashParams.get("id_token");
        const accessToken = hashParams.get("access_token");
        
        if (!idToken) {
          setStatus("Error: No ID token received");
          toast.error("Authentication failed: No ID token received");
          return;
        }

        const decodeJwtPayload = (token) => {
          try {
            // JWT tokens are split by dots - get the middle (payload) part
            const base64Url = token.split('.')[1];
            // Convert base64url to base64
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            // Decode and parse
            const jsonPayload = decodeURIComponent(
              atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
            );
            return JSON.parse(jsonPayload);
          } catch (error) {
            console.error("Error decoding JWT:", error);
            throw new Error("Invalid token format");
          }
        };

        // Decode the JWT to extract user info
        const payload = decodeJwtPayload(idToken);
        
        // Extract user information from the payload
        const userInfo = {
          name: payload.name,
          email: payload.email,
          picture: payload.picture,
          sub: payload.sub
        };
        
        // Verify the nonce (to prevent CSRF attacks)
        if (!payload.nonce || !verifySecureNonce(payload.nonce)) {
          console.error("Security error: Nonce verification failed");
          setStatus("Error: Invalid authentication response");
          toast.error("Authentication failed: Security verification failed");

          // Notify the opener window about the authentication failure
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage({ 
              type: "OAUTH_FAILURE", 
              provider: "google",
              error: "nonce_verification_failed",
              time: Date.now()
            }, window.location.origin);
            
            // Still close the window after showing the error
            setTimeout(() => window.close(), 3000);
          }
          
          //Stop login
          return;
        } 
        
        // Store user info
        localStorage.setItem("user_info", JSON.stringify(userInfo));
        
        // Store the token
        localStorage.setItem("token", JSON.stringify({
          idToken,
          accessToken,
          provider: "google",
          expiresAt: Date.now() + (payload.exp - payload.iat) * 1000, // Fix: Calculate expiry correctly
          sub: payload.sub,
        }));

        // Clean up nonce AFTER checking it
        //localStorage.removeItem("nonce");
        const salt = localStorage.getItem("salt");
        
        // Generate a wallet using the JWT token
        setStatus("Generating wallet from authentication data...");
        await generateWalletFromToken(idToken, salt);
        
        // If this window was opened by another window (opener exists)
        if (window.opener && !window.opener.closed) {
          // Send message to opener window
          window.opener.postMessage({ 
            type: "OAUTH_SUCCESS", 
            provider: "google",
            time: Date.now() // Adding timestamp to ensure message uniqueness
          }, window.location.origin);
          
          setStatus("Authentication successful! Closing window...");
          
          // Close this tab after a brief delay
          setTimeout(() => window.close(), 1500);
        } else {
          // If no opener (user opened directly), redirect to stored URL
          const redirectUrl = localStorage.getItem("redirect") || "/dashboard";
          localStorage.removeItem("redirect");
          
          setStatus("Authentication successful! Redirecting...");
          setTimeout(() => navigate(redirectUrl), 1500);
        }
      } catch (error) {
        console.error("OAuth callback error:", error);
        setStatus("Authentication failed. Please try again.");
        toast.error("Authentication error. Please try again.");
      }
    };

    processOAuthResponse();
  }, [navigate, generateWalletFromToken]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="bg-card border border-border rounded-lg p-8 w-full max-w-md flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <h2 className="text-xl font-semibold text-center">{status}</h2>
      </div>
    </div>
  );
};

export default OAuthCallback;