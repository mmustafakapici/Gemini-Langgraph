import React, { useEffect, useState } from "react";
import { Plus, LogOut } from "lucide-react"; // Import LogOut icon
import { listSessions, createSession, SessionMeta } from "../utils/storage";

interface SidebarProps {
  onNewChat: (newSessionId?: string) => void;
  onLogout: () => void;
  onSelectSession: (sessionId: string) => void;
  activeSessionId?: string;
}

const Sidebar: React.FC<SidebarProps> = ({
  onNewChat,
  onLogout,
  onSelectSession,
  activeSessionId,
}) => {
  const [sessions, setSessions] = useState<SessionMeta[]>([]);

  useEffect(() => {
    setSessions(listSessions());
    const onStorage = () => setSessions(listSessions());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const handleNew = () => {
    const meta = createSession();
    onNewChat(meta.id);
    // sessions güncellemesi için storage event veya manuel set
    setSessions(listSessions());
  };

  return (
    <div className="w-64 bg-black_olive-100 p-4 flex flex-col rounded-xl shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-flame-500">Bolt AI</h2>
      </div>

      <button
        onClick={handleNew}
        className="flex items-center justify-center w-full py-3 px-4 mb-4 bg-flame-600 text-floral_white-500 rounded-xl shadow-md hover:bg-flame-700 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-flame-500 focus:ring-offset-2 focus:ring-offset-black_olive-700"
      >
        <Plus size={20} className="mr-2" /> Yeni Sohbet
      </button>

      <div className="flex-1 overflow-y-auto custom-scrollbar-thin">
        {sessions.length === 0 ? (
          <p className="text-timberwolf-400 text-sm text-center mt-4">
            Henüz sohbet yok.
          </p>
        ) : (
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => onSelectSession(s.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors duration-200 flex items-center justify-between ${
                    s.id === activeSessionId
                      ? "bg-flame-600 text-floral_white-500"
                      : "hover:bg-black_olive-600"
                  }`}
                  aria-pressed={s.id === activeSessionId}
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">
                      {s.title || "Sohbet"}
                    </span>
                    <span className="text-xs text-timberwolf-400 truncate max-w-[12rem]">
                      {s.lastMessage || "—"}
                    </span>
                  </div>
                  <div className="text-xs text-timberwolf-400 ml-2">
                    {new Date(s.updatedAt).toLocaleTimeString()}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-auto pt-4 border-t border-black_olive-600">
        <button
          onClick={onLogout}
          className="flex items-center justify-center w-full py-3 px-4 bg-eerie_black-600 text-timberwolf-400 rounded-xl shadow-md hover:bg-eerie_black-500 hover:text-floral_white-500 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-timberwolf-500 focus:ring-offset-2 focus:ring-offset-black_olive-700"
        >
          <LogOut size={20} className="mr-2" /> Oturumu Kapat
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
