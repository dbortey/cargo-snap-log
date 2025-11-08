import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { CheckCircle2, X } from "lucide-react";

interface ConfirmEntryProps {
  containerNumber: string;
  imageData: string;
  onConfirm: (containerNumber: string, size: string) => void;
  onCancel: () => void;
}

export const ConfirmEntry = ({ containerNumber, imageData, onConfirm, onCancel }: ConfirmEntryProps) => {
  const [editedNumber, setEditedNumber] = useState(containerNumber);
  const [containerSize, setContainerSize] = useState<string>("");

  const handleConfirm = () => {
    if (!containerSize) {
      return;
    }
    onConfirm(editedNumber, containerSize);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-auto">
      <div className="min-h-full p-4 pb-20">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Confirm Entry</h2>
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <Card className="mb-6 overflow-hidden">
            <img
              src={imageData}
              alt="Captured container"
              className="w-full h-auto"
            />
          </Card>

          <div className="space-y-6">
            <div>
              <Label htmlFor="container-number" className="text-base font-semibold mb-2 block">
                Container Number
              </Label>
              <Input
                id="container-number"
                value={editedNumber}
                onChange={(e) => setEditedNumber(e.target.value.toUpperCase())}
                placeholder="ABCD1234567"
                className="text-lg h-12 font-mono"
                maxLength={11}
              />
              <p className="text-sm text-muted-foreground mt-2">
                Format: 4 letters + 7 numbers (e.g., ABCD1234567)
              </p>
            </div>

            <div>
              <Label htmlFor="container-size" className="text-base font-semibold mb-2 block">
                Container Size
              </Label>
              <Select value={containerSize} onValueChange={setContainerSize}>
                <SelectTrigger className="h-12 text-lg">
                  <SelectValue placeholder="Select container size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20ft" className="text-lg">20ft Container (1x20)</SelectItem>
                  <SelectItem value="40ft" className="text-lg">40ft Container (1x40)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-card border-t">
            <div className="max-w-2xl mx-auto">
              <Button
                onClick={handleConfirm}
                disabled={!editedNumber || !containerSize || editedNumber.length !== 11}
                size="lg"
                className="w-full bg-success hover:bg-success/90 text-success-foreground font-semibold text-lg h-14"
              >
                <CheckCircle2 className="mr-2 h-6 w-6" />
                Confirm Entry
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
