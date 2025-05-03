
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="py-4 px-6 md:px-12 flex items-center justify-between relative z-50">
      <div className="flex items-center">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
            <span className="font-bold text-lg">ZA</span>
          </div>
          <span className="text-xl font-bold tracking-tight">ZeroAuth</span>
        </Link>
      </div>

      {/* Desktop Menu */}
      <div className="hidden md:flex items-center gap-8">
        <Link to="/" className="hover:text-primary transition-colors">
          Home
        </Link>
        <Link to="/dashboard" className="hover:text-primary transition-colors">
          Dashboard
        </Link>
        <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary/10">
          <Link to="/dashboard">Launch App</Link>
        </Button>
      </div>

      {/* Mobile Menu Button */}
      <div className="md:hidden">
        <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-background border-b border-border py-4 px-6 flex flex-col gap-4">
          <Link
            to="/"
            className="hover:text-primary transition-colors"
            onClick={() => setIsMenuOpen(false)}
          >
            Home
          </Link>
          <Link
            to="/dashboard"
            className="hover:text-primary transition-colors"
            onClick={() => setIsMenuOpen(false)}
          >
            Dashboard
          </Link>
          <Button asChild className="w-full">
            <Link to="/dashboard" onClick={() => setIsMenuOpen(false)}>
              Launch App
            </Link>
          </Button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
