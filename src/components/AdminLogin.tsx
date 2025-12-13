import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, LogIn, Mail, Lock, ArrowLeft } from "lucide-react";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

interface AdminLoginProps {
  onLogin: (admin: { id: string; email: string; name: string; role: string; sessionToken: string }) => void;
}

export const AdminLogin = ({ onLogin }: AdminLoginProps) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const handleLogin = async () => {
    setErrors({});

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as "email" | "password";
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-auth", {
        body: {
          email: email.toLowerCase().trim(),
          password,
          action: "login",
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      onLogin({
        id: data.admin.id,
        email: data.admin.email,
        name: data.admin.name,
        role: data.admin.role,
        sessionToken: data.sessionToken,
      });
      toast.success(`Welcome, ${data.admin.name}!`);
    } catch (error) {
      console.error("Admin login error:", error);
      toast.error("Failed to login. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

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

    function createParticles(count = 120) {
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
    createParticles(120);
    loop();

    window.addEventListener("resize", resizeCanvas);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      {/* Animation Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <canvas id="animationCanvas" className="w-full h-full block"></canvas>
      </div>
      {/* Rainbow Animation */}
      <div className="rainbow-container absolute inset-0 z-0 pointer-events-none">
        {[...Array(25)].map((_, i) => (
          <div key={i} className="rainbow"></div>
        ))}
      </div>
      {/* Back button */}
      <button
        onClick={() => navigate("/")}
        className="absolute top-4 left-4 p-2 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        aria-label="Back to login"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="text-sm">Back</span>
      </button>
      
      <Card className="w-full max-w-md p-8 space-y-6 border-border/50 shadow-xl relative z-10">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
            <p className="text-muted-foreground mt-1">Sign in to manage the system</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Admin email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors({});
                }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                disabled={isLoading}
                className={`pl-10 h-12 ${errors.email ? "border-destructive" : ""}`}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-destructive pl-1">{errors.email}</p>
            )}
          </div>

          <div className="space-y-1">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors({});
                }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                disabled={isLoading}
                className={`pl-10 h-12 ${errors.password ? "border-destructive" : ""}`}
              />
            </div>
            {errors.password && (
              <p className="text-xs text-destructive pl-1">{errors.password}</p>
            )}
          </div>

          <Button
            onClick={handleLogin}
            disabled={isLoading || !email.trim() || !password.trim()}
            size="lg"
            className="w-full h-12"
          >
            <LogIn className="mr-2 h-5 w-5" />
            {isLoading ? "Signing in..." : "Sign In"}
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Admin accounts are created by system administrators only.
        </p>
      </Card>
    </div>
  );
};
