
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const HeroSection = () => {
  return (
    <div className="relative min-h-[80vh] grid-pattern flex flex-col items-center justify-center text-center px-6">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background z-0"></div>
      
      <div className="relative z-10 max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
            Blockchain Authentication
          </span>
          <br /> with Zero-Knowledge Proofs
        </h1>
        
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Authenticate securely through blockchain while preserving privacy with 
          zero-knowledge proofs and seamless OAuth 2.0 integration.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
          <Button asChild size="lg" className="gap-2">
            <Link to="/dashboard">
              Connect Wallet <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href="#features">Learn More</a>
          </Button>
        </div>
        
        <div className="pt-12 connect-line">
          <div className="inline-block p-2 rounded-full bg-primary/10 border border-primary/30 animate-pulse">
            <div className="h-3 w-3 rounded-full bg-primary"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
