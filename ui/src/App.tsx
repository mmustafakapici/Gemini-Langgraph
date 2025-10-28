import React, { useEffect } from 'react';
import ChatScreen from './components/ChatScreen';
import './index.css'; // Ensure Tailwind CSS is imported
import { cleanupTemporarySessionOnLoad } from './utils/session';

function App() {
  useEffect(() => {
    // Uygulama yüklendiğinde geçici oturumları temizle
    cleanupTemporarySessionOnLoad();
  }, []);

  return (
    <div className="font-sans antialiased">
      <ChatScreen />
    </div>
  );
}

export default App;
