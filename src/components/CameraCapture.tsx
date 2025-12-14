import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, X, Flashlight, FlashlightOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  onClose: () => void;
}

export const CameraCapture = ({ onCapture, onClose }: CameraCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);

      // Check if torch is supported
      const track = mediaStream.getVideoTracks()[0];
      if (track) {
        const capabilities = track.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean };
        if (capabilities?.torch) {
          setTorchSupported(true);
        }
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast.error("Failed to access camera. Please check permissions.");
      onClose();
    }
  }, [onClose]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  const toggleTorch = useCallback(async () => {
    if (!stream) return;

    const track = stream.getVideoTracks()[0];
    if (!track) return;

    try {
      const newTorchState = !torchEnabled;
      await track.applyConstraints({
        advanced: [{ torch: newTorchState } as MediaTrackConstraintSet]
      });
      setTorchEnabled(newTorchState);
    } catch (error) {
      console.error("Error toggling torch:", error);
      toast.error("Failed to toggle flash");
    }
  }, [stream, torchEnabled]);

  const captureImage = useCallback(() => {
    if (!videoRef.current) return;

    setIsCapturing(true);
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const imageData = canvas.toDataURL("image/jpeg", 0.8);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      onCapture(imageData);
    }
    setIsCapturing(false);
  }, [onCapture, stream]);

  // Start camera on mount and cleanup on unmount
  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 bg-card border-b">
          <h2 className="text-lg font-semibold">Capture Container</h2>
          <div className="flex items-center gap-2">
            {torchSupported && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTorch}
                className={torchEnabled ? "text-yellow-500" : "text-muted-foreground"}
                title={torchEnabled ? "Turn off flash" : "Turn on flash"}
              >
                {torchEnabled ? (
                  <Flashlight className="h-5 w-5" />
                ) : (
                  <FlashlightOff className="h-5 w-5" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (stream) {
                  stream.getTracks().forEach((track) => track.stop());
                }
                onClose();
              }}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 relative bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="border-4 border-primary rounded-lg w-4/5 h-48 opacity-50" />
          </div>
        </div>

        <div className="absolute bottom-8 left-0 right-0 px-6">
          <Button
            onClick={captureImage}
            disabled={isCapturing || !stream}
            size="lg"
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-lg h-14 shadow-lg"
          >
            <Camera className="mr-2 h-6 w-6" />
            Capture Photo
          </Button>
        </div>
      </div>
    </div>
  );
};