import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, TrendingDown, DollarSign, Clock, AlertCircle, Play, Pause, CheckCircle, XCircle, RefreshCw, Settings, BarChart3 } from 'lucide-react';
import derivAPI from '../services/derivAPI';

interface TradeParams {
  symbol: string;
  tradeType: 'ONETOUCH' | 'NOTOUCH';
  amount: number;
  duration: number;
  durationType: 's' | 'm' | 'h' | 'd';
  barrier: string;
  barrierType: 'high' | 'low';
}

interface ActiveTrade {
  id: string;
  contractId?: number;
  symbol: string;
  tradeType: 'ONETOUCH' | 'NOTOUCH';
  amount: number;
  duration: number;
  durationType: string;
  barrier: string;
  barrierType: 'high' | 'low';
  entrySpot?: number;
  currentSpot?: number;
  profit?: number;
  status: 'pending' | 'active' | 'won' | 'lost';
  startTime: number;
  endTime?: number;
  payout?: number;
}

interface BarrierConfig {
  symbol: string;
  name: string;
  defaultHighOffset: number;
  defaultLowOffset: number;
  minOffset: number;
  maxOffset: number;
  pipSize: number;
}

const TouchNoTouchTrading: React.FC = () => {
  const [tradeParams, setTradeParams] = useState<TradeParams>({
    symbol: 'R_10',
    tradeType: 'ONETOUCH',
    amount: 10,
    duration: 300,
    durationType: 's',
    barrier: '',
    barrierType: 'high'
  });

  const [isConnected, setIsConnected] = useState(false);
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [activeTrades, setActiveTrades] = useState<ActiveTrade[]>([]);
  const [isPlacingTrade, setIsPlacingTrade] = useState(false);
  const [tradeHistory, setTradeHistory] = useState<ActiveTrade[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [processedContracts, setProcessedContracts] = useState<Set<number>>(new Set());
  const [showBarrierSettings, setShowBarrierSettings] = useState(false);
  const [customBarrierOffsets, setCustomBarrierOffsets] = useState<{[key: string]: {high: number, low: number}}>({});

  // Barrier configurations for different volatility indices based on Deriv defaults
  const barrierConfigs: BarrierConfig[] = [
    {
      symbol: 'R_10',
      name: 'Volatility 10 Index',
      defaultHighOffset: 0.1,
      defaultLowOffset: 0.1,
      minOffset: 0.01,
      maxOffset: 1.0,
      pipSize: 0.01
    },
    {
      symbol: 'R_25',
      name: 'Volatility 25 Index',
      defaultHighOffset: 0.2,
      defaultLowOffset: 0.2,
      minOffset: 0.02,
      maxOffset: 2.0,
      pipSize: 0.01
    },
    {
      symbol: 'R_50',
      name: 'Volatility 50 Index',
      defaultHighOffset: 0.5,
      defaultLowOffset: 0.5,
      minOffset: 0.05,
      maxOffset: 5.0,
      pipSize: 0.01
    },
    {
      symbol: 'R_75',
      name: 'Volatility 75 Index',
      defaultHighOffset: 0.8,
      defaultLowOffset: 0.8,
      minOffset: 0.08,
      maxOffset: 8.0,
      pipSize: 0.01
    },
    {
      symbol: 'R_100',
      name: 'Volatility 100 Index',
      defaultHighOffset: 1.0,
      defaultLowOffset: 1.0,
      minOffset: 0.1,
      maxOffset: 10.0,
      pipSize: 0.01
    }
  ];

  const symbols = barrierConfigs.map(config => ({
    value: config.symbol,
    name: config.name,
    description: `${config.symbol.replace('R_', '')}% volatility`
  }));

  useEffect(() => {
    // Subscribe to connection status
    derivAPI.onConnectionChange((data) => {
      setIsConnected(data.connected);
      if (data.connected) {
        const info = derivAPI.getAccountInfo();
        setAccountInfo(info);
        subscribeToPriceUpdates();
      } else {
        setAccountInfo(null);
        setCurrentPrice(null);
      }
    });

    // Check initial connection
    if (derivAPI.isConnected()) {
      setIsConnected(true);
      const info = derivAPI.getAccountInfo();
      setAccountInfo(info);
      subscribeToPriceUpdates();
    }

    return () => {
      derivAPI.unsubscribe(tradeParams.symbol, 'tick');
    };
  }, []);

  useEffect(() => {
    if (isConnected) {
      subscribeToPriceUpdates();
    }
  }, [tradeParams.symbol, isConnected]);

  useEffect(() => {
    // Update barrier when price or symbol changes
    if (currentPrice) {
      updateBarrier();
    }
  }, [currentPrice, tradeParams.symbol, tradeParams.barrierType]);

  const subscribeToPriceUpdates = () => {
    if (!isConnected) return;

    derivAPI.unsubscribe(tradeParams.symbol, 'tick');

    derivAPI.subscribeTicks(tradeParams.symbol, (data) => {
      if (data.tick && typeof data.tick.quote === 'number') {
        setCurrentPrice(data.tick.quote);
        
        setActiveTrades(prev => prev.map(trade => ({
          ...trade,
          currentSpot: data.tick.quote
        })));
      }
    }).catch(error => {
      console.error('Failed to subscribe to price updates:', error);
    });
  };

  const getCurrentBarrierConfig = (): BarrierConfig => {
    return barrierConfigs.find(config => config.symbol === tradeParams.symbol) || barrierConfigs[0];
  };

  const getBarrierOffset = (type: 'high' | 'low'): number => {
    const config = getCurrentBarrierConfig();
    const customOffsets = customBarrierOffsets[tradeParams.symbol];
    
    if (customOffsets) {
      return type === 'high' ? customOffsets.high : customOffsets.low;
    }
    
    return type === 'high' ? config.defaultHighOffset : config.defaultLowOffset;
  };

  const updateBarrier = () => {
    if (!currentPrice) return;
    
    const offset = getBarrierOffset(tradeParams.barrierType);
    const newBarrier = tradeParams.barrierType === 'high' 
      ? (currentPrice + offset).toFixed(5)
      : (currentPrice - offset).toFixed(5);
    
    setTradeParams(prev => ({ ...prev, barrier: newBarrier }));
  };

  const calculatePayout = (): number => {
    // Touch/No Touch payouts vary based on barrier distance and duration
    const baseMultiplier = tradeParams.tradeType === 'ONETOUCH' ? 3.5 : 2.8;
    const durationMultiplier = tradeParams.duration < 300 ? 1.2 : 1.0;
    return tradeParams.amount * baseMultiplier * durationMultiplier;
  };

  const buyContract = (proposalId: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      const buyParams = {
        buy: proposalId,
        price: tradeParams.amount
      };

      console.log('💰 Buying Touch/No Touch contract with params:', buyParams);

      const timeout = setTimeout(() => {
        reject(new Error('Buy request timeout'));
      }, 15000);

      const messageHandler = (data: any) => {
        if (data.buy && data.echo_req && 
            data.echo_req.buy === buyParams.buy &&
            data.echo_req.price === buyParams.price) {
          clearTimeout(timeout);
          derivAPI.removeMessageHandler?.(messageHandler);
          resolve(data);
        }
      };

      derivAPI.addMessageHandler?.(messageHandler);
      
      const success = derivAPI.send(buyParams);
      if (!success) {
        clearTimeout(timeout);
        reject(new Error('Failed to send buy request'));
      }
    });
  };

  const subscribeToContractUpdates = (contractId: number, tradeId: string) => {
    console.log('📈 Subscribing to Touch/No Touch contract updates for:', contractId);
    
    if (processedContracts.has(contractId)) {
      console.log('📈 Already processing contract:', contractId);
      return;
    }
    
    setProcessedContracts(prev => new Set(prev).add(contractId));
    
    derivAPI.subscribeToContract(contractId);
    
    const contractHandler = (data: any) => {
      if (data.proposal_open_contract && data.proposal_open_contract.contract_id === contractId) {
        const contract = data.proposal_open_contract;
        console.log('📊 Touch/No Touch contract update received:', contract);
        
        setActiveTrades(prev => prev.map(trade => {
          if (trade.id === tradeId) {
            const updatedTrade = {
              ...trade,
              currentSpot: contract.current_spot,
              profit: contract.profit,
              status: contract.is_expired ? 
                (contract.profit > 0 ? 'won' : 'lost') : 'active'
            };

            if (contract.is_expired) {
              setTradeHistory(prevHistory => {
                const exists = prevHistory.some(h => h.contractId === contractId);
                if (!exists) {
                  return [...prevHistory, updatedTrade];
                }
                return prevHistory;
              });
              return null;
            }

            return updatedTrade;
          }
          return trade;
        }).filter(Boolean) as ActiveTrade[]);
      }
    };

    derivAPI.addMessageHandler?.(contractHandler);
  };

  const quickTrade = async (direction: 'ONETOUCH' | 'NOTOUCH') => {
    const quickTradeParams = {
      ...tradeParams,
      tradeType: direction
    };
    
    setTradeParams(quickTradeParams);
    await placeTradeWithParams(quickTradeParams);
  };

  const placeTradeWithParams = async (params: TradeParams = tradeParams) => {
    if (!isConnected || !accountInfo) {
      setError('Please connect your API token first');
      return;
    }

    if (!currentPrice) {
      setError('Waiting for price data...');
      return;
    }

    if (params.amount <= 0) {
      setError('Please enter a valid stake amount');
      return;
    }

    if (!params.barrier) {
      setError('Barrier not set. Please wait for price data.');
      return;
    }

    setIsPlacingTrade(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('🎯 Placing Touch/No Touch trade:', params);

      const proposal = await createTradeProposalWithParams(params);
      
      if (proposal.error) {
        throw new Error(proposal.error.message || 'Failed to create trade proposal');
      }

      const buyResult = await buyContract(proposal.proposal.id);
      
      if (buyResult.error) {
        throw new Error(buyResult.error.message || 'Failed to buy contract');
      }

      const newTrade: ActiveTrade = {
        id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        contractId: buyResult.buy.contract_id,
        symbol: params.symbol,
        tradeType: params.tradeType,
        amount: params.amount,
        duration: params.duration,
        durationType: params.durationType,
        barrier: params.barrier,
        barrierType: params.barrierType,
        entrySpot: currentPrice,
        currentSpot: currentPrice,
        status: 'active',
        startTime: Date.now(),
        endTime: Date.now() + getDurationInSeconds(params.duration, params.durationType) * 1000,
        payout: calculatePayout()
      };

      setActiveTrades(prev => [...prev, newTrade]);
      setSuccess(`${params.tradeType === 'ONETOUCH' ? 'Touch' : 'No Touch'} trade placed successfully! Contract ID: ${buyResult.buy.contract_id}`);

      subscribeToContractUpdates(buyResult.buy.contract_id, newTrade.id);

      console.log('✅ Touch/No Touch trade placed successfully:', newTrade);

    } catch (error) {
      console.error('❌ Failed to place Touch/No Touch trade:', error);
      setError(error instanceof Error ? error.message : 'Failed to place trade');
    } finally {
      setIsPlacingTrade(false);
    }
  };

  const placeTrade = async () => {
    await placeTradeWithParams();
  };

  const createTradeProposalWithParams = (params: TradeParams): Promise<any> => {
    return new Promise((resolve, reject) => {
      const proposalParams: any = {
        proposal: 1,
        amount: params.amount,
        basis: 'stake',
        contract_type: params.tradeType,
        currency: accountInfo.currency,
        symbol: params.symbol,
        barrier: params.barrier
      };

      proposalParams.duration = params.duration;
      proposalParams.duration_unit = params.durationType;

      console.log('📋 Creating Touch/No Touch proposal with params:', proposalParams);

      const timeout = setTimeout(() => {
        reject(new Error('Proposal request timeout - please try again'));
      }, 30000);

      const messageHandler = (data: any) => {
        if (data.proposal && data.echo_req && 
            data.echo_req.proposal === proposalParams.proposal &&
            data.echo_req.symbol === proposalParams.symbol &&
            data.echo_req.contract_type === proposalParams.contract_type) {
          clearTimeout(timeout);
          derivAPI.removeMessageHandler?.(messageHandler);
          resolve(data);
        }
        
        // Handle error responses
        if (data.error && data.echo_req && 
            data.echo_req.proposal === proposalParams.proposal &&
            data.echo_req.symbol === proposalParams.symbol) {
          clearTimeout(timeout);
          derivAPI.removeMessageHandler?.(messageHandler);
          reject(new Error(data.error.message || 'Proposal request failed'));
        }
      };

      derivAPI.addMessageHandler?.(messageHandler);
      
      const success = derivAPI.send(proposalParams);
      if (!success) {
        clearTimeout(timeout);
        reject(new Error('Failed to send proposal request'));
      }
    });
  };

  const getDurationInSeconds = (duration: number, type: string): number => {
    switch (type) {
      case 's': return duration;
      case 'm': return duration * 60;
      case 'h': return duration * 3600;
      case 'd': return duration * 86400;
      default: return duration;
    }
  };

  const updateCustomBarrierOffset = (type: 'high' | 'low', value: number) => {
    const config = getCurrentBarrierConfig();
    const clampedValue = Math.max(config.minOffset, Math.min(config.maxOffset, value));
    
    setCustomBarrierOffsets(prev => ({
      ...prev,
      [tradeParams.symbol]: {
        ...prev[tradeParams.symbol],
        [type]: clampedValue
      }
    }));
  };

  const resetToDefaultBarriers = () => {
    setCustomBarrierOffsets(prev => {
      const newOffsets = { ...prev };
      delete newOffsets[tradeParams.symbol];
      return newOffsets;
    });
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getTradeStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-blue-400';
      case 'won': return 'text-green-400';
      case 'lost': return 'text-red-400';
      case 'pending': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const currentConfig = getCurrentBarrierConfig();
  const highBarrier = currentPrice ? (currentPrice + getBarrierOffset('high')).toFixed(5) : '0.00000';
  const lowBarrier = currentPrice ? (currentPrice - getBarrierOffset('low')).toFixed(5) : '0.00000';

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl md:text-3xl font-bold text-green-400">Touch/No Touch Trading</h2>
        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <Target className="w-4 h-4 text-green-400" />
          <span>Barrier-based Binary Options</span>
        </div>
      </div>

      {/* Connection Status */}
      {!isConnected && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <div className="flex items-center space-x-2 text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">API Connection Required</span>
          </div>
          <p className="text-red-300 text-sm mt-1">
            Please go to Settings and add your Deriv API token to enable live trading.
          </p>
        </div>
      )}

      {isConnected && !accountInfo && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
          <div className="flex items-center space-x-2 text-yellow-400">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Authorization Required</span>
          </div>
          <p className="text-yellow-300 text-sm mt-1">
            Connected to Deriv API but not authorized. Please check your API token in Settings.
          </p>
        </div>
      )}

      {/* Account Info */}
      {accountInfo && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-green-400">
                {accountInfo.currency} {parseFloat(accountInfo.balance || 0).toFixed(2)}
              </div>
              <div className="text-sm text-gray-400">Account Balance</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-white">{accountInfo.loginid}</div>
              <div className="text-sm text-gray-400">Login ID</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-400">
                {currentPrice ? currentPrice.toFixed(5) : 'Loading...'}
              </div>
              <div className="text-sm text-gray-400">Current Price ({tradeParams.symbol})</div>
            </div>
          </div>
        </div>
      )}

      {/* Trading Explanation */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
        <h4 className="text-blue-400 font-medium mb-2">How Touch/No Touch Trading Works:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-300">
          <div>
            <p className="font-medium text-green-400 mb-1">Touch:</p>
            <p>Win if the market touches the barrier at any time during the contract period.</p>
          </div>
          <div>
            <p className="font-medium text-red-400 mb-1">No Touch:</p>
            <p>Win if the market never touches the barrier during the entire contract period.</p>
          </div>
        </div>
      </div>

      {/* Current Barriers Display */}
      {currentPrice && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-white font-semibold">Current Barriers</h4>
            <button
              onClick={() => setShowBarrierSettings(!showBarrierSettings)}
              className="flex items-center space-x-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>Customize</span>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="text-red-400 font-medium text-sm">High Barrier</div>
              <div className="text-xl font-bold text-white">{highBarrier}</div>
              <div className="text-xs text-gray-400">+{getBarrierOffset('high').toFixed(3)}</div>
            </div>
            
            <div className="text-center p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="text-blue-400 font-medium text-sm">Current Price</div>
              <div className="text-xl font-bold text-white">{currentPrice.toFixed(5)}</div>
              <div className="text-xs text-gray-400">Entry Spot</div>
            </div>
            
            <div className="text-center p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="text-green-400 font-medium text-sm">Low Barrier</div>
              <div className="text-xl font-bold text-white">{lowBarrier}</div>
              <div className="text-xs text-gray-400">-{getBarrierOffset('low').toFixed(3)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Barrier Settings */}
      {showBarrierSettings && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <h4 className="text-white font-semibold mb-4">Barrier Settings for {currentConfig.name}</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                High Barrier Offset
              </label>
              <input
                type="number"
                value={getBarrierOffset('high')}
                onChange={(e) => updateCustomBarrierOffset('high', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                min={currentConfig.minOffset}
                max={currentConfig.maxOffset}
                step={currentConfig.pipSize}
              />
              <p className="text-xs text-gray-500 mt-1">
                Range: {currentConfig.minOffset} - {currentConfig.maxOffset}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Low Barrier Offset
              </label>
              <input
                type="number"
                value={getBarrierOffset('low')}
                onChange={(e) => updateCustomBarrierOffset('low', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                min={currentConfig.minOffset}
                max={currentConfig.maxOffset}
                step={currentConfig.pipSize}
              />
              <p className="text-xs text-gray-500 mt-1">
                Range: {currentConfig.minOffset} - {currentConfig.maxOffset}
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={resetToDefaultBarriers}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm transition-colors"
            >
              Reset to Defaults
            </button>
            <button
              onClick={() => setShowBarrierSettings(false)}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm transition-colors"
            >
              Apply Settings
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Trading Panel */}
        <div className="lg:col-span-2 bg-gray-800 border border-gray-700 p-4 md:p-6 rounded-xl">
          <h3 className="text-lg md:text-xl font-semibold text-white mb-4 flex items-center space-x-2">
            <Target className="w-5 h-5 text-green-400" />
            <span>Place Touch/No Touch Trade</span>
          </h3>
          
          <div className="space-y-4">
            {/* Symbol Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Asset</label>
              <select 
                value={tradeParams.symbol}
                onChange={(e) => setTradeParams(prev => ({ ...prev, symbol: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
              >
                {symbols.map(symbol => (
                  <option key={symbol.value} value={symbol.value}>
                    {symbol.name} - {symbol.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Barrier Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Barrier Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTradeParams(prev => ({ ...prev, barrierType: 'high' }))}
                  className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-lg font-medium transition-all text-sm ${
                    tradeParams.barrierType === 'high'
                      ? 'bg-red-500/20 text-red-400 border border-red-500'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                  }`}
                >
                  <TrendingUp className="w-3 h-3" />
                  <span>High Barrier</span>
                </button>
                <button
                  onClick={() => setTradeParams(prev => ({ ...prev, barrierType: 'low' }))}
                  className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-lg font-medium transition-all text-sm ${
                    tradeParams.barrierType === 'low'
                      ? 'bg-green-500/20 text-green-400 border border-green-500'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                  }`}
                >
                  <TrendingDown className="w-3 h-3" />
                  <span>Low Barrier</span>
                </button>
              </div>
            </div>

            {/* Quick Trade Buttons */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Quick Trade</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => quickTrade('ONETOUCH')}
                  disabled={!isConnected || !accountInfo || isPlacingTrade || !currentPrice || tradeParams.amount <= 0}
                  className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all ${
                    isPlacingTrade || !isConnected || !accountInfo || !currentPrice || tradeParams.amount <= 0
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  <Target className="w-4 h-4" />
                  <span>{isPlacingTrade && tradeParams.tradeType === 'ONETOUCH' ? 'Placing...' : 'Touch'}</span>
                </button>
                <button
                  onClick={() => quickTrade('NOTOUCH')}
                  disabled={!isConnected || !accountInfo || isPlacingTrade || !currentPrice || tradeParams.amount <= 0}
                  className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all ${
                    isPlacingTrade || !isConnected || !accountInfo || !currentPrice || tradeParams.amount <= 0
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-purple-500 text-white hover:bg-purple-600'
                  }`}
                >
                  <XCircle className="w-4 h-4" />
                  <span>{isPlacingTrade && tradeParams.tradeType === 'NOTOUCH' ? 'Placing...' : 'No Touch'}</span>
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Click Touch or No Touch to instantly place a trade with the selected barrier.
              </p>
            </div>

            {/* Trade Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Selected Type (for form)</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTradeParams(prev => ({ ...prev, tradeType: 'ONETOUCH' }))}
                  className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-lg font-medium transition-all text-sm ${
                    tradeParams.tradeType === 'ONETOUCH'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                  }`}
                >
                  <Target className="w-3 h-3" />
                  <span>Touch</span>
                </button>
                <button
                  onClick={() => setTradeParams(prev => ({ ...prev, tradeType: 'NOTOUCH' }))}
                  className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-lg font-medium transition-all text-sm ${
                    tradeParams.tradeType === 'NOTOUCH'
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                  }`}
                >
                  <XCircle className="w-3 h-3" />
                  <span>No Touch</span>
                </button>
              </div>
            </div>

            {/* Stake Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Stake Amount</label>
              <input
                type="number"
                value={tradeParams.amount}
                onChange={(e) => setTradeParams(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                placeholder="Enter stake amount"
                min="1"
                step="0.01"
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {[5, 10, 25, 50, 100].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setTradeParams(prev => ({ ...prev, amount }))}
                    className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1 text-xs rounded transition-colors"
                  >
                    {accountInfo?.currency || '$'}{amount}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Duration</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={tradeParams.duration}
                  onChange={(e) => setTradeParams(prev => ({ ...prev, duration: parseInt(e.target.value) || 1 }))}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                  min="15"
                />
                <select 
                  value={tradeParams.durationType}
                  onChange={(e) => setTradeParams(prev => ({ ...prev, durationType: e.target.value as 's' | 'm' | 'h' | 'd' }))}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                >
                  <option value="s">Seconds</option>
                  <option value="m">Minutes</option>
                  <option value="h">Hours</option>
                  <option value="d">Days</option>
                </select>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Minimum duration: 15 seconds
              </p>
            </div>

            {/* Potential Payout */}
            <div className="p-3 bg-green-500/10 border border-green-500 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Potential Payout:</span>
                <span className="text-green-400 font-semibold">
                  {accountInfo?.currency || '$'}{calculatePayout().toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-gray-400 text-sm">Potential Profit:</span>
                <span className="text-green-400 font-semibold">
                  +{accountInfo?.currency || '$'}{(calculatePayout() - tradeParams.amount).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-gray-400 text-sm">Target Barrier:</span>
                <span className="text-blue-400 font-semibold">
                  {tradeParams.barrier || 'Calculating...'}
                </span>
              </div>
            </div>

            {/* Messages */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span className="text-red-400 text-sm">{error}</span>
                  </div>
                  <button onClick={clearMessages} className="text-red-400 hover:text-red-300">
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-500/10 border border-green-500 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-green-400 text-sm">{success}</span>
                  </div>
                  <button onClick={clearMessages} className="text-green-400 hover:text-green-300">
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Place Trade Button */}
            <button 
              onClick={placeTrade}
              disabled={!isConnected || !accountInfo || isPlacingTrade || !currentPrice || tradeParams.amount <= 0}
              className="w-full py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              {isPlacingTrade ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Placing Trade...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Place {tradeParams.tradeType === 'ONETOUCH' ? 'Touch' : 'No Touch'} Trade</span>
                </>
              )}
            </button>
            
            <p className="text-xs text-gray-400 text-center">
              Use the Touch/No Touch buttons above for instant trading, or this button to place with current form settings.
            </p>
          </div>
        </div>

        {/* Active Trades & History */}
        <div className="space-y-4">
          {/* Active Trades */}
          <div className="bg-gray-800 border border-gray-700 p-4 rounded-xl">
            <h4 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span>Active Trades ({activeTrades.length})</span>
            </h4>
            
            {activeTrades.length === 0 ? (
              <p className="text-gray-400 text-sm">No active trades</p>
            ) : (
              <div className="space-y-3">
                {activeTrades.map((trade) => (
                  <div key={trade.id} className="p-3 bg-gray-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {trade.tradeType === 'ONETOUCH' ? (
                          <Target className="w-4 h-4 text-blue-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-purple-400" />
                        )}
                        <span className="text-white font-medium text-sm">
                          {trade.symbol} {trade.tradeType === 'ONETOUCH' ? 'Touch' : 'No Touch'}
                        </span>
                      </div>
                      <span className={`text-xs font-medium ${getTradeStatusColor(trade.status)}`}>
                        {trade.status.toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-400">Stake:</span>
                        <span className="text-white ml-1">{accountInfo?.currency || '$'}{trade.amount}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Barrier:</span>
                        <span className="text-white ml-1">{trade.barrier}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Current:</span>
                        <span className="text-white ml-1">{trade.currentSpot?.toFixed(5)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">P&L:</span>
                        <span className={`ml-1 ${trade.profit && trade.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {trade.profit ? `${accountInfo?.currency || '$'}${trade.profit.toFixed(2)}` : 'TBD'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-2 text-xs text-gray-400">
                      Started: {formatTime(trade.startTime)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Trade History */}
          <div className="bg-gray-800 border border-gray-700 p-4 rounded-xl">
            <h4 className="text-lg font-semibold text-white mb-3">Recent History</h4>
            
            {tradeHistory.length === 0 ? (
              <p className="text-gray-400 text-sm">No completed trades</p>
            ) : (
              <div className="space-y-2">
                {tradeHistory.slice(-5).map((trade) => (
                  <div key={trade.id} className="p-2 bg-gray-700/30 rounded">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {trade.tradeType === 'ONETOUCH' ? (
                          <Target className="w-3 h-3 text-blue-400" />
                        ) : (
                          <XCircle className="w-3 h-3 text-purple-400" />
                        )}
                        <span className="text-white text-xs">{trade.symbol}</span>
                      </div>
                      <span className={`text-xs font-medium ${getTradeStatusColor(trade.status)}`}>
                        {trade.status === 'won' ? 'WON' : 'LOST'}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-gray-400">{accountInfo?.currency || '$'}{trade.amount}</span>
                      <span className={trade.profit && trade.profit >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {trade.profit ? `${accountInfo?.currency || '$'}${trade.profit.toFixed(2)}` : '0.00'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Risk Warning */}
      <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-orange-400 font-medium">Risk Warning</p>
            <p className="text-orange-300 text-sm mt-1">
              Touch/No Touch trading involves substantial risk and may result in loss of capital. 
              Barrier distances affect payout rates - closer barriers offer higher payouts but lower win probability.
              Only trade with money you can afford to lose.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TouchNoTouchTrading;