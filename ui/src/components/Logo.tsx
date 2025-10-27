import React from 'react';
import { Bot } from 'lucide-react';

const Logo: React.FC = () => {
  return (
    <div className="flex items-center justify-center gap-2 text-floral_white-500">
      <Bot size={32} className="text-flame-500" />
      <span className="text-3xl font-bold tracking-tight">AILAYZER AI</span> {/* Burası güncellendi */}
    </div>
  );
};

export default Logo;
