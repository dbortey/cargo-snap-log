import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Camera } from "lucide-react";
import { CameraCapture } from "./CameraCapture";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ConfirmEntryProps {
  containerNumber: string;
  imageData: string;
  onConfirm: (
    containerNumber: string,
    size: string,
    containerImage: string,
    licensePlateNumber: string,
    entryType: string
  ) => void;
  onCancel: () => void;
}

export const ConfirmEntry = ({
  containerNumber: initialContainerNumber,
  imageData,
  onConfirm,
  onCancel,
}: ConfirmEntryProps) => {
  const [containerNumber, setContainerNumber] = useState(initialContainerNumber);
  const [size, setSize] = useState("20ft");
  const [entryType, setEntryType] = useState("receiving");
  const [showLicensePlateCamera, setShowLicensePlateCamera] = useState(false);
  const [licensePlateImage, setLicensePlateImage] = useState<string>("");
  const [licensePlateNumber, setLicensePlateNumber] = useState<string>("");
  const [isProcessingPlate, setIsProcessingPlate] = useState(false);

  const handleLicensePlateCapture = async (image: string) => {
    setLicensePlateImage(image);
    setShowLicensePlateCamera(false);
    setIsProcessingPlate(true);

    try {
      const { data, error } = await supabase.functions.invoke("extract-license-plate", {
        body: { imageData: image },
      });

      if (error) throw error;

      if (data.licensePlateNumber === "UNABLE_TO_READ") {
        toast.warning("Unable to read license plate. Please enter it manually.");
        setLicensePlateNumber("");
      } else {
        setLicensePlateNumber(data.licensePlateNumber);
        toast.success("License plate extracted!");
      }
    } catch (error) {
      console.error("Error processing license plate:", error);
      toast.error("Failed to process license plate. Please enter manually.");
      setLicensePlateNumber("");
    } finally {
      setIsProcessingPlate(false);
    }
  };

  const handleSubmit = () => {
    if (!containerNumber.trim()) {
      toast.error("Please enter a container number");
      return;
    }
    onConfirm(containerNumber, size, imageData, licensePlateNumber, entryType);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      {showLicensePlateCamera ? (
        <CameraCapture
          onCapture={handleLicensePlateCapture}
          onClose={() => setShowLicensePlateCamera(false)}
        />
      ) : (
        <div className="max-w-2xl mx-auto space-y-6 py-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">Confirm Entry</h2>
            <Button variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          </div>

          <Card className="overflow-hidden shadow-lg border-border">
            <div className="aspect-video bg-muted/30 overflow-hidden">
              <img
                src={imageData}
                alt="Container"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">
                  Container Number
                </label>
                <Input
                  value={containerNumber}
                  onChange={(e) => setContainerNumber(e.target.value.toUpperCase())}
                  placeholder="e.g., ABCD1234567"
                  className="font-mono text-lg"
                />
              </div>

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
                  Entry Type
                </label>
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
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground">
                  License Plate <span className="text-muted-foreground font-normal">(Optional)</span>
                </label>
                
                {!licensePlateNumber ? (
                  <Button
                    onClick={() => setShowLicensePlateCamera(true)}
                    variant="outline"
                    className="w-full h-12"
                    disabled={isProcessingPlate}
                  >
                    <Camera className="mr-2 h-5 w-5" />
                    {isProcessingPlate ? "Processing..." : "Capture License Plate"}
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      value={licensePlateNumber}
                      onChange={(e) => setLicensePlateNumber(e.target.value.toUpperCase())}
                      placeholder="Enter license plate"
                      className="font-mono text-lg flex-1"
                    />
                    <Button
                      onClick={() => {
                        setLicensePlateNumber("");
                        setLicensePlateImage("");
                      }}
                      variant="ghost"
                      size="icon"
                    >
                      ✕
                    </Button>
                  </div>
                )}
                
                {!licensePlateNumber && (
                  <Input
                    value={licensePlateNumber}
                    onChange={(e) => setLicensePlateNumber(e.target.value.toUpperCase())}
                    placeholder="Or type license plate manually"
                    className="font-mono"
                  />
                )}
              </div>

              <Button
                onClick={handleSubmit}
                className="w-full h-14 text-lg font-semibold shadow-lg"
                size="lg"
              >
                ✓ Confirm Entry
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
