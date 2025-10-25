import { useState, useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { ChatHeader } from './chat-header';
import { ChatMessage } from './chat-message';
import { ChatInput } from './chat-input';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { askRag } from '@/lib/api'; // askRag fonksiyonunu import ediyoruz

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
}

export function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: 'Hello! How can I assist you today?', sender: 'ai' },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    const newUserMessage: Message = { id: Date.now().toString(), text, sender: 'user' };
    setMessages((prevMessages) => [...prevMessages, newUserMessage]);
    setIsLoading(true);

    try {
      // Doğrudan fetch çağrısı yerine askRag fonksiyonunu kullanıyoruz
      const data = await askRag(text);
      
      const aiResponseText = data.answer || "I couldn't find an answer for that."; // Fallback if answer is empty
      
      const newAiMessage: Message = { id: (Date.now() + 1).toString(), text: aiResponseText, sender: 'ai' };
      setMessages((prevMessages) => [...prevMessages, newAiMessage]);

    } catch (error) {
      console.error("Failed to fetch RAG response:", error);
      toast.error("Failed to get a response from the AI. Please try again later.");
      const errorMessage: Message = { id: (Date.now() + 1).toString(), text: "I'm sorry, I encountered an error trying to get a response. Please try again.", sender: 'ai' };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full max-w-3xl mx-auto rounded-xl overflow-hidden border border-border shadow-2xl bg-background">
      <ChatHeader />
      <CardContent className="flex-1 p-0 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 p-4">
          <div className="flex flex-col space-y-4">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="flex justify-start p-4">
                <div className="max-w-[70%] rounded-lg p-3 bg-card text-card-foreground rounded-bl-none border border-border shadow-md flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Bolt is thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </CardContent>
      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
}
