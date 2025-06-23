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
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}
      
      <aside className={`
        fixed md:relative top-0 left-0 h-full w-64 bg-gray-800 border-r border-gray-700 z-50
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex items-center justify-between p-4 md:hidden border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Menu</h2>
          <button 
            onClick={onClose}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        
        <nav className="p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleItemClick(item.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium ${
                      activeTab === item.id
                        ? 'bg-green-500 text-white shadow-lg'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}
                    type="button"
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span>{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Debug info */}
        <div className="p-4 border-t border-gray-700">
          <div className="text-xs text-gray-500">
            Active: {activeTab}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;