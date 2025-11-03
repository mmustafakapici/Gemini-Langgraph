import React from 'react';
import { User, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface ChatBubbleProps {
  message: string;
  sender: 'user' | 'ai';
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, sender }) => {
  const isUser = sender === 'user';
  const bubbleClasses = isUser
    ? 'bg-flame-500 text-floral_white self-end rounded-br-none'
    : 'bg-eerie_black-600 text-floral_white self-start rounded-bl-none';
  const avatarClasses = isUser
    ? 'bg-flame-600'
    : 'bg-black_olive-700';

  return (
    <div className={`flex items-end gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${avatarClasses}`}>
          <Bot size={18} className="text-floral_white" />
        </div>
      )}
      <div className={`p-4 rounded-2xl shadow-md max-w-2xl break-words ${bubbleClasses}`}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // Custom renderer for code blocks
            code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              return !inline && match ? (
                <SyntaxHighlighter
                  style={atomOneDark}
                  language={match[1]}
                  PreTag="div"
                  {...props}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              ) : (
                <code className={`${className} bg-black_olive-700 px-1 py-0.5 rounded text-sm`} {...props}>
                  {children}
                </code>
              );
            },
            // Custom renderer for links
            a: ({ node, ...props }) => (
              <a {...props} className="text-blue-300 hover:underline" target="_blank" rel="noopener noreferrer" />
            ),
            // Custom renderer for paragraphs
            p: ({ node, ...props }) => <p {...props} className="mb-2 last:mb-0" />,
            // Custom renderer for lists
            ul: ({ node, ...props }) => <ul {...props} className="list-disc list-inside mb-2 last:mb-0 pl-4" />,
            ol: ({ node, ...props }) => <ol {...props} className="list-decimal list-inside mb-2 last:mb-0 pl-4" />,
            li: ({ node, ...props }) => <li {...props} className="mb-1" />,
            // Custom renderer for headings
            h1: ({ node, ...props }) => <h1 {...props} className="text-2xl font-bold mt-4 mb-2" />,
            h2: ({ node, ...props }) => <h2 {...props} className="text-xl font-bold mt-3 mb-2" />,
            h3: ({ node, ...props }) => <h3 {...props} className="text-lg font-bold mt-2 mb-1" />,
            // Custom renderer for blockquotes
            blockquote: ({ node, ...props }) => (
              <blockquote {...props} className="border-l-4 border-flame-400 pl-4 italic my-2" />
            ),
            // Custom renderer for tables
            table: ({ node, ...props }) => (
              <table {...props} className="table-auto w-full my-2 border-collapse border border-black_olive-500" />
            ),
            th: ({ node, ...props }) => (
              <th {...props} className="border border-black_olive-500 px-4 py-2 bg-black_olive-700 font-semibold" />
            ),
            td: ({ node, ...props }) => (
              <td {...props} className="border border-black_olive-500 px-4 py-2" />
            ),
          }}
        >
          {message}
        </ReactMarkdown>
      </div>
      {isUser && (
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${avatarClasses}`}>
          <User size={18} className="text-floral_white" />
        </div>
      )}
    </div>
  );
};

export default ChatBubble;
