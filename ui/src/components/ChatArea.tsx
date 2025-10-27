import React, { useEffect, useRef } from "react";

interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
  isStreaming?: boolean; // Added for potential future use in UI, though not strictly needed for display
}

interface ChatAreaProps {
  messages: Message[];
}

const ChatArea: React.FC<ChatAreaProps> = ({ messages }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar-thin bg-eerie_black-200 rounded-t-xl">
      <div className="max-w-3xl mx-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-timberwolf-500 text-lg">
            <p className="mb-2">Henüz bir sohbet başlatmadınız.</p>
            <p>
              Yeni bir sohbet başlatmak için sol menüyü kullanın veya mesaj
              yazın.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex mb-4 ${
                message.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[70%] p-3 rounded-lg shadow-md ${
                  message.sender === "user"
                    ? "bg-flame-600 text-floral_white-500 rounded-br-none"
                    : "bg-black_olive-600 text-floral_white-500 rounded-bl-none"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.text}</p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ChatArea;
