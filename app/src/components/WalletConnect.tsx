// import { useState, useEffect } from "react";
// import { Button } from "@/components/ui/button";
// import { Copy, CheckCircle, Shield, Key } from "lucide-react";
// import { useAuth } from "@/context/AuthContext";
// import { toast } from "sonner";

// const WalletConnect = () => {
//   const {walletAddress, generateWalletFromToken } = useAuth();
//   const [hasCopied, setHasCopied] = useState(false);
//   const [googleConnected, setGoogleConnected] = useState(false);
//   const [oauthToken, setOauthToken] = useState<string | null>(null);
//   const [userId, setUserId] = useState<string | null>(null);

//   // Check if Google is connected
//   useEffect(() => {
//     const checkGoogleConnection = () => {
//       try {
//         const tokenData = localStorage.getItem('oauth_token');
//         if (tokenData) {
//           const parsed = JSON.parse(tokenData);
//           if (parsed.provider === "google" && parsed.expiresAt > Date.now()) {
//             setGoogleConnected(true);
//             setOauthToken(parsed.idToken);
//             setUserId(parsed.sub);
//           } else {
//             // Token expired or invalid
//             setGoogleConnected(false);
//             setOauthToken(null);
//             setUserId(null);
//           }
//         } else {
//           // No token found
//           setGoogleConnected(false);
//           setOauthToken(null);
//           setUserId(null);
//         }
//       } catch (e) {
//         console.error("Error checking Google connection:", e);
//         setGoogleConnected(false);
//         setOauthToken(null);
//         setUserId(null);
//       }
//     };

//     checkGoogleConnection();
    
//     // Listen for OAuth status changes
//     const handleOAuthChange = (event: CustomEvent) => {
//       if (event.detail) {
//         if (event.detail.connected) {
//           checkGoogleConnection();
//         } else {
//           // Handle disconnect event
//           setGoogleConnected(false);
//           setOauthToken(null);
//           setUserId(null);
//         }
//       }
//     };

//     window.addEventListener("oauth-status-change", handleOAuthChange as EventListener);
    
//     // Check connection status periodically to handle token expiration
//     const intervalId = setInterval(checkGoogleConnection, 30000);
    
//     return () => {
//       window.removeEventListener("oauth-status-change", handleOAuthChange as EventListener);
//       clearInterval(intervalId);
//     };
//   }, []);

//   const handleCreateIdentity = async () => {
//     if (!oauthToken || !userId) {
//       toast.error("Google authentication required");
//       return;
//     }

//     try {
//       await generateWalletFromToken(oauthToken, userId);
//       toast.success("Secure identity created successfully");
//     } catch (error) {
//       console.error("Identity creation error:", error);
//       toast.error("Failed to create identity. Please try again.");
//     }
//   };

//   const handleDemoMode = async () => {
//     try {
//       // Generate a demo token with fixed values for consistent demo identity
//       const demoToken = "demo_jwt_token_for_testing_purposes_only";
//       const demoUserId = "demo_user_123";
      
//       await generateWalletFromToken(demoToken, demoUserId);
//       toast.success("Demo identity created successfully");
//     } catch (error) {
//       console.error("Demo identity creation error:", error);
//       toast.error("Failed to create demo identity. Please try again.");
//     }
//   };

//   const handleCopyAddress = () => {
//     if (!walletAddress) return;
    
//     navigator.clipboard.writeText(walletAddress);
//     setHasCopied(true);
//     toast.success("Identity ID copied to clipboard");
    
//     setTimeout(() => {
//       setHasCopied(false);
//     }, 2000);
//   };

//   // Check if identity was created via OAuth
//   const isOAuthIdentity = () => {
//     try {
//       const zkpData = localStorage.getItem("zkp_credentials");
//       if (!zkpData) return false;
      
//       const parsed = JSON.parse(atob(zkpData));
//       return parsed.provider === "google";
//     } catch (e) {
//       return false;
//     }
//   };

//   return (
//     <div className="bg-card border border-border rounded-lg p-6">
//       <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
//         <Shield className="h-5 w-5" /> Zero-Knowledge Identity
//       </h3>
      
//       {walletAddress ? (
//         <div className="space-y-4">
//           <div className="bg-muted p-3 rounded-md flex items-center justify-between">
//             <span className="text-sm font-mono truncate">
//               {walletAddress}
//             </span>
//             <Button 
//               variant="ghost" 
//               size="icon" 
//               onClick={handleCopyAddress} 
//               className="text-muted-foreground hover:text-primary"
//             >
//               {hasCopied ? (
//                 <CheckCircle className="h-4 w-4" />
//               ) : (
//                 <Copy className="h-4 w-4" />
//               )}
//             </Button>
//           </div>
          
//           <div className="flex flex-col gap-2">
//             <Button
//               variant="outline"
//               className="w-full"
//               onClick={disconnectWallet}
//             >
//               Disconnect Identity
//             </Button>
//           </div>
//         </div>
//       ) : (
//         <div className="space-y-4">
//           <p className="text-muted-foreground text-sm">
//             Create a secure zero-knowledge identity for blockchain authentication.
//           </p>
          
//           <div className="grid grid-cols-1 gap-3">
//             <Button
//               className="w-full"
//               onClick={handleCreateIdentity}
//               disabled={!googleConnected || isConnecting}
//             >
//               {isConnecting ? "Creating..." : "Create Identity"}
//             </Button>
            
//             <Button
//               variant="outline"
//               className="w-full"
//               onClick={handleDemoMode}
//               disabled={isConnecting}
//             >
//               <Key className="h-4 w-4 mr-2" />
//               Demo Mode
//             </Button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default WalletConnect;