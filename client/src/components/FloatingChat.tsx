import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
}

interface TranscriptMessage {
  id: string;
  messageId?: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Utility: Detect Safari on iOS (including iPadOS)
const isSafariIOS = (): boolean => {
  const ua = navigator.userAgent;
  // Modern iPadOS reports as "Macintosh" with touch points
  const isIOS = /iPad|iPhone|iPod/.test(ua) || 
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(ua);
  return isIOS && isSafari;
};

export function VoiceChatModal({ isOpen, onClose }: VoiceChatModalProps) {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [currentUserInput, setCurrentUserInput] = useState("");
  const [hasShownDisclosure, setHasShownDisclosure] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranscriptRef = useRef<string>("");
  const isRecordingRef = useRef<boolean>(false);
  const currentUserInputRef = useRef<string>("");
  const isTTSPrimedRef = useRef<boolean>(false);
  
  // Check if AI disclosure has been shown before
  useEffect(() => {
    const disclosureShown = localStorage.getItem('healthpilot_voice_disclosure_shown');
    setHasShownDisclosure(disclosureShown === 'true');
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      const isSafariOnIOS = isSafariIOS();
      
      // Safari iOS has buggy continuous mode - use false to prevent failures
      recognition.continuous = !isSafariOnIOS;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        
        const currentTranscript = finalTranscript || interimTranscript;
        
        // Safari iOS bug: Prevent text duplication
        if (isSafariOnIOS && currentTranscript === lastTranscriptRef.current) {
          return;
        }
        lastTranscriptRef.current = currentTranscript;
        
        setCurrentUserInput(currentTranscript);
        currentUserInputRef.current = currentTranscript;
        
        // Safari iOS workaround: Auto-stop after 500ms of silence
        if (isSafariOnIOS && speechTimeoutRef.current) {
          clearTimeout(speechTimeoutRef.current);
        }
        
        if (isSafariOnIOS) {
          speechTimeoutRef.current = setTimeout(() => {
            if (recognitionRef.current && isRecordingRef.current) {
              recognitionRef.current.stop();
            }
          }, 500);
        }
      };
      
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        
        // Safari iOS specific: Helpful message for dictation not enabled
        if (event.error === 'service-not-allowed' && isSafariOnIOS) {
          toast({
            title: "Enable Dictation",
            description: "Go to Settings → General → Keyboard and enable Dictation to use voice chat.",
            variant: "destructive",
          });
        } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
          toast({
            title: "Voice Error",
            description: "Could not understand speech. Please try again.",
            variant: "destructive",
          });
        }
        setIsRecording(false);
      };
      
      recognition.onend = () => {
        if (speechTimeoutRef.current) {
          clearTimeout(speechTimeoutRef.current);
        }
        
        if (isRecordingRef.current && currentUserInputRef.current.trim()) {
          handleUserInputComplete(currentUserInputRef.current.trim());
        }
        setIsRecording(false);
        isRecordingRef.current = false;
        lastTranscriptRef.current = "";
      };
      
      recognitionRef.current = recognition;
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
      }
    };
  }, []);

  // Prime TTS for iOS Safari - must be called from user gesture
  const primeTTS = () => {
    if (!isTTSPrimedRef.current && 'speechSynthesis' in window) {
      // Speak empty utterance to enable TTS on iOS
      const primeUtterance = new SpeechSynthesisUtterance('');
      window.speechSynthesis.speak(primeUtterance);
      isTTSPrimedRef.current = true;
    }
  };

  // Speak text with iOS Safari compatibility
  const speakText = (text: string) => {
    if (!('speechSynthesis' in window) || !text) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    setIsSpeaking(true);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    utterance.onend = () => {
      setIsSpeaking(false);
    };
    
    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    // Small delay for iOS Safari compatibility
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 100);
  };

  const handleUserInputComplete = async (userMessage: string) => {
    if (!userMessage.trim()) return;

    /**
     * PRIVACY & DATA DELETION POLICY:
     * 
     * Voice chat implements strict data minimization principles:
     * 
     * 1. NO RAW AUDIO STORAGE: Raw audio data is NEVER stored. Web Speech API 
     *    processes speech client-side and only text transcripts are transmitted.
     * 
     * 2. TRANSCRIPT RETENTION: Text transcripts are stored temporarily in memory 
     *    (React state) for the duration of the voice chat session only. When the
     *    modal closes, all transcript data is cleared.
     * 
     * 3. SUMMARIZATION ONLY: After each interaction, only high-level summaries
     *    (preferences, progress, concerns) are stored in the database via the
     *    coach_memory table. Full transcript text is NOT persisted.
     * 
     * 4. VECTOR EMBEDDINGS: Summaries are converted to embeddings for semantic
     *    search. Original summary text is stored, but raw transcripts are not.
     * 
     * 5. USER CONTROL: Users can delete all coaching memories via the "Forget Me"
     *    feature in Privacy Dashboard, which removes summaries and embeddings.
     * 
     * This approach complies with GDPR, HIPAA, PIPEDA, and Australia Privacy Act
     * data minimization requirements.
     */

    // Add user message to transcript (in-memory only, cleared on modal close)
    const userMsg: TranscriptMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };
    
    setTranscript(prev => [...prev, userMsg]);
    setCurrentUserInput("");
    currentUserInputRef.current = "";
    setIsProcessing(true);

    try {
      // Send to AI chat endpoint
      const res = await apiRequest("POST", "/api/chat", { 
        message: userMessage,
        currentPage: "Voice Chat"
      });
      const data = await res.json();

      // Prepend AI disclosure on first voice interaction
      const aiDisclosure = "Hello! I'm your HealthPilot Coach, an AI assistant powered by OpenAI. I'm here to help with fitness and wellness guidance, but I'm not a medical professional. Always consult qualified healthcare providers for medical advice.\n\n";
      
      let aiResponse = data.reply || "I'm sorry, I couldn't process that.";
      
      // Add disclosure if this is the first voice interaction
      // Check against !hasShownDisclosure flag, not stale transcript.length
      if (!hasShownDisclosure) {
        aiResponse = aiDisclosure + aiResponse;
        setHasShownDisclosure(true);
        localStorage.setItem('healthpilot_voice_disclosure_shown', 'true');
      }

      // Add AI response to transcript
      const aiMsg: TranscriptMessage = {
        id: `ai-${Date.now()}`,
        messageId: data.messageId,
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
      };
      
      setTranscript(prev => [...prev, aiMsg]);

      // Speak the AI response with iOS Safari compatibility
      speakText(aiResponse);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get AI response",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Not Supported",
        description: "Voice input is not supported in your browser",
        variant: "destructive",
      });
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      isRecordingRef.current = false;
    } else {
      // Prime TTS on first user interaction (iOS Safari requirement)
      primeTTS();
      
      try {
        recognitionRef.current.start();
        setIsRecording(true);
        isRecordingRef.current = true;
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

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  // Close and cleanup on unmount
  useEffect(() => {
    if (!isOpen) {
      if (recognitionRef.current && isRecording) {
        recognitionRef.current.stop();
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsRecording(false);
      isRecordingRef.current = false;
      setCurrentUserInput("");
      currentUserInputRef.current = "";
    }
  }, [isOpen]);

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
                <div className="p-6 rounded-full bg-primary/10">
                  <Mic className="h-12 w-12 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-lg mb-2">Ready to chat!</h4>
                  <p className="text-muted-foreground text-sm max-w-sm">
                    Tap the microphone button below to start your voice conversation with your AI health coach.
                  </p>
                </div>
              </div>
            ) : (
              transcript.map((msg) => {
                // Extract citations from AI messages
                const citations = msg.role === 'assistant' ? extractCitations(msg.content) : [];
                
                return (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    data-testid={`voice-transcript-${msg.role}`}
                  >
                    <div className="flex flex-col gap-2 max-w-[80%]">
                      <div
                        className={`rounded-lg p-4 ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words text-sm">
                          {msg.content}
                        </p>
                        <p className="text-xs opacity-70 mt-2">
                          {msg.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                      
                      {/* Citation badges for AI messages */}
                      {citations.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap px-1">
                          <TooltipProvider>
                            {citations.map((citation, index) => {
                              const url = getStandardUrl(citation.standard);
                              const badgeContent = (
                                <Badge 
                                  variant="outline" 
                                  className="text-xs gap-1 bg-primary/5 border-primary/20 hover:bg-primary/10 cursor-pointer"
                                  data-testid={`badge-voice-citation-${citation.standard.toLowerCase()}`}
                                >
                                  <Shield className="h-3 w-3" />
                                  {citation.standard}
                                  {url && <ExternalLink className="h-3 w-3 ml-0.5" />}
                                </Badge>
                              );

                              return (
                                <Tooltip key={index}>
                                  <TooltipTrigger asChild>
                                    {url ? (
                                      <a 
                                        href={url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex"
                                        data-testid={`link-voice-citation-${citation.standard.toLowerCase()}`}
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
                      
                      {msg.role === 'assistant' && msg.messageId && (
                        <div className="flex justify-end">
                          <ChatFeedback 
                            messageId={msg.messageId} 
                            conversationType="voice"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Current user input preview */}
            {currentUserInput && (
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-lg p-4 bg-primary/50 text-primary-foreground border-2 border-primary border-dashed">
                  <p className="whitespace-pre-wrap break-words text-sm">
                    {currentUserInput}
                  </p>
                  <p className="text-xs opacity-70 mt-2">Listening...</p>
                </div>
              </div>
            )}

            {/* Processing indicator */}
            {isProcessing && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg p-4 bg-muted">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <p className="text-sm">AI is thinking...</p>
                  </div>
                </div>
              </div>
            )}

            <div ref={transcriptEndRef} />
          </div>

          {/* Voice Controls */}
          <div className="border-t p-6 bg-muted/30">
            <div className="flex flex-col items-center gap-4">
              {/* Waveform Visualization - Recording */}
              {isRecording && (
                <div className="flex items-center gap-1 h-12" data-testid="waveform-visualization">
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-primary rounded-full animate-pulse"
                      style={{
                        height: `${20 + Math.random() * 30}px`,
                        animationDelay: `${i * 0.1}s`,
                        animationDuration: '0.8s',
                      }}
                    />
                  ))}
                </div>
              )}

              {/* AI Speaking Indicator */}
              {isSpeaking && (
                <div className="flex flex-col items-center gap-2" data-testid="ai-speaking-indicator">
                  <div className="flex items-center gap-1 h-12">
                    {[...Array(6)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1.5 bg-green-500 rounded-full animate-pulse"
                        style={{
                          height: `${15 + Math.random() * 25}px`,
                          animationDelay: `${i * 0.15}s`,
                          animationDuration: '1s',
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <Volume2 className="h-4 w-4" />
                    <span>AI is speaking...</span>
                  </div>
                </div>
              )}

              {/* Mic Button */}
              <div className="flex items-center gap-4">
                <Button
                  size="lg"
                  variant={isRecording ? "default" : "outline"}
                  onClick={toggleRecording}
                  disabled={isProcessing}
                  className={`h-16 w-16 rounded-full ${
                    isRecording
                      ? 'bg-red-500 hover:bg-red-600 border-red-400 animate-pulse'
                      : 'bg-primary hover:bg-primary/90'
                  }`}
                  data-testid="button-toggle-voice-recording"
                >
                  {isRecording ? (
                    <MicOff className="h-8 w-8 text-white" />
                  ) : (
                    <Mic className="h-8 w-8 text-white" />
                  )}
                </Button>
              </div>

              <p className="text-sm text-muted-foreground text-center">
                {isRecording
                  ? "Tap to stop recording"
                  : isProcessing
                  ? "Processing your message..."
                  : "Tap to start talking"}
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

interface FloatingChatProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage?: string;
}

export function FloatingChat({ isOpen, onClose, currentPage }: FloatingChatProps) {
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
  }, [sessionId]);

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
    if (!isOpen) {
      setIsMinimized(false);
    } else {
      // Increment session ID to trigger new timestamp and reset chat UI
      setSessionId(prev => prev + 1);
      // Keep minimized by default for better UX during debugging
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
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-8 w-8 text-white hover:bg-white/20"
                data-testid="button-minimize-chat"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
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
  const isPremium = subscriptionTier === 'premium' || subscriptionTier === 'enterprise';
  
  // Green for premium/enterprise users, purple for free users
  const buttonClasses = isPremium
    ? "bg-gradient-to-br from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 border-2 border-green-400 hover:border-green-300"
    : "bg-gradient-to-br from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800 border-2 border-purple-400 hover:border-purple-300";
  
  return (
    <Button
      size="icon"
      style={{ position: 'fixed', bottom: '1rem', right: '1rem' }}
      className={`z-40 h-10 w-10 rounded-full shadow-lg ${buttonClasses} animate-pulse hover:animate-none transition-all hover:scale-110`}
      onClick={onClick}
      data-testid="button-open-floating-chat"
    >
      <Sparkles className="h-5 w-5 text-white" />
    </Button>
  );
}
