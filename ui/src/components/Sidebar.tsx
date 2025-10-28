import React, { useEffect, useState } from "react";
import {
  Plus,
  LogOut,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
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
    const meta = createSession();
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
      className={`bg-black_olive-100 p-4 flex flex-col rounded-xl shadow-lg transition-all duration-200 ${
        collapsed ? "w-16" : "w-72 md:w-80 lg:w-80"
      }`}
    >
      <div className="flex items-center justify-between mb-6">
        <h2
          className={`text-2xl font-bold text-flame-500 ${
            collapsed ? "hidden" : ""
          }`}
        >
          Bolt AI
        </h2>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="p-1 rounded bg-eerie_black-600 text-timberwolf-300 hover:bg-eerie_black-500"
          title={collapsed ? "Sidebar genişlet" : "Sidebar daralt"}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <button
        onClick={handleNew}
        className={`flex items-center justify-center ${
          collapsed ? "w-12 h-10" : "w-full py-3 px-4 mb-4"
        } bg-flame-600 text-floral_white-500 rounded-xl shadow-md hover:bg-flame-700 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-flame-500 focus:ring-offset-2 focus:ring-offset-black_olive-700`}
      >
        <Plus size={20} className={`${collapsed ? "" : "mr-2"}`} />
        {!collapsed && "Yeni Sohbet"}
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
                          className="bg-transparent text-sm outline-none w-44"
                        />
                        <button
                          onClick={() => saveRename(s.id)}
                          className="text-xs px-2 py-1 bg-flame-500 rounded text-floral_white-500"
                        >
                          Kaydet
                        </button>
                        <button
                          onClick={cancelRename}
                          className="text-xs px-2 py-1 bg-gray-600 rounded text-timberwolf-200"
                        >
                          İptal
                        </button>
                      </div>
                    ) : (
                      <>
                        <span
                          className={`font-medium text-sm ${
                            collapsed ? "hidden" : ""
                          }`}
                        >
                          {s.title || "Sohbet"}
                        </span>
                        <span
                          className={`text-xs text-timberwolf-400 truncate ${
                            collapsed ? "hidden" : "max-w-[40rem]"
                          }`}
                        >
                          {s.lastMessage || "—"}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-xs text-timberwolf-400 mr-2">
                      {new Date(s.updatedAt).toLocaleTimeString()}
                    </div>
                    {editingId !== s.id && (
                      <>
                        {!collapsed && (
                          <>
                            <button
                              onClick={(e) => handleRename(e, s.id)}
                              title="Yeniden adlandır"
                              className="p-1"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={(e) => handleDelete(e, s.id)}
                              title="Sohbeti sil"
                              className="p-1"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </>
                    )}

                    {confirmDeleteId === s.id && (
                      <div className="ml-2 p-2 bg-eerie_black-700 border border-black_olive-600 rounded text-sm flex items-center gap-2">
                        <span>Silinsin mi?</span>
                        <button
                          onClick={() => confirmDelete(s.id)}
                          className="px-2 py-1 bg-red-600 rounded text-floral_white-500"
                        >
                          Sil
                        </button>
                        <button
                          onClick={cancelDelete}
                          className="px-2 py-1 bg-gray-600 rounded text-timberwolf-200"
                        >
                          İptal
                        </button>
                      </div>
                    )}
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
