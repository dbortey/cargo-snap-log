import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { CheckCircle2, X, Camera } from "lucide-react";
import { CameraCapture } from "./CameraCapture";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ConfirmEntryProps {
  containerNumber: string;
  imageData: string;
  onConfirm: (containerNumber: string, size: string, containerImage: string, licensePlateNumber: string) => void;
  onCancel: () => void;
}

export const ConfirmEntry = ({ containerNumber, imageData, onConfirm, onCancel }: ConfirmEntryProps) => {
  const [editedNumber, setEditedNumber] = useState(containerNumber);
  const [containerSize, setContainerSize] = useState<string>("");
  const [showLicensePlateCamera, setShowLicensePlateCamera] = useState(false);
  const [licensePlateNumber, setLicensePlateNumber] = useState<string>("");
  const [isProcessingLicense, setIsProcessingLicense] = useState(false);

  const handleLicensePlateCapture = async (image: string) => {
    setIsProcessingLicense(true);
    setShowLicensePlateCamera(false);
    
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
      setIsProcessingLicense(false);
    }
  };

  const handleFinalConfirm = () => {
    onConfirm(editedNumber, containerSize, imageData, licensePlateNumber);
  };

  const isValid = editedNumber.length === 11 && containerSize !== "";

  if (showLicensePlateCamera) {
    return (
      <CameraCapture
        onCapture={handleLicensePlateCapture}
        onClose={() => setShowLicensePlateCamera(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6 pt-6">
        <Card className="overflow-hidden">
          <div className="relative aspect-video bg-muted">
            <img
              src={imageData}
              alt="Captured container"
              className="w-full h-full object-contain"
            />
          </div>
        </Card>

        <Card className="p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="container-number">Container Number</Label>
            <Input
              id="container-number"
              value={editedNumber}
              onChange={(e) => setEditedNumber(e.target.value.toUpperCase())}
              placeholder="Enter container number"
              maxLength={11}
              className="font-mono text-lg"
            />
            <p className="text-sm text-muted-foreground">
              {editedNumber.length}/11 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="container-size">Container Size</Label>
            <Select value={containerSize} onValueChange={setContainerSize}>
              <SelectTrigger id="container-size">
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="20ft">20ft</SelectItem>
                <SelectItem value="40ft">40ft</SelectItem>
                <SelectItem value="40ft HC">40ft HC (High Cube)</SelectItem>
                <SelectItem value="45ft">45ft</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="license-plate">License Plate (Optional)</Label>
            <Input
              id="license-plate"
              value={licensePlateNumber}
              onChange={(e) => setLicensePlateNumber(e.target.value.toUpperCase())}
              placeholder="Enter license plate number"
              className="font-mono"
              disabled={isProcessingLicense}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowLicensePlateCamera(true)}
                disabled={isProcessingLicense}
                className="flex-1"
              >
                <Camera className="mr-2 h-4 w-4" />
                {isProcessingLicense ? "Processing..." : "Scan License Plate"}
              </Button>
            </div>
          </div>

          <Button
            onClick={handleFinalConfirm}
            disabled={!isValid}
            size="lg"
            className="w-full"
          >
            <CheckCircle2 className="mr-2 h-5 w-5" />
            Confirm Entry
          </Button>

          <Button
            variant="outline"
            onClick={onCancel}
            className="w-full"
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        </Card>
      </div>
    </div>
  );
};
