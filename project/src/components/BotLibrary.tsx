import React, { useState } from 'react';
import { Bot, Search, Filter, Star, TrendingUp, Shield, Zap, Target, Clock, Award, ChevronRight, Download, Eye } from 'lucide-react';

interface TradingBot {
  id: string;
  name: string;
  description: string;
  category: string;
  winRate: string;
  minStake: string;
  maxStake: string;
  timeframe: string;
  complexity: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  rating: number;
  downloads: string;
  status: 'active' | 'beta' | 'coming-soon';
  tags: string[];
  author: string;
  lastUpdated: string;
  isFunctional: boolean;
}

const BotLibrary: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBot, setSelectedBot] = useState<TradingBot | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const categories = [
    { id: 'all', name: 'All Bots', icon: Bot, count: 127 },
    { id: 'scalping', name: 'Scalping', icon: Zap, count: 23 },
    { id: 'trend', name: 'Trend Following', icon: TrendingUp, count: 18 },
    { id: 'martingale', name: 'Martingale', icon: Target, count: 15 },
    { id: 'grid', name: 'Grid Trading', icon: Shield, count: 12 },
    { id: 'arbitrage', name: 'Arbitrage', icon: Award, count: 8 },
    { id: 'momentum', name: 'Momentum', icon: Clock, count: 14 },
    { id: 'reversal', name: 'Mean Reversion', icon: TrendingUp, count: 11 },
    { id: 'breakout', name: 'Breakout', icon: Zap, count: 9 },
    { id: 'news', name: 'News Trading', icon: Eye, count: 7 },
    { id: 'ai', name: 'AI/ML Bots', icon: Bot, count: 10 }
  ];

  // Functional bot (fully developed)
  const functionalBot: TradingBot = {
    id: 'advanced-scalper-pro',
    name: 'Advanced Scalper Pro',
    description: 'High-frequency scalping bot with advanced risk management and dynamic position sizing. Uses multiple timeframes and technical indicators.',
    category: 'scalping',
    winRate: '78.5%',
    minStake: '$5',
    maxStake: '$500',
    timeframe: '1-5 minutes',
    complexity: 'Advanced',
    rating: 4.8,
    downloads: '12.5K',
    status: 'active',
    tags: ['High Frequency', 'Risk Management', 'Multi-Timeframe', 'RSI', 'MACD'],
    author: 'PipBox Team',
    lastUpdated: '2024-01-15',
    isFunctional: true
  };

  // Generate dummy bots for different categories
  const generateDummyBots = (): TradingBot[] => {
    const dummyBots: TradingBot[] = [];
    
    // Scalping bots (22 more)
    const scalpingBots = [
      'Lightning Scalper', 'Micro Profit Hunter', 'Quick Strike Bot', 'Rapid Fire Trader',
      'Speed Demon', 'Flash Trader Pro', 'Instant Profit', 'Turbo Scalper',
      'Velocity Bot', 'Swift Strike', 'Nano Trader', 'Bullet Speed',
      'Hyper Scalper', 'Quantum Quick', 'Laser Focus', 'Precision Strike',
      'Ultra Fast', 'Sonic Trader', 'Blitz Bot', 'Thunder Strike',
      'Meteor Scalper', 'Comet Trader'
    ];

    // Trend Following bots (18)
    const trendBots = [
      'Trend Master Pro', 'Wave Rider', 'Momentum Surfer', 'Trend Catcher',
      'Flow Follower', 'Current Rider', 'Trend Hunter', 'Direction Finder',
      'Trend Seeker', 'Wave Master', 'Momentum King', 'Trend Tracker',
      'Flow Master', 'Current Catcher', 'Trend Wizard', 'Wave Hunter',
      'Momentum Beast', 'Trend Dominator'
    ];

    // Martingale bots (15)
    const martingaleBots = [
      'Smart Martingale', 'Safe Martingale Pro', 'Adaptive Martingale', 'Controlled Risk Martin',
      'Progressive Trader', 'Martingale Master', 'Risk Managed Martin', 'Smart Recovery',
      'Balanced Martingale', 'Cautious Martin', 'Steady Recovery', 'Safe Progression',
      'Measured Martin', 'Calculated Risk', 'Prudent Martingale'
    ];

    // Grid Trading bots (12)
    const gridBots = [
      'Grid Master Pro', 'Smart Grid', 'Adaptive Grid', 'Dynamic Grid',
      'Flexible Grid', 'Intelligent Grid', 'Auto Grid', 'Perfect Grid',
      'Grid Genius', 'Grid Wizard', 'Grid Hunter', 'Grid King'
    ];

    // Add more categories...
    const allBotNames = [
      ...scalpingBots, ...trendBots, ...martingaleBots, ...gridBots,
      // Arbitrage bots
      'Arbitrage Master', 'Price Difference Hunter', 'Market Gap Finder', 'Spread Catcher',
      'Opportunity Seeker', 'Price Discrepancy', 'Market Inefficiency', 'Profit Gap',
      // Momentum bots
      'Momentum Master', 'Force Trader', 'Power Move', 'Strength Indicator',
      'Momentum Surge', 'Force Multiplier', 'Power Trader', 'Strength Bot',
      'Momentum Wave', 'Force Hunter', 'Power Surge', 'Strength Seeker',
      'Momentum King', 'Force Master',
      // Mean Reversion bots
      'Reversion Master', 'Mean Hunter', 'Balance Seeker', 'Center Finder',
      'Equilibrium Bot', 'Balance Master', 'Mean Catcher', 'Reversion Pro',
      'Balance Hunter', 'Center Master', 'Equilibrium Seeker',
      // Breakout bots
      'Breakout Master', 'Level Breaker', 'Resistance Crusher', 'Support Smasher',
      'Barrier Breaker', 'Level Hunter', 'Breakout King', 'Range Breaker',
      'Boundary Crusher',
      // News Trading bots
      'News Master', 'Event Trader', 'Announcement Hunter', 'News Catcher',
      'Event Master', 'News Seeker', 'Announcement Bot',
      // AI/ML bots
      'AI Master Pro', 'Neural Network Bot', 'Machine Learning Trader', 'Deep Learning Bot',
      'AI Predictor', 'Neural Trader', 'ML Master', 'AI Hunter',
      'Smart AI Bot', 'Intelligent Trader'
    ];

    allBotNames.forEach((name, index) => {
      const categories = ['scalping', 'trend', 'martingale', 'grid', 'arbitrage', 'momentum', 'reversal', 'breakout', 'news', 'ai'];
      const complexities: ('Beginner' | 'Intermediate' | 'Advanced' | 'Expert')[] = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
      const statuses: ('active' | 'beta' | 'coming-soon')[] = ['beta', 'coming-soon'];
      
      let category = 'scalping';
      if (index < 22) category = 'scalping';
      else if (index < 40) category = 'trend';
      else if (index < 55) category = 'martingale';
      else if (index < 67) category = 'grid';
      else if (index < 75) category = 'arbitrage';
      else if (index < 89) category = 'momentum';
      else if (index < 100) category = 'reversal';
      else if (index < 109) category = 'breakout';
      else if (index < 116) category = 'news';
      else category = 'ai';

      dummyBots.push({
        id: `bot-${index + 2}`,
        name,
        description: `Professional ${category} trading bot with advanced algorithms and risk management features. Currently in development.`,
        category,
        winRate: `${Math.floor(Math.random() * 30 + 60)}%`,
        minStake: `$${Math.floor(Math.random() * 10 + 1)}`,
        maxStake: `$${Math.floor(Math.random() * 500 + 100)}`,
        timeframe: ['1-5 minutes', '5-15 minutes', '15-60 minutes', '1-4 hours'][Math.floor(Math.random() * 4)],
        complexity: complexities[Math.floor(Math.random() * complexities.length)],
        rating: Math.floor(Math.random() * 20 + 30) / 10,
        downloads: `${Math.floor(Math.random() * 10 + 1)}.${Math.floor(Math.random() * 9)}K`,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        tags: ['Coming Soon', 'In Development'],
        author: 'Open pips Team',
        lastUpdated: '2024-01-10',
        isFunctional: false
      });
    });

    return dummyBots;
  };

  const allBots = [functionalBot, ...generateDummyBots()];

  const filteredBots = allBots.filter(bot => {
    const matchesCategory = selectedCategory === 'all' || bot.category === selectedCategory;
    const matchesSearch = bot.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bot.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bot.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleBotSelect = (bot: TradingBot) => {
    if (bot.isFunctional) {
      // Load bot into automated trading
      localStorage.setItem('selectedBot', JSON.stringify(bot));
      alert(`${bot.name} has been loaded into your Automated Trading section!`);
    } else {
      setSelectedBot(bot);
      setShowDetails(true);
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'Beginner': return 'text-green-400';
      case 'Intermediate': return 'text-yellow-400';
      case 'Advanced': return 'text-orange-400';
      case 'Expert': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded-full">Active</span>;
      case 'beta':
        return <span className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded-full">Beta</span>;
      case 'coming-soon':
        return <span className="px-2 py-1 text-xs bg-gray-500/20 text-gray-400 rounded-full">Coming Soon</span>;
      default:
        return null;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl md:text-3xl font-bold text-green-400">Bot Library</h2>
        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <Bot className="w-4 h-4 text-green-400" />
          <span>{allBots.length} Trading Bots Available</span>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search bots by name, description, or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-green-500 focus:outline-none"
          />
        </div>
        <button className="flex items-center space-x-2 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 hover:border-green-500 transition-colors">
          <Filter className="w-4 h-4" />
          <span>Advanced Filters</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Categories Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Categories</h3>
            <div className="space-y-2">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                      selectedCategory === category.id
                        ? 'bg-green-500 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{category.name}</span>
                    </div>
                    <span className="text-xs bg-gray-600 px-2 py-1 rounded-full">
                      {category.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bots Grid */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredBots.map((bot) => (
              <div
                key={bot.id}
                className={`bg-gray-800 border border-gray-700 rounded-xl p-4 hover:border-green-500 transition-all cursor-pointer ${
                  bot.isFunctional ? 'ring-2 ring-green-500/20' : ''
                }`}
                onClick={() => handleBotSelect(bot)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Bot className={`w-5 h-5 ${bot.isFunctional ? 'text-green-400' : 'text-gray-400'}`} />
                    {bot.isFunctional && <Star className="w-4 h-4 text-yellow-400 fill-current" />}
                  </div>
                  {getStatusBadge(bot.status)}
                </div>

                <h4 className="text-white font-semibold mb-2">{bot.name}</h4>
                <p className="text-gray-400 text-sm mb-3 line-clamp-2">{bot.description}</p>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Win Rate:</span>
                    <span className="text-green-400 font-medium">{bot.winRate}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Complexity:</span>
                    <span className={`font-medium ${getComplexityColor(bot.complexity)}`}>
                      {bot.complexity}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Downloads:</span>
                    <span className="text-white">{bot.downloads}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${
                          i < Math.floor(bot.rating) ? 'text-yellow-400 fill-current' : 'text-gray-600'
                        }`}
                      />
                    ))}
                    <span className="text-xs text-gray-400 ml-1">{bot.rating}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>

                {bot.isFunctional && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <div className="flex items-center space-x-2 text-green-400">
                      <Download className="w-4 h-4" />
                      <span className="text-sm font-medium">Ready to Use</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredBots.length === 0 && (
            <div className="text-center py-12">
              <Bot className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">No bots found</h3>
              <p className="text-gray-500">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </div>
      </div>

      {/* Bot Details Modal */}
      {showDetails && selectedBot && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-white">{selectedBot.name}</h3>
                <p className="text-gray-400">{selectedBot.category}</p>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-gray-300">{selectedBot.description}</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-white font-medium mb-2">Performance</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Win Rate:</span>
                      <span className="text-green-400">{selectedBot.winRate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Rating:</span>
                      <span className="text-yellow-400">{selectedBot.rating}/5</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-white font-medium mb-2">Requirements</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Min Stake:</span>
                      <span className="text-white">{selectedBot.minStake}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Max Stake:</span>
                      <span className="text-white">{selectedBot.maxStake}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-yellow-400 mb-2">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">Coming Soon</span>
                </div>
                <p className="text-yellow-300 text-sm">
                  This bot is currently in development. It will be available in a future update.
                  Join our newsletter to get notified when it's ready!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BotLibrary;