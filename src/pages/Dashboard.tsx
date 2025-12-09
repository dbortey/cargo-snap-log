import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Package, ArrowDownToLine, ArrowUpFromLine, Truck, Calendar, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, subDays } from "date-fns";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const Dashboard = () => {
  const navigate = useNavigate();
  const [selectedUser, setSelectedUser] = useState<string>("all");

  const { data: entries = [] } = useQuery({
    queryKey: ["container-entries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("container_entries")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const users = [...new Set(entries.map((e) => e.user_name))].sort();

  const filteredEntries = selectedUser === "all" 
    ? entries 
    : entries.filter((e) => e.user_name === selectedUser);

  // Stats calculations
  const totalContainers = filteredEntries.length;
  const receivingCount = filteredEntries.filter((e) => e.entry_type === "receiving").length;
  const clearingCount = filteredEntries.filter((e) => e.entry_type === "clearing").length;
  
  const uniqueLicensePlates = new Set(
    filteredEntries.filter((e) => e.license_plate_number).map((e) => e.license_plate_number)
  ).size;

  const uniqueDays = new Set(
    filteredEntries.map((e) => format(new Date(e.created_at), "yyyy-MM-dd"))
  ).size;

  // Daily entries for bar chart (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
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
  });

  // Size distribution for pie chart
  const sizeDistribution = [
    { name: "20ft", value: filteredEntries.filter((e) => e.container_size === "20ft").length, color: "hsl(var(--primary))" },
    { name: "40ft", value: filteredEntries.filter((e) => e.container_size === "40ft").length, color: "hsl(var(--chart-2))" },
    { name: "45ft", value: filteredEntries.filter((e) => e.container_size === "45ft").length, color: "hsl(var(--chart-3))" },
  ].filter((s) => s.value > 0);

  // Top license plates by frequency
  const licensePlateFrequency = filteredEntries
    .filter((e) => e.license_plate_number)
    .reduce((acc, e) => {
      acc[e.license_plate_number!] = (acc[e.license_plate_number!] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const topLicensePlates = Object.entries(licensePlateFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto">
          <button
            onClick={() => navigate("/")}
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="px-4 py-5 space-y-5 max-w-4xl mx-auto">
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
        <div className="grid grid-cols-2 gap-3">
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
        <div className="space-y-4">
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
              <div className="space-y-2">
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
      </div>
    </div>
  );
};

export default Dashboard;
