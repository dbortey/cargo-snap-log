import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CameraCapture } from "@/components/CameraCapture";
import { ConfirmEntry } from "@/components/ConfirmEntry";
import { EntriesGrid } from "@/components/EntriesGrid";
import { NameEntry } from "@/components/NameEntry";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PlusCircle, Container, LogOut, MapPin } from "lucide-react";
import { compressImage } from "@/lib/imageCompression";
import containerLogo from "@/assets/container-logo.png";

const Index = () => {
  const [currentUser, setCurrentUser] = useState<string>("");
  const [showCamera, setShowCamera] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string>("");
  const [extractedNumber, setExtractedNumber] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLocationValid, setIsLocationValid] = useState<boolean | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Check if user is stored in session
    const storedUser = sessionStorage.getItem("containerTrackerUser");
    if (storedUser) {
      setCurrentUser(storedUser);
    }

    // Check geolocation
    checkLocation();
  }, []);

  const checkLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      setIsLocationValid(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        // Greater Accra bounds (approximate)
        const isInGreaterAccra = 
          latitude >= 5.4 && latitude <= 6.0 &&
          longitude >= -0.5 && longitude <= 0.3;

        if (!isInGreaterAccra) {
          toast.error("Access denied: This service is only available in Greater Accra, Ghana", {
            duration: 5000,
          });
          setIsLocationValid(false);
        } else {
          setIsLocationValid(true);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast.error("Please enable location services to use this app");
        setIsLocationValid(false);
      }
    );
  };

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
    licensePlateNumber: string,
    entryType: string
  ) => {
    try {
      const { error } = await supabase.from("container_entries").insert({
        container_number: containerNumber,
        container_size: size,
        user_name: currentUser,
        container_image: containerImage,
        license_plate_number: licensePlateNumber || null,
        entry_type: entryType,
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

  if (isLocationValid === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-4">
          <div className="p-4 bg-destructive/10 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
            <MapPin className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold">Location Restricted</h1>
          <p className="text-muted-foreground">
            This service is only available in Greater Accra, Ghana. Please ensure you are within the service area and location services are enabled.
          </p>
          <Button onClick={checkLocation} variant="outline">
            Retry Location Check
          </Button>
        </div>
      </div>
    );
  }

  if (isLocationValid === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Checking location...</p>
        </div>
      </div>
    );
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
      <header className="bg-gradient-to-r from-primary to-primary/90 text-primary-foreground py-6 px-4 shadow-xl border-b border-primary/20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-foreground/10 rounded-lg backdrop-blur-sm">
              <img src={containerLogo} alt="Logo" className="h-7 w-7 object-contain" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Container Tracker</h1>
              <p className="text-xs text-primary-foreground/80">Greater Accra Operations</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-primary-foreground/70">Logged in as</p>
              <p className="text-sm font-semibold">{currentUser}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-primary-foreground hover:bg-primary-foreground/20 h-10 px-3"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 pb-24">
        <div className="sticky top-4 z-10">
          <Button
            onClick={() => setShowCamera(true)}
            disabled={isProcessing}
            size="lg"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg h-16 shadow-xl hover:shadow-2xl transition-all duration-200"
          >
            <PlusCircle className="mr-2 h-6 w-6" />
            {isProcessing ? "Processing..." : "📸 Record New Entry"}
          </Button>
        </div>

        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-bold text-foreground">Container Entries</h2>
            <div className="text-sm text-muted-foreground">
              Manage and track all container movements
            </div>
          </div>
          <EntriesGrid />
        </div>
      </main>
    </div>
  );
};

export default Index;
