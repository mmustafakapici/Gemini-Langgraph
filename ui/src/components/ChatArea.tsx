import React, { useEffect, useRef, useState } from "react";

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
  const [dotIndex, setDotIndex] = useState(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Debug: log when messages prop changes and detect per-message updates
  const prevMapRef = useRef<
    Record<string, { len: number; isStreaming?: boolean; lastSeen: number }>
  >({});
  useEffect(() => {
    try {
      const now = Date.now();
      messages.forEach((m) => {
        const prev = prevMapRef.current[m.id];
        const len = (m.text || "").length;
        if (!prev) {
          // new message rendered
          console.debug(
            `[ChatArea] render new message id=${m.id} sender=${
              m.sender
            } len=${len} streaming=${!!m.isStreaming}`
          );
          prevMapRef.current[m.id] = {
            len,
            isStreaming: m.isStreaming,
            lastSeen: now,
          };
          return;
        }

        if (len !== prev.len) {
          // message text changed (token appended)
          console.debug(
            `[ChatArea] message update id=${m.id} sender=${m.sender} prev_len=${
              prev.len
            } new_len=${len} streaming=${!!m.isStreaming}`
          );
          prevMapRef.current[m.id].len = len;
          prevMapRef.current[m.id].lastSeen = now;
        }

        if (prev.isStreaming && !m.isStreaming) {
          // streaming finished for this message
          console.debug(
            `[ChatArea] message finished id=${
              m.id
            } total_len=${len} time=${new Date(now).toISOString()}`
          );
          prevMapRef.current[m.id].isStreaming = false;
        }
      });
    } catch (e) {
      console.error("ChatArea debug error", e);
    }
  }, [messages]);

  // Dot animation for streaming placeholder
  useEffect(() => {
    const hasEmptyStreaming = messages.some(
      (m) => m.sender === "ai" && m.isStreaming && (!m.text || m.text === "")
    );
    if (!hasEmptyStreaming) return;
    const t = setInterval(() => setDotIndex((i) => (i + 1) % 3), 400);
    return () => clearInterval(t);
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
                {message.sender === "ai" &&
                message.isStreaming &&
                (!message.text || message.text === "") ? (
                  <p className="text-sm whitespace-pre-wrap">
                    {".".repeat(dotIndex + 1)}
                  </p>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                )}
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
