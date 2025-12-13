import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogIn, UserPlus, KeyRound, Phone, User, Hash, Sparkles, Shield } from "lucide-react";
import containerLogo from "@/assets/container-logo.png";
import { loginSchema, signupSchema, recoverySchema } from "@/lib/validation";
import { z } from "zod";
import { InstallAppButton } from "./InstallAppButton";

interface NameEntryProps {
  onConnect: (userId: string, userName: string, staffId: string, sessionToken: string) => void;
}

type AuthMode = "login" | "signup" | "recover";

interface FieldError {
  name?: string;
  code?: string;
  staffId?: string;
  phone?: string;
}

export const NameEntry = ({ onConnect }: NameEntryProps) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("login");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FieldError>({});

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

  const clearErrors = () => setErrors({});

  useEffect(() => {
    const canvas = document.getElementById("animationCanvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let dpr = window.devicePixelRatio || 1;
    function resizeCanvas() {
      dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const particles: { x: number; y: number; radius: number; color: string; vx: number; vy: number }[] = [];
    const colors = [
      "rgba(255,126,179,0.28)",
      "rgba(255,117,140,0.22)",
      "rgba(255,106,106,0.18)",
      "rgba(255,140,66,0.18)",
      "rgba(255,201,60,0.14)",
    ];

    function createParticles(count = 100) {
      particles.length = 0;
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          radius: Math.random() * 3 + 1,
          color: colors[Math.floor(Math.random() * colors.length)],
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6,
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      });
    }

    function update() {
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -50) p.x = window.innerWidth + 50;
        if (p.x > window.innerWidth + 50) p.x = -50;
        if (p.y < -50) p.y = window.innerHeight + 50;
        if (p.y > window.innerHeight + 50) p.y = -50;
      }
    }

    let raf = 0;
    function loop() {
      update();
      draw();
      raf = requestAnimationFrame(loop);
    }

    resizeCanvas();
    createParticles(100);
    loop();

    window.addEventListener("resize", resizeCanvas);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  const generateCode = () => {
    clearErrors();
    
    try {
      // Validate name and staff ID before generating
      const nameResult = z.string().trim().min(2).regex(/^[a-zA-Z\s]+$/).safeParse(signupName);
      const staffIdResult = z.string().trim().min(3).regex(/^[a-zA-Z0-9]+$/).safeParse(signupStaffId);

      if (!nameResult.success) {
        setErrors({ name: "Name must be at least 2 letters" });
        return;
      }
      if (!staffIdResult.success) {
        setErrors({ staffId: "Staff ID must be at least 3 alphanumeric characters" });
        return;
      }

      // Get letters from name (only alphabetic characters)
      const nameLetters = signupName.replace(/[^a-zA-Z]/g, "").toUpperCase();
      if (nameLetters.length < 2) {
        setErrors({ name: "Name must contain at least 2 letters" });
        return;
      }

      // Get last 3 digits from staff ID
      const staffDigits = signupStaffId.replace(/[^0-9]/g, "");
      if (staffDigits.length < 3) {
        setErrors({ staffId: "Staff ID must contain at least 3 digits" });
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
    } catch {
      toast.error("Failed to generate code");
    }
  };

  const handleLogin = async () => {
    clearErrors();

    const result = loginSchema.safeParse({
      name: loginName,
      code: loginCode.toUpperCase(),
    });

    if (!result.success) {
      const fieldErrors: FieldError = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof FieldError;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    try {
      // Use edge function for secure login with server-side session creation
      const { data, error } = await supabase.functions.invoke("user-auth", {
        body: {
          action: "login",
          name: result.data.name,
          code: result.data.code,
        },
      });

      if (error) throw error;

      if (!data?.success) {
        if (data?.error === "Too many login attempts. Please wait a minute.") {
          toast.error(data.error);
        } else {
          toast.error("Invalid name or code");
        }
        return;
      }

      onConnect(data.user.id, data.user.name, data.user.staffId || "", data.sessionToken);
      toast.success(`Welcome back, ${data.user.name}!`);
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Failed to login. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    clearErrors();

    const result = signupSchema.safeParse({
      name: signupName,
      staffId: signupStaffId,
      phone: signupPhone,
    });

    if (!result.success) {
      const fieldErrors: FieldError = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof FieldError;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    if (!generatedCode) {
      toast.error("Please generate your code first");
      return;
    }

    setIsLoading(true);
    try {
      // Check if staff ID already exists using secure RPC
      const { data: isAvailable, error: checkError } = await supabase.rpc("check_staff_id_available", {
        p_staff_id: result.data.staffId,
      });

      if (checkError) throw checkError;

      if (!isAvailable) {
        setErrors({ staffId: "This staff ID is already registered" });
        return;
      }

      // Create new user using secure RPC
      const { data: newUser, error: insertError } = await supabase.rpc("create_user_account", {
        p_name: result.data.name,
        p_staff_id: result.data.staffId,
        p_phone_number: result.data.phone,
        p_code: generatedCode,
      });

      if (insertError) {
        if (insertError.message.includes("Staff ID already registered")) {
          setErrors({ staffId: "This staff ID is already registered" });
          return;
        }
        throw insertError;
      }

      if (!newUser || newUser.length === 0) {
        throw new Error("Failed to create account");
      }

      const user = newUser[0];
      
      // Login after signup to get session token
      const { data: loginData, error: loginError } = await supabase.functions.invoke("user-auth", {
        body: {
          action: "login",
          name: result.data.name,
          code: generatedCode,
        },
      });

      if (loginError || !loginData?.success) {
        // User was created but login failed - still allow them in with empty session
        // They'll need to login again on next visit
        console.error("Auto-login after signup failed:", loginError);
        onConnect(user.user_id, user.user_name, result.data.staffId, "");
      } else {
        onConnect(loginData.user.id, loginData.user.name, result.data.staffId, loginData.sessionToken);
      }
      
      toast.success(`Welcome, ${result.data.name}! Your code is: ${generatedCode}`);
    } catch (error) {
      console.error("Signup error:", error);
      toast.error("Failed to create account. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecovery = async () => {
    clearErrors();

    const result = recoverySchema.safeParse({
      staffId: recoverStaffId,
    });

    if (!result.success) {
      const fieldErrors: FieldError = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof FieldError;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    try {
      // Use secure RPC function for recovery request
      const { data: found, error } = await supabase.rpc("request_recovery", {
        p_staff_id: result.data.staffId,
      });

      if (error) throw error;

      if (!found) {
        setErrors({ staffId: "No account found with this staff ID" });
        return;
      }

      toast.success("Recovery request sent! An admin will contact you shortly.");
      setMode("login");
      setRecoverStaffId("");
    } catch (error) {
      console.error("Recovery error:", error);
      toast.error("Failed to request recovery. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      {/* Animation Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <canvas id="animationCanvas" className="w-full h-full block"></canvas>
      </div>
      <div className="rainbow-container absolute inset-0 z-0 pointer-events-none">
        {[...Array(25)].map((_, i) => (
          <div key={i} className="rainbow" />
        ))}
      </div>
      {/* Admin toggle - subtle icon at top right */}
      <button
        onClick={() => navigate("/admin")}
        className="absolute top-4 right-4 p-2 opacity-5 hover:opacity-30 transition-opacity"
        aria-label="Admin login"
      >
        <Shield className="h-5 w-5" />
      </button>
      
      <Card className="w-full max-w-md p-8 space-y-6 border-border/50 shadow-xl relative z-10">
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
              <div className="space-y-1">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="First name"
                    value={loginName}
                    onChange={(e) => {
                      setLoginName(e.target.value);
                      clearErrors();
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    disabled={isLoading}
                    className={`pl-10 h-12 ${errors.name ? "border-destructive" : ""}`}
                  />
                </div>
                {errors.name && (
                  <p className="text-xs text-destructive pl-1">{errors.name}</p>
                )}
              </div>
              <div className="space-y-1">
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Your code (e.g., AB123)"
                    value={loginCode}
                    onChange={(e) => {
                      setLoginCode(e.target.value.toUpperCase());
                      clearErrors();
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    disabled={isLoading}
                    className={`pl-10 h-12 font-mono uppercase ${errors.code ? "border-destructive" : ""}`}
                    maxLength={5}
                  />
                </div>
                {errors.code && (
                  <p className="text-xs text-destructive pl-1">{errors.code}</p>
                )}
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
                onClick={() => {
                  setMode("signup");
                  clearErrors();
                }}
                className="flex-1 text-muted-foreground"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Create Account
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setMode("recover");
                  clearErrors();
                }}
                className="flex-1 text-muted-foreground"
              >
                <KeyRound className="mr-2 h-4 w-4" />
                Forgot Code?
              </Button>
            </div>

            {/* Install App Button */}
            <div className="pt-4 border-t border-border/50">
              <InstallAppButton />
            </div>
          </div>
        )}

        {/* Signup Form */}
        {mode === "signup" && (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="First name"
                    value={signupName}
                    onChange={(e) => {
                      setSignupName(e.target.value);
                      setGeneratedCode("");
                      clearErrors();
                    }}
                    disabled={isLoading}
                    className={`pl-10 h-12 ${errors.name ? "border-destructive" : ""}`}
                  />
                </div>
                {errors.name && (
                  <p className="text-xs text-destructive pl-1">{errors.name}</p>
                )}
              </div>
              <div className="space-y-1">
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Staff ID"
                    value={signupStaffId}
                    onChange={(e) => {
                      setSignupStaffId(e.target.value);
                      setGeneratedCode("");
                      clearErrors();
                    }}
                    disabled={isLoading}
                    className={`pl-10 h-12 ${errors.staffId ? "border-destructive" : ""}`}
                  />
                </div>
                {errors.staffId && (
                  <p className="text-xs text-destructive pl-1">{errors.staffId}</p>
                )}
              </div>
              <div className="space-y-1">
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="tel"
                    placeholder="Phone (0XXXXXXXXX or +233XXXXXXXXX)"
                    value={signupPhone}
                    onChange={(e) => {
                      setSignupPhone(e.target.value);
                      clearErrors();
                    }}
                    disabled={isLoading}
                    className={`pl-10 h-12 ${errors.phone ? "border-destructive" : ""}`}
                  />
                </div>
                {errors.phone && (
                  <p className="text-xs text-destructive pl-1">{errors.phone}</p>
                )}
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
              onClick={() => {
                setMode("login");
                clearErrors();
              }}
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

            <div className="space-y-1">
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Staff ID"
                  value={recoverStaffId}
                  onChange={(e) => {
                    setRecoverStaffId(e.target.value);
                    clearErrors();
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleRecovery()}
                  disabled={isLoading}
                  className={`pl-10 h-12 ${errors.staffId ? "border-destructive" : ""}`}
                />
              </div>
              {errors.staffId && (
                <p className="text-xs text-destructive pl-1">{errors.staffId}</p>
              )}
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
              onClick={() => {
                setMode("login");
                clearErrors();
              }}
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
