import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { Package, Search, ChevronRight, Image } from "lucide-react";
import { EntryDetailsDialog } from "./EntryDetailsDialog";
import { Input } from "@/components/ui/input";

interface ContainerEntry {
  id: string;
  container_number: string;
  second_container_number?: string | null;
  container_size: string;
  user_name: string;
  created_at: string;
  container_image?: string | null;
  license_plate_number?: string | null;
  entry_type: string;
}

type FilterType = "all" | "receiving" | "clearing";
type FilterSize = "all" | "20ft" | "40ft" | "45ft";

export const EntriesGrid = () => {
  const [selectedEntry, setSelectedEntry] = useState<ContainerEntry | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [filterSize, setFilterSize] = useState<FilterSize>("all");

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

  // Cycle through type filter
  const cycleTypeFilter = () => {
    const types: FilterType[] = ["all", "receiving", "clearing"];
    const currentIndex = types.indexOf(filterType);
    setFilterType(types[(currentIndex + 1) % types.length]);
  };

  // Cycle through size filter
  const cycleSizeFilter = () => {
    const sizes: FilterSize[] = ["all", "20ft", "40ft", "45ft"];
    const currentIndex = sizes.indexOf(filterSize);
    setFilterSize(sizes[(currentIndex + 1) % sizes.length]);
  };

  const filteredEntries = useMemo(() => {
    return entries?.filter((entry) => {
      const matchesSearch = 
        entry.container_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.license_plate_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.second_container_number?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === "all" || entry.entry_type === filterType;
      const matchesSize = filterSize === "all" || entry.container_size === filterSize;
      
      return matchesSearch && matchesType && matchesSize;
    });
  }, [entries, searchTerm, filterType, filterSize]);

  // Group entries by date
  const groupedEntries = useMemo(() => {
    if (!filteredEntries) return {};
    
    const groups: Record<string, ContainerEntry[]> = {};
    
    filteredEntries.forEach((entry) => {
      const date = parseISO(entry.created_at);
      let dateKey: string;
      
      if (isToday(date)) {
        dateKey = "Today";
      } else if (isYesterday(date)) {
        dateKey = "Yesterday";
      } else {
        dateKey = format(date, "MMMM d, yyyy");
      }
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(entry);
    });
    
    return groups;
  }, [filteredEntries]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 w-24 bg-muted rounded mb-3" />
            <div className="space-y-2">
              <div className="h-20 bg-muted rounded-xl" />
              <div className="h-20 bg-muted rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Package className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-1">No Entries Yet</h3>
        <p className="text-sm text-muted-foreground">
          Start recording container entries using the button above
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search containers, names..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 rounded-xl bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <FilterChip
            active={filterType !== "all"}
            onClick={cycleTypeFilter}
            label={filterType === "all" ? "All Types" : filterType === "receiving" ? "📦 Receiving" : "🚚 Clearing"}
          />
          <FilterChip
            active={filterSize !== "all"}
            onClick={cycleSizeFilter}
            label={filterSize === "all" ? "All Sizes" : filterSize}
          />
          {(filterType !== "all" || filterSize !== "all") && (
            <button
              onClick={() => {
                setFilterType("all");
                setFilterSize("all");
              }}
              className="px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 rounded-full transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Entries List */}
        {filteredEntries && filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground mb-2">No entries match your filters</p>
            <button
              onClick={() => {
                setSearchTerm("");
                setFilterType("all");
                setFilterSize("all");
              }}
              className="text-sm text-primary font-medium hover:underline"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedEntries).map(([dateGroup, groupEntries]) => (
              <div key={dateGroup}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-1">
                  {dateGroup}
                </h3>
                <div className="space-y-2">
                  {groupEntries.map((entry) => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      onClick={() => {
                        setSelectedEntry(entry);
                        setDialogOpen(true);
                      }}
                    />
                  ))}
                </div>
              </div>
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

const FilterChip = ({ 
  active, 
  onClick, 
  label 
}: { 
  active: boolean; 
  onClick: () => void; 
  label: string;
}) => (
  <button
    onClick={onClick}
    className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
      active 
        ? "bg-primary text-primary-foreground shadow-sm" 
        : "bg-muted text-foreground hover:bg-muted/80"
    }`}
  >
    {label}
  </button>
);

const EntryCard = ({ 
  entry, 
  onClick 
}: { 
  entry: ContainerEntry; 
  onClick: () => void;
}) => {
  const entryDate = new Date(entry.created_at);
  
  return (
    <button
      onClick={onClick}
      className="w-full bg-card rounded-xl p-4 shadow-sm border border-border/50 hover:border-primary/30 hover:shadow-md transition-all text-left group"
    >
      <div className="flex items-start gap-3">
        {/* Status Indicator */}
        <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
          entry.entry_type === "receiving" ? "bg-blue-500" : "bg-emerald-500"
        }`} />
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0">
              <p className="font-mono font-bold text-base text-foreground truncate">
                {entry.container_number}
              </p>
              {entry.second_container_number && (
                <p className="font-mono text-xs text-muted-foreground">
                  + {entry.second_container_number}
                </p>
              )}
            </div>
            <span className="px-2 py-0.5 bg-muted rounded text-xs font-medium text-muted-foreground flex-shrink-0">
              {entry.container_size}
            </span>
          </div>
          
          {/* Details Row */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{entry.user_name}</span>
            <span>•</span>
            <span>{format(entryDate, "h:mm a")}</span>
            {entry.license_plate_number && (
              <>
                <span>•</span>
                <span className="font-mono">{entry.license_plate_number}</span>
              </>
            )}
          </div>
        </div>

        {/* Thumbnail & Arrow */}
        <div className="flex items-center gap-2">
          {entry.container_image && (
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0">
              <img
                src={entry.container_image}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </div>
      </div>
    </button>
  );
};
