import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAdminSession } from "@/hooks/useAdminSession";
import { AdminLogin } from "@/components/AdminLogin";
import {
  Shield,
  LogOut,
  RefreshCw,
  Phone,
  User,
  Hash,
  Clock,
  Copy,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";

interface RecoveryRequest {
  id: string;
  name: string;
  staff_id: string;
  phone_number: string;
  code: string;
  recovery_requested_at: string;
}

const AdminPanel = () => {
  const { admin, isLoading: sessionLoading, createSession, logout, isAuthenticated } = useAdminSession();
  const [requests, setRequests] = useState<RecoveryRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchRecoveryRequests = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-recovery", {
        body: { action: "get_requests" },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setRequests(data.requests || []);
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("Failed to fetch recovery requests");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteRecovery = async (userId: string, userName: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-recovery", {
        body: { action: "complete_recovery", userId },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success(`Recovery completed for ${userName}`);
      fetchRecoveryRequests();
    } catch (error) {
      console.error("Error completing recovery:", error);
      toast.error("Failed to complete recovery");
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchRecoveryRequests();
    }
  }, [isAuthenticated]);

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin onLogin={createSession} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-6 px-4 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Shield className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
              <p className="text-xs text-white/70">Container Tracker Management</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-white/70">Logged in as</p>
              <p className="text-sm font-semibold">{admin?.name}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-white hover:bg-white/20"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Recovery Requests</h2>
            <p className="text-muted-foreground">
              Users who have requested their login codes
            </p>
          </div>
          <Button
            onClick={fetchRecoveryRequests}
            disabled={isLoading}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {requests.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Pending Requests</h3>
            <p className="text-muted-foreground">
              All recovery requests have been handled.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {requests.map((request) => (
              <Card key={request.id} className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-amber-500" />
                      <span className="font-semibold text-lg">{request.name}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Staff ID:</span>
                        <span className="font-mono font-medium">{request.staff_id}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Phone:</span>
                        <button
                          onClick={() => copyToClipboard(request.phone_number, `phone-${request.id}`)}
                          className="font-mono font-medium hover:text-primary flex items-center gap-1"
                        >
                          {request.phone_number}
                          {copiedId === `phone-${request.id}` ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Requested:</span>
                        <span>
                          {format(new Date(request.recovery_requested_at), "MMM d, h:mm a")}
                        </span>
                      </div>
                    </div>

                    <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 inline-block">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">User's Code</p>
                          <p className="text-2xl font-mono font-bold tracking-widest text-primary">
                            {request.code}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(request.code, `code-${request.id}`)}
                          className="h-10 w-10 p-0"
                        >
                          {copiedId === `code-${request.id}` ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <Copy className="h-5 w-5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={() => handleCompleteRecovery(request.id, request.name)}
                      className="gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Mark as Sent
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      Click after sending the code via SMS
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPanel;
