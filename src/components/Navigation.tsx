import { useState, useEffect } from "react";
import { Menu, X, Pill } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/ThemeToggle";

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsOpen(false);
    }
  };

  const menuItems = [
    { label: "Home", id: "home" },
    { label: "Features", id: "features" },
    { label: "How It Works", id: "how-it-works" },
    { label: "About", id: "about" },
    { label: "Contact", id: "contact" },
  ];

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-6xl hidden md:block">
        <div className="rounded-full bg-[#2a2d3a]/95 backdrop-blur-xl border border-white/10 shadow-2xl px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => scrollToSection("home")}>
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Pill className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">MediMind</span>
            </div>

            {/* Menu Items */}
            <div className="flex items-center gap-8">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="text-white/70 hover:text-white transition-colors duration-200 font-medium text-sm"
                >
                  {item.label}
                </button>
              ))}
              <div className="h-6 w-px bg-white/10" />
              <ThemeToggle />
              <Button
                size="sm"
                onClick={() => navigate(isAuthenticated ? "/dashboard" : "/auth")}
                className="bg-primary hover:bg-primary/90 text-white rounded-full px-6"
              >
                {isAuthenticated ? "Workspace" : "Access Portal"}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="fixed top-4 left-4 right-4 z-50 md:hidden">
        <div className="rounded-full bg-[#2a2d3a]/95 backdrop-blur-xl border border-white/10 shadow-2xl px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => scrollToSection("home")}>
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Pill className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">MediMind</span>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-white hover:text-primary transition-colors"
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="mt-2 rounded-2xl bg-[#2a2d3a]/95 backdrop-blur-xl border border-white/10 shadow-2xl p-6"
            >
              <div className="flex flex-col gap-4">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      scrollToSection(item.id);
                      setIsOpen(false);
                    }}
                    className="text-white/70 hover:text-white transition-colors duration-200 font-medium text-left py-2"
                  >
                    {item.label}
                  </button>
                ))}
                <div className="h-px bg-white/10 my-2" />
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white/70 text-sm font-medium">Theme</span>
                  <ThemeToggle />
                </div>
                <Button
                  className="w-full rounded-xl bg-primary hover:bg-primary/90 text-white"
                  onClick={() => {
                    setIsOpen(false);
                    navigate(isAuthenticated ? "/dashboard" : "/auth");
                  }}
                >
                  {isAuthenticated ? "Go to Workspace" : "Access Portal"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </>
  );
};

export default Navigation;
