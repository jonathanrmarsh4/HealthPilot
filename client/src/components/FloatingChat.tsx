import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, getWebSocketBaseUrl, getWebSocketProtocol } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Link } from "wouter";
import { Send, X, MessageCircle, Loader2, Minimize2, Sparkles, Trash2, Mic, MicOff, Volume2, VolumeX, Activity, Shield, ExternalLink } from "lucide-react";
import { useOnboarding } from "@/contexts/OnboardingContext";
import type { ChatMessage } from "@shared/schema";
import { ChatFeedback } from "@/components/ChatFeedback";
import { extractCitations, getStandardFullName, getStandardUrl } from "@/lib/citationUtils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface VoiceChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  context?: string | null;
}

export function VoiceChatModal({ isOpen, onClose, context }: VoiceChatModalProps) {
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
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const connect = async () => {
    try {
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access is not supported in this browser');
      }

      // Request microphone access with better error handling
      console.log("🎤 Requesting microphone access...");
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      console.log("✅ Microphone access granted");
      mediaStreamRef.current = stream;

      // Create audio context
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      
      // Safari iOS requires AudioContext to be resumed after user interaction
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      // Get authentication token from backend
      console.log("🔑 Requesting authentication token...");
      const tokenResponse = await apiRequest('/api/voice-chat/token', { method: 'POST' });
      const { token } = await tokenResponse.json();
      console.log("✅ Got token, connecting to WebSocket...");

      // Connect to WebSocket with token (mobile-aware URL construction)
      const protocol = getWebSocketProtocol();
      const host = getWebSocketBaseUrl();
      const wsUrl = `${protocol}//${host}/api/voice-chat?token=${token}`;
      
      console.log(`🔌 Connecting to: ${wsUrl}`);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("✅ Voice chat connected");
        setIsConnected(true);
        toast({
          title: "Voice Chat Connected",
          description: "Your AI health coach is ready to chat!",
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
          // Commit the audio buffer and request response
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({type: "input_audio_buffer.commit"}));
            wsRef.current.send(JSON.stringify({type: "response.create"}));
          }
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
        setTranscript([]);
        
        if (event.code === 4003) {
          toast({
            variant: "destructive",
            title: "Premium Required",
            description: "Voice chat requires a Premium subscription. Please upgrade to continue.",
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
      console.error("❌ Failed to connect:", error);
      
      // Provide specific error message based on error type
      let errorTitle = "Microphone Access Required";
      let errorMessage = "Please allow microphone access to use voice chat";
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorTitle = "Permission Denied";
        // Detect if running on iOS
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS) {
          errorMessage = "Please enable microphone access:\n\n1. Go to iOS Settings\n2. Scroll to HealthPilot\n3. Enable Microphone\n4. Return and try again";
        } else {
          errorMessage = "Microphone access was denied. Please allow microphone access in your browser settings and try again.";
        }
      } else if (error.name === 'NotFoundError') {
        errorMessage = "No microphone found on this device. Please connect a microphone and try again.";
      } else if (error.name === 'NotSupportedError') {
        errorMessage = "Microphone access is not supported in this browser. Please use a supported browser like Safari or Chrome.";
      } else if (error.name === 'SecurityError') {
        errorMessage = "Microphone access is blocked due to security restrictions. Please ensure you're using HTTPS.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        variant: "destructive",
        title: errorTitle,
        description: errorMessage,
        duration: 8000, // Show longer for iOS instructions
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

    // Ensure AudioContext is running (Safari iOS fix)
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

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

  // Auto-connect when modal opens
  useEffect(() => {
    if (isOpen && !isConnected) {
      connect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      disconnect();
    }
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
      data-testid="voice-chat-modal-backdrop"
    >
      <Card className="w-full max-w-2xl bg-background/95 backdrop-blur-md shadow-2xl border-2 border-primary/20">
        <div className="flex flex-col h-[min(80vh,600px)]">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 p-4 border-b bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-lg">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <h3 className="font-semibold">Voice Coach</h3>
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                Premium
              </Badge>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              className="h-8 w-8 text-white hover:bg-white/20"
              data-testid="button-close-voice-modal"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Transcript Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {transcript.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                {isConnected ? (
                  <>
                    <div className="flex items-center justify-center gap-8">
                      {/* Listening indicator */}
                      <div className="flex flex-col items-center gap-2">
                        <div className={`p-4 rounded-full ${isListening ? 'bg-green-500/20' : 'bg-muted'}`}>
                          {isListening ? (
                            <Mic className="w-12 h-12 text-green-500 animate-pulse" data-testid="icon-mic-active" />
                          ) : (
                            <MicOff className="w-12 h-12 text-muted-foreground" data-testid="icon-mic-inactive" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {isListening ? "Listening..." : "Ready"}
                        </p>
                      </div>

                      {/* Speaking indicator */}
                      <div className="flex flex-col items-center gap-2">
                        <div className={`p-4 rounded-full ${isSpeaking ? 'bg-primary/20' : 'bg-muted'}`}>
                          <Sparkles className={`w-12 h-12 ${isSpeaking ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} data-testid="icon-ai-speaking" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {isSpeaking ? "AI Speaking..." : "Idle"}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground max-w-sm mt-4">
                      Start speaking! Your AI health coach is listening and will respond naturally.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="p-6 rounded-full bg-primary/10">
                      <Loader2 className="h-12 w-12 text-primary animate-spin" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg mb-2">Connecting...</h4>
                      <p className="text-muted-foreground text-sm max-w-sm">
                        Setting up your voice connection with the AI health coach.
                      </p>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                {transcript.map((item, index) => (
                  <div
                    key={index}
                    className={`flex ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`rounded-lg p-4 max-w-[80%] ${
                        item.role === 'user'
                          ? 'bg-primary/10'
                          : 'bg-muted'
                      }`}
                      data-testid={`transcript-${item.role}-${index}`}
                    >
                      <p className="text-xs text-muted-foreground mb-1">
                        {item.role === 'user' ? 'You' : 'AI Coach'}
                      </p>
                      <p className="whitespace-pre-wrap">{item.text}</p>
                    </div>
                  </div>
                ))}
              </>
            )}

            <div ref={transcriptEndRef} />
          </div>

          {/* Audio Status Footer */}
          {isConnected && (
            <div className="border-t p-4 bg-muted/30">
              <div className="flex items-center justify-center gap-8">
                {/* Listening visual */}
                {isListening && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className="w-1 bg-green-500 rounded-full animate-pulse"
                          style={{
                            height: `${12 + Math.random() * 16}px`,
                            animationDelay: `${i * 0.1}s`,
                            animationDuration: '0.8s',
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-green-600 dark:text-green-400">Listening...</span>
                  </div>
                )}

                {/* Speaking visual */}
                {isSpeaking && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          className="w-1 bg-primary rounded-full animate-pulse"
                          style={{
                            height: `${12 + Math.random() * 16}px`,
                            animationDelay: `${i * 0.1}s`,
                            animationDuration: '1s',
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-primary">AI Speaking...</span>
                  </div>
                )}

                {!isListening && !isSpeaking && (
                  <p className="text-sm text-muted-foreground">Speak naturally - I&apos;m listening!</p>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

interface FloatingChatProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage?: string;
  context?: string | null;
}

export function FloatingChat({ isOpen, onClose, currentPage, context }: FloatingChatProps) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isMinimized, setIsMinimized] = useState(true);
  const { status: onboardingStatus } = useOnboarding();
  
  // Track chat session to reset UI synchronously when opening (prevents flash of old messages)
  const [sessionId, setSessionId] = useState(0);
  const clearedAtTimestamp = useMemo(() => {
    if (!isOpen) return null;
    return new Date().toISOString();
  }, [isOpen]);

  // Voice recognition state
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [speechRecognitionSupported, setSpeechRecognitionSupported] = useState(false);
  const [speechSynthesisSupported, setSpeechSynthesisSupported] = useState(false);

  // Check for Web Speech API support
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSpeechRecognitionSupported(!!SpeechRecognition);
    setSpeechSynthesisSupported('speechSynthesis' in window);
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setMessage(prev => prev + (prev ? ' ' : '') + transcript);
      };
      
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          toast({
            title: "Voice Input Error",
            description: "Could not understand speech. Please try again.",
            variant: "destructive",
          });
        }
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
      
      recognitionRef.current = recognition;
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [toast]);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) return;
    
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        toast({
          title: "Error",
          description: "Could not start voice input",
          variant: "destructive",
        });
      }
    }
  };

  const speakResponse = (text: string) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (isOpen) {
      // Increment session ID to trigger new timestamp and reset chat UI
      setSessionId(prev => prev + 1);
      // Keep minimized by default, especially during onboarding
      setIsMinimized(true);
    }
  }, [isOpen]);

  const { data: messages, isLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/history"],
    enabled: isOpen,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", "/api/chat", { 
        message: content,
        currentPage: currentPage || "Unknown Page"
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/history"] });
      // Refetch onboarding status to update UI after chat interaction
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/status"] });
      setMessage("");
      
      // Auto-clear UI when contextual onboarding is triggered
      if (data.contextualOnboardingTriggered) {
        setSessionId(prev => prev + 1);
      }
      
      // Speak AI response if voice output is enabled
      if (data.reply && voiceEnabled) {
        speakResponse(data.reply);
      }
      
      // Show success notification if training plan was saved
      if (data.trainingPlanSaved) {
        queryClient.invalidateQueries({ queryKey: ["/api/training-schedules"] });
        toast({
          title: "Training Plan Added! 🎉",
          description: "Your personalized workout plan has been added to your Training page",
        });
      }
      
      // Show success notification if meal plan was saved
      if (data.mealPlanSaved) {
        queryClient.invalidateQueries({ queryKey: ["/api/meal-plans"] });
        toast({
          title: "Meal Plan Added! 🍽️",
          description: "Your personalized meal plan has been added to your Meal Plans page",
        });
      }
      
      // Show success notification if goal was saved
      if (data.goalSaved) {
        queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
        toast({
          title: "Goal Added! 🎯",
          description: "Your health goal has been added to your Goals page.",
          action: (
            <ToastAction altText="View Goals" asChild>
              <Link href="/goals">View Goals</Link>
            </ToastAction>
          ),
        });
      }
      
      // Show success notification if exercise was saved
      if (data.exerciseSaved) {
        queryClient.invalidateQueries({ queryKey: ["/api/scheduled-exercises"] });
        queryClient.invalidateQueries({ queryKey: ["/api/exercise-recommendations"] });
        queryClient.invalidateQueries({ queryKey: ["/api/training-schedules"] });
        toast({
          title: "Exercise Added! 💪",
          description: "Your exercise has been added to your Training page",
        });
      }
      // Don't reset cleared state - let new messages appear after the cleared timestamp
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const handleClearChat = () => {
    setSessionId(prev => prev + 1);
    toast({
      title: "Chat cleared",
      description: "Your conversation history is preserved for AI context",
    });
  };

  // Determine if user is in initial onboarding (needs basic info)
  const isOnboarding = onboardingStatus && !onboardingStatus.basicInfoComplete;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized]);

  // Auto-send contextual message when opening with context
  useEffect(() => {
    if (isOpen && context === 'goals' && !sendMessageMutation.isPending) {
      const contextMessage = "Help me set some personalized health goals based on my current health data and biomarkers. What goals would you recommend?";
      sendMessageMutation.mutate(contextMessage);
      // Expand the chat to show the message
      setIsMinimized(false);
    }
    // Only run once when context changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, context]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !sendMessageMutation.isPending) {
      sendMessageMutation.mutate(message.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Generate contextual opening question based on current page
  const getContextualQuestion = (page?: string): string => {
    switch (page) {
      case "Dashboard":
        return "What would you like to know about your health overview?";
      case "Training":
        return "How can I help optimize your training today?";
      case "Meal Plans":
        return "What kind of meal plan are you looking for?";
      case "Biomarkers":
        return "Would you like help understanding your biomarker data?";
      case "Supplement Stack":
        return "Need recommendations for your supplement stack?";
      case "Sleep Dashboard":
        return "Want tips to improve your sleep quality?";
      case "Health Goals":
        return "What health goals would you like to work on?";
      case "Health Records":
        return "Would you like me to analyze your health records?";
      case "Workout History":
        return "Want to review your workout performance?";
      default:
        return "How can I help you with your health journey today?";
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      style={{ position: 'fixed', bottom: '1rem', right: '1rem' }}
      className={`z-50 flex flex-col w-[calc(100vw-2rem)] sm:w-80 md:w-96 max-w-md ${
        isMinimized ? "max-h-[60px]" : "h-[min(max(10rem,calc(100dvh-2rem)),600px)]"
      }`}
    >
      <Card className="flex flex-col h-full shadow-lg bg-background/90 border-purple-500/50">
        <div className="border-b bg-gradient-to-r from-purple-600 to-purple-700 text-white">
          <div className="flex items-center justify-between gap-2 p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <h3 className="font-semibold">{isOnboarding ? "Getting Started" : "Health Coach"}</h3>
            </div>
            <div className="flex items-center gap-1">
              {speechSynthesisSupported && !isOnboarding && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setVoiceEnabled(!voiceEnabled)}
                  className="h-8 w-8 text-white hover:bg-white/20"
                  data-testid="button-toggle-voice-output"
                  title={voiceEnabled ? "Disable voice output" : "Enable voice output"}
                >
                  {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </Button>
              )}
              {messages && messages.length > 0 && !isOnboarding && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleClearChat}
                  className="h-8 w-8 text-white hover:bg-white/20"
                  data-testid="button-clear-chat"
                  title="Clear chat (keeps history for context)"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              {!isOnboarding && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="h-8 w-8 text-white hover:bg-white/20"
                  data-testid="button-minimize-chat"
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                onClick={onClose}
                className="h-8 w-8 text-white hover:bg-white/20"
                data-testid="button-close-chat"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {!isMinimized && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (() => {
                // Filter messages to only show those at or after the cleared timestamp
                const visibleMessages = messages && clearedAtTimestamp
                  ? messages.filter(msg => {
                      if (!msg.createdAt) return false;
                      const msgTime = typeof msg.createdAt === 'string' ? msg.createdAt : msg.createdAt.toISOString();
                      return msgTime >= clearedAtTimestamp;
                    })
                  : messages || [];
                
                return visibleMessages.length > 0 ? (
                  visibleMessages.map((msg, index) => {
                    // Extract citations from AI messages
                    const citations = msg.role === "assistant" ? extractCitations(msg.content) : [];
                    
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        data-testid={`floating-message-${msg.role}-${index}`}
                      >
                        <div className="flex flex-col gap-2 max-w-[85%]">
                          <div
                            className={`rounded-lg p-3 text-sm ${
                              msg.role === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          </div>
                          
                          {/* Citation badges for AI messages */}
                          {citations.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap px-1">
                              <TooltipProvider>
                                {citations.map((citation, citIndex) => {
                                  const url = getStandardUrl(citation.standard);
                                  const badgeContent = (
                                    <Badge 
                                      variant="outline" 
                                      className="text-xs gap-1 bg-primary/5 border-primary/20 hover:bg-primary/10 cursor-pointer"
                                      data-testid={`badge-text-citation-${citation.standard.toLowerCase()}`}
                                    >
                                      <Shield className="h-3 w-3" />
                                      {citation.standard}
                                      {url && <ExternalLink className="h-3 w-3 ml-0.5" />}
                                    </Badge>
                                  );

                                  return (
                                    <Tooltip key={citIndex}>
                                      <TooltipTrigger asChild>
                                        {url ? (
                                          <a 
                                            href={url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="inline-flex"
                                            data-testid={`link-text-citation-${citation.standard.toLowerCase()}`}
                                          >
                                            {badgeContent}
                                          </a>
                                        ) : (
                                          badgeContent
                                        )}
                                      </TooltipTrigger>
                                      <TooltipContent side="bottom" className="max-w-xs">
                                        <p className="text-xs">
                                          <strong>{getStandardFullName(citation.standard)}:</strong> {citation.text}
                                          {url && <span className="block mt-1 text-primary">Click to learn more →</span>}
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  );
                                })}
                              </TooltipProvider>
                            </div>
                          )}
                          
                          {msg.role === "assistant" && (
                            <div className="flex justify-end">
                              <ChatFeedback 
                                messageId={msg.id} 
                                conversationType="text"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-lg p-3 bg-muted text-sm">
                      <p className="whitespace-pre-wrap break-words">
                        {getContextualQuestion(currentPage)}
                      </p>
                    </div>
                  </div>
                );
              })()}
              
              {sendMessageMutation.isPending && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-lg p-3 bg-muted">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <p className="text-sm">Thinking...</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t p-3">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={isListening ? "Listening..." : "Ask your health coach..."}
                  className={`flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                    isListening ? 'ring-2 ring-purple-500 animate-pulse' : ''
                  }`}
                  rows={2}
                  disabled={sendMessageMutation.isPending}
                  data-testid="input-floating-chat-message"
                />
                <div className="flex flex-col gap-2">
                  {speechRecognitionSupported && (
                    <Button
                      type="button"
                      size="icon"
                      variant={isListening ? "default" : "outline"}
                      onClick={toggleVoiceInput}
                      disabled={sendMessageMutation.isPending}
                      data-testid="button-voice-input"
                      title={isListening ? "Stop listening" : "Start voice input"}
                    >
                      {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
                  )}
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!message.trim() || sendMessageMutation.isPending}
                    data-testid="button-send-floating-message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

export function FloatingChatTrigger({ onClick, subscriptionTier = 'free' }: { onClick: () => void; subscriptionTier?: string }) {
  // Use primary gradient for all users to match theme
  const buttonClasses = "bg-primary hover:bg-primary/90 border-2 border-primary/50 hover:border-primary/70";
  
  return (
    <Button
      size="icon"
      style={{ position: 'fixed', bottom: '1rem', right: '1rem' }}
      className={`z-40 h-10 w-10 rounded-full shadow-lg ${buttonClasses} animate-pulse hover:animate-none transition-all hover:scale-110`}
      onClick={onClick}
      data-testid="button-open-floating-chat"
    >
      <Sparkles className="h-5 w-5 text-primary-foreground" />
    </Button>
  );
}
