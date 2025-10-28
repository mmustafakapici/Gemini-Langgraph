import React, { useRef, useEffect } from "react";
import { MessageSquare } from "lucide-react";

interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
  isStreaming?: boolean;
}

interface ChatAreaProps {
  messages: Message[];
}

const ChatArea: React.FC<ChatAreaProps> = ({ messages }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 bg-eerie_black rounded-t-xl">
        <MessageSquare size={64} className="text-flame mb-6" />
        <h1 className="text-5xl font-extrabold text-floral_white text-center leading-tight">
          Merhaba,
          <br />
          senin için ne yapabilirim?
        </h1>
        <p className="text-timberwolf text-lg mt-4 text-center">
          Yeni bir sohbet başlatmak veya mevcut sohbetlerine göz atmak için sol menüyü kullanabilirsin.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar-thin bg-eerie_black rounded-t-xl">
      <div className="max-w-3xl mx-auto space-y-4">
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
                  ? "bg-flame text-floral_white rounded-br-none"
                  : "bg-black_olive text-floral_white rounded-bl-none"
              }`}
            >
              {message.text}
              {message.isStreaming && (
                <span className="animate-pulse ml-2">█</span>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ChatArea;
