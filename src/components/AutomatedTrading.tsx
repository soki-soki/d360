import React, { useState, useEffect } from 'react';
import { Bot, Play, Pause, Settings, TrendingUp, AlertTriangle, Star, Download } from 'lucide-react';

interface SelectedBot {
  id: string;
  name: string;
  description: string;
  winRate: string;
  minStake: string;
  maxStake: string;
  timeframe: string;
  complexity: string;
  rating: number;
}

const AutomatedTrading: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState('scalping');
  const [loadedBot, setLoadedBot] = useState<SelectedBot | null>(null);

  useEffect(() => {
    // Check if a bot was loaded from the library
    const savedBot = localStorage.getItem('selectedBot');
    if (savedBot) {
      setLoadedBot(JSON.parse(savedBot));
      setSelectedStrategy('loaded-bot');
    }
  }, []);

  const strategies = [
    { id: 'scalping', name: 'Basic Scalping', description: 'Quick trades with small profits', winRate: '65%' },
    { id: 'trend', name: 'Trend Following', description: 'Follows market trends', winRate: '58%' },
    { id: 'martingale', name: 'Martingale System', description: 'Progressive betting strategy', winRate: '72%' },
    { id: 'grid', name: 'Grid Trading', description: 'Places orders at regular intervals', winRate: '61%' },
  ];

  const botSettings = [
    { label: 'Initial Stake', value: loadedBot ? loadedBot.minStake.replace('$', '') : '10', type: 'currency' },
    { label: 'Max Trades/Hour', value: '15', type: 'number' },
    { label: 'Stop Loss', value: '100', type: 'currency' },
    { label: 'Take Profit', value: '500', type: 'currency' },
    { label: 'Risk Level', value: 'Medium', type: 'select' },
  ];

  const clearLoadedBot = () => {
    localStorage.removeItem('selectedBot');
    setLoadedBot(null);
    setSelectedStrategy('scalping');
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl md:text-3xl font-bold text-green-400">Automated Trading</h2>
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <div className={`flex items-center space-x-2 px-3 md:px-4 py-2 rounded-lg border ${
            isRunning ? 'bg-green-500/20 text-green-400 border-green-500' : 'bg-gray-800 text-gray-400 border-gray-700'
          }`}>
            <Bot className="w-4 h-4" />
            <span className="font-medium text-sm md:text-base">{isRunning ? 'Bot Active' : 'Bot Inactive'}</span>
          </div>
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`flex items-center space-x-2 px-4 md:px-6 py-2 md:py-3 rounded-lg font-medium transition-all duration-300 text-sm md:text-base ${
              isRunning 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isRunning ? 'Stop Bot' : 'Start Bot'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Strategy Selection */}
        <div className="lg:col-span-2 bg-gray-800 border border-gray-700 p-4 md:p-6 rounded-xl">
          <h3 className="text-lg md:text-xl font-semibold text-white mb-4 flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <span>Trading Strategies</span>
          </h3>

          {/* Loaded Bot from Library */}
          {loadedBot && (
            <div className="mb-6 p-4 bg-green-500/10 border-2 border-green-500 rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Star className="w-5 h-5 text-yellow-400 fill-current" />
                  <h4 className="font-semibold text-white">Loaded from Library</h4>
                </div>
                <button
                  onClick={clearLoadedBot}
                  className="text-gray-400 hover:text-white text-sm"
                >
                  Remove
                </button>
              </div>
              <div
                onClick={() => setSelectedStrategy('loaded-bot')}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-300 ${
                  selectedStrategy === 'loaded-bot'
                    ? 'border-green-400 bg-green-400/10'
                    : 'border-green-500/50 hover:border-green-400/70 bg-green-500/5'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-white text-sm md:text-base">{loadedBot.name}</h4>
                  <div className="flex items-center space-x-2">
                    <span className="text-green-400 text-sm font-medium">{loadedBot.winRate}</span>
                    <div className="flex items-center space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${
                            i < Math.floor(loadedBot.rating) ? 'text-yellow-400 fill-current' : 'text-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-gray-400 text-xs md:text-sm mb-2">{loadedBot.description}</p>
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span>Complexity: <span className="text-orange-400">{loadedBot.complexity}</span></span>
                  <span>Timeframe: {loadedBot.timeframe}</span>
                </div>
              </div>
            </div>
          )}

          {/* Default Strategies */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {strategies.map((strategy) => (
              <div
                key={strategy.id}
                onClick={() => setSelectedStrategy(strategy.id)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-300 ${
                  selectedStrategy === strategy.id
                    ? 'border-green-400 bg-green-400/10'
                    : 'border-gray-700 hover:border-green-500/50 bg-gray-800/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-white text-sm md:text-base">{strategy.name}</h4>
                  <span className="text-green-400 text-sm font-medium">{strategy.winRate}</span>
                </div>
                <p className="text-gray-400 text-xs md:text-sm">{strategy.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bot Settings */}
        <div className="bg-gray-800 border border-gray-700 p-4 md:p-6 rounded-xl">
          <h3 className="text-lg md:text-xl font-semibold text-white mb-4 flex items-center space-x-2">
            <Settings className="w-5 h-5 text-green-400" />
            <span>Bot Settings</span>
          </h3>
          <div className="space-y-4">
            {botSettings.map((setting, index) => (
              <div key={index}>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  {setting.label}
                </label>
                <input
                  type="text"
                  defaultValue={setting.value}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none transition-colors text-sm md:text-base"
                />
              </div>
            ))}
          </div>
          <button className="bg-green-500 hover:bg-green-600 text-white w-full mt-6 px-4 py-2 rounded-lg font-medium text-sm md:text-base transition-colors">
            Save Settings
          </button>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-gray-800 border border-gray-700 p-4 md:p-6 rounded-xl">
        <h3 className="text-lg md:text-xl font-semibold text-white mb-4">Bot Performance</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <div className="text-center">
            <p className="text-xl md:text-2xl font-bold text-green-400">156</p>
            <p className="text-gray-400 text-xs md:text-sm">Successful Trades</p>
          </div>
          <div className="text-center">
            <p className="text-xl md:text-2xl font-bold text-red-400">44</p>
            <p className="text-gray-400 text-xs md:text-sm">Failed Trades</p>
          </div>
          <div className="text-center">
            <p className="text-xl md:text-2xl font-bold text-green-400">78%</p>
            <p className="text-gray-400 text-xs md:text-sm">Win Rate</p>
          </div>
          <div className="text-center">
            <p className="text-xl md:text-2xl font-bold text-white">$2,847</p>
            <p className="text-gray-400 text-xs md:text-sm">Total Profit</p>
          </div>
        </div>
      </div>

      {/* Risk Warning */}
      <div className="bg-gray-800 border border-orange-500 p-4 rounded-xl bg-orange-500/10">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-orange-400 font-medium text-sm md:text-base">Risk Warning</p>
            <p className="text-gray-300 text-xs md:text-sm mt-1">Automated trading involves significant risk. Never invest more than you can afford to lose.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutomatedTrading;