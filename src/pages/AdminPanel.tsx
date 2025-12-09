import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Trash2,
  X,
  Package,
  Search,
  List,
} from "lucide-react";
import { format, parseISO, isToday, isYesterday } from "date-fns";

interface RecoveryRequest {
  id: string;
  name: string;
  staff_id: string;
  phone_number: string;
  code: string;
  recovery_requested_at: string;
}

interface DeletionRequest {
  id: string;
  container_number: string;
  second_container_number: string | null;
  container_size: string;
  entry_type: string;
  user_name: string;
  created_at: string;
  deletion_requested_at: string;
}

interface ContainerEntry {
  id: string;
  container_number: string;
  second_container_number: string | null;
  container_size: string;
  entry_type: string;
  user_name: string;
  created_at: string;
  license_plate_number: string | null;
  deletion_requested: boolean;
}

const AdminPanel = () => {
  const { admin, isLoading: sessionLoading, createSession, logout, isAuthenticated } = useAdminSession();
  const [recoveryRequests, setRecoveryRequests] = useState<RecoveryRequest[]>([]);
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);
  const [entries, setEntries] = useState<ContainerEntry[]>([]);
  const [entriesSearch, setEntriesSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchRecoveryRequests = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-recovery", {
        body: { action: "get_requests" },
      });

      if (error) throw error;
      if (data.error) {
        toast.error(data.error);
        return;
      }
      setRecoveryRequests(data.requests || []);
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("Failed to fetch recovery requests");
    }
  };

  const fetchDeletionRequests = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-recovery", {
        body: { action: "get_deletion_requests" },
      });

      if (error) throw error;
      if (data.error) {
        toast.error(data.error);
        return;
      }
      setDeletionRequests(data.requests || []);
    } catch (error) {
      console.error("Error fetching deletion requests:", error);
      toast.error("Failed to fetch deletion requests");
    }
  };

  const fetchEntries = async () => {
    try {
      const { data, error } = await supabase
        .from("container_entries")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error("Error fetching entries:", error);
      toast.error("Failed to fetch entries");
    }
  };

  const fetchAllRequests = async () => {
    setIsLoading(true);
    await Promise.all([fetchRecoveryRequests(), fetchDeletionRequests(), fetchEntries()]);
    setIsLoading(false);
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

  const handleConfirmDeletion = async (entryId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-recovery", {
        body: { action: "confirm_deletion", entryId },
      });

      if (error) throw error;
      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success("Entry deleted successfully");
      fetchDeletionRequests();
    } catch (error) {
      console.error("Error confirming deletion:", error);
      toast.error("Failed to delete entry");
    }
  };

  const handleRejectDeletion = async (entryId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-recovery", {
        body: { action: "reject_deletion", entryId },
      });

      if (error) throw error;
      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success("Deletion request rejected");
      fetchDeletionRequests();
    } catch (error) {
      console.error("Error rejecting deletion:", error);
      toast.error("Failed to reject deletion request");
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
      fetchAllRequests();
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
            <h2 className="text-2xl font-bold">Management</h2>
            <p className="text-muted-foreground">Handle user requests and entries</p>
          </div>
          <Button
            onClick={fetchAllRequests}
            disabled={isLoading}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <Tabs defaultValue="entries" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="entries" className="gap-2">
              <List className="h-4 w-4" />
              Entries ({entries.length})
            </TabsTrigger>
            <TabsTrigger value="recovery" className="gap-2">
              <User className="h-4 w-4" />
              Recovery ({recoveryRequests.length})
            </TabsTrigger>
            <TabsTrigger value="deletion" className="gap-2">
              <Trash2 className="h-4 w-4" />
              Deletion ({deletionRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="entries" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search containers, names, plates..."
                value={entriesSearch}
                onChange={(e) => setEntriesSearch(e.target.value)}
                className="pl-10 h-11 max-w-md"
              />
            </div>

            {entries.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Entries</h3>
                <p className="text-muted-foreground">No container entries have been recorded yet.</p>
              </Card>
            ) : (
              <div className="space-y-6">
                {Object.entries(
                  entries
                    .filter((entry) => {
                      const search = entriesSearch.toLowerCase();
                      return (
                        entry.container_number.toLowerCase().includes(search) ||
                        entry.user_name.toLowerCase().includes(search) ||
                        entry.license_plate_number?.toLowerCase().includes(search) ||
                        entry.second_container_number?.toLowerCase().includes(search)
                      );
                    })
                    .reduce((groups: Record<string, ContainerEntry[]>, entry) => {
                      const date = parseISO(entry.created_at);
                      let dateKey: string;
                      if (isToday(date)) {
                        dateKey = "Today";
                      } else if (isYesterday(date)) {
                        dateKey = "Yesterday";
                      } else {
                        dateKey = format(date, "MMMM d, yyyy");
                      }
                      if (!groups[dateKey]) groups[dateKey] = [];
                      groups[dateKey].push(entry);
                      return groups;
                    }, {})
                ).map(([dateGroup, groupEntries]) => (
                  <div key={dateGroup}>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-1">
                      {dateGroup}
                    </h3>
                    <div className="grid gap-2">
                      {groupEntries.map((entry) => (
                        <Card key={entry.id} className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                              entry.entry_type === "receiving" ? "bg-blue-500" : "bg-emerald-500"
                            }`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div>
                                  <p className="font-mono font-bold text-base text-foreground">
                                    {entry.container_number}
                                  </p>
                                  {entry.second_container_number && (
                                    <p className="font-mono text-xs text-muted-foreground">
                                      + {entry.second_container_number}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {entry.deletion_requested && (
                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs rounded font-medium">
                                      Deletion Pending
                                    </span>
                                  )}
                                  <span className="px-2 py-0.5 bg-muted rounded text-xs font-medium text-muted-foreground">
                                    {entry.container_size}
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                <span>{entry.user_name}</span>
                                <span>•</span>
                                <span>{format(new Date(entry.created_at), "h:mm a")}</span>
                                {entry.license_plate_number && (
                                  <>
                                    <span>•</span>
                                    <span className="font-mono">{entry.license_plate_number}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="recovery" className="space-y-4">
            {recoveryRequests.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Pending Requests</h3>
                <p className="text-muted-foreground">All recovery requests have been handled.</p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {recoveryRequests.map((request) => (
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
                            <span>{format(new Date(request.recovery_requested_at), "MMM d, h:mm a")}</span>
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
                        <Button onClick={() => handleCompleteRecovery(request.id, request.name)} className="gap-2">
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
          </TabsContent>

          <TabsContent value="deletion" className="space-y-4">
            {deletionRequests.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Deletion Requests</h3>
                <p className="text-muted-foreground">All entries are in good standing.</p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {deletionRequests.map((entry) => (
                  <Card key={entry.id} className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            entry.entry_type === "receiving" ? "bg-blue-500" : "bg-emerald-500"
                          }`} />
                          <span className="text-sm font-medium text-muted-foreground capitalize">
                            {entry.entry_type}
                          </span>
                          <span className="px-2 py-0.5 bg-destructive/10 text-destructive text-xs rounded font-medium">
                            Deletion Requested
                          </span>
                        </div>

                        <div>
                          <p className="font-mono font-bold text-xl text-foreground">
                            {entry.container_number}
                          </p>
                          {entry.second_container_number && (
                            <p className="font-mono text-sm text-muted-foreground">
                              + {entry.second_container_number}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <span>Size: <span className="font-medium text-foreground">{entry.container_size}</span></span>
                          <span>•</span>
                          <span>By: <span className="font-medium text-foreground">{entry.user_name}</span></span>
                          <span>•</span>
                          <span>Created: {format(new Date(entry.created_at), "MMM d, yyyy")}</span>
                          <span>•</span>
                          <span>Requested: {format(new Date(entry.deletion_requested_at), "MMM d, h:mm a")}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          onClick={() => handleConfirmDeletion(entry.id)}
                          className="gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleRejectDeletion(entry.id)}
                          className="gap-2"
                        >
                          <X className="h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminPanel;