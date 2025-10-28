import React, { useState } from 'react';
import { Send, Mic } from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean; // Add isLoading prop
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, isLoading }) => {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim() && !isLoading) { // Disable send if loading
      onSendMessage(message);
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading) { // Disable send if loading
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 bg-black_olive border-t border-black_olive rounded-b-xl shadow-lg">
      <div className="max-w-3xl mx-auto flex items-end gap-3">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={isLoading ? "AI yanıtlıyor..." : "Mesajınızı buraya yazın..."}
          rows={1}
          className="flex-1 resize-none p-3 rounded-xl bg-eerie_black border border-black_olive focus:border-flame focus:ring-1 focus:ring-flame text-floral_white placeholder-timberwolf outline-none transition-all duration-300 custom-scrollbar-thin"
          style={{ maxHeight: '150px' }}
          disabled={isLoading} // Disable textarea if loading
        />
        <button
          onClick={handleSend}
          className={`flex-shrink-0 p-3 rounded-full bg-flame text-floral_white transition-all duration-300 transform focus:outline-none focus:ring-2 focus:ring-flame focus:ring-offset-2 focus:ring-offset-black_olive ${
            isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-flame hover:scale-110'
          }`}
          aria-label="Mesaj gönder"
          disabled={isLoading} // Disable button if loading
        >
          <Send size={20} />
        </button>
        <button
          className={`flex-shrink-0 p-3 rounded-full bg-eerie_black text-timberwolf transition-all duration-300 transform focus:outline-none focus:ring-2 focus:ring-timberwolf focus:ring-offset-2 focus:ring-offset-black_olive ${
            isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:text-floral_white hover:bg-black_olive hover:scale-110'
          }`}
          aria-label="Sesli mesaj gönder"
          title="Sesli mesaj (yakında)"
          disabled={isLoading} // Disable button if loading
        >
          <Mic size={20} />
        </button>
      </div>
    </div>
  );
};

export default MessageInput;
