import React, { useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Activity, BarChart3, Target, Wallet, User, AlertCircle } from 'lucide-react';
import DerivChart from './DerivChart';
import DigitAnalyzer from './DigitAnalyzer';
import derivAPI from '../services/derivAPI';

const Dashboard: React.FC = () => {
  const [selectedSymbol, setSelectedSymbol] = useState('R_10');
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [realTimeStats, setRealTimeStats] = useState({
    totalProfit: 0,
    activeContracts: 0,
    winRate: 0,
    dailyPnL: 0
  });

  React.useEffect(() => {
    // Subscribe to connection status
    derivAPI.onConnectionChange((data) => {
      setIsConnected(data.connected);
      if (data.connected) {
        const info = derivAPI.getAccountInfo();
        setAccountInfo(info);
        
        if (info) {
          derivAPI.subscribeBalance();
          derivAPI.subscribePortfolio();
          
          // Subscribe to portfolio changes for real-time stats
          derivAPI.onPortfolioChange((portfolioData) => {
            updateRealTimeStats();
          });
          
          // Subscribe to balance changes
          derivAPI.onBalanceChange((balanceData) => {
            if (accountInfo) {
              setAccountInfo({
                ...accountInfo,
                balance: balanceData.balance.balance
              });
            }
          });
        }
      } else {
        setAccountInfo(null);
      }
    });

    // Check initial connection and account info
    if (derivAPI.isConnected()) {
      const info = derivAPI.getAccountInfo();
      setAccountInfo(info);
      setIsConnected(true);
      updateRealTimeStats();
    }
    
    // Update stats every 5 seconds
    const statsInterval = setInterval(updateRealTimeStats, 5000);
    
    return () => {
      clearInterval(statsInterval);
    };
  }, []);
  
  const updateRealTimeStats = () => {
    if (derivAPI.isConnected() && derivAPI.getAccountInfo()) {
      const stats = derivAPI.getTotalProfitLoss();
      setRealTimeStats({
        totalProfit: stats.profit,
        activeContracts: stats.activeContracts,
        winRate: stats.winRate,
        dailyPnL: stats.profit // For now, using total profit as daily P&L
      });
    }
  };

  // Use real data if connected and authorized, otherwise show placeholder
  const stats = isConnected && accountInfo ? [
    { 
      label: 'Total Profit', 
      value: `${accountInfo.currency} ${realTimeStats.totalProfit.toFixed(2)}`, 
      change: realTimeStats.totalProfit >= 0 ? `+${Math.abs(realTimeStats.totalProfit).toFixed(2)}` : `-${Math.abs(realTimeStats.totalProfit).toFixed(2)}`, 
      trend: realTimeStats.totalProfit >= 0 ? 'up' : 'down' 
    },
    { 
      label: 'Active Trades', 
      value: realTimeStats.activeContracts.toString(), 
      change: `${realTimeStats.activeContracts}`, 
      trend: 'up' 
    },
    { 
      label: 'Win Rate', 
      value: `${realTimeStats.winRate.toFixed(1)}%`, 
      change: `${realTimeStats.winRate.toFixed(1)}%`, 
      trend: realTimeStats.winRate >= 50 ? 'up' : 'down' 
    },
    { 
      label: 'Daily P&L', 
      value: `${accountInfo.currency} ${realTimeStats.dailyPnL.toFixed(2)}`, 
      change: realTimeStats.dailyPnL >= 0 ? `+${Math.abs(realTimeStats.dailyPnL).toFixed(2)}` : `-${Math.abs(realTimeStats.dailyPnL).toFixed(2)}`, 
      trend: realTimeStats.dailyPnL >= 0 ? 'up' : 'down' 
    },
  ] : [
    { label: 'Total Profit', value: 'Connect API', change: 'No data', trend: 'up' },
    { label: 'Active Trades', value: 'Connect API', change: 'No data', trend: 'up' },
    { label: 'Win Rate', value: 'Connect API', change: 'No data', trend: 'up' },
    { label: 'Daily P&L', value: 'Connect API', change: 'No data', trend: 'up' },
  ];

  const volatilitySymbols = [
    { value: 'R_10', name: 'Volatility 10', description: '10% volatility' },
    { value: 'R_25', name: 'Volatility 25', description: '25% volatility' },
    { value: 'R_50', name: 'Volatility 50', description: '50% volatility' },
    { value: 'R_75', name: 'Volatility 75', description: '75% volatility' },
    { value: 'R_100', name: 'Volatility 100', description: '100% volatility' }
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl md:text-3xl font-bold text-green-400 tracking-tight text-shadow">Trading Dashboard</h2>
        <div className="flex items-center space-x-2 text-sm text-gray-400 bg-gray-800/60 px-4 py-2 rounded-full border border-gray-700/40">
          <Activity className={`w-4 h-4 ${isConnected ? 'text-green-400' : 'text-red-400'}`} />
          <span>{isConnected ? 'Live Market Data' : 'Disconnected'}</span>
        </div>
      </div>

      {/* Account Information */}
      {accountInfo && (
        <div className="data-card">
          <h3 className="text-lg md:text-xl font-semibold text-white mb-4 flex items-center space-x-2 tracking-tight">
            <User className="w-5 h-5 text-green-400" />
            <span>Account Information</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="info-item">
              <div className="flex items-center space-x-2 mb-2">
                <Wallet className="w-4 h-4 text-green-400" />
                <span className="text-gray-400 text-sm">Account Balance</span>
              </div>
              <p className="text-xl md:text-2xl font-bold text-green-400 tracking-tight">
                {accountInfo.currency} {parseFloat(accountInfo.balance || 0).toLocaleString('en-US', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })}
              </p>
            </div>
            <div className="info-item">
              <div className="flex items-center space-x-2 mb-2">
                <User className="w-4 h-4 text-blue-400" />
                <span className="text-gray-400 text-sm">Login ID</span>
              </div>
              <p className="text-lg font-medium text-white">{accountInfo.loginid}</p>
            </div>
            <div className="info-item">
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="w-4 h-4 text-yellow-400" />
                <span className="text-gray-400 text-sm">Currency</span>
              </div>
              <p className="text-lg font-medium text-white">{accountInfo.currency}</p>
            </div>
            <div className="info-item">
              <div className="flex items-center space-x-2 mb-2">
                <Activity className="w-4 h-4 text-green-400" />
                <span className="text-gray-400 text-sm">Status</span>
              </div>
              <p className="text-lg font-medium text-green-400 flex items-center">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                Active
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Connection Notice */}
      {!isConnected && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 shadow-lg backdrop-blur">
          <div className="flex items-center space-x-2 text-yellow-400">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Market Data Only - Connect API for Trading Stats</span>
          </div>
          <p className="text-yellow-300 text-sm mt-1">
            Chart and market data is live. Go to Settings to add your API token for real trading statistics and account data.
          </p>
        </div>
      )}
      
      {isConnected && !accountInfo && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 shadow-lg backdrop-blur">
          <div className="flex items-center space-x-2 text-blue-400">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Connected - Add API Token for Trading Data</span>
          </div>
          <p className="text-blue-300 text-sm mt-1">
            Market data is live. Add your API token in Settings to see real trading statistics and account information.
          </p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs md:text-sm font-medium">{stat.label}</p>
                <p className="text-xl md:text-2xl font-bold text-white mt-1 tracking-tight">{stat.value}</p>
              </div>
              <div className={`flex items-center space-x-1 ${stat.trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                {stat.trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span className="text-sm font-medium">{stat.change}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Symbol Selection */}
      <div className="data-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center space-x-2 tracking-tight">
            <BarChart3 className="w-5 h-5 text-green-400" />
            <span>Volatility Indices</span>
          </h3>
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="px-4 py-2 bg-gray-700/80 border border-gray-600/70 rounded-lg text-white focus:border-green-500 focus:outline-none shadow-sm"
          >
            {volatilitySymbols.map(symbol => (
              <option key={symbol.value} value={symbol.value}>
                {symbol.name} - {symbol.description}
              </option>
            ))}
          </select>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {volatilitySymbols.map(symbol => (
            <button
              key={symbol.value}
              onClick={() => setSelectedSymbol(symbol.value)}
              className={`p-3 rounded-lg text-center transition-all ${
                selectedSymbol === symbol.value
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md'
                  : 'bg-gray-700/80 text-gray-300 hover:bg-gray-600 border border-gray-600/30'
              }`}
            >
              <div className="font-medium text-sm tracking-tight">{symbol.name}</div>
              <div className="text-xs opacity-75 mt-1">{symbol.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Real Deriv Chart */}
      <DerivChart symbol={selectedSymbol} height={400} />

      {/* Digit Analyzer */}
      <DigitAnalyzer />

      {/* Recent Activity */}
      <div className="data-card">
        <h3 className="text-lg md:text-xl font-semibold text-white mb-4 flex items-center space-x-2 tracking-tight">
          <Target className="w-5 h-5 text-green-400" />
          <span>Recent Activity</span>
        </h3>
        <div className="space-y-3">
          {[
            { action: 'Digits Over/Under', symbol: 'R_10', amount: '$25', result: 'Win', profit: '+$18.75', time: '2 minutes ago', status: 'success' },
            { action: 'Rise/Fall', symbol: 'R_25', amount: '$50', result: 'Loss', profit: '-$50.00', time: '5 minutes ago', status: 'failed' },
            { action: 'Matches/Differs', symbol: 'R_50', amount: '$100', result: 'Win', profit: '+$85.00', time: '8 minutes ago', status: 'success' },
            { action: 'Even/Odd', symbol: 'R_75', amount: '$30', result: 'Pending', profit: 'TBD', time: '12 minutes ago', status: 'pending' },
          ].map((activity, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700/80 transition-all duration-200 border border-gray-600/20 hover:border-gray-600/40 shadow-sm hover:shadow">
              <div className="flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${
                  activity.status === 'success' ? 'bg-green-400 animate-pulse' :
                  activity.status === 'pending' ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'
                }`}></div>
                <div>
                  <p className="text-white font-medium text-sm md:text-base tracking-tight">
                    {activity.action} - {activity.symbol}
                  </p>
                  <p className="text-gray-400 text-xs md:text-sm">{activity.time}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-medium text-sm md:text-base tracking-tight">{activity.amount}</p>
                <p className={`text-xs md:text-sm font-medium ${
                  activity.status === 'success' ? 'text-green-400' :
                  activity.status === 'pending' ? 'text-yellow-400' : 'text-red-400'
                }`}>{activity.profit}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;