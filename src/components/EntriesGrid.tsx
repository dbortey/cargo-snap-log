import { useState, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { Package, Search, ChevronRight, Check } from "lucide-react";
import { EntryDetailsDialog } from "./EntryDetailsDialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface ContainerEntry {
  id: string;
  container_number: string;
  second_container_number?: string | null;
  container_size: string;
  user_name: string;
  user_id?: string | null;
  created_at: string;
  container_image?: string | null;
  license_plate_number?: string | null;
  entry_type: string;
  deletion_requested?: boolean;
  paperback_checked?: boolean;
}

type FilterType = "all" | "receiving" | "clearing";
type FilterSize = "all" | "20ft" | "40ft" | "45ft";

interface EntriesGridProps {
  currentUserId?: string;
  sessionToken?: string;
}

export const EntriesGrid = ({ currentUserId, sessionToken }: EntriesGridProps) => {
  const [selectedEntry, setSelectedEntry] = useState<ContainerEntry | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [filterSize, setFilterSize] = useState<FilterSize>("all");
  const queryClient = useQueryClient();

  const { data: entries, isLoading } = useQuery({
    queryKey: ["container-entries", currentUserId, sessionToken],
    queryFn: async () => {
      if (!sessionToken) return [];
      
      // Use secure RPC that validates session
      const { data, error } = await supabase.rpc("get_user_entries", {
        p_session_token: sessionToken,
      });

      if (error) throw error;
      return data as ContainerEntry[];
    },
    enabled: !!sessionToken,
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

  const handleTogglePaperback = async (entryId: string, checked: boolean) => {
    if (!sessionToken) return;
    
    try {
      const { error } = await supabase.rpc("toggle_paperback_status", {
        p_session_token: sessionToken,
        p_entry_id: entryId,
        p_checked: checked,
      });

      if (error) throw error;
      
      // Optimistically update cache
      queryClient.setQueryData(
        ["container-entries", currentUserId, sessionToken],
        (old: ContainerEntry[] | undefined) =>
          old?.map((e) => (e.id === entryId ? { ...e, paperback_checked: checked } : e))
      );
    } catch (error) {
      console.error("Error updating paperback status:", error);
      toast.error("Failed to update paperback status");
    }
  };

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
                      sessionToken={sessionToken}
                      onClick={() => {
                        setSelectedEntry(entry);
                        setDialogOpen(true);
                      }}
                      onTogglePaperback={handleTogglePaperback}
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
        currentUserId={currentUserId}
        sessionToken={sessionToken}
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
  sessionToken,
  onClick,
  onTogglePaperback,
}: { 
  entry: ContainerEntry; 
  sessionToken?: string;
  onClick: () => void;
  onTogglePaperback: (entryId: string, checked: boolean) => void;
}) => {
  const entryDate = new Date(entry.created_at);
  const isPaperbackChecked = entry.paperback_checked ?? false;
  const isMarkedForDelete = entry.deletion_requested ?? false;
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Swipe handling
  const touchStartX = useRef<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setIsAnimating(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const currentX = e.touches[0].clientX;
    const diff = touchStartX.current - currentX;
    // Only allow left swipe, max 80px
    if (diff > 0) {
      setSwipeOffset(Math.min(diff, 80));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    
    setIsAnimating(true);
    
    // Swipe left threshold (50px)
    if (diff > 50 && sessionToken) {
      onTogglePaperback(entry.id, !isPaperbackChecked);
    }
    
    // Animate back
    setSwipeOffset(0);
    touchStartX.current = null;
  };

  const handleCheckboxChange = (checked: boolean) => {
    onTogglePaperback(entry.id, checked);
  };
  
  return (
    <div
      ref={cardRef}
      className="relative overflow-hidden rounded-xl"
    >
      {/* Swipe reveal background */}
      <div className="absolute inset-y-0 right-0 w-20 bg-primary flex items-center justify-center rounded-r-xl">
        <Check className="h-5 w-5 text-primary-foreground" />
      </div>
      
      {/* Card content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ 
          transform: `translateX(-${swipeOffset}px)`,
          transition: isAnimating ? 'transform 0.3s ease-out' : 'none'
        }}
        className="relative w-full bg-card p-4 shadow-sm border border-border/50 hover:border-primary/30 hover:shadow-md group rounded-xl"
      >
        <div className="flex items-start gap-3">
          {/* Status Indicators - Stacked dots */}
          <div className="mt-1 flex flex-col items-center gap-1.5 flex-shrink-0">
            {/* Entry type dot (blue/green) */}
            <div className={`w-2.5 h-2.5 rounded-full ${
              entry.entry_type === "receiving" ? "bg-blue-500" : "bg-emerald-500"
            }`} />
            {/* Paperback indicator (black dot) - only show if not checked */}
            {!isPaperbackChecked && (
              <div className="w-2 h-2 rounded-full bg-foreground/80" />
            )}
          </div>
          
          {/* Content */}
          <button
            onClick={onClick}
            className="flex-1 min-w-0 text-left"
          >
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
          </button>

          {/* Right side: Thumbnail & Arrow */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Thumbnail */}
            {entry.container_image && (
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                <img
                  src={entry.container_image}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            {/* Arrow */}
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
        </div>

        {/* Bottom row: Paperback checkbox and Delete badge */}
        <div 
          className="mt-3 pt-3 border-t border-border/30 flex items-center justify-between"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2">
            <Checkbox
              id={`paperback-${entry.id}`}
              checked={isPaperbackChecked}
              onCheckedChange={handleCheckboxChange}
              className="h-4 w-4 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <label 
              htmlFor={`paperback-${entry.id}`}
              className="text-xs text-muted-foreground cursor-pointer select-none"
            >
              Paperback
            </label>
          </div>
          
          {/* Marked for Delete badge */}
          {isMarkedForDelete && (
            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-medium rounded whitespace-nowrap">
              Marked for delete
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
