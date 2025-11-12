import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { Package, User, Calendar, Container, Truck } from "lucide-react";
import { EntryDetailsDialog } from "./EntryDetailsDialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface ContainerEntry {
  id: string;
  container_number: string;
  container_size: string;
  user_name: string;
  created_at: string;
  container_image?: string | null;
  license_plate_number?: string | null;
  entry_type: string;
}

export const EntriesGrid = () => {
  const [selectedEntry, setSelectedEntry] = useState<ContainerEntry | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date-desc");

  const { data: entries, isLoading } = useQuery({
    queryKey: ["container-entries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("container_entries")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ContainerEntry[];
    },
  });

  const filteredEntries = entries?.filter((entry) => {
    const matchesSearch = 
      entry.container_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.license_plate_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === "all" || entry.entry_type === filterType;
    
    return matchesSearch && matchesType;
  }).sort((a, b) => {
    if (sortBy === "date-desc") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    } else if (sortBy === "date-asc") {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    } else if (sortBy === "container") {
      return a.container_number.localeCompare(b.container_number);
    }
    return 0;
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="h-32 bg-muted rounded-lg"></div>
          </Card>
        ))}
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Package className="h-20 w-20 mx-auto text-muted-foreground mb-4 opacity-50" />
        <h3 className="text-xl font-semibold mb-2">No Entries Yet</h3>
        <p className="text-muted-foreground">
          Start recording container entries using the button above
        </p>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <Card className="p-4 shadow-md">
          <div className="flex flex-col md:flex-row gap-3">
            <Input
              placeholder="Search by container, user, or license plate..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="receiving">📦 Receiving</SelectItem>
                <SelectItem value="clearing">🚚 Clearing</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Newest First</SelectItem>
                <SelectItem value="date-asc">Oldest First</SelectItem>
                <SelectItem value="container">Container Number</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {filteredEntries && filteredEntries.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No entries match your filters</p>
            <Button 
              variant="ghost" 
              onClick={() => {
                setSearchTerm("");
                setFilterType("all");
              }}
              className="mt-4"
            >
              Clear Filters
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEntries?.map((entry) => (
              <Card
                key={entry.id}
                className="overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-200 border-border hover:border-primary/50 group"
                onClick={() => {
                  setSelectedEntry(entry);
                  setDialogOpen(true);
                }}
              >
                {entry.container_image && (
                  <div className="aspect-video bg-muted/30 overflow-hidden">
                    <img
                      src={entry.container_image}
                      alt="Container"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                )}
                
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="h-4 w-4 text-primary flex-shrink-0" />
                        <h3 className="font-mono font-bold text-lg truncate">
                          {entry.container_number}
                        </h3>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {entry.container_size}
                      </p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${
                      entry.entry_type === "receiving" 
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" 
                        : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                    }`}>
                      {entry.entry_type === "receiving" ? (
                        <>
                          <Container className="h-3 w-3" />
                          Receiving
                        </>
                      ) : (
                        <>
                          <Truck className="h-3 w-3" />
                          Clearing
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground font-medium">{entry.user_name}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{format(new Date(entry.created_at), "MMM d, yyyy • h:mm a")}</span>
                    </div>

                    {entry.license_plate_number && (
                      <div className="mt-2 pt-2 border-t border-border">
                        <div className="inline-block px-2 py-1 bg-muted/50 rounded text-xs font-mono">
                          🚗 {entry.license_plate_number}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <EntryDetailsDialog
        entry={selectedEntry}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
};
