import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, RefreshCw, Target, Calculator, Zap, ArrowUp, ArrowDown } from 'lucide-react';
import derivAPI from '../services/derivAPI';

interface DigitStats {
  digit: number;
  count: number;
  percentage: number;
  lastSeen: number;
}

interface TradeRecommendation {
  type: 'over' | 'under' | 'even' | 'odd';
  probability: number;
  confidence: 'low' | 'medium' | 'high';
  reasoning: string;
}

const DigitAnalyzer: React.FC = () => {
  const [digitStats, setDigitStats] = useState<DigitStats[]>([]);
  const [totalTicks, setTotalTicks] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [currentTick, setCurrentTick] = useState<number | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState('R_10');
  const [lastDigits, setLastDigits] = useState<number[]>([]);
  const [tradeRecommendations, setTradeRecommendations] = useState<TradeRecommendation[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('Connecting...');
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Initialize digit stats
  useEffect(() => {
    console.log('🎯 DigitAnalyzer: Initializing for symbol:', selectedSymbol);
    const initialStats: DigitStats[] = Array.from({ length: 10 }, (_, i) => ({
      digit: i,
      count: 0,
      percentage: 0,
      lastSeen: 0
    }));

    setDigitStats(initialStats);
    setTotalTicks(0);
    setLastDigits([]);
    setCurrentTick(null);
    setCurrentPrice(null);
    setIsSubscribed(false);
    setConnectionStatus('Connecting...');
  }, [selectedSymbol]);

  // Connect to Deriv API and subscribe to real tick data
  useEffect(() => {
    console.log('🎯 DigitAnalyzer: Setting up subscriptions for', selectedSymbol);
    
    // Subscribe to connection status
    const connectionCallback = (data: { connected: boolean }) => {
      console.log('🔌 DigitAnalyzer: Connection status changed:', data.connected);
      setIsConnected(data.connected);
      
      if (data.connected) {
        setConnectionStatus('Connected - Starting subscription...');
        // Subscribe to ticks when connected
        subscribeToTicks();
      } else {
        setConnectionStatus('Disconnected');
        setIsSubscribed(false);
        setIsAnalyzing(false);
      }
    };
    
    derivAPI.onConnectionChange(connectionCallback);
    
    // Check if already connected
    if (derivAPI.isConnected()) {
      setIsConnected(true);
      subscribeToTicks();
    }
    
    return () => {
      console.log('🚫 DigitAnalyzer: Cleaning up subscriptions for', selectedSymbol);
      if (isSubscribed) {
        derivAPI.unsubscribe(selectedSymbol, 'tick');
        setIsSubscribed(false);
      }
    };
  }, [selectedSymbol]);

  const subscribeToTicks = async () => {
    if (!derivAPI.isConnected()) {
      console.log('🎯 DigitAnalyzer: Not connected, retrying...');
      // Retry connection
      setTimeout(() => {
        if (!derivAPI.isConnected()) {
          derivAPI.manualConnect();
        }
      }, 2000);
      return;
    }
    
    if (isSubscribed) {
      console.log('🎯 DigitAnalyzer: Already subscribed to', selectedSymbol);
      return;
    }
    
    try {
      console.log('🎯 DigitAnalyzer: Subscribing to ticks for', selectedSymbol);
      setConnectionStatus('Subscribing to tick data...');
      
      derivAPI.subscribeTicks(selectedSymbol, (data) => {
        console.log('📊 DigitAnalyzer: Received tick data:', data);
        
        if (data.tick && typeof data.tick.quote === 'number') {
          const price = data.tick.quote;
          setCurrentPrice(price);
          
          // Extract last digit from price more reliably
          const lastDigit = extractLastDigit(price);
          
          if (lastDigit !== null) {
            console.log('💰 DigitAnalyzer: Price:', price, 'Last digit:', lastDigit);
            setCurrentTick(lastDigit);
            setConnectionStatus(`Live data from ${selectedSymbol}`);
            setIsAnalyzing(true);
            
            // Update last digits array (keep last 100)
            setLastDigits(prev => {
              const newDigits = [...prev, lastDigit];
              return newDigits.slice(-100);
            });

            // Update digit statistics
            updateDigitStats(lastDigit);
          } else {
            console.warn('⚠️ DigitAnalyzer: Could not extract valid digit from price:', price);
          }
        } else {
          console.warn('⚠️ DigitAnalyzer: Invalid tick data format:', data);
        }
      }).then(() => {
        setIsSubscribed(true);
        setConnectionStatus(`Subscribed to ${selectedSymbol}`);
        console.log('✅ DigitAnalyzer: Successfully subscribed to', selectedSymbol);
      }).catch((error) => {
        console.error('❌ DigitAnalyzer: Failed to subscribe to ticks:', error);
        setConnectionStatus('Subscription failed - retrying...');
        setIsSubscribed(false);
        
        // Retry after delay
        setTimeout(() => {
          if (derivAPI.isConnected()) {
            subscribeToTicks();
          }
        }, 5000);
      });
      
    } catch (error) {
      console.error('❌ DigitAnalyzer: Failed to subscribe to ticks:', error);
      setConnectionStatus('Subscription failed - will retry');
      setIsSubscribed(false);
      
      // Retry after delay
      setTimeout(() => {
        if (derivAPI.isConnected()) {
          subscribeToTicks();
        }
      }, 5000);
    }
  };
  
  // Extract last digit from price with better reliability
  const extractLastDigit = (price: number): number | null => {
    try {
      // Convert to string and remove decimal point
      const priceStr = price.toString();
      const cleanStr = priceStr.replace('.', '');
      
      // Get the last character
      const lastChar = cleanStr.slice(-1);
      const digit = parseInt(lastChar);
      
      // Validate digit
      if (isNaN(digit) || digit < 0 || digit > 9) {
        return null;
      }
      
      return digit;
    } catch (error) {
      console.error('❌ DigitAnalyzer: Error extracting digit:', error);
      return null;
    }
  };
  
  // Update digit statistics
  const updateDigitStats = (lastDigit: number) => {
    setDigitStats(prevStats => {
      const newStats = [...prevStats];
      newStats[lastDigit].count += 1;
      newStats[lastDigit].lastSeen = 0;

      // Increment lastSeen for other digits
      newStats.forEach((stat, index) => {
        if (index !== lastDigit) {
          stat.lastSeen += 1;
        }
      });

      const newTotal = newStats.reduce((sum, stat) => sum + stat.count, 0);
      newStats.forEach(stat => {
        stat.percentage = newTotal > 0 ? (stat.count / newTotal) * 100 : 0;
      });

      setTotalTicks(newTotal);
      return newStats;
    });
  };
  
  // Manual refresh function
  const handleRefresh = () => {
    console.log('🔄 DigitAnalyzer: Manual refresh requested');
    setIsSubscribed(false);
    derivAPI.unsubscribe(selectedSymbol, 'tick');
    
    // Reset stats
    const initialStats: DigitStats[] = Array.from({ length: 10 }, (_, i) => ({
      digit: i,
      count: 0,
      percentage: 0,
      lastSeen: 0
    }));
    setDigitStats(initialStats);
    setTotalTicks(0);
    setLastDigits([]);
    setCurrentTick(null);
    
    // Resubscribe
    setTimeout(() => {
      if (derivAPI.isConnected()) {
        subscribeToTicks();
      }
    }, 1000);
  };

  // Generate simulated data if not connected
  const generateSimulatedData = () => {
    if (isConnected || totalTicks > 0) return;
    
    console.log('🎲 DigitAnalyzer: Generating simulated data for demo');
    const simulatedDigits: number[] = [];
    
    // Generate 50 random digits with some bias for demonstration
    for (let i = 0; i < 50; i++) {
      const digit = Math.floor(Math.random() * 10);
      simulatedDigits.push(digit);
    }
    
    setLastDigits(simulatedDigits);
    
    // Update stats
    const newStats: DigitStats[] = Array.from({ length: 10 }, (_, i) => ({
      digit: i,
      count: 0,
      percentage: 0,
      lastSeen: 0
    }));
    
    simulatedDigits.forEach(digit => {
      newStats[digit].count += 1;
    });
    
    const total = simulatedDigits.length;
    newStats.forEach(stat => {
      stat.percentage = (stat.count / total) * 100;
    });
    
    setDigitStats(newStats);
    setTotalTicks(total);
    setCurrentTick(simulatedDigits[simulatedDigits.length - 1]);
    setConnectionStatus('Demo data (not connected)');
  };
  
  // Generate demo data if not connected after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isConnected && totalTicks === 0 && !isSubscribed) {
        console.log('🎲 DigitAnalyzer: No connection after 3 seconds, showing demo data');
        generateSimulatedData();
      }
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [isConnected, totalTicks, isSubscribed]);

  // Calculate trade recommendations based on digit patterns
  useEffect(() => {
    if (lastDigits.length >= 20) {
      const recommendations = calculateTradeRecommendations();
      setTradeRecommendations(recommendations);
    }
  }, [lastDigits, digitStats]);

  const calculateTradeRecommendations = (): TradeRecommendation[] => {
    const recommendations: TradeRecommendation[] = [];
    
    if (lastDigits.length < 20) return recommendations;

    // Calculate Over/Under probabilities
    const recentDigits = lastDigits.slice(-20);
    const overCount = recentDigits.filter(d => d >= 5).length;
    const underCount = recentDigits.filter(d => d < 5).length;
    
    const overPercentage = (overCount / recentDigits.length) * 100;
    const underPercentage = (underCount / recentDigits.length) * 100;

    // Calculate Even/Odd probabilities
    const evenCount = recentDigits.filter(d => d % 2 === 0).length;
    const oddCount = recentDigits.filter(d => d % 2 === 1).length;
    
    const evenPercentage = (evenCount / recentDigits.length) * 100;
    const oddPercentage = (oddCount / recentDigits.length) * 100;

    // Analyze patterns and streaks
    const lastFiveDigits = lastDigits.slice(-5);
    const consecutiveOvers = getConsecutiveCount(lastFiveDigits, d => d >= 5);
    const consecutiveUnders = getConsecutiveCount(lastFiveDigits, d => d < 5);
    const consecutiveEvens = getConsecutiveCount(lastFiveDigits, d => d % 2 === 0);
    const consecutiveOdds = getConsecutiveCount(lastFiveDigits, d => d % 2 === 1);

    // Over/Under recommendation
    if (Math.abs(overPercentage - 50) > 15) {
      const recommendOver = underPercentage > 65 || consecutiveUnders >= 4;
      const recommendUnder = overPercentage > 65 || consecutiveOvers >= 4;
      
      if (recommendOver) {
        recommendations.push({
          type: 'over',
          probability: Math.min(75, 50 + (underPercentage - 50) * 0.8),
          confidence: underPercentage > 70 ? 'high' : underPercentage > 60 ? 'medium' : 'low',
          reasoning: `Recent trend shows ${underPercentage.toFixed(1)}% under digits. Mean reversion expected.`
        });
      } else if (recommendUnder) {
        recommendations.push({
          type: 'under',
          probability: Math.min(75, 50 + (overPercentage - 50) * 0.8),
          confidence: overPercentage > 70 ? 'high' : overPercentage > 60 ? 'medium' : 'low',
          reasoning: `Recent trend shows ${overPercentage.toFixed(1)}% over digits. Mean reversion expected.`
        });
      }
    }

    // Even/Odd recommendation
    if (Math.abs(evenPercentage - 50) > 15) {
      const recommendEven = oddPercentage > 65 || consecutiveOdds >= 4;
      const recommendOdd = evenPercentage > 65 || consecutiveEvens >= 4;
      
      if (recommendEven) {
        recommendations.push({
          type: 'even',
          probability: Math.min(75, 50 + (oddPercentage - 50) * 0.8),
          confidence: oddPercentage > 70 ? 'high' : oddPercentage > 60 ? 'medium' : 'low',
          reasoning: `Recent trend shows ${oddPercentage.toFixed(1)}% odd digits. Balance correction likely.`
        });
      } else if (recommendOdd) {
        recommendations.push({
          type: 'odd',
          probability: Math.min(75, 50 + (evenPercentage - 50) * 0.8),
          confidence: evenPercentage > 70 ? 'high' : evenPercentage > 60 ? 'medium' : 'low',
          reasoning: `Recent trend shows ${evenPercentage.toFixed(1)}% even digits. Balance correction likely.`
        });
      }
    }

    return recommendations;
  };

  const getConsecutiveCount = (digits: number[], condition: (d: number) => boolean): number => {
    let count = 0;
    for (let i = digits.length - 1; i >= 0; i--) {
      if (condition(digits[i])) {
        count++;
      } else {
        break;
      }
    }
    return count;
  };

  const getDigitColor = (digit: number) => {
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500',
      'bg-pink-500', 'bg-indigo-500', 'bg-orange-500', 'bg-teal-500', 'bg-cyan-500'
    ];
    return colors[digit];
  };

  const getBarWidth = (percentage: number) => {
    return Math.max(percentage, 2);
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'text-green-400 bg-green-500/20 border-green-500';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500';
      case 'low': return 'text-orange-400 bg-orange-500/20 border-orange-500';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500';
    }
  };

  const symbols = [
    { value: 'R_10', name: 'Volatility 10' },
    { value: 'R_25', name: 'Volatility 25' },
    { value: 'R_50', name: 'Volatility 50' },
    { value: 'R_75', name: 'Volatility 75' },
    { value: 'R_100', name: 'Volatility 100' }
  ];

  // Calculate current statistics
  const overCount = lastDigits.filter(d => d >= 5).length;
  const underCount = lastDigits.filter(d => d < 5).length;
  const evenCount = lastDigits.filter(d => d % 2 === 0).length;
  const oddCount = lastDigits.filter(d => d % 2 === 1).length;

  const overPercentage = lastDigits.length > 0 ? (overCount / lastDigits.length) * 100 : 0;
  const underPercentage = lastDigits.length > 0 ? (underCount / lastDigits.length) * 100 : 0;
  const evenPercentage = lastDigits.length > 0 ? (evenCount / lastDigits.length) * 100 : 0;
  const oddPercentage = lastDigits.length > 0 ? (oddCount / lastDigits.length) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Main Digit Analyzer */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div>
            <h3 className="text-lg md:text-xl font-semibold text-white flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-green-400" />
              <span>Digit Analyzer</span>
            </h3>
            <p className="text-sm text-gray-400 mt-1">Real-time last digit distribution from Deriv.com</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:border-green-500 focus:outline-none"
            >
              {symbols.map(symbol => (
                <option key={symbol.value} value={symbol.value}>
                  {symbol.name}
                </option>
              ))}
            </select>
            
            <button
              onClick={handleRefresh}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg text-white text-sm transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
            
            <div className="flex items-center space-x-2 min-w-0">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                isConnected && isAnalyzing ? 'bg-green-400 animate-pulse' : 
                isConnected ? 'bg-yellow-400' : 'bg-red-400'
              }`}></div>
              <span className="text-sm text-gray-400">
                {connectionStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Current Price and Tick Display */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentPrice !== null && (
            <div className="p-4 bg-gray-700 rounded-lg border-l-4 border-blue-400">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Target className="w-5 h-5 text-blue-400" />
                  <span className="text-gray-400">Current Price:</span>
                </div>
                <span className="text-xl font-bold text-white">{currentPrice.toFixed(5)}</span>
              </div>
            </div>
          )}
          
          {currentTick !== null && (
            <div className="p-4 bg-gray-700 rounded-lg border-l-4 border-green-400">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Target className="w-5 h-5 text-green-400" />
                  <span className="text-gray-400">Latest Digit:</span>
                  <span className="text-3xl font-bold text-white">{currentTick}</span>
                </div>
                <div className="flex flex-col space-y-1">
                  <div className={`px-2 py-1 rounded text-xs font-medium text-center ${
                    currentTick >= 5 ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {currentTick >= 5 ? 'OVER' : 'UNDER'}
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium text-center ${
                    currentTick % 2 === 0 ? 'bg-green-500/20 text-green-400' : 'bg-purple-500/20 text-purple-400'
                  }`}>
                    {currentTick % 2 === 0 ? 'EVEN' : 'ODD'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Connection Status Messages */}
        {!isConnected && (
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 text-yellow-400 animate-spin" />
              <span className="text-yellow-400">Connecting to Deriv API for live tick data...</span>
            </div>
            <p className="text-yellow-300 text-sm mt-2">
              {totalTicks > 0 ? 'Demo data shown below for illustration.' : 'Attempting to connect...'}
            </p>
          </div>
        )}

        {isConnected && !isAnalyzing && (
          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
              <span className="text-blue-400">Waiting for tick data from {selectedSymbol}...</span>
            </div>
          </div>
        )}

        {/* Recent Digits */}
        {lastDigits.length > 0 && (
          <div className="mb-6 p-4 bg-gray-700/50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-400 mb-3">Last {Math.min(20, lastDigits.length)} Digits</h4>
            <div className="flex flex-wrap gap-2">
              {lastDigits.slice(-20).map((digit, index) => (
                <div
                  key={index}
                  className={`w-8 h-8 ${getDigitColor(digit)} rounded-lg flex items-center justify-center text-white font-bold text-sm transition-all duration-300 ${
                    index === lastDigits.slice(-20).length - 1 ? 'ring-2 ring-green-400 scale-110' : ''
                  }`}
                >
                  {digit}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Digit Distribution */}
        {totalTicks > 0 && (
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
              <span>Digit</span>
              <div className="flex space-x-8">
                <span>Count</span>
                <span>Percentage</span>
                <span>Last Seen</span>
              </div>
            </div>

            {digitStats.map((stat) => (
              <div key={stat.digit} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 ${getDigitColor(stat.digit)} rounded-lg flex items-center justify-center text-white font-bold text-sm`}>
                      {stat.digit}
                    </div>
                    <span className="text-white font-medium">Digit {stat.digit}</span>
                  </div>
                  
                  <div className="flex items-center space-x-8 text-sm">
                    <span className="text-white font-medium w-12 text-right">{stat.count}</span>
                    <span className="text-green-400 font-medium w-16 text-right">{stat.percentage.toFixed(1)}%</span>
                    <span className="text-gray-400 w-16 text-right">{stat.lastSeen} ticks</span>
                  </div>
                </div>
                
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${getDigitColor(stat.digit)}`}
                    style={{ width: `${getBarWidth(stat.percentage)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Over/Under and Even/Odd Statistics */}
        {totalTicks > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h4 className="text-white font-semibold mb-3 flex items-center space-x-2">
                <ArrowUp className="w-4 h-4 text-blue-400" />
                <span>Over/Under Analysis</span>
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Over (5-9):</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-blue-400 font-medium">{overCount}</span>
                    <span className="text-blue-400 font-medium">({overPercentage.toFixed(1)}%)</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Under (0-4):</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-red-400 font-medium">{underCount}</span>
                    <span className="text-red-400 font-medium">({underPercentage.toFixed(1)}%)</span>
                  </div>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-3 flex overflow-hidden">
                  <div className="bg-red-500 h-full" style={{ width: `${underPercentage}%` }}></div>
                  <div className="bg-blue-500 h-full" style={{ width: `${overPercentage}%` }}></div>
                </div>
              </div>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-4">
              <h4 className="text-white font-semibold mb-3 flex items-center space-x-2">
                <Calculator className="w-4 h-4 text-green-400" />
                <span>Even/Odd Analysis</span>
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Even (0,2,4,6,8):</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-green-400 font-medium">{evenCount}</span>
                    <span className="text-green-400 font-medium">({evenPercentage.toFixed(1)}%)</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Odd (1,3,5,7,9):</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-purple-400 font-medium">{oddCount}</span>
                    <span className="text-purple-400 font-medium">({oddPercentage.toFixed(1)}%)</span>
                  </div>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-3 flex overflow-hidden">
                  <div className="bg-green-500 h-full" style={{ width: `${evenPercentage}%` }}></div>
                  <div className="bg-purple-500 h-full" style={{ width: `${oddPercentage}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Statistics Summary */}
        {totalTicks > 0 && (
          <div className="pt-4 border-t border-gray-700">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-white">{totalTicks.toLocaleString()}</div>
                <div className="text-xs text-gray-400">Total Ticks</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-400">
                  {digitStats.length > 0 ? Math.max(...digitStats.map(s => s.percentage)).toFixed(1) : '0'}%
                </div>
                <div className="text-xs text-gray-400">Highest %</div>
              </div>
              <div>
                <div className="text-lg font-bold text-red-400">
                  {digitStats.length > 0 ? Math.min(...digitStats.map(s => s.percentage)).toFixed(1) : '0'}%
                </div>
                <div className="text-xs text-gray-400">Lowest %</div>
              </div>
              <div>
                <div className="text-lg font-bold text-yellow-400">10.0%</div>
                <div className="text-xs text-gray-400">Expected %</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Trade Recommendations */}
      {tradeRecommendations.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 md:p-6">
          <h3 className="text-lg md:text-xl font-semibold text-white mb-4 flex items-center space-x-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            <span>AI Trade Recommendations</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tradeRecommendations.map((rec, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-2 ${getConfidenceColor(rec.confidence)}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {rec.type === 'over' && <ArrowUp className="w-4 h-4" />}
                    {rec.type === 'under' && <ArrowDown className="w-4 h-4" />}
                    {rec.type === 'even' && <Calculator className="w-4 h-4" />}
                    {rec.type === 'odd' && <Calculator className="w-4 h-4" />}
                    <span className="font-semibold uppercase">{rec.type}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{rec.probability.toFixed(1)}%</div>
                    <div className="text-xs uppercase">{rec.confidence}</div>
                  </div>
                </div>
                <p className="text-sm opacity-90">{rec.reasoning}</p>
              </div>
            ))}
          </div>
          
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-yellow-400 text-sm">
              <strong>Disclaimer:</strong> These are algorithmic predictions based on historical patterns. 
              Trading involves risk and past performance doesn't guarantee future results.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DigitAnalyzer;