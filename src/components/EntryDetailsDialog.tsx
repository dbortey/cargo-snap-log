import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { Trash2, X, ChevronRight, Clock, Pencil, Save } from "lucide-react";
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
    user_id?: string | null;
    created_at: string;
    container_image?: string | null;
    license_plate_number?: string | null;
    entry_type: string;
    deletion_requested?: boolean;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId?: string;
}

export const EntryDetailsDialog = ({ entry, open, onOpenChange, currentUserId }: EntryDetailsDialogProps) => {
  const [imageExpanded, setImageExpanded] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState({
    container_number: "",
    second_container_number: "",
    license_plate_number: "",
    container_size: "",
    entry_type: "",
  });
  const queryClient = useQueryClient();

  // Entries grid already shows only the current user's entries,
  // so we can treat all visible entries as owned by the current user.
  const isOwner = true;
  const alreadyRequested = entry?.deletion_requested;

  const startEditing = () => {
    if (!entry) return;
    setEditData({
      container_number: entry.container_number,
      second_container_number: entry.second_container_number || "",
      license_plate_number: entry.license_plate_number || "",
      container_size: entry.container_size,
      entry_type: entry.entry_type,
    });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!entry || !currentUserId) return;

    if (!editData.container_number.trim()) {
      toast.error("Container number is required");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("container_entries")
        .update({
          container_number: editData.container_number.toUpperCase(),
          second_container_number: editData.second_container_number.toUpperCase() || null,
          license_plate_number: editData.license_plate_number.toUpperCase() || null,
          container_size: editData.container_size,
          entry_type: editData.entry_type,
        })
        .eq("id", entry.id)
        .eq("user_id", currentUserId);

      if (error) throw error;

      toast.success("Entry updated successfully");
      queryClient.invalidateQueries({ queryKey: ["container-entries"] });
      setIsEditing(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating entry:", error);
      toast.error("Failed to update entry");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestDeletion = async () => {
    if (!entry || !currentUserId) return;
    
    if (!confirm("Request deletion of this entry? An admin will review and confirm.")) {
      return;
    }

    setIsRequesting(true);
    try {
      const { error } = await supabase
        .from("container_entries")
        .update({
          deletion_requested: true,
          deletion_requested_at: new Date().toISOString(),
          deletion_requested_by: currentUserId,
        })
        .eq("id", entry.id)
        .eq("user_id", currentUserId);

      if (error) throw error;

      toast.success("Deletion request submitted. An admin will review it.");
      queryClient.invalidateQueries({ queryKey: ["container-entries"] });
      onOpenChange(false);
    } catch (error) {
      console.error("Error requesting deletion:", error);
      toast.error("Failed to request deletion");
    } finally {
      setIsRequesting(false);
    }
  };

  if (!entry) return null;

  const entryDate = new Date(entry.created_at);

  return (
    <>
      <Dialog open={open} onOpenChange={(open) => {
        if (!open) setIsEditing(false);
        onOpenChange(open);
      }}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-card border-0 shadow-2xl rounded-2xl [&>button]:hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${
                (isEditing ? editData.entry_type : entry.entry_type) === "receiving" ? "bg-blue-500" : "bg-emerald-500"
              }`} />
              <span className="text-sm font-medium text-muted-foreground capitalize">
                {isEditing ? editData.entry_type : entry.entry_type}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {isOwner && !isEditing && !alreadyRequested && (
                <button
                  onClick={startEditing}
                  className="p-2 rounded-full hover:bg-muted transition-colors"
                  title="Edit entry"
                >
                  <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
              <button
                onClick={() => onOpenChange(false)}
                className="p-2 rounded-full hover:bg-muted transition-colors"
                title="Close"
              >
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="px-5 py-4 space-y-4">
            {isEditing ? (
              // Edit Mode
              <div className="space-y-4">
                {/* Entry Type Toggle */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Entry Type</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditData(d => ({ ...d, entry_type: "receiving" }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        editData.entry_type === "receiving"
                          ? "bg-blue-500 text-white"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      📦 Receiving
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditData(d => ({ ...d, entry_type: "clearing" }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        editData.entry_type === "clearing"
                          ? "bg-emerald-500 text-white"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      🚚 Clearing
                    </button>
                  </div>
                </div>

                {/* Container Size */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Container Size</p>
                  <div className="flex gap-2">
                    {["20ft", "40ft", "45ft"].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setEditData(d => ({ ...d, container_size: size }))}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                          editData.container_size === size
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Container Numbers */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Container 1 *</p>
                  <Input
                    value={editData.container_number}
                    onChange={(e) => setEditData(d => ({ ...d, container_number: e.target.value.toUpperCase() }))}
                    className="font-mono text-lg h-12"
                    placeholder="e.g. MSKU1234567"
                  />
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-2">Container 2 (optional)</p>
                  <Input
                    value={editData.second_container_number}
                    onChange={(e) => setEditData(d => ({ ...d, second_container_number: e.target.value.toUpperCase() }))}
                    className="font-mono text-lg h-12"
                    placeholder="e.g. TCNU7654321"
                  />
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-2">License Plate (optional)</p>
                  <Input
                    value={editData.license_plate_number}
                    onChange={(e) => setEditData(d => ({ ...d, license_plate_number: e.target.value.toUpperCase() }))}
                    className="font-mono h-11"
                    placeholder="e.g. GR-1234-23"
                  />
                </div>

                {/* Save/Cancel Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={cancelEditing}
                    className="flex-1 h-11 rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveEdit}
                    disabled={isSaving}
                    className="flex-1 h-11 rounded-xl"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            ) : (
              // View Mode
              <>
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
              </>
            )}
          </div>
          
          {/* Actions - Show for owner (only in view mode) */}
          {isOwner && !isEditing && (
            <div className="px-5 py-4 border-t border-border/50">
              {alreadyRequested ? (
                <div className="flex items-center justify-center gap-2 py-3 text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-xl">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-medium">Deletion pending admin approval</span>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  onClick={handleRequestDeletion}
                  disabled={isRequesting}
                  className="w-full h-11 rounded-xl font-medium text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {isRequesting ? "Requesting..." : "Delete Entry"}
                  <span className="ml-2 text-xs text-muted-foreground">(admin will confirm)</span>
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Expanded Image Modal */}
      <Dialog open={imageExpanded} onOpenChange={setImageExpanded}>
        <DialogContent className="max-w-4xl p-2 bg-black/95 border-0">
          <button 
            onClick={() => setImageExpanded(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
            title="Close expanded image"
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
