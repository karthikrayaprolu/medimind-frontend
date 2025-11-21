import { FormEvent, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, UserPlus, Mail, Lock, ShieldCheck, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const tabConfig = [
  { key: "login", label: "Login", icon: LogIn },
  { key: "signup", label: "Sign Up", icon: UserPlus },
] as const;

type AuthMode = (typeof tabConfig)[number]["key"];

const AuthPage = () => {
  const [mode, setMode] = useState<AuthMode>("login");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTarget = useMemo(() => {
    if (location.state?.from?.pathname) {
      return location.state.from.pathname as string;
    }
    return "/dashboard";
  }, [location.state]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "").trim();

    if (!email || !password) {
      toast({
        title: "Missing details",
        description: "Please enter your email and password to continue.",
        variant: "destructive",
      });
      return;
    }

    if (mode === "signup") {
      const confirm = String(formData.get("confirmPassword") ?? "").trim();
      if (password !== confirm) {
        toast({
          title: "Passwords do not match",
          description: "Please ensure both password fields are identical.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsLoading(true);

    try {
      const { authApi } = await import("@/lib/api");

      if (mode === "login") {
        const response = await authApi.login({ email, password });
        login(response.user_id);
        toast({
          title: "Welcome back!",
          description: `Logged in as ${response.email}`,
        });
      } else {
        const fullName = String(formData.get("fullName") ?? "").trim();
        const response = await authApi.signup({ email, password, fullName });
        login(response.user_id);
        toast({
          title: "Account created!",
          description: "Your account has been created successfully.",
        });
      }

      navigate(redirectTarget, { replace: true });
    } catch (error) {
      toast({
        title: mode === "login" ? "Login failed" : "Signup failed",
        description: error instanceof Error ? error.message : "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-background via-muted/40 to-background">
      <div className="absolute inset-x-0 top-6 flex justify-center">
        <Button variant="ghost" className="" onClick={() => navigate("/")}>

          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to site
        </Button>
      </div>

      <div className="flex min-h-screen items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-4xl"
        >
          <Card className="overflow-hidden border-border/60 bg-card/95 shadow-2xl backdrop-blur">
            <div className={cn("grid gap-0", mode === "login" ? "md:grid-cols-2 md:min-h-[560px]" : "md:grid-cols-1")}>
              <div className={cn("relative flex flex-col p-8 sm:p-12", mode === "signup" && "mx-auto w-full max-w-3xl")}>
                <motion.div
                  layout
                  className="mb-8 flex rounded-full bg-primary/10 p-1 text-xs font-semibold uppercase tracking-widest text-primary"
                >
                  <motion.div layout className="px-4 py-1">
                    MediMind Access Portal
                  </motion.div>
                </motion.div>

                <div className="relative mb-10 flex justify-center overflow-hidden rounded-xl bg-muted/40 p-2">
                  <div className="relative flex w-full rounded-lg bg-background p-1">
                    {tabConfig.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = mode === tab.key;
                      return (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setMode(tab.key)}
                          className={cn(
                            "relative flex-1 rounded-md px-4 py-3 text-sm font-semibold transition-colors",
                            isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {isActive && (
                            <motion.span
                              layoutId="auth-highlight"
                              className="absolute inset-0 rounded-md bg-primary/10"
                              transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            />
                          )}
                          <span className="relative z-10 flex items-center justify-center gap-2">
                            <Icon className="h-4 w-4" />
                            {tab.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  <motion.form
                    key={mode}
                    onSubmit={handleSubmit}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.35 }}
                    className={cn(mode === "signup" ? "grid gap-6 md:grid-cols-2" : "space-y-6")}
                  >
                    {mode === "signup" && (
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Full name</Label>
                        <div className="relative">
                          <Input id="fullName" name="fullName" placeholder="Jamie Rivera" autoComplete="name" />
                          <ShieldCheck className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="email">Email address</Label>
                      <div className="relative">
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="you@example.com"
                          autoComplete="email"
                        />
                        <Mail className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input id="password" name="password" type="password" placeholder="••••••••" autoComplete="current-password" />
                        <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      </div>
                    </div>

                    {mode === "signup" && (
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm password</Label>
                        <div className="relative">
                          <Input id="confirmPassword" name="confirmPassword" type="password" placeholder="••••••••" autoComplete="new-password" />
                          <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        </div>
                      </div>
                    )}

                    <div className={cn(mode === "signup" ? "md:col-span-2 space-y-4" : "space-y-4")}>
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? "Authorizing..." : mode === "login" ? "Access Workspace" : "Create Account"}
                      </Button>

                      <p className="text-center text-xs text-muted-foreground">
                        By continuing you agree to secure handling of healthcare information within the MediMind platform.
                      </p>
                    </div>
                  </motion.form>
                </AnimatePresence>
              </div>

              {mode === "login" && (
                <div className="relative hidden h-full flex-col gap-12 bg-primary p-8 text-primary-foreground md:flex">
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                    className="space-y-5"
                  >
                    <span className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest">
                      <ShieldCheck className="h-4 w-4" />
                      Protected Access
                    </span>
                    <h2 className="text-3xl font-bold">Medication Management Workspace</h2>
                    <p className="text-sm text-primary-foreground/90">
                      Authenticate to upload prescriptions, monitor OCR progress, review structured medication records, and manage reminder schedules—everything orchestrated in one secure hub.
                    </p>
                  </motion.div>

                  <motion.ul
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                    className="space-y-4 text-sm text-primary-foreground/90"
                  >
                    <li className="flex items-start gap-3">
                      <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary-foreground/15 text-sm font-semibold">1</span>
                      Upload prescriptions with JWT-secured API calls and instant status tracking.
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary-foreground/15 text-sm font-semibold">2</span>
                      Review OCR and structured medication data synchronized across services.
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary-foreground/15 text-sm font-semibold">3</span>
                      Configure reminder schedules and track adherence history without leaving the dashboard.
                    </li>
                  </motion.ul>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default AuthPage;
