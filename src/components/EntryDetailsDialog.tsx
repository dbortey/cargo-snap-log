import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { User, Package, Calendar, Trash2, Truck, Container } from "lucide-react";
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Package className="h-6 w-6 text-primary" />
              Entry Details
            </DialogTitle>
          </DialogHeader>

          {entry && (
            <div className="space-y-6">
              {entry.container_image && (
                <div className="relative group">
                  <div className="aspect-video bg-muted/20 rounded-xl overflow-hidden border border-border">
                    <img
                      src={entry.container_image}
                      alt="Container"
                      className="w-full h-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => handleImageClick(entry.container_image!)}
                    />
                  </div>
                </div>
              )}

              <div className="grid gap-3">
                <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-lg">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-0.5">Container Number</p>
                      <p className="font-mono font-bold text-xl">{entry.container_number}</p>
                      {entry.second_container_number && (
                        <p className="font-mono text-sm text-muted-foreground mt-1">
                          + {entry.second_container_number}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                    entry.entry_type === "receiving" 
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" 
                      : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                  }`}>
                    {entry.entry_type === "receiving" ? "📦 Receiving" : "🚚 Clearing"}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div className="p-4 bg-card rounded-xl border border-border shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-primary/10 rounded-lg">
                        <Container className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium mb-0.5">Size</p>
                        <p className="font-semibold text-lg">{entry.container_size}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-card rounded-xl border border-border shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-primary/10 rounded-lg">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium mb-0.5">Recorded By</p>
                        <p className="font-semibold text-lg">{entry.user_name}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-card rounded-xl border border-border shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-lg">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-0.5">Recorded At</p>
                      <p className="font-semibold text-lg">
                        {format(new Date(entry.created_at), "MMMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  </div>
                </div>

                {entry.license_plate_number && (
                  <div className="p-4 bg-card rounded-xl border border-border shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-primary/10 rounded-lg">
                        <Truck className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium mb-0.5">License Plate</p>
                        <p className="font-mono font-bold text-lg">{entry.license_plate_number}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 h-12 text-base font-semibold shadow-md"
                >
                  <Trash2 className="mr-2 h-5 w-5" />
                  {isDeleting ? "Deleting..." : "Delete Entry"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => onOpenChange(false)} 
                  className="flex-1 h-12 text-base font-semibold"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>

        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-5xl">
            <img
              src={selectedImage || ""}
              alt="Full size preview"
              className="w-full h-auto rounded-lg"
            />
          </DialogContent>
        </Dialog>
      </Dialog>
    </>
  );
};
