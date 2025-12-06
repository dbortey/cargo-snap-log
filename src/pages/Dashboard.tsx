import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Package, Car, Truck, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, startOfDay, isToday, isYesterday, subDays } from "date-fns";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

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
    { name: "40ft", value: filteredEntries.filter((e) => e.container_size === "40ft").length, color: "hsl(var(--success))" },
    { name: "45ft", value: filteredEntries.filter((e) => e.container_size === "45ft").length, color: "hsl(var(--warning))" },
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
    clearing: { label: "Clearing", color: "hsl(var(--success))" },
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
        <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto">
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

      <div className="px-4 py-6 space-y-6 max-w-7xl mx-auto">
        {/* User Filter */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Filter by User</span>
          <button
            onClick={cycleUser}
            className="px-4 py-2 rounded-full text-sm font-medium bg-primary text-primary-foreground transition-all"
          >
            {selectedUser === "all" ? "All Users" : selectedUser}
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalContainers}</p>
                  <p className="text-xs text-muted-foreground">Total Containers</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <Car className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{receivingCount} / {clearingCount}</p>
                  <p className="text-xs text-muted-foreground">Receiving / Clearing</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <Truck className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{uniqueLicensePlates}</p>
                  <p className="text-xs text-muted-foreground">Unique Trucks</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent">
                  <Calendar className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{uniqueDays}</p>
                  <p className="text-xs text-muted-foreground">Active Days</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Bar Chart - Daily Activity */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Last 7 Days Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <BarChart data={last7Days}>
                  <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="receiving" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="clearing" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Pie Chart - Size Distribution */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Container Size Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {sizeDistribution.length > 0 ? (
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sizeDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {sizeDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top License Plates Table */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Most Frequent Trucks</CardTitle>
          </CardHeader>
          <CardContent>
            {topLicensePlates.length > 0 ? (
              <div className="space-y-3">
                {topLicensePlates.map(([plate, count], index) => (
                  <div
                    key={plate}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                        {index + 1}
                      </span>
                      <span className="font-mono font-medium text-foreground">{plate}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{count} entries</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                No license plate data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
