import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import MessageInput from './MessageInput';
import { getSessionId, resetSession } from '../utils/session';
import { ragStream } from '../utils/rag';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  isStreaming?: boolean; // To indicate if the message is currently being streamed
}

const ChatScreen: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false); // To prevent multiple sends

  // Initialize session ID on component mount
  useEffect(() => {
    setSessionId(getSessionId());
  }, []);

  const handleSendMessage = async (text: string) => {
    if (!sessionId || isLoading) return;

    setIsLoading(true);

    const newUserMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
    };
    setMessages((prev) => [...prev, newUserMessage]);

    // Add a placeholder for the AI response
    const aiMessageId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: aiMessageId, text: 'AI is thinking...', sender: 'ai', isStreaming: true },
    ]);

    let accumulatedResponse = '';
    try {
      await ragStream({
        query: text,
        session_id: sessionId,
        onToken: (token) => {
          accumulatedResponse += token;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessageId ? { ...msg, text: accumulatedResponse } : msg
            )
          );
        },
      });
    } catch (error) {
      console.error('Error during RAG stream:', error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId
            ? { ...msg, text: 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.', isStreaming: false }
            : msg
        )
      );
    } finally {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId ? { ...msg, isStreaming: false } : msg
        )
      );
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    resetSession();
    setSessionId(getSessionId()); // Get a new session ID
    setMessages([]);
    console.log('New chat started!');
  };

  const handleLogout = () => {
    resetSession();
    setSessionId(getSessionId()); // Get a new session ID
    setMessages([]);
    console.log("User logged out and session reset.");
  };

  return (
    <div className="flex h-screen bg-eerie_black-500 text-floral_white-500">
      <Sidebar onNewChat={handleNewChat} onLogout={handleLogout} />
      <div className="flex flex-col flex-1 ml-4 rounded-xl shadow-2xl overflow-hidden">
        <ChatArea messages={messages} />
        <MessageInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default ChatScreen;
