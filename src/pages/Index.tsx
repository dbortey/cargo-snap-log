import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { EntryForm } from "@/components/EntryForm";
import { EntriesGrid } from "@/components/EntriesGrid";
import { NameEntry } from "@/components/NameEntry";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PlusCircle, LogOut, MapPin, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import containerLogo from "@/assets/container-logo.png";

const Index = () => {
  const [currentUser, setCurrentUser] = useState<string>("");
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [isLocationValid, setIsLocationValid] = useState<boolean | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = sessionStorage.getItem("containerTrackerUser");
    if (storedUser) {
      setCurrentUser(storedUser);
    }
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

  const handleFormSubmit = async (data: {
    containerNumber: string;
    secondContainerNumber?: string;
    size: string;
    containerImage: string;
    licensePlateNumber: string;
    entryType: string;
  }) => {
    try {
      const { error } = await supabase.from("container_entries").insert({
        container_number: data.containerNumber,
        second_container_number: data.secondContainerNumber || null,
        container_size: data.size,
        user_name: currentUser,
        container_image: data.containerImage,
        license_plate_number: data.licensePlateNumber || null,
        entry_type: data.entryType,
      });

      if (error) throw error;

      toast.success("Entry recorded successfully!");
      queryClient.invalidateQueries({ queryKey: ["container-entries"] });
      setShowEntryForm(false);
    } catch (error) {
      console.error("Error saving entry:", error);
      toast.error("Failed to save entry. Please try again.");
    }
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

  if (showEntryForm) {
    return <EntryForm onSubmit={handleFormSubmit} onCancel={() => setShowEntryForm(false)} />;
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="text-primary-foreground hover:bg-primary-foreground/20 h-10 px-3"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
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
            onClick={() => setShowEntryForm(true)}
            size="lg"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg h-16 shadow-xl hover:shadow-2xl transition-all duration-200"
          >
            <PlusCircle className="mr-2 h-6 w-6" />
            📸 Record New Entry
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
