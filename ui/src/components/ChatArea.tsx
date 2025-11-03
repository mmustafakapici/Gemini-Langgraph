import React, { useRef, useEffect } from "react";
import { MessageCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
  isStreaming?: boolean;
}

interface ChatAreaProps {
  messages: Message[];
  onSendMessage: (message: string) => void; // Add onSendMessage prop
}

const predefinedPrompts = [
  "AILAYZER hakkında bilgi ver",
  "Yeni bir sohbet başlat",
  "Bugün hava nasıl?",
  "En son haberler neler?",
];

const ChatArea: React.FC<ChatAreaProps> = ({ messages, onSendMessage }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handlePromptClick = (prompt: string) => {
    onSendMessage(prompt);
  };

  return (
    <div className="flex-1 p-6 bg-eerie_black rounded-t-xl overflow-y-auto custom-scrollbar">
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center px-4">
          <MessageCircle size={64} className="text-flame mb-6 animate-bounce-slow" />
          <h1 className="text-4xl font-bold text-floral_white mb-4">
            Merhaba, senin için ne yapabilirim?
          </h1>
          <p className="text-timberwolf text-lg mb-8">
            Yeni bir sohbet başlatmak veya mevcut sohbetlerine göz atmak için sol menüyü kullanabilirsin.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full">
            {predefinedPrompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => handlePromptClick(prompt)}
                className="p-4 bg-black_olive text-floral_white rounded-lg shadow-md hover:bg-flame hover:text-eerie_black transition-all duration-300 text-lg font-medium"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto space-y-4"> {/* Added max-w-3xl and mx-auto here */}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[70%] p-3 rounded-lg shadow-md ${
                  message.sender === "user"
                    ? "bg-flame text-eerie_black"
                    : "bg-black_olive text-floral_white"
                }`}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.text}
                </ReactMarkdown>
                {message.isStreaming && (
                  <span className="animate-pulse ml-2">█</span>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
};

export default ChatArea;
