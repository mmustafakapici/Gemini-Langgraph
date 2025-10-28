import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import ChatArea from "./ChatArea";
import MessageInput from "./MessageInput";
import {
  getSessionId,
  resetSession,
  setActiveSessionId,
} from "../utils/session";
import { ragStream } from "../utils/rag";
import { loadMessages, saveMessage, createSession } from "../utils/storage";

interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
  isStreaming?: boolean; // To indicate if the message is currently being streamed
}

const ChatScreen: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false); // To prevent multiple sends
  const [activeSessionId, setActiveSessionLocal] = useState<string>("");

  // Initialize session ID on component mount
  useEffect(() => {
    const id = getSessionId();
    setSessionId(id);
    setActiveSessionLocal(id);
    // persist active session key for other tabs
    try {
      setActiveSessionId(id);
    } catch {}
    // load messages for active session
    const msgs = loadMessages(id).map((m) => ({ ...m }));
    setMessages(msgs);
  }, []);

  const handleSendMessage = async (text: string) => {
    if (!sessionId || isLoading) return;

    setIsLoading(true);

    const newUserMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: "user",
    };
    setMessages((prev) => {
      const next = [...prev, newUserMessage];
      saveMessage(sessionId, newUserMessage);
      return next;
    });

    // Add a placeholder for the AI response
    const aiMessageId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      {
        id: aiMessageId,
        text: "",
        sender: "ai",
        isStreaming: true,
      },
    ]);

    let accumulatedResponse = "";
    try {
      await ragStream({
        query: text,
        session_id: sessionId,
        onToken: (token) => {
          try {
            console.debug(
              `[rag:onToken] received token len=${
                token.length
              } preview=${JSON.stringify(token)}`
            );
          } catch {}
          accumulatedResponse += token;
          try {
            console.debug(
              `[rag:onToken] accumulated len=${accumulatedResponse.length}`
            );
          } catch {}
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessageId
                ? { ...msg, text: accumulatedResponse }
                : msg
            )
          );
        },
      });
    } catch (error) {
      console.error("Error during RAG stream:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId
            ? {
                ...msg,
                text: "Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.",
                isStreaming: false,
              }
            : msg
        )
      );
    } finally {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId ? { ...msg, isStreaming: false } : msg
        )
      );
      // finalize AI message in storage
      const final = {
        id: aiMessageId,
        sender: "ai",
        text: accumulatedResponse,
        createdAt: Date.now(),
      };
      try {
        saveMessage(sessionId, final);
      } catch (e) {
        console.error("Failed to save final AI message", e);
      }
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    // Create a new session and switch to it
    const meta = createSession();
    setActiveSessionLocal(meta.id);
    setSessionId(meta.id);
    setMessages([]);
    try {
      setActiveSessionId(meta.id);
    } catch {}
    console.log("New chat started!", meta.id);
  };

  const handleSelectSession = (id: string) => {
    setSessionId(id);
    setActiveSessionLocal(id);
    try {
      setActiveSessionId(id);
    } catch {}
    // load messages
    const msgs = loadMessages(id).map((m) => ({ ...m }));
    setMessages(msgs);
  };

  const handleLogout = () => {
    resetSession();
    setSessionId(getSessionId()); // Get a new session ID
    setMessages([]);
    console.log("User logged out and session reset.");
  };

  return (
    <div className="flex h-screen bg-eerie_black-500 text-floral_white-500">
      <Sidebar
        onNewChat={handleNewChat}
        onLogout={handleLogout}
        onSelectSession={handleSelectSession}
        activeSessionId={activeSessionId}
      />
      <div className="flex flex-col flex-1 ml-4 rounded-xl shadow-2xl overflow-hidden">
        <ChatArea messages={messages} />
        <MessageInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default ChatScreen;
