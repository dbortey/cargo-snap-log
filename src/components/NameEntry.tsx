import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogIn, Users } from "lucide-react";
import containerLogo from "@/assets/container-logo.png";

interface NameEntryProps {
  onConnect: (userName: string) => void;
}

interface User {
  id: string;
  name: string;
  created_at: string;
  last_seen_at: string;
}

export const NameEntry = ({ onConnect }: NameEntryProps) => {
  const [name, setName] = useState("");
  const [existingUsers, setExistingUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadExistingUsers();
  }, []);

  const loadExistingUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("users" as any)
        .select("id, name, created_at, last_seen_at")
        .order("last_seen_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setExistingUsers((data as unknown as User[]) || []);
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const handleConnect = async (userName: string) => {
    if (!userName.trim()) {
      toast.error("Please enter your name");
      return;
    }

    setIsLoading(true);
    try {
      // Check if user exists
      const { data: existingUser } = await supabase
        .from("users" as any)
        .select("id")
        .eq("name", userName.trim())
        .single();

      if (existingUser) {
        // Update last_seen_at
        await supabase
          .from("users" as any)
          .update({ last_seen_at: new Date().toISOString() } as any)
          .eq("id", (existingUser as any).id);
      } else {
        // Create new user
        const { error: insertError } = await supabase
          .from("users" as any)
          .insert({ name: userName.trim() } as any);

        if (insertError) throw insertError;
      }

      onConnect(userName.trim());
      toast.success(`Welcome, ${userName}!`);
    } catch (error) {
      console.error("Error connecting:", error);
      toast.error("Failed to connect. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-4">
          <img 
            src={containerLogo} 
            alt="Container Tracker" 
            className="h-20 w-20 mx-auto object-contain"
          />
          <div>
            <h1 className="text-3xl font-bold">Container Tracker</h1>
            <p className="text-muted-foreground mt-2">Enter your name to continue</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConnect(name)}
              disabled={isLoading}
              className="text-lg"
            />
            <Button
              onClick={() => handleConnect(name)}
              disabled={isLoading || !name.trim()}
              size="lg"
              className="w-full"
            >
              <LogIn className="mr-2 h-5 w-5" />
              {isLoading ? "Connecting..." : "Connect"}
            </Button>
          </div>

          {existingUsers.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>Recent users</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {existingUsers.map((user) => (
                  <Button
                    key={user.id}
                    variant="outline"
                    onClick={() => handleConnect(user.name)}
                    disabled={isLoading}
                    className="justify-start"
                  >
                    {user.name}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
