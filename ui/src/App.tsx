import './App.css';
import { ChatWindow } from './components/chat/chat-window';
import { Toaster } from './components/ui/sonner'; // Using sonner for modern toasts

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <ChatWindow />
      <Toaster />
    </div>
  );
}

export default App;
