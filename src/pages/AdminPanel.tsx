import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  BarChart3,
  Truck,
  ArrowDownToLine,
  ArrowUpFromLine,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { format, parseISO, isToday, isYesterday, subDays } from "date-fns";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

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
  deletion_reason: string | null;
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

interface DuplicateEntry {
  container_number: string;
  entries: ContainerEntry[];
}

const AdminPanel = () => {
  const { admin, isLoading: sessionLoading, createSession, logout, isAuthenticated } = useAdminSession();
  const [recoveryRequests, setRecoveryRequests] = useState<RecoveryRequest[]>([]);
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);
  const [entries, setEntries] = useState<ContainerEntry[]>([]);
  const [entriesSearch, setEntriesSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string>("all");

  const fetchRecoveryRequests = async () => {
    if (!admin?.sessionToken) return;
    try {
      const { data, error } = await supabase.functions.invoke("admin-recovery", {
        body: { action: "get_requests", sessionToken: admin.sessionToken },
      });

      if (error) throw error;
      if (data.error) {
        if (data.error.includes("Unauthorized")) {
          toast.error("Session expired. Please log in again.");
          logout();
          return;
        }
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
    if (!admin?.sessionToken) return;
    try {
      const { data, error } = await supabase.functions.invoke("admin-recovery", {
        body: { action: "get_deletion_requests", sessionToken: admin.sessionToken },
      });

      if (error) throw error;
      if (data.error) {
        if (data.error.includes("Unauthorized")) {
          toast.error("Session expired. Please log in again.");
          logout();
          return;
        }
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
    if (!admin?.sessionToken) return;
    try {
      const { data, error } = await supabase.functions.invoke("admin-recovery", {
        body: { action: "get_all_entries", sessionToken: admin.sessionToken },
      });

      if (error) throw error;
      if (data.error) {
        if (data.error.includes("Unauthorized")) {
          toast.error("Session expired. Please log in again.");
          logout();
          return;
        }
        toast.error(data.error);
        return;
      }
      setEntries(data.entries || []);
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
    if (!admin?.sessionToken) {
      toast.error("Session expired. Please log in again.");
      logout();
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("admin-recovery", {
        body: { action: "complete_recovery", userId, sessionToken: admin.sessionToken },
      });

      if (error) throw error;
      if (data.error) {
        if (data.error.includes("Unauthorized")) {
          toast.error("Session expired. Please log in again.");
          logout();
          return;
        }
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
    if (!admin?.sessionToken) {
      toast.error("Session expired. Please log in again.");
      logout();
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("admin-recovery", {
        body: { action: "confirm_deletion", entryId, sessionToken: admin.sessionToken },
      });

      if (error) throw error;
      if (data.error) {
        if (data.error.includes("Unauthorized")) {
          toast.error("Session expired. Please log in again.");
          logout();
          return;
        }
        toast.error(data.error);
        return;
      }

      toast.success("Entry deleted successfully");
      fetchAllRequests();
    } catch (error) {
      console.error("Error confirming deletion:", error);
      toast.error("Failed to delete entry");
    }
  };

  const handleRejectDeletion = async (entryId: string) => {
    if (!admin?.sessionToken) {
      toast.error("Session expired. Please log in again.");
      logout();
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("admin-recovery", {
        body: { action: "reject_deletion", entryId, sessionToken: admin.sessionToken },
      });

      if (error) throw error;
      if (data.error) {
        if (data.error.includes("Unauthorized")) {
          toast.error("Session expired. Please log in again.");
          logout();
          return;
        }
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

  // Dashboard calculations
  const users = useMemo(() => [...new Set(entries.map((e) => e.user_name))].sort(), [entries]);

  const filteredEntries = useMemo(() => 
    selectedUser === "all" ? entries : entries.filter((e) => e.user_name === selectedUser),
    [entries, selectedUser]
  );

  const totalContainers = filteredEntries.length;
  const receivingCount = filteredEntries.filter((e) => e.entry_type === "receiving").length;
  const clearingCount = filteredEntries.filter((e) => e.entry_type === "clearing").length;
  
  const uniqueLicensePlates = new Set(
    filteredEntries.filter((e) => e.license_plate_number).map((e) => e.license_plate_number)
  ).size;

  const uniqueDays = new Set(
    filteredEntries.map((e) => format(new Date(e.created_at), "yyyy-MM-dd"))
  ).size;

  const last7Days = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayEntries = filteredEntries.filter(
      (e) => format(new Date(e.created_at), "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
    );
    return {
      date: format(date, "EEE"),
      fullDate: format(date, "MMM d"),
      receiving: dayEntries.filter((e) => e.entry_type === "receiving").length,
      clearing: dayEntries.filter((e) => e.entry_type === "clearing").length,
    };
  }), [filteredEntries]);

  const sizeDistribution = useMemo(() => [
    { name: "20ft", value: filteredEntries.filter((e) => e.container_size === "20ft").length, color: "hsl(var(--primary))" },
    { name: "40ft", value: filteredEntries.filter((e) => e.container_size === "40ft").length, color: "hsl(var(--chart-2))" },
    { name: "45ft", value: filteredEntries.filter((e) => e.container_size === "45ft").length, color: "hsl(var(--chart-3))" },
  ].filter((s) => s.value > 0), [filteredEntries]);

  const topLicensePlates = useMemo(() => {
    const frequency = filteredEntries
      .filter((e) => e.license_plate_number)
      .reduce((acc, e) => {
        acc[e.license_plate_number!] = (acc[e.license_plate_number!] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(frequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
  }, [filteredEntries]);

  // Duplicate detection - containers with same number, different users, and different entry types
  const duplicateEntries = useMemo(() => {
    const containerMap: Record<string, ContainerEntry[]> = {};
    
    entries.forEach((entry) => {
      // Check primary container number
      const key = `${entry.container_number}-${entry.entry_type}`;
      if (!containerMap[key]) containerMap[key] = [];
      containerMap[key].push(entry);
      
      // Check secondary container number if exists
      if (entry.second_container_number) {
        const key2 = `${entry.second_container_number}-${entry.entry_type}`;
        if (!containerMap[key2]) containerMap[key2] = [];
        containerMap[key2].push(entry);
      }
    });

    const duplicates: DuplicateEntry[] = [];
    
    Object.entries(containerMap).forEach(([key, entryList]) => {
      // Check if same container entered by multiple different users
      const uniqueUsers = new Set(entryList.map(e => e.user_name));
      if (uniqueUsers.size > 1 && entryList.length > 1) {
        const [containerNum] = key.split('-');
        duplicates.push({
          container_number: containerNum,
          entries: entryList,
        });
      }
    });

    return duplicates;
  }, [entries]);

  const chartConfig = {
    receiving: { label: "Receiving", color: "hsl(var(--primary))" },
    clearing: { label: "Clearing", color: "hsl(var(--chart-2))" },
  };

  const cycleUser = () => {
    const allOptions = ["all", ...users];
    const currentIndex = allOptions.indexOf(selectedUser);
    const nextIndex = (currentIndex + 1) % allOptions.length;
    setSelectedUser(allOptions[nextIndex]);
  };

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

        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5 max-w-2xl">
            <TabsTrigger value="dashboard" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="duplicates" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Duplicates</span>
              {duplicateEntries.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-amber-500 text-white rounded-full">
                  {duplicateEntries.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="entries" className="gap-2">
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Entries</span>
            </TabsTrigger>
            <TabsTrigger value="recovery" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Recovery</span>
            </TabsTrigger>
            <TabsTrigger value="deletion" className="gap-2">
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Deletion</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-5">
            {/* User Filter */}
            <button
              onClick={cycleUser}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border hover:border-primary/50 transition-all"
            >
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {selectedUser === "all" ? "All Users" : selectedUser}
              </span>
            </button>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{totalContainers}</p>
                      <p className="text-xs text-muted-foreground">Containers</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-chart-2/10">
                      <Truck className="h-5 w-5 text-chart-2" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{uniqueLicensePlates}</p>
                      <p className="text-xs text-muted-foreground">Trucks</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-chart-3/10">
                      <div className="flex gap-0.5">
                        <ArrowDownToLine className="h-4 w-4 text-chart-3" />
                        <ArrowUpFromLine className="h-4 w-4 text-chart-3" />
                      </div>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        <span className="text-primary">{receivingCount}</span>
                        <span className="text-muted-foreground mx-1">/</span>
                        <span className="text-chart-2">{clearingCount}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">In / Out</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-accent">
                      <Calendar className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{uniqueDays}</p>
                      <p className="text-xs text-muted-foreground">Days Active</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Bar Chart - Daily Activity */}
              <Card className="border-border/50">
                <CardHeader className="pb-2 px-4 pt-4">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Last 7 Days</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <ChartContainer config={chartConfig} className="h-[180px] w-full">
                    <BarChart data={last7Days} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis 
                        dataKey="date" 
                        tickLine={false} 
                        axisLine={false} 
                        fontSize={11}
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis 
                        tickLine={false} 
                        axisLine={false} 
                        fontSize={11}
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        width={30}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="receiving" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="clearing" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                  <div className="flex justify-center gap-6 mt-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm bg-primary" />
                      <span className="text-xs text-muted-foreground">Receiving</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm bg-chart-2" />
                      <span className="text-xs text-muted-foreground">Clearing</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pie Chart - Size Distribution */}
              <Card className="border-border/50">
                <CardHeader className="pb-2 px-4 pt-4">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Container Sizes</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  {sizeDistribution.length > 0 ? (
                    <div className="h-[160px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={sizeDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={70}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {sizeDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[160px] flex items-center justify-center text-muted-foreground text-sm">
                      No data
                    </div>
                  )}
                  <div className="flex justify-center gap-4 mt-2">
                    {sizeDistribution.map((item) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                        <span className="text-xs text-muted-foreground">{item.name} ({item.value})</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top License Plates */}
            <Card className="border-border/50">
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-sm font-medium text-muted-foreground">Frequent Trucks</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {topLicensePlates.length > 0 ? (
                  <div className="grid md:grid-cols-2 gap-2">
                    {topLicensePlates.map(([plate, count], index) => (
                      <div
                        key={plate}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                            {index + 1}
                          </span>
                          <span className="font-mono text-sm font-medium">{plate}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{count}×</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-muted-foreground text-sm">
                    No data
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Duplicates Tab */}
          <TabsContent value="duplicates" className="space-y-4">
            {duplicateEntries.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Duplicates Found</h3>
                <p className="text-muted-foreground">All container entries appear to be unique.</p>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    {duplicateEntries.length} container(s) recorded by different users for the same action
                  </p>
                </div>
                
                {duplicateEntries.map((duplicate, idx) => (
                  <Card key={idx} className="p-4 border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <span className="font-mono font-bold text-lg">{duplicate.container_number}</span>
                      <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-xs rounded font-medium">
                        {duplicate.entries[0].entry_type}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {duplicate.entries.map((entry) => (
                        <div 
                          key={entry.id} 
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg text-sm"
                        >
                          <div className="flex items-center gap-4">
                            <span className="font-medium">{entry.user_name}</span>
                            <span className="text-muted-foreground">
                              {format(new Date(entry.created_at), "MMM d, h:mm a")}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground">
                            {entry.container_size}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Entries Tab */}
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

          {/* Recovery Tab */}
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

                      <Button
                        onClick={() => handleCompleteRecovery(request.id, request.name)}
                        className="gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Mark Complete
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Deletion Tab */}
          <TabsContent value="deletion" className="space-y-4">
            {deletionRequests.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Pending Deletion Requests</h3>
                <p className="text-muted-foreground">All deletion requests have been handled.</p>
              </Card>
            ) : (
              <div className="grid gap-4">
                {deletionRequests.map((request) => (
                  <Card key={request.id} className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-2">
                          <Trash2 className="h-5 w-5 text-destructive" />
                          <span className="font-mono font-bold text-lg">{request.container_number}</span>
                          {request.second_container_number && (
                            <span className="font-mono text-sm text-muted-foreground">
                              + {request.second_container_number}
                            </span>
                          )}
                          <span className="px-2 py-0.5 bg-muted rounded text-xs font-medium">
                            {request.container_size}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Recorded by:</span>
                            <span className="font-medium">{request.user_name}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Type:</span>
                            <span className="font-medium capitalize">{request.entry_type}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Requested:</span>
                            <span>{format(new Date(request.deletion_requested_at), "MMM d, h:mm a")}</span>
                          </div>
                        </div>

                        {request.deletion_reason && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-lg font-medium">
                              Reason: {request.deletion_reason}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => handleRejectDeletion(request.id)}
                          className="gap-2"
                        >
                          <X className="h-4 w-4" />
                          Reject
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleConfirmDeletion(request.id)}
                          className="gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          Confirm Delete
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
