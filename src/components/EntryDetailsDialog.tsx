import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { User, Package, Calendar, Trash2, Truck, Container, X, ChevronRight } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface EntryDetailsDialogProps {
  entry: {
    id: string;
    container_number: string;
    second_container_number?: string | null;
    container_size: string;
    user_name: string;
    created_at: string;
    container_image?: string | null;
    license_plate_number?: string | null;
    entry_type: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EntryDetailsDialog = ({ entry, open, onOpenChange }: EntryDetailsDialogProps) => {
  const [imageExpanded, setImageExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    if (!entry) return;
    
    if (!confirm("Are you sure you want to delete this entry? This action cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("container_entries")
        .delete()
        .eq("id", entry.id);

      if (error) throw error;

      toast.success("Entry deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["container-entries"] });
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting entry:", error);
      toast.error("Failed to delete entry");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!entry) return null;

  const entryDate = new Date(entry.created_at);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-card border-0 shadow-2xl rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${
                entry.entry_type === "receiving" ? "bg-blue-500" : "bg-emerald-500"
              }`} />
              <span className="text-sm font-medium text-muted-foreground capitalize">
                {entry.entry_type}
              </span>
            </div>
            <button 
              onClick={() => onOpenChange(false)}
              className="p-1.5 rounded-full hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Main Content */}
          <div className="px-5 py-4 space-y-4">
            {/* Container Numbers - Equal Treatment */}
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Container 1</p>
                  <p className="font-mono font-bold text-xl tracking-tight text-foreground">
                    {entry.container_number}
                  </p>
                </div>
                <span className="px-3 py-1.5 bg-muted rounded-lg text-sm font-semibold text-foreground">
                  {entry.container_size}
                </span>
              </div>
              
              {entry.second_container_number && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Container 2</p>
                  <p className="font-mono font-bold text-xl tracking-tight text-foreground">
                    {entry.second_container_number}
                  </p>
                </div>
              )}
            </div>

            {/* Details Grid */}
            <div className="space-y-2.5">
              <DetailRow 
                label="Recorded by" 
                value={entry.user_name}
              />
              <DetailRow 
                label="Date" 
                value={format(entryDate, "d MMM yyyy")}
              />
              <DetailRow 
                label="Time" 
                value={format(entryDate, "h:mm a")}
              />
              {entry.license_plate_number && (
                <DetailRow 
                  label="License Plate" 
                  value={entry.license_plate_number}
                  mono
                />
              )}
            </div>

            {/* Image Thumbnail */}
            {entry.container_image && (
              <button
                onClick={() => setImageExpanded(true)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
              >
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  <img
                    src={entry.container_image}
                    alt="Container"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-foreground">Container Photo</p>
                  <p className="text-xs text-muted-foreground">Tap to view full image</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="px-5 py-4 border-t border-border/50">
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full h-11 rounded-xl font-medium"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting ? "Deleting..." : "Delete Entry"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Expanded Image Modal */}
      <Dialog open={imageExpanded} onOpenChange={setImageExpanded}>
        <DialogContent className="max-w-4xl p-2 bg-black/95 border-0">
          <button 
            onClick={() => setImageExpanded(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
          >
            <X className="h-5 w-5 text-white" />
          </button>
          <img
            src={entry.container_image || ""}
            alt="Container full view"
            className="w-full h-auto rounded-lg max-h-[80vh] object-contain"
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

const DetailRow = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className={`text-sm font-medium text-foreground ${mono ? "font-mono" : ""}`}>
      {value}
    </span>
  </div>
);
