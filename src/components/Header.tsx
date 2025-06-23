import React from 'react';
import { Bot, Activity, Settings, User, Menu } from 'lucide-react';
import derivAPI from '../services/derivAPI';

interface HeaderProps {
  onMenuToggle?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const [isConnected, setIsConnected] = React.useState(false);

  React.useEffect(() => {
    // Subscribe to connection status
    derivAPI.onConnectionChange((data) => {
      setIsConnected(data.connected);
    });
  }, []);

  return (
    <header className="bg-gradient-header border-b border-gray-700/50 px-4 md:px-6 py-3 md:py-4 z-10 relative backdrop-blur">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onMenuToggle}
            className="md:hidden p-2 hover:bg-gray-700/70 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5 text-gray-300" />
          </button>
          <div className="relative flex-shrink-0">
            <Bot className="w-7 md:w-9 h-7 md:h-9 text-green-400 animate-pulse-slow" />
            <div className="absolute -top-1 -right-1 w-2 md:w-3 h-2 md:h-3 bg-green-400 rounded-full animate-bounce-slow"></div>
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl md:text-2xl font-bold gradient-text tracking-tight">Open pips</h1>
            <p className="text-xs text-gray-400 hidden sm:block font-medium">Advanced Deriv Trading Bot</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3 md:space-x-5">
          <div className={`flex items-center space-x-2 px-3 md:px-4 py-1.5 md:py-2 glass-effect-light rounded-full border ${
            isConnected ? 'border-green-500/50 animate-glow' : 'border-red-500/50'
          }`}>
            <Activity className={`w-3.5 md:w-4 h-3.5 md:h-4 ${isConnected ? 'text-green-400' : 'text-red-400'}`} />
            <span className={`text-xs md:text-sm font-medium hidden sm:inline ${
              isConnected ? 'text-green-400' : 'text-red-400'
            }`}>
              {isConnected ? 'Connected' : 'Connecting...'}
            </span>
          </div>
          
          <div className="flex items-center space-x-2 md:space-x-3">
            <button 
              className="p-2 md:p-2.5 bg-gray-800/80 hover:bg-gray-700 border border-gray-700/50 rounded-full transition-all duration-200 hover:border-green-500/30"
              aria-label="Settings"
            >
              <Settings className="w-4 md:w-5 h-4 md:h-5 text-gray-300 hover:text-white" />
            </button>
            <button 
              className="p-2 md:p-2.5 bg-gray-800/80 hover:bg-gray-700 border border-gray-700/50 rounded-full transition-all duration-200 hover:border-green-500/30"
              aria-label="User profile"
            >
              <User className="w-4 md:w-5 h-4 md:h-5 text-gray-300 hover:text-white" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;