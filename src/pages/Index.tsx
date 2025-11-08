import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CameraCapture } from "@/components/CameraCapture";
import { ConfirmEntry } from "@/components/ConfirmEntry";
import { EntriesTable } from "@/components/EntriesTable";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PlusCircle, Container } from "lucide-react";

const Index = () => {
  const [showCamera, setShowCamera] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string>("");
  const [extractedNumber, setExtractedNumber] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  const handleCapture = async (imageData: string) => {
    setCapturedImage(imageData);
    setIsProcessing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("extract-container-number", {
        body: { imageData },
      });

      if (error) throw error;

      if (data.containerNumber === "UNABLE_TO_READ") {
        toast.warning("Unable to read container number clearly. Please enter it manually.");
        setExtractedNumber("");
      } else {
        setExtractedNumber(data.containerNumber);
        toast.success("Container number extracted!");
      }
      
      setShowCamera(false);
      setShowConfirm(true);
    } catch (error) {
      console.error("Error processing image:", error);
      toast.error("Failed to process image. Please try again.");
      setShowCamera(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = async (containerNumber: string, size: string) => {
    try {
      const { error } = await supabase.from("container_entries").insert({
        container_number: containerNumber,
        container_size: size,
      });

      if (error) throw error;

      toast.success("Entry recorded successfully!");
      queryClient.invalidateQueries({ queryKey: ["container-entries"] });
      
      setShowConfirm(false);
      setCapturedImage("");
      setExtractedNumber("");
    } catch (error) {
      console.error("Error saving entry:", error);
      toast.error("Failed to save entry. Please try again.");
    }
  };

  const handleCancel = () => {
    setShowConfirm(false);
    setCapturedImage("");
    setExtractedNumber("");
  };

  if (showCamera) {
    return <CameraCapture onCapture={handleCapture} onClose={() => setShowCamera(false)} />;
  }

  if (showConfirm) {
    return (
      <ConfirmEntry
        containerNumber={extractedNumber}
        imageData={capturedImage}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground py-6 px-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Container className="h-8 w-8" />
          <h1 className="text-2xl font-bold">Container Tracker</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6 pb-24">
        <div className="sticky top-4 z-10">
          <Button
            onClick={() => setShowCamera(true)}
            disabled={isProcessing}
            size="lg"
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-lg h-16 shadow-lg"
          >
            <PlusCircle className="mr-2 h-6 w-6" />
            {isProcessing ? "Processing..." : "Record Entry"}
          </Button>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Recent Entries</h2>
          <EntriesTable />
        </div>
      </main>
    </div>
  );
};

export default Index;
