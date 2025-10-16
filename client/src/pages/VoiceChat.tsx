import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Phone, PhoneOff, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { PremiumFeature } from "@/components/PremiumFeature";
import { motion, AnimatePresence } from "framer-motion";

export default function VoiceChat() {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState<Array<{ role: 'user' | 'assistant', text: string }>>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const { data: user } = useQuery<{ subscriptionTier: string; role?: string }>({
    queryKey: ["/api/auth/user"],
  });

  const isPremium = user?.subscriptionTier === 'premium' || user?.subscriptionTier === 'enterprise' || user?.role === 'admin';

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  const connect = async () => {
    // Double-check premium status before allowing connection
    if (!isPremium) {
      toast({
        variant: "destructive",
        title: "Premium Required",
        description: "Voice chat requires a Premium subscription. Please upgrade to continue.",
      });
      return;
    }

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Create audio context
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });

      // Get authentication token from backend
      console.log("🔑 Requesting authentication token...");
      const tokenResponse = await fetch('/api/voice-chat/token', {
        method: 'POST',
        credentials: 'include',
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to get authentication token');
      }

      const { token } = await tokenResponse.json();
      console.log("✅ Got token, connecting to WebSocket...");

      // Connect to WebSocket with token
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/voice-chat?token=${token}`;
      
      console.log(`🔌 Connecting to: ${wsUrl}`);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("✅ Voice chat connected");
        setIsConnected(true);
        toast({
          title: "Voice Chat Connected",
          description: "You can now speak with your AI health coach!",
        });
      };

      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        
        // Handle different event types
        if (data.type === 'session.created' || data.type === 'session.updated') {
          console.log("Session configured:", data);
        } else if (data.type === 'input_audio_buffer.speech_started') {
          setIsListening(true);
        } else if (data.type === 'input_audio_buffer.speech_stopped') {
          setIsListening(false);
        } else if (data.type === 'conversation.item.input_audio_transcription.completed') {
          // User's speech was transcribed
          setTranscript(prev => [...prev, { role: 'user', text: data.transcript }]);
        } else if (data.type === 'response.audio_transcript.delta') {
          // Assistant's speech transcription
          setTranscript(prev => {
            const lastItem = prev[prev.length - 1];
            if (lastItem?.role === 'assistant') {
              return [...prev.slice(0, -1), { role: 'assistant', text: lastItem.text + data.delta }];
            } else {
              return [...prev, { role: 'assistant', text: data.delta }];
            }
          });
        } else if (data.type === 'response.audio.delta') {
          // Play audio
          setIsSpeaking(true);
          const audioData = atob(data.delta);
          const audioArray = new Int16Array(audioData.length / 2);
          for (let i = 0; i < audioData.length; i += 2) {
            audioArray[i / 2] = (audioData.charCodeAt(i + 1) << 8) | audioData.charCodeAt(i);
          }
          const floatArray = new Float32Array(audioArray.length);
          for (let i = 0; i < audioArray.length; i++) {
            floatArray[i] = audioArray[i] / 32768.0;
          }
          audioQueueRef.current.push(floatArray);
          playAudioQueue();
        } else if (data.type === 'response.audio.done') {
          setIsSpeaking(false);
        } else if (data.type === 'error') {
          console.error("Voice chat error:", data.error);
          toast({
            variant: "destructive",
            title: "Voice Chat Error",
            description: data.error.message,
          });
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        toast({
          variant: "destructive",
          title: "Connection Error",
          description: "Failed to connect to voice chat",
        });
      };

      ws.onclose = (event) => {
        console.log("WebSocket closed:", event.code, event.reason);
        setIsConnected(false);
        setIsListening(false);
        setIsSpeaking(false);
        setTranscript([]); // Clear transcript on disconnect
        
        if (event.code === 4003) {
          toast({
            variant: "destructive",
            title: "Premium Required",
            description: "Voice chat requires a Premium subscription. Please upgrade to continue.",
            action: {
              label: "Upgrade",
              onClick: () => window.location.href = "/pricing",
            },
          });
        } else if (event.code === 4001) {
          toast({
            variant: "destructive",
            title: "Authentication Required",
            description: "Please log in to use voice chat",
          });
        }
      };

      // Start capturing audio
      startAudioCapture(stream, ws);

    } catch (error: any) {
      console.error("Failed to connect:", error);
      toast({
        variant: "destructive",
        title: "Microphone Access Required",
        description: "Please allow microphone access to use voice chat",
      });
    }
  };

  const startAudioCapture = (stream: MediaStream, ws: WebSocket) => {
    if (!audioContextRef.current) return;

    const audioContext = audioContextRef.current;
    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);

    source.connect(processor);
    processor.connect(audioContext.destination);

    processor.onaudioprocess = (e) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

      const inputData = e.inputBuffer.getChannelData(0);
      const pcm16 = new Int16Array(inputData.length);
      
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }

      const base64 = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(pcm16.buffer))));
      
      wsRef.current.send(JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: base64,
      }));
    };
  };

  const playAudioQueue = async () => {
    if (isPlayingRef.current || !audioContextRef.current) return;
    if (audioQueueRef.current.length === 0) return;

    isPlayingRef.current = true;

    while (audioQueueRef.current.length > 0) {
      const audioData = audioQueueRef.current.shift()!;
      const audioBuffer = audioContextRef.current.createBuffer(1, audioData.length, 24000);
      audioBuffer.getChannelData(0).set(audioData);

      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      
      await new Promise<void>((resolve) => {
        source.onended = () => resolve();
        source.start();
      });
    }

    isPlayingRef.current = false;
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsConnected(false);
    setIsListening(false);
    setIsSpeaking(false);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-primary" />
            Voice Chat with AI Coach
          </h1>
          <p className="text-muted-foreground">
            Have a natural conversation with your AI health coach
          </p>
        </div>
        <Badge variant="default" className="bg-gradient-to-r from-purple-500 to-pink-500">
          Premium
        </Badge>
      </div>

      <PremiumFeature
        feature="voice_chat"
        lockMessage="Voice chat with your AI health coach is a Premium feature. Upgrade to have natural conversations about your health, get instant feedback, and receive personalized coaching through voice."
      >
        <div className="space-y-6">
          {/* Connection Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isConnected ? <Phone className="w-5 h-5 text-green-500" /> : <PhoneOff className="w-5 h-5 text-muted-foreground" />}
                Connection Status
              </CardTitle>
              <CardDescription>
                {isConnected ? "Connected and ready to chat" : "Click Start to begin voice chat"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                {!isConnected ? (
                  <Button
                    onClick={connect}
                    size="lg"
                    className="w-full"
                    disabled={!user}
                    data-testid="button-start-voice-chat"
                  >
                    <Phone className="w-5 h-5 mr-2" />
                    Start Voice Chat
                  </Button>
                ) : (
                  <Button
                    onClick={disconnect}
                    variant="destructive"
                    size="lg"
                    className="w-full"
                    data-testid="button-end-voice-chat"
                  >
                    <PhoneOff className="w-5 h-5 mr-2" />
                    End Voice Chat
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Audio Visualization */}
          {isConnected && (
            <Card>
              <CardHeader>
                <CardTitle>Audio Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center gap-8 p-8">
                  {/* Listening indicator */}
                  <div className="flex flex-col items-center gap-2">
                    <motion.div
                      animate={isListening ? {
                        scale: [1, 1.2, 1],
                        opacity: [0.5, 1, 0.5]
                      } : {}}
                      transition={{
                        duration: 1,
                        repeat: isListening ? Infinity : 0,
                      }}
                    >
                      {isListening ? (
                        <Mic className="w-16 h-16 text-green-500" data-testid="icon-mic-active" />
                      ) : (
                        <MicOff className="w-16 h-16 text-muted-foreground" data-testid="icon-mic-inactive" />
                      )}
                    </motion.div>
                    <p className="text-sm text-muted-foreground">
                      {isListening ? "Listening..." : "Ready"}
                    </p>
                  </div>

                  {/* Speaking indicator */}
                  <div className="flex flex-col items-center gap-2">
                    <motion.div
                      animate={isSpeaking ? {
                        scale: [1, 1.1, 1],
                      } : {}}
                      transition={{
                        duration: 0.5,
                        repeat: isSpeaking ? Infinity : 0,
                      }}
                    >
                      <Sparkles className={`w-16 h-16 ${isSpeaking ? 'text-primary' : 'text-muted-foreground'}`} data-testid="icon-ai-speaking" />
                    </motion.div>
                    <p className="text-sm text-muted-foreground">
                      {isSpeaking ? "AI Speaking..." : "Idle"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Transcript */}
          {transcript.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Conversation Transcript</CardTitle>
                <CardDescription>Live transcript of your conversation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  <AnimatePresence>
                    {transcript.map((item, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-3 rounded-lg ${
                          item.role === 'user'
                            ? 'bg-primary/10 ml-8'
                            : 'bg-muted mr-8'
                        }`}
                        data-testid={`transcript-${item.role}-${index}`}
                      >
                        <p className="text-xs text-muted-foreground mb-1">
                          {item.role === 'user' ? 'You' : 'AI Coach'}
                        </p>
                        <p>{item.text}</p>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>How to Use Voice Chat</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-primary">1.</span>
                  <span>Click "Start Voice Chat" and allow microphone access</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">2.</span>
                  <span>Speak naturally - the AI will detect when you start and stop talking</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">3.</span>
                  <span>Listen to the AI's response - it has access to all your health data</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">4.</span>
                  <span>Ask about your biomarkers, workouts, sleep, or get personalized advice</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </PremiumFeature>
    </div>
  );
}
