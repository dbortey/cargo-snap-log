import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Plus, X, Check, Loader2 } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6 py-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">New Entry</h2>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>

        <Card className="shadow-lg border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Entry Type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant={entryType === "receiving" ? "default" : "outline"}
                onClick={() => setEntryType("receiving")}
                className="h-14 text-base"
              >
                📦 Receiving
              </Button>
              <Button
                type="button"
                variant={entryType === "clearing" ? "default" : "outline"}
                onClick={() => setEntryType("clearing")}
                className="h-14 text-base"
              >
                🚚 Clearing
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Capture Options</CardTitle>
            <p className="text-sm text-muted-foreground">Choose what to capture first</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => setCaptureTarget("container")}
                variant="outline"
                className="h-20 flex-col gap-2"
                disabled={isProcessingContainer}
              >
                <Camera className="h-6 w-6" />
                {isProcessingContainer ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </span>
                ) : containerImage ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <Check className="h-4 w-4" /> Container ✓
                  </span>
                ) : (
                  "📦 Container"
                )}
              </Button>
              <Button
                onClick={() => setCaptureTarget("license")}
                variant="outline"
                className="h-20 flex-col gap-2"
                disabled={isProcessingPlate}
              >
                <Camera className="h-6 w-6" />
                {isProcessingPlate ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </span>
                ) : licensePlateNumber ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <Check className="h-4 w-4" /> Plate ✓
                  </span>
                ) : (
                  "🚗 License Plate"
                )}
              </Button>
            </div>

            {containerImage && (
              <div className="relative aspect-video bg-muted/30 rounded-lg overflow-hidden">
                <img
                  src={containerImage}
                  alt="Container"
                  className="w-full h-full object-contain"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={() => {
                    setContainerImage("");
                    setContainerNumber("");
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Container Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                Container Number <span className="text-destructive">*</span>
              </label>
              <Input
                value={containerNumber}
                onChange={(e) => setContainerNumber(e.target.value.toUpperCase())}
                placeholder="e.g., ABCD1234567"
                className="font-mono text-lg"
              />
            </div>

            {!showSecondContainer ? (
              <Button
                variant="ghost"
                onClick={() => setShowSecondContainer(true)}
                className="text-primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Second Container Number
              </Button>
            ) : (
              <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-foreground">
                    Second Container Number
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowSecondContainer(false);
                      setSecondContainerNumber("");
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={secondContainerNumber}
                    onChange={(e) => setSecondContainerNumber(e.target.value.toUpperCase())}
                    placeholder="e.g., EFGH7654321"
                    className="font-mono text-lg flex-1"
                  />
                  <Button
                    onClick={() => setCaptureTarget("secondContainer")}
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 shrink-0"
                    disabled={isProcessingSecondContainer}
                  >
                    {isProcessingSecondContainer ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                Container Size
              </label>
              <Select value={size} onValueChange={setSize}>
                <SelectTrigger className="text-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20ft">20ft Standard</SelectItem>
                  <SelectItem value="40ft">40ft Standard</SelectItem>
                  <SelectItem value="40ft HC">40ft High Cube</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                License Plate <span className="text-muted-foreground font-normal">(Optional)</span>
              </label>
              <Input
                value={licensePlateNumber}
                onChange={(e) => setLicensePlateNumber(e.target.value.toUpperCase())}
                placeholder="Enter or capture license plate"
                className="font-mono"
              />
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={handleSubmit}
          className="w-full h-14 text-lg font-semibold shadow-lg"
          size="lg"
          disabled={!containerNumber.trim() || !containerImage}
        >
          <Check className="mr-2 h-5 w-5" />
          Confirm Entry
        </Button>
      </div>
    </div>
  );
};