import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { User, Package, Calendar, Image as ImageIcon } from "lucide-react";
import { useState } from "react";

interface EntryDetailsDialogProps {
  entry: {
    id: string;
    container_number: string;
    container_size: string;
    user_name: string;
    created_at: string;
    container_image?: string | null;
    license_plate_image?: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EntryDetailsDialog = ({ entry, open, onOpenChange }: EntryDetailsDialogProps) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  if (!entry) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Entry Details</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Container Info */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Container Number</p>
                  <p className="text-xl font-mono font-bold">{entry.container_number}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Container Size</p>
                  <Badge variant="secondary" className="mt-1">
                    {entry.container_size}
                  </Badge>
                </div>
              </div>
            </div>

            {/* User and Date */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Recorded by</p>
                  <p className="font-medium">{entry.user_name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Date & Time</p>
                  <p className="font-medium">
                    {format(new Date(entry.created_at), "MMMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              </div>
            </div>

            {/* Images */}
            {(entry.container_image || entry.license_plate_image) && (
              <div className="space-y-3 pt-4 border-t">
                <p className="font-semibold flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Images
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {entry.container_image && (
                    <button
                      onClick={() => setImagePreview(entry.container_image!)}
                      className="relative aspect-video rounded-lg overflow-hidden border-2 border-border hover:border-primary transition-colors"
                    >
                      <img
                        src={entry.container_image}
                        alt="Container"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-white" />
                      </div>
                      <p className="absolute bottom-2 left-2 right-2 text-xs text-white bg-black/70 px-2 py-1 rounded">
                        Container Photo
                      </p>
                    </button>
                  )}
                  {entry.license_plate_image && (
                    <button
                      onClick={() => setImagePreview(entry.license_plate_image!)}
                      className="relative aspect-video rounded-lg overflow-hidden border-2 border-border hover:border-primary transition-colors"
                    >
                      <img
                        src={entry.license_plate_image}
                        alt="License Plate"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-white" />
                      </div>
                      <p className="absolute bottom-2 left-2 right-2 text-xs text-white bg-black/70 px-2 py-1 rounded">
                        License Plate
                      </p>
                    </button>
                  )}
                </div>
              </div>
            )}
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
