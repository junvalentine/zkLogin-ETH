import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import UserDashboard from "@/components/UserDashboard";
import OAuthProviders from "@/components/OAuthProviders";
import Navbar from "@/components/Navbar";

const Dashboard = () => {
  const { walletAddress, isAuthenticated } = useAuth();
  const [isLoaded, setIsLoaded] = useState(false);
  const [googleLoggedIn, setGoogleLoggedIn] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Add this state to force re-render

  // Check for Google login and refresh when needed
  useEffect(() => {
    const checkGoogleLogin = () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const tokenData = JSON.parse(token);
          if (tokenData.provider === "google" && tokenData.expiresAt > Date.now()) {
            setGoogleLoggedIn(true);
            
            // Also check if user_info exists
            const userInfo = localStorage.getItem('user_info');
            if (!userInfo) {
              console.warn("OAuth token exists but no user info found");
            }
          }
        }
      } catch (e) {
        console.error("Error checking Google login:", e);
      }
    };

    checkGoogleLogin();
    
    // Listen for OAuth status changes
    const handleOAuthChange = (event: CustomEvent) => {
      if (event.detail && typeof event.detail.connected === 'boolean') {
        setGoogleLoggedIn(event.detail.connected);
        // Force a refresh when OAuth status changes
        setRefreshTrigger(prev => prev + 1);
      }
    };

    // Listen for messages from popup window
    const handleMessage = (event: MessageEvent) => {
      // Verify origin for security
      if (event.origin !== window.location.origin) return;
      
      // Handle successful OAuth
      if (event.data?.type === "OAUTH_SUCCESS") {
        console.log("Received OAuth success message");
        
        // Small delay to ensure localStorage is updated
        setTimeout(() => {
          checkGoogleLogin();
          // Force refresh
          setRefreshTrigger(prev => prev + 1);
          window.location.reload();
        }, 500);
      }
    };

    window.addEventListener("oauth-status-change", handleOAuthChange as EventListener);
    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener("oauth-status-change", handleOAuthChange as EventListener);
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  useEffect(() => {
    // Simulate loading state
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  // This effect will run whenever refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      // Check if we have auth data but UI hasn't updated
      const hasToken = !!localStorage.getItem('token');
      const hasUserInfo = !!localStorage.getItem('user_info');
      
      if (hasToken && hasUserInfo && !googleLoggedIn) {
        console.log("Auth data detected but UI not updated, forcing refresh");
        window.location.reload();
      }
    }
  }, [refreshTrigger, googleLoggedIn]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Account Dashboard</h1>
            <Link to="/">
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <ArrowLeft className="h-4 w-4" />
                <span>Home</span>
              </Button>
            </Link>
          </div>

          <div className="space-y-6">
            {(!isAuthenticated && !googleLoggedIn) ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Welcome to ZeroAuth</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Sign in with Google to access your secure wallet and blockchain features.
                    </p>
                  </CardContent>
                </Card>
                
                <OAuthProviders />
              </>
            ) : (
              <UserDashboard key={refreshTrigger} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;