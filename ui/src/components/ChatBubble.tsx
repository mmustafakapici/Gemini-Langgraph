import React from 'react';
import { User, Bot } from 'lucide-react';

interface ChatBubbleProps {
  message: string;
  sender: 'user' | 'ai';
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, sender }) => {
  const isUser = sender === 'user';
  const bubbleClasses = isUser
    ? 'bg-flame-500 text-floral_white-500 self-end rounded-br-none'
    : 'bg-eerie_black-600 text-floral_white-500 self-start rounded-bl-none';
  const avatarClasses = isUser
    ? 'bg-flame-600'
    : 'bg-black_olive-700';

  return (
    <div className={`flex items-end gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${avatarClasses}`}>
          <Bot size={18} className="text-floral_white-500" />
        </div>
      )}
      <div className={`p-4 rounded-2xl shadow-md max-w-2xl break-words ${bubbleClasses}`}> {/* Mesaj akışı için maksimum genişlik */}
        <p className="text-sm sm:text-base">{message}</p>
      </div>
      {isUser && (
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${avatarClasses}`}>
          <User size={18} className="text-floral_white-500" />
        </div>
      )}
    </div>
  );
};

export default ChatBubble;
