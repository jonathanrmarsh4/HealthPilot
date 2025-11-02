import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function VoiceChatSimple() {
  const { toast } = useToast();
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [micStatus, setMicStatus] = useState<string>("Not tested");
  const [errorDetails, setErrorDetails] = useState<string>("");

  const testMicrophone = async () => {
    setIsTestingMic(true);
    setMicStatus("Testing...");
    setErrorDetails("");

    try {
      console.log("🎤 Step 1: Checking if mediaDevices exists...");
      console.log("navigator.mediaDevices:", navigator.mediaDevices);
      
      if (!navigator.mediaDevices) {
        throw new Error("navigator.mediaDevices is not available. This browser/app doesn't support microphone access.");
      }

      console.log("✅ Step 1 passed: mediaDevices exists");

      console.log("🎤 Step 2: Checking if getUserMedia exists...");
      console.log("navigator.mediaDevices.getUserMedia:", navigator.mediaDevices.getUserMedia);
      
      if (!navigator.mediaDevices.getUserMedia) {
        throw new Error("getUserMedia is not available. This browser/app doesn't support microphone access.");
      }

      console.log("✅ Step 2 passed: getUserMedia exists");

      console.log("🎤 Step 3: Requesting microphone permission...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      console.log("✅ Step 3 passed: Microphone access granted!");
      console.log("Stream:", stream);
      console.log("Audio tracks:", stream.getAudioTracks());

      // Stop the stream immediately
      stream.getTracks().forEach(track => track.stop());

      setMicStatus("✅ Microphone works!");
      toast({
        title: "Success!",
        description: "Microphone access granted. Voice chat should work now!",
      });

    } catch (error: any) {
      console.error("❌ Microphone test failed:", error);
      console.error("Error name:", error?.name);
      console.error("Error message:", error?.message);
      console.error("Error stack:", error?.stack);

      let errorMessage = "Unknown error";
      let detailsMessage = "";

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = "Permission Denied";
        detailsMessage = `
Microphone access was denied. 

On iOS:
1. Go to Settings
2. Scroll to HealthPilot
3. Enable Microphone
4. Return and try again

Error: ${error.message || error.name}
        `.trim();
      } else if (error.name === 'NotFoundError') {
        errorMessage = "No Microphone Found";
        detailsMessage = `No microphone detected on this device.\n\nError: ${error.message || error.name}`;
      } else if (error.name === 'NotSupportedError') {
        errorMessage = "Not Supported";
        detailsMessage = `Microphone access is not supported in this context.\n\nError: ${error.message || error.name}`;
      } else if (error.name === 'SecurityError') {
        errorMessage = "Security Error";
        detailsMessage = `Microphone access blocked by security policy.\n\nError: ${error.message || error.name}`;
      } else if (error.message) {
        errorMessage = error.message;
        detailsMessage = `Full error: ${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`;
      }

      setMicStatus(`❌ ${errorMessage}`);
      setErrorDetails(detailsMessage);

      toast({
        variant: "destructive",
        title: errorMessage,
        description: error.message || "Check the details below",
        duration: 10000,
      });
    } finally {
      setIsTestingMic(false);
    }
  };

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Simple Voice Chat Test</h1>
        <p className="text-muted-foreground">Test microphone access step-by-step</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Microphone Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              {micStatus.includes("✅") ? (
                <Mic className="w-6 h-6 text-green-500" />
              ) : micStatus.includes("❌") ? (
                <MicOff className="w-6 h-6 text-destructive" />
              ) : (
                <AlertCircle className="w-6 h-6 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">Status:</p>
                <Badge variant={
                  micStatus.includes("✅") ? "default" : 
                  micStatus.includes("❌") ? "destructive" : 
                  "secondary"
                }>
                  {micStatus}
                </Badge>
              </div>
            </div>
            <Button
              onClick={testMicrophone}
              disabled={isTestingMic}
              data-testid="button-test-microphone"
            >
              {isTestingMic ? "Testing..." : "Test Microphone"}
            </Button>
          </div>

          {errorDetails && (
            <div className="p-4 border border-destructive rounded-lg bg-destructive/10">
              <p className="font-medium text-destructive mb-2">Error Details:</p>
              <pre className="text-sm whitespace-pre-wrap text-muted-foreground font-mono">
                {errorDetails}
              </pre>
            </div>
          )}

          <div className="p-4 border rounded-lg bg-muted/50">
            <p className="text-sm font-medium mb-2">Debug Info:</p>
            <div className="space-y-1 text-sm text-muted-foreground font-mono">
              <p>Platform: {navigator.platform}</p>
              <p>User Agent: {navigator.userAgent.substring(0, 60)}...</p>
              <p>MediaDevices: {navigator.mediaDevices ? "✅ Available" : "❌ Not available"}</p>
              <p>getUserMedia: {navigator.mediaDevices?.getUserMedia ? "✅ Available" : "❌ Not available"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>1. <strong>Click "Test Microphone"</strong> button above</p>
          <p>2. <strong>Grant permission</strong> when iOS prompts you</p>
          <p>3. <strong>Check the status</strong> - it should show "✅ Microphone works!"</p>
          <p className="pt-4 text-muted-foreground">
            If you see an error, the error details will show you exactly what went wrong and how to fix it.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
