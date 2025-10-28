import React, { useEffect, useState } from "react";
import {
  Plus,
  LogOut,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Zap, // Geçici sohbet için yeni ikon
} from "lucide-react";
import {
  listSessions,
  createSession,
  SessionMeta,
  deleteSession,
  updateSession,
} from "../utils/storage";

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<boolean>(false);

  useEffect(() => {
    setSessions(listSessions());
    const onStorage = () => setSessions(listSessions());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const handleNew = () => {
    const meta = createSession(); // Varsayılan olarak kalıcı sohbet
    onNewChat(meta.id);
    setSessions(listSessions());
  };

  const handleNewTemporaryChat = () => {
    const meta = createSession("Geçici Sohbet", true); // Geçici sohbet oluştur
    onNewChat(meta.id);
    setSessions(listSessions());
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setConfirmDeleteId(id);
  };

  const confirmDelete = (id: string) => {
    deleteSession(id);
    setSessions(listSessions());
    setConfirmDeleteId(null);
    if (activeSessionId === id) {
      const meta = createSession();
      onNewChat(meta.id);
      setSessions(listSessions());
    }
  };

  const cancelDelete = () => setConfirmDeleteId(null);

  const handleRename = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const current = sessions.find((s) => s.id === id);
    setEditingId(id);
    setEditingTitle(current?.title || "");
  };

  const saveRename = (id: string) => {
    const trimmed = editingTitle.trim();
    const finalTitle = trimmed.length === 0 ? "Sohbet" : trimmed;
    updateSession({ id, title: finalTitle });
    setSessions(listSessions());
    setEditingId(null);
    setEditingTitle("");
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditingTitle("");
  };

  return (
    <div
      className={`bg-black_olive p-4 flex flex-col rounded-xl shadow-lg transition-all duration-200 ${
        collapsed ? "w-16" : "w-72 md:w-80 lg:w-80"
      }`}
    >
      <div className="flex items-center justify-between mb-6">
        <h2
          className={`text-2xl font-bold text-flame ${
            collapsed ? "hidden" : ""
          }`}
        >
          Bolt AI
        </h2>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="p-1 rounded bg-eerie_black text-timberwolf hover:bg-black_olive"
          title={collapsed ? "Sidebar genişlet" : "Sidebar daralt"}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <button
        onClick={handleNew}
        className={`flex items-center ${
          collapsed ? "justify-center w-12 h-10" : "w-full py-3 px-4 mb-2 justify-center"
        } bg-flame text-floral_white rounded-xl shadow-md hover:bg-flame transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-flame focus:ring-offset-2 focus:ring-offset-black_olive`}
      >
        <Plus size={20} className={`${collapsed ? "" : "mr-2"}`} />
        {!collapsed && "Yeni Sohbet"}
      </button>

      <button
        onClick={handleNewTemporaryChat}
        className={`flex items-center ${
          collapsed ? "justify-center w-12 h-10" : "w-full py-3 px-4 mb-4 justify-center"
        } bg-black_olive text-timberwolf rounded-xl shadow-md hover:bg-eerie_black transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-timberwolf focus:ring-offset-2 focus:ring-offset-black_olive`}
      >
        <Zap size={20} className={`${collapsed ? "" : "mr-2"}`} />
        {!collapsed && "Geçici Sohbet"}
      </button>

      <div className="flex-1 overflow-y-auto custom-scrollbar-thin">
        {sessions.length === 0 ? (
          <p className={`text-timberwolf text-sm text-center mt-4 ${collapsed ? "hidden" : ""}`}>
            Henüz sohbet yok.
          </p>
        ) : (
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li key={s.id} className="relative">
                <button
                  onClick={() => onSelectSession(s.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors duration-200 flex items-center ${
                    s.id === activeSessionId
                      ? "bg-flame text-floral_white"
                      : "hover:bg-black_olive text-timberwolf"
                  } ${collapsed ? "justify-center" : "justify-between"}`}
                  aria-pressed={s.id === activeSessionId}
                >
                  {collapsed ? (
                    s.isTemporary ? <Zap size={20} /> : <MessageSquare size={20} />
                  ) : (
                    <div className="flex flex-col flex-grow overflow-hidden">
                      {editingId === s.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            autoFocus
                            value={editingTitle}
                            onChange={(ev) => setEditingTitle(ev.target.value)}
                            onKeyDown={(ev) => {
                              if (ev.key === "Enter") saveRename(s.id);
                              if (ev.key === "Escape") cancelRename();
                            }}
                            onBlur={() => saveRename(s.id)}
                            className="bg-eerie_black text-sm outline-none rounded px-2 py-1 w-full text-floral_white"
                          />
                          <button
                            onClick={() => saveRename(s.id)}
                            className="text-xs px-2 py-1 bg-flame rounded text-floral_white hover:bg-flame"
                          >
                            Kaydet
                          </button>
                          <button
                            onClick={cancelRename}
                            className="text-xs px-2 py-1 bg-black_olive rounded text-timberwolf hover:bg-eerie_black"
                          >
                            İptal
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="font-medium text-sm truncate flex items-center gap-2">
                            {s.isTemporary && <Zap size={14} className="text-flame" />}
                            {s.title || "Sohbet"}
                          </span>
                          <span className="text-xs text-timberwolf truncate max-w-[40rem]">
                            {s.lastMessage || "—"}
                          </span>
                        </>
                      )}
                    </div>
                  )}

                  {!collapsed && editingId !== s.id && (
                    <div className="flex items-center gap-2 ml-auto">
                      <div className="text-xs text-timberwolf">
                        {new Date(s.updatedAt).toLocaleTimeString()}
                      </div>
                      <button
                        onClick={(e) => handleRename(e, s.id)}
                        title="Yeniden adlandır"
                        className="p-1 hover:text-floral_white"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, s.id)}
                        title="Sohbeti sil"
                        className="p-1 hover:text-flame"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </button>

                {confirmDeleteId === s.id && !collapsed && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 mr-2 p-3 bg-eerie_black border border-black_olive rounded-lg shadow-xl text-sm flex items-center gap-3 z-10">
                    <span className="text-floral_white">Silinsin mi?</span>
                    <button
                      onClick={() => confirmDelete(s.id)}
                      className="px-3 py-1 bg-flame rounded-md text-floral_white hover:bg-flame transition-colors duration-200"
                    >
                      Sil
                    </button>
                    <button
                      onClick={cancelDelete}
                      className="px-3 py-1 bg-black_olive rounded-md text-timberwolf hover:bg-eerie_black transition-colors duration-200"
                    >
                      İptal
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-auto pt-4 border-t border-black_olive">
        <button
          onClick={onLogout}
          className={`flex items-center ${
            collapsed ? "justify-center w-12 h-10" : "w-full py-3 px-4 justify-center"
          } bg-eerie_black text-timberwolf rounded-xl shadow-md hover:bg-black_olive hover:text-floral_white transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-timberwolf focus:ring-offset-2 focus:ring-offset-black_olive`}
        >
          <LogOut size={20} className={`${collapsed ? "" : "mr-2"}`} />{" "}
          {!collapsed && "Oturumu Kapat"}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
