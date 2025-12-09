import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogIn, UserPlus, KeyRound, Phone, User, Hash, Sparkles } from "lucide-react";
import containerLogo from "@/assets/container-logo.png";

interface NameEntryProps {
  onConnect: (userName: string) => void;
}

type AuthMode = "login" | "signup" | "recover";

export const NameEntry = ({ onConnect }: NameEntryProps) => {
  const [mode, setMode] = useState<AuthMode>("login");
  const [isLoading, setIsLoading] = useState(false);

  // Login fields
  const [loginName, setLoginName] = useState("");
  const [loginCode, setLoginCode] = useState("");

  // Signup fields
  const [signupName, setSignupName] = useState("");
  const [signupStaffId, setSignupStaffId] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");

  // Recovery fields
  const [recoverStaffId, setRecoverStaffId] = useState("");

  const generateCode = () => {
    if (!signupName.trim() || !signupStaffId.trim()) {
      toast.error("Please enter your name and staff ID first");
      return;
    }

    // Get letters from name (only alphabetic characters)
    const nameLetters = signupName.replace(/[^a-zA-Z]/g, "").toUpperCase();
    if (nameLetters.length < 2) {
      toast.error("Name must contain at least 2 letters");
      return;
    }

    // Get last 3 digits from staff ID
    const staffDigits = signupStaffId.replace(/[^0-9]/g, "");
    if (staffDigits.length < 3) {
      toast.error("Staff ID must contain at least 3 digits");
      return;
    }

    // Pick 2 random letters from name
    const randomIndices: number[] = [];
    while (randomIndices.length < 2) {
      const idx = Math.floor(Math.random() * nameLetters.length);
      if (!randomIndices.includes(idx)) {
        randomIndices.push(idx);
      }
    }
    const twoLetters = randomIndices.map(i => nameLetters[i]).join("");

    // Get last 3 digits
    const lastThreeDigits = staffDigits.slice(-3);

    const code = `${twoLetters}${lastThreeDigits}`;
    setGeneratedCode(code);
    toast.success("Code generated! Save this code for login.");
  };

  const handleLogin = async () => {
    if (!loginName.trim() || !loginCode.trim()) {
      toast.error("Please enter your name and code");
      return;
    }

    setIsLoading(true);
    try {
      const { data: user, error } = await supabase
        .from("users" as any)
        .select("*")
        .eq("name", loginName.trim())
        .eq("code", loginCode.trim().toUpperCase())
        .maybeSingle();

      if (error) throw error;

      if (!user) {
        toast.error("Invalid name or code");
        return;
      }

      // Update last_seen_at
      await supabase
        .from("users" as any)
        .update({ last_seen_at: new Date().toISOString() } as any)
        .eq("id", (user as any).id);

      onConnect((user as any).name);
      toast.success(`Welcome back, ${(user as any).name}!`);
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Failed to login. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!signupName.trim() || !signupStaffId.trim() || !signupPhone.trim() || !generatedCode) {
      toast.error("Please fill all fields and generate your code");
      return;
    }

    setIsLoading(true);
    try {
      // Check if staff ID already exists
      const { data: existingUser } = await supabase
        .from("users" as any)
        .select("id")
        .eq("staff_id", signupStaffId.trim())
        .maybeSingle();

      if (existingUser) {
        toast.error("This staff ID is already registered");
        return;
      }

      // Create new user
      const { error: insertError } = await supabase
        .from("users" as any)
        .insert({
          name: signupName.trim(),
          staff_id: signupStaffId.trim(),
          phone_number: signupPhone.trim(),
          code: generatedCode,
        } as any);

      if (insertError) throw insertError;

      onConnect(signupName.trim());
      toast.success(`Welcome, ${signupName}! Your code is: ${generatedCode}`);
    } catch (error) {
      console.error("Signup error:", error);
      toast.error("Failed to create account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecovery = async () => {
    if (!recoverStaffId.trim()) {
      toast.error("Please enter your staff ID");
      return;
    }

    setIsLoading(true);
    try {
      const { data: user, error } = await supabase
        .from("users" as any)
        .select("id, name")
        .eq("staff_id", recoverStaffId.trim())
        .maybeSingle();

      if (error) throw error;

      if (!user) {
        toast.error("No account found with this staff ID");
        return;
      }

      // Mark recovery requested
      await supabase
        .from("users" as any)
        .update({
          recovery_requested: true,
          recovery_requested_at: new Date().toISOString(),
        } as any)
        .eq("id", (user as any).id);

      toast.success("Recovery request sent! An admin will contact you shortly.");
      setMode("login");
    } catch (error) {
      console.error("Recovery error:", error);
      toast.error("Failed to request recovery. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 space-y-6 border-border/50 shadow-xl">
        <div className="text-center space-y-4">
          <img 
            src={containerLogo} 
            alt="Container Tracker" 
            className="h-20 w-20 mx-auto object-contain"
          />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Container Tracker</h1>
            <p className="text-muted-foreground mt-2">
              {mode === "login" && "Sign in to your account"}
              {mode === "signup" && "Create a new account"}
              {mode === "recover" && "Recover your account"}
            </p>
          </div>
        </div>

        {/* Login Form */}
        {mode === "login" && (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="First name"
                  value={loginName}
                  onChange={(e) => setLoginName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  disabled={isLoading}
                  className="pl-10 h-12"
                />
              </div>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Your code (e.g., AB123)"
                  value={loginCode}
                  onChange={(e) => setLoginCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  disabled={isLoading}
                  className="pl-10 h-12 font-mono uppercase"
                  maxLength={5}
                />
              </div>
            </div>

            <Button
              onClick={handleLogin}
              disabled={isLoading || !loginName.trim() || !loginCode.trim()}
              size="lg"
              className="w-full h-12"
            >
              <LogIn className="mr-2 h-5 w-5" />
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>

            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => setMode("signup")}
                className="flex-1 text-muted-foreground"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Create Account
              </Button>
              <Button
                variant="ghost"
                onClick={() => setMode("recover")}
                className="flex-1 text-muted-foreground"
              >
                <KeyRound className="mr-2 h-4 w-4" />
                Forgot Code?
              </Button>
            </div>
          </div>
        )}

        {/* Signup Form */}
        {mode === "signup" && (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="First name"
                  value={signupName}
                  onChange={(e) => {
                    setSignupName(e.target.value);
                    setGeneratedCode("");
                  }}
                  disabled={isLoading}
                  className="pl-10 h-12"
                />
              </div>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Staff ID"
                  value={signupStaffId}
                  onChange={(e) => {
                    setSignupStaffId(e.target.value);
                    setGeneratedCode("");
                  }}
                  disabled={isLoading}
                  className="pl-10 h-12"
                />
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="tel"
                  placeholder="Phone number (for recovery)"
                  value={signupPhone}
                  onChange={(e) => setSignupPhone(e.target.value)}
                  disabled={isLoading}
                  className="pl-10 h-12"
                />
              </div>
            </div>

            {/* Code Generation */}
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                onClick={generateCode}
                disabled={!signupName.trim() || !signupStaffId.trim()}
                className="w-full h-12 border-primary/30 hover:bg-accent"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Generate My Code
              </Button>

              {generatedCode && (
                <div className="bg-primary/10 border border-primary/30 rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Your unique code</p>
                  <p className="text-2xl font-mono font-bold tracking-widest text-primary">
                    {generatedCode}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Save this code! You'll need it to sign in.
                  </p>
                </div>
              )}
            </div>

            <Button
              onClick={handleSignup}
              disabled={isLoading || !signupName.trim() || !signupStaffId.trim() || !signupPhone.trim() || !generatedCode}
              size="lg"
              className="w-full h-12"
            >
              <UserPlus className="mr-2 h-5 w-5" />
              {isLoading ? "Creating account..." : "Create Account"}
            </Button>

            <Button
              variant="ghost"
              onClick={() => setMode("login")}
              className="w-full text-muted-foreground"
            >
              Already have an account? Sign in
            </Button>
          </div>
        )}

        {/* Recovery Form */}
        {mode === "recover" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Enter your staff ID and an admin will send your code to your registered phone number.
            </p>

            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Staff ID"
                value={recoverStaffId}
                onChange={(e) => setRecoverStaffId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRecovery()}
                disabled={isLoading}
                className="pl-10 h-12"
              />
            </div>

            <Button
              onClick={handleRecovery}
              disabled={isLoading || !recoverStaffId.trim()}
              size="lg"
              className="w-full h-12"
            >
              <Phone className="mr-2 h-5 w-5" />
              {isLoading ? "Requesting..." : "Request Recovery"}
            </Button>

            <Button
              variant="ghost"
              onClick={() => setMode("login")}
              className="w-full text-muted-foreground"
            >
              Back to Sign In
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};
