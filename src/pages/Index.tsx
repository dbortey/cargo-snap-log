import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CameraCapture } from "@/components/CameraCapture";
import { ConfirmEntry } from "@/components/ConfirmEntry";
import { EntriesTable } from "@/components/EntriesTable";
import { NameEntry } from "@/components/NameEntry";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PlusCircle, Container, LogOut } from "lucide-react";
import { compressImage } from "@/lib/imageCompression";
import containerLogo from "@/assets/container-logo.png";

const Index = () => {
  const [currentUser, setCurrentUser] = useState<string>("");
  const [showCamera, setShowCamera] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string>("");
  const [extractedNumber, setExtractedNumber] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Check if user is stored in session
    const storedUser = sessionStorage.getItem("containerTrackerUser");
    if (storedUser) {
      setCurrentUser(storedUser);
    }
  }, []);

  const handleConnect = (userName: string) => {
    setCurrentUser(userName);
    sessionStorage.setItem("containerTrackerUser", userName);
  };

  const handleLogout = () => {
    setCurrentUser("");
    sessionStorage.removeItem("containerTrackerUser");
    toast.info("Logged out successfully");
  };

  const handleCapture = async (imageData: string) => {
    setIsProcessing(true);
    
    try {
      // Compress the image before storing
      const compressedImage = await compressImage(imageData);
      setCapturedImage(compressedImage);

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

  const handleConfirm = async (
    containerNumber: string,
    size: string,
    containerImage: string,
    licensePlateImage: string
  ) => {
    try {
      // Compress license plate image
      const compressedLicensePlate = licensePlateImage 
        ? await compressImage(licensePlateImage)
        : null;

      const { error } = await supabase.from("container_entries").insert({
        container_number: containerNumber,
        container_size: size,
        user_name: currentUser,
        container_image: containerImage,
        license_plate_image: compressedLicensePlate,
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

  if (!currentUser) {
    return <NameEntry onConnect={handleConnect} />;
  }

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
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={containerLogo} alt="Logo" className="h-8 w-8 object-contain" />
            <h1 className="text-2xl font-bold">Container Tracker</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm">Welcome, {currentUser}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-primary-foreground hover:bg-primary-foreground/20"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
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
