import React from "react";
import { Plus, LogOut } from "lucide-react"; // Import LogOut icon

interface SidebarProps {
  onNewChat: () => void;
  onLogout: () => void; // Add onLogout prop
}

const Sidebar: React.FC<SidebarProps> = ({ onNewChat, onLogout }) => {
  return (
    <div className="w-64 bg-black_olive-100 p-4 flex flex-col rounded-xl shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-flame-500">Bolt AI</h2>
      </div>

      <button
        onClick={onNewChat}
        className="flex items-center justify-center w-full py-3 px-4 mb-4 bg-flame-600 text-floral_white-500 rounded-xl shadow-md hover:bg-flame-700 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-flame-500 focus:ring-offset-2 focus:ring-offset-black_olive-700"
      >
        <Plus size={20} className="mr-2" /> Yeni Sohbet
      </button>

      <div className="flex-1 overflow-y-auto custom-scrollbar-thin">
        {/* Sohbet geçmişi listesi buraya gelecek */}
        <p className="text-timberwolf-400 text-sm text-center mt-4">
          Sohbet geçmişi yakında...
        </p>
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
