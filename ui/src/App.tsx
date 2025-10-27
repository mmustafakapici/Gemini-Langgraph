import React from 'react';
import ChatScreen from './components/ChatScreen';
import './index.css'; // Ensure Tailwind CSS is imported

function App() {
  // AuthScreen kaldırıldığı için, uygulama doğrudan ChatScreen ile başlar.
  // Kimlik doğrulama durumu ve yükleme mantığı artık gerekli değil.

  // onLogout işlevi de artık bir AuthScreen olmadığı için gereksizdir.
  // Ancak ChatScreen'in bir onLogout prop'u beklediğini varsayarak,
  // şimdilik boş bir fonksiyon ile geçiyoruz veya ChatScreen'den kaldırıyoruz.
  // Kullanıcının isteğine göre ChatScreen'den de kaldırılabilir.
  // Şimdilik, ChatScreen'in onLogout prop'unu kaldırıyorum, çünkü artık bir çıkış mekanizması yok.

  return (
    <div className="font-sans antialiased">
      <ChatScreen />
    </div>
  );
}

export default App;
