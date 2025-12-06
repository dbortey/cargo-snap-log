import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, Plus, X, Check, Loader2, ArrowLeft, Package, Car } from "lucide-react";
import { CameraCapture } from "./CameraCapture";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { compressImage } from "@/lib/imageCompression";

interface EntryFormProps {
  onSubmit: (data: {
    containerNumber: string;
    secondContainerNumber?: string;
    size: string;
    containerImage: string;
    licensePlateNumber: string;
    entryType: string;
  }) => void;
  onCancel: () => void;
}

type CaptureTarget = "container" | "license" | "secondContainer" | null;

export const EntryForm = ({ onSubmit, onCancel }: EntryFormProps) => {
  const [containerNumber, setContainerNumber] = useState("");
  const [secondContainerNumber, setSecondContainerNumber] = useState("");
  const [showSecondContainer, setShowSecondContainer] = useState(false);
  const [size, setSize] = useState("20ft");
  const [entryType, setEntryType] = useState("receiving");
  const [containerImage, setContainerImage] = useState("");
  const [licensePlateNumber, setLicensePlateNumber] = useState("");
  
  const [captureTarget, setCaptureTarget] = useState<CaptureTarget>(null);
  const [isProcessingContainer, setIsProcessingContainer] = useState(false);
  const [isProcessingPlate, setIsProcessingPlate] = useState(false);
  const [isProcessingSecondContainer, setIsProcessingSecondContainer] = useState(false);

  const handleContainerCapture = async (imageData: string) => {
    setCaptureTarget(null);
    setIsProcessingContainer(true);

    try {
      const compressedImage = await compressImage(imageData);
      setContainerImage(compressedImage);

      const { data, error } = await supabase.functions.invoke("extract-container-number", {
        body: { imageData },
      });

      if (error) throw error;

      if (data.containerNumber === "UNABLE_TO_READ") {
        toast.warning("Unable to read container number. Please enter it manually.");
      } else {
        setContainerNumber(data.containerNumber);
        toast.success("Container number extracted!");
      }
    } catch (error) {
      console.error("Error processing container:", error);
      toast.error("Failed to process image. Please enter manually.");
    } finally {
      setIsProcessingContainer(false);
    }
  };

  const handleSecondContainerCapture = async (imageData: string) => {
    setCaptureTarget(null);
    setIsProcessingSecondContainer(true);

    try {
      const { data, error } = await supabase.functions.invoke("extract-container-number", {
        body: { imageData },
      });

      if (error) throw error;

      if (data.containerNumber === "UNABLE_TO_READ") {
        toast.warning("Unable to read second container number. Please enter it manually.");
      } else {
        setSecondContainerNumber(data.containerNumber);
        toast.success("Second container number extracted!");
      }
    } catch (error) {
      console.error("Error processing second container:", error);
      toast.error("Failed to process image. Please enter manually.");
    } finally {
      setIsProcessingSecondContainer(false);
    }
  };

  const handleLicensePlateCapture = async (imageData: string) => {
    setCaptureTarget(null);
    setIsProcessingPlate(true);

    try {
      const { data, error } = await supabase.functions.invoke("extract-license-plate", {
        body: { imageData },
      });

      if (error) throw error;

      if (data.licensePlateNumber === "UNABLE_TO_READ") {
        toast.warning("Unable to read license plate. Please enter it manually.");
      } else {
        setLicensePlateNumber(data.licensePlateNumber);
        toast.success("License plate extracted!");
      }
    } catch (error) {
      console.error("Error processing license plate:", error);
      toast.error("Failed to process license plate. Please enter manually.");
    } finally {
      setIsProcessingPlate(false);
    }
  };

  const handleSubmit = () => {
    if (!containerNumber.trim()) {
      toast.error("Please enter a container number");
      return;
    }
    if (!containerImage) {
      toast.error("Please capture a container image");
      return;
    }
    onSubmit({
      containerNumber,
      secondContainerNumber: showSecondContainer ? secondContainerNumber : undefined,
      size,
      containerImage,
      licensePlateNumber,
      entryType,
    });
  };

  const handleCapture = (imageData: string) => {
    if (captureTarget === "container") {
      handleContainerCapture(imageData);
    } else if (captureTarget === "license") {
      handleLicensePlateCapture(imageData);
    } else if (captureTarget === "secondContainer") {
      handleSecondContainerCapture(imageData);
    }
  };

  if (captureTarget) {
    return (
      <CameraCapture
        onCapture={handleCapture}
        onClose={() => setCaptureTarget(null)}
      />
    );
  }

  const sizeOptions = ["20ft", "40ft", "45ft"];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={onCancel} className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">New Entry</h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">
        {/* Entry Type Toggle */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Entry Type</label>
          <div className="flex gap-2 p-1 bg-muted/50 rounded-xl">
            <button
              type="button"
              onClick={() => setEntryType("receiving")}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                entryType === "receiving"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Package className="h-4 w-4 mx-auto mb-1" />
              Receiving
            </button>
            <button
              type="button"
              onClick={() => setEntryType("clearing")}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                entryType === "clearing"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Car className="h-4 w-4 mx-auto mb-1" />
              Clearing
            </button>
          </div>
        </div>

        {/* License Plate Section - First */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              License Plate
              <span className="ml-1 text-muted-foreground/60 normal-case">(Optional)</span>
            </label>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                value={licensePlateNumber}
                onChange={(e) => setLicensePlateNumber(e.target.value.toUpperCase())}
                placeholder="Enter plate number"
                className="h-12 font-mono text-base bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50"
              />
              {licensePlateNumber && (
                <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
              )}
            </div>
            <Button
              onClick={() => setCaptureTarget("license")}
              variant="outline"
              size="icon"
              className="h-12 w-12 shrink-0 bg-muted/30 border-0 hover:bg-muted/50"
              disabled={isProcessingPlate}
            >
              {isProcessingPlate ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Camera className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Container 1 Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Container 1 <span className="text-destructive">*</span>
            </label>
            {containerImage && (
              <button
                onClick={() => {
                  setContainerImage("");
                  setContainerNumber("");
                }}
                className="text-xs text-destructive hover:text-destructive/80 transition-colors"
              >
                Remove image
              </button>
            )}
          </div>
          
          {/* Container Image Capture */}
          <Button
            onClick={() => setCaptureTarget("container")}
            variant="outline"
            className={`w-full h-24 border-dashed border-2 bg-muted/20 hover:bg-muted/30 ${
              containerImage ? "border-green-500/50" : "border-border"
            }`}
            disabled={isProcessingContainer}
          >
            {isProcessingContainer ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Processing image...</span>
              </div>
            ) : containerImage ? (
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 rounded-lg overflow-hidden bg-muted">
                  <img src={containerImage} alt="Container" className="h-full w-full object-cover" />
                </div>
                <div className="flex items-center gap-2 text-green-600">
                  <Check className="h-4 w-4" />
                  <span className="font-medium">Image captured</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Camera className="h-6 w-6" />
                <span className="text-sm">Tap to capture container image</span>
              </div>
            )}
          </Button>

          {/* Container Number Input */}
          <div className="relative">
            <Input
              value={containerNumber}
              onChange={(e) => setContainerNumber(e.target.value.toUpperCase())}
              placeholder="Container number (e.g., ABCD1234567)"
              className="h-12 font-mono text-base bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50"
            />
            {containerNumber && (
              <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
            )}
          </div>
        </div>

        {/* Container 2 Section */}
        {!showSecondContainer ? (
          <Button
            variant="ghost"
            onClick={() => setShowSecondContainer(true)}
            className="w-full h-12 text-primary hover:text-primary border border-dashed border-primary/30 hover:border-primary/50 hover:bg-primary/5"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Container 2
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Container 2
              </label>
              <button
                onClick={() => {
                  setShowSecondContainer(false);
                  setSecondContainerNumber("");
                }}
                className="text-xs text-destructive hover:text-destructive/80 transition-colors"
              >
                Remove
              </button>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  value={secondContainerNumber}
                  onChange={(e) => setSecondContainerNumber(e.target.value.toUpperCase())}
                  placeholder="Container number (e.g., EFGH7654321)"
                  className="h-12 font-mono text-base bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50"
                />
                {secondContainerNumber && (
                  <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                )}
              </div>
              <Button
                onClick={() => setCaptureTarget("secondContainer")}
                variant="outline"
                size="icon"
                className="h-12 w-12 shrink-0 bg-muted/30 border-0 hover:bg-muted/50"
                disabled={isProcessingSecondContainer}
              >
                {isProcessingSecondContainer ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Camera className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Container Size */}
        <div className="space-y-3">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Container Size</label>
          <div className="flex gap-2">
            {sizeOptions.map((sizeOption) => (
              <button
                key={sizeOption}
                type="button"
                onClick={() => setSize(sizeOption)}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                  size === sizeOption
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                {sizeOption}
              </button>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <Button
            onClick={handleSubmit}
            className="w-full h-14 text-base font-semibold rounded-xl shadow-lg"
            size="lg"
            disabled={!containerNumber.trim() || !containerImage}
          >
            <Check className="mr-2 h-5 w-5" />
            Confirm Entry
          </Button>
        </div>
      </div>
    </div>
  );
};
