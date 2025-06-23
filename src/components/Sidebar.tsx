import React from 'react';
import { Bot, TrendingUp, Settings, BarChart3, X, Library } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onNavigate, isOpen = true, onClose }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'bot-library', label: 'Bot Library', icon: Library },
    { id: 'automated', label: 'Auto Trading', icon: Bot },
    { id: 'manual', label: 'Manual Trading', icon: TrendingUp },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleItemClick = (itemId: string) => {
    console.log('🔧 Sidebar: Clicked item:', itemId);
    onNavigate(itemId);
    console.log('🔧 Sidebar: onNavigate called with:', itemId);
    
    // Close sidebar on mobile after navigation
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/70 z-40 md:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}
      
      <aside className={`
        fixed md:relative top-0 left-0 h-full w-72 bg-gray-800/95 backdrop-blur-sm border-r border-gray-700/50 z-50
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex items-center justify-between p-5 md:hidden border-b border-gray-700/50">
          <h2 className="text-lg font-semibold text-white tracking-tight">Navigation</h2>
          <button 
            onClick={onClose}
            className="p-2 bg-gray-700/80 hover:bg-gray-600 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        
        <nav className="p-4 md:p-5">
          <ul className="space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleItemClick(item.id)}
                    className={`w-full flex items-center space-x-3.5 px-4 py-3.5 rounded-xl transition-all duration-200 font-medium ${
                      activeTab === item.id
                        ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/70'
                    }`}
                    type="button"
                  >
                    <Icon className="w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110" />
                    <span className="tracking-wide">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* App Info */}
        <div className="absolute bottom-0 left-0 right-0 p-5 border-t border-gray-700/30">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              <span className="block text-gray-400 font-medium mb-1">Open pips</span>
              <span className="block opacity-70">v1.0.0</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-xs text-gray-400">Live</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;