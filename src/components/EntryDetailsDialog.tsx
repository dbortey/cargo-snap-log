import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { User, Package, Calendar, Trash2, Car } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface EntryDetailsDialogProps {
  entry: {
    id: string;
    container_number: string;
    container_size: string;
    user_name: string;
    created_at: string;
    container_image?: string | null;
    license_plate_number?: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EntryDetailsDialog = ({ entry, open, onOpenChange }: EntryDetailsDialogProps) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  if (!entry) return null;

  const handleDelete = async () => {
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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Entry Details</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Container Info Card */}
            <div className="bg-muted/30 rounded-lg p-4 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Container Number</p>
                  <p className="text-2xl font-mono font-bold mt-1">{entry.container_number}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary/10 rounded-lg">
                  <Package className="h-5 w-5 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Size</p>
                  <Badge variant="secondary" className="mt-1 font-semibold">
                    {entry.container_size}
                  </Badge>
                </div>
              </div>

              {entry.license_plate_number && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-accent/10 rounded-lg">
                    <Car className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">License Plate</p>
                    <p className="text-lg font-mono font-bold mt-1">{entry.license_plate_number}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Meta Info Card */}
            <div className="bg-muted/30 rounded-lg p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recorded by</p>
                  <p className="font-semibold mt-1">{entry.user_name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary/10 rounded-lg">
                  <Calendar className="h-5 w-5 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date & Time</p>
                  <p className="font-semibold mt-1">
                    {format(new Date(entry.created_at), "MMM d, yyyy • h:mm a")}
                  </p>
                </div>
              </div>
            </div>

            {/* Container Image */}
            {entry.container_image && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Container Photo</p>
                <button
                  onClick={() => setImagePreview(entry.container_image!)}
                  className="relative w-full aspect-video rounded-lg overflow-hidden border-2 border-border hover:border-primary transition-all shadow-sm hover:shadow-md"
                >
                  <img
                    src={entry.container_image}
                    alt="Container"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors" />
                </button>
              </div>
            )}

            {/* Delete Button */}
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting ? "Deleting..." : "Delete Entry"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={!!imagePreview} onOpenChange={() => setImagePreview(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          {imagePreview && (
            <img
              src={imagePreview}
              alt="Full size preview"
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
