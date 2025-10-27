import { createContext, useContext, useState, ReactNode } from 'react';

interface ChatContextType {
  openChat: (context?: string) => void;
  openVoiceChat: (context?: string) => void;
  isChatOpen: boolean;
  isVoiceChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
  setIsVoiceChatOpen: (open: boolean) => void;
  chatContext: string | null;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isVoiceChatOpen, setIsVoiceChatOpen] = useState(false);
  const [chatContext, setChatContext] = useState<string | null>(null);

  const openChat = (context?: string) => {
    if (context) {
      setChatContext(context);
    }
    setIsChatOpen(true);
  };

  const openVoiceChat = (context?: string) => {
    if (context) {
      setChatContext(context);
    }
    setIsVoiceChatOpen(true);
  };

  return (
    <ChatContext.Provider
      value={{
        openChat,
        openVoiceChat,
        isChatOpen,
        isVoiceChatOpen,
        setIsChatOpen,
        setIsVoiceChatOpen,
        chatContext,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
