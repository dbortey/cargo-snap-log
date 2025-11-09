import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { CheckCircle2, X, Camera } from "lucide-react";
import { CameraCapture } from "./CameraCapture";
import { compressImage } from "@/lib/imageCompression";

interface ConfirmEntryProps {
  containerNumber: string;
  imageData: string;
  onConfirm: (containerNumber: string, size: string, containerImage: string, licensePlateImage: string) => void;
  onCancel: () => void;
}

export const ConfirmEntry = ({ containerNumber, imageData, onConfirm, onCancel }: ConfirmEntryProps) => {
  const [editedNumber, setEditedNumber] = useState(containerNumber);
  const [containerSize, setContainerSize] = useState<string>("");
  const [showLicensePlateCamera, setShowLicensePlateCamera] = useState(false);
  const [licensePlateImage, setLicensePlateImage] = useState<string>("");
  const [step, setStep] = useState<"size" | "license">("size");

  const handleSizeConfirm = () => {
    setStep("license");
  };

  const handleLicensePlateCapture = async (image: string) => {
    const compressed = await compressImage(image);
    setLicensePlateImage(compressed);
    setShowLicensePlateCamera(false);
  };

  const handleFinalConfirm = () => {
    onConfirm(editedNumber, containerSize, imageData, licensePlateImage);
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

          {step === "size" && (
            <Button
              onClick={handleSizeConfirm}
              disabled={!isValid}
              size="lg"
              className="w-full"
            >
              Next: Capture License Plate
            </Button>
          )}

          {step === "license" && (
            <div className="space-y-4">
              {licensePlateImage ? (
                <>
                  <div className="space-y-2">
                    <Label>License Plate Photo</Label>
                    <div className="relative aspect-video rounded-lg overflow-hidden border-2 border-border">
                      <img
                        src={licensePlateImage}
                        alt="License plate"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setLicensePlateImage("")}
                      className="flex-1"
                    >
                      Retake Photo
                    </Button>
                    <Button
                      onClick={handleFinalConfirm}
                      className="flex-1"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Confirm Entry
                    </Button>
                  </div>
                </>
              ) : (
                <Button
                  onClick={() => setShowLicensePlateCamera(true)}
                  size="lg"
                  className="w-full"
                >
                  <Camera className="mr-2 h-5 w-5" />
                  Capture License Plate
                </Button>
              )}
            </div>
          )}

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
