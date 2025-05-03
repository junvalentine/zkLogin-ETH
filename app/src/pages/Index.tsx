
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import Features from "@/components/Features";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <HeroSection />
      <Features />
      
      <footer className="py-12 px-6 bg-muted/10">
        <div className="container mx-auto text-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} ZeroAuth - Blockchain Authentication with Zero-Knowledge Proofs
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
