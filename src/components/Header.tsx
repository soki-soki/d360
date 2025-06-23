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
    <header className="glass-effect border-b border-trading-gray-light px-4 md:px-6 py-3 md:py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button 
            onClick={onMenuToggle}
            className="md:hidden p-2 hover:bg-trading-gray-light rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-400" />
          </button>
          <div className="relative">
            <Bot className="w-6 md:w-8 h-6 md:h-8 text-trading-green animate-pulse-slow" />
            <div className="absolute -top-1 -right-1 w-2 md:w-3 h-2 md:h-3 bg-trading-green rounded-full animate-bounce-slow"></div>
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold gradient-text">Open pips</h1>
            <p className="text-xs text-gray-400 hidden sm:block">Advanced Deriv Trading Bot</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 md:space-x-4">
          <div className={`flex items-center space-x-2 px-2 md:px-3 py-1 md:py-2 glass-effect rounded-lg border ${
            isConnected ? 'border-trading-green' : 'border-red-500'
          }`}>
            <Activity className={`w-3 md:w-4 h-3 md:h-4 ${isConnected ? 'text-trading-green' : 'text-red-400'}`} />
            <span className={`text-xs md:text-sm font-medium hidden sm:inline ${
              isConnected ? 'text-trading-green' : 'text-red-400'
            }`}>
              {isConnected ? 'Connected' : 'Connecting...'}
            </span>
          </div>
          
          <div className="flex items-center space-x-1 md:space-x-2">
            <button className="btn-secondary p-1.5 md:p-2 rounded-lg">
              <Settings className="w-4 md:w-5 h-4 md:h-5 text-gray-300" />
            </button>
            <button className="btn-secondary p-1.5 md:p-2 rounded-lg">
              <User className="w-4 md:w-5 h-4 md:h-5 text-gray-300" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;